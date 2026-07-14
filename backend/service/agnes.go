package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultAgnesBaseURL    = "https://apihub.agnes-ai.com/v1"
	defaultAgnesImageModel = "agnes-image-2.1-flash"
	defaultAgnesVideoModel = "agnes-video-v2.0"
)

// AgnesService 封装 Agnes 图片/视频生成 API。
type AgnesService struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// AgnesImageRequest 图片生成请求；ImageURL 为空时为文生图，非空时为图生图。
type AgnesImageRequest struct {
	Prompt         string
	Size           string
	ResponseFormat string
	ImageURL       string
}

// AgnesImageResult 文生图结果。
type AgnesImageResult struct {
	URL           string
	B64JSON       string
	RevisedPrompt string
	Model         string
	Size          string
}

// AgnesVideoRequest 视频生成请求；ImageURL 为空时为文生视频，非空时为图生视频。
type AgnesVideoRequest struct {
	Prompt         string
	ImageURL       string
	Width          int
	Height         int
	NumFrames      int
	FrameRate      int
	NegativePrompt string
}

// AgnesVideoResult 视频任务结果。
type AgnesVideoResult struct {
	TaskID    string
	VideoID   string
	Status    string
	Progress  int
	VideoURL  string
	Error     string
	Model     string
	Width     int
	Height    int
	NumFrames int
	FrameRate int
}

func NewAgnesService(config ModelConfig) *AgnesService {
	baseURL := strings.TrimRight(config.ApiBase, "/")
	if baseURL == "" {
		baseURL = defaultAgnesBaseURL
	}
	return &AgnesService{
		apiKey:  config.ApiKey,
		baseURL: baseURL,
		model:   config.Model,
		client:  &http.Client{Timeout: 300 * time.Second},
	}
}

func (s *AgnesService) GenerateImage(req AgnesImageRequest) (*AgnesImageResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("AGNES_API_KEY 未配置")
	}
	if strings.TrimSpace(req.Prompt) == "" {
		return nil, fmt.Errorf("图片提示词不能为空")
	}
	if req.Size == "" {
		req.Size = "1024x768"
	}
	if req.ResponseFormat == "" {
		req.ResponseFormat = "url"
	}
	model := s.model
	if model == "" {
		model = defaultAgnesImageModel
	}

	body := map[string]interface{}{
		"model":  model,
		"prompt": req.Prompt,
		"size":   req.Size,
	}

	extraBody := map[string]interface{}{
		"response_format": req.ResponseFormat,
	}

	if req.ImageURL != "" {
		extraBody["image"] = []string{req.ImageURL}
	}

	body["extra_body"] = extraBody

	respBody, err := s.postJSON(s.v1Endpoint("/images/generations"), body)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Data []struct {
			URL           *string `json:"url"`
			B64JSON       *string `json:"b64_json"`
			RevisedPrompt *string `json:"revised_prompt"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("解析 Agnes 图片响应失败: %w", err)
	}
	if len(parsed.Data) == 0 {
		return nil, fmt.Errorf("Agnes 图片响应没有 data")
	}

	result := &AgnesImageResult{Model: model, Size: req.Size}
	if parsed.Data[0].URL != nil {
		result.URL = *parsed.Data[0].URL
	}
	if parsed.Data[0].B64JSON != nil {
		result.B64JSON = *parsed.Data[0].B64JSON
	}
	if parsed.Data[0].RevisedPrompt != nil {
		result.RevisedPrompt = *parsed.Data[0].RevisedPrompt
	}
	if result.URL == "" && result.B64JSON == "" {
		return nil, fmt.Errorf("Agnes 图片响应缺少 url/b64_json")
	}
	return result, nil
}

func (s *AgnesService) GenerateVideo(req AgnesVideoRequest) (*AgnesVideoResult, error) {
	created, err := s.CreateVideoTask(req)
	if err != nil {
		return nil, err
	}
	return s.PollVideoTask(created.VideoID, created.TaskID)
}

func (s *AgnesService) CreateVideoTask(req AgnesVideoRequest) (*AgnesVideoResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("AGNES_API_KEY 未配置")
	}
	if strings.TrimSpace(req.Prompt) == "" {
		return nil, fmt.Errorf("视频提示词不能为空")
	}
	model := s.model
	if model == "" {
		model = defaultAgnesVideoModel
	}
	width, height := req.Width, req.Height
	if width <= 0 {
		width = 1152
	}
	if height <= 0 {
		height = 768
	}
	numFrames := normalizeAgnesNumFrames(req.NumFrames)
	frameRate := req.FrameRate
	if frameRate <= 0 {
		frameRate = 24
	}

	body := map[string]interface{}{
		"model":      model,
		"prompt":     req.Prompt,
		"width":      width,
		"height":     height,
		"num_frames": numFrames,
		"frame_rate": frameRate,
	}
	if req.ImageURL != "" {
		body["image"] = req.ImageURL
	}
	if req.NegativePrompt != "" {
		body["negative_prompt"] = req.NegativePrompt
	}

	respBody, err := s.postJSON(s.v1Endpoint("/videos"), body)
	if err != nil {
		return nil, err
	}

	result, err := parseAgnesVideoResponse(respBody)
	if err != nil {
		return nil, err
	}
	result.Model = model
	result.Width = width
	result.Height = height
	result.NumFrames = numFrames
	result.FrameRate = frameRate
	if result.VideoID == "" && result.TaskID == "" {
		return nil, fmt.Errorf("Agnes 视频创建响应缺少 video_id/task_id")
	}
	return result, nil
}

func (s *AgnesService) PollVideoTask(videoID, taskID string) (*AgnesVideoResult, error) {
	deadline := time.Now().Add(360 * time.Second)
	time.Sleep(5 * time.Second)
	for {
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("Agnes 视频生成超时")
		}

		result, err := s.GetVideoTask(videoID, taskID)
		if err != nil {
			return nil, err
		}
		switch result.Status {
		case "completed", "succeeded", "success", "done":
			if result.VideoURL == "" {
				return nil, fmt.Errorf("Agnes 视频任务已完成但缺少视频 URL")
			}
			return result, nil
		case "failed", "error", "cancelled", "canceled":
			if result.Error == "" {
				result.Error = "视频生成失败"
			}
			return nil, fmt.Errorf("%s", result.Error)
		}

		time.Sleep(5 * time.Second)
	}
}

func (s *AgnesService) GetVideoTask(videoID, taskID string) (*AgnesVideoResult, error) {
	endpoint := ""
	if videoID != "" {
		q := url.Values{}
		q.Set("video_id", videoID)
		if s.model != "" {
			q.Set("model_name", s.model)
		}
		endpoint = s.gatewayEndpoint("/agnesapi") + "?" + q.Encode()
	} else if taskID != "" {
		endpoint = s.v1Endpoint("/videos/" + url.PathEscape(taskID))
	} else {
		return nil, fmt.Errorf("缺少 Agnes video_id/task_id")
	}

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("创建 Agnes 查询请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("调用 Agnes 视频查询失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取 Agnes 视频查询响应失败: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Agnes 视频查询返回状态 %d: %s", resp.StatusCode, string(respBody))
	}
	return parseAgnesVideoResponse(respBody)
}

func (s *AgnesService) postJSON(endpoint string, body map[string]interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("序列化 Agnes 请求失败: %w", err)
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建 Agnes 请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("调用 Agnes API 失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取 Agnes 响应失败: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Agnes API 返回状态 %d: %s", resp.StatusCode, string(respBody))
	}
	return respBody, nil
}

func parseAgnesVideoResponse(respBody []byte) (*AgnesVideoResult, error) {
	var parsed struct {
		ID                  string      `json:"id"`
		TaskID              string      `json:"task_id"`
		VideoID             string      `json:"video_id"`
		Model               string      `json:"model"`
		Status              string      `json:"status"`
		Progress            int         `json:"progress"`
		VideoURL            string      `json:"video_url"`
		RemixedFromVideoID  string      `json:"remixed_from_video_id"`
		Error               interface{} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("解析 Agnes 视频响应失败: %w", err)
	}

	status := strings.ToLower(strings.TrimSpace(parsed.Status))
	videoURL := parsed.VideoURL
	if videoURL == "" {
		videoURL = parsed.RemixedFromVideoID
	}
	errorText := ""
	switch v := parsed.Error.(type) {
	case string:
		errorText = v
	case map[string]interface{}:
		if msg, ok := v["message"].(string); ok {
			errorText = msg
		} else if b, err := json.Marshal(v); err == nil {
			errorText = string(b)
		}
	}

	result := &AgnesVideoResult{
		TaskID:   parsed.TaskID,
		VideoID:  parsed.VideoID,
		Status:   status,
		Progress: parsed.Progress,
		VideoURL: videoURL,
		Error:    errorText,
		Model:    parsed.Model,
	}
	if result.TaskID == "" {
		result.TaskID = parsed.ID
	}
	return result, nil
}

func (s *AgnesService) v1Endpoint(path string) string {
	base := strings.TrimRight(s.baseURL, "/")
	if !strings.HasSuffix(base, "/v1") {
		base += "/v1"
	}
	return base + path
}

func (s *AgnesService) gatewayEndpoint(path string) string {
	base := strings.TrimRight(s.baseURL, "/")
	base = strings.TrimSuffix(base, "/v1")
	return base + path
}

func normalizeAgnesNumFrames(numFrames int) int {
	if numFrames <= 0 {
		return 121
	}
	if numFrames > 441 {
		numFrames = 441
	}
	if (numFrames-1)%8 == 0 {
		return numFrames
	}
	return ((numFrames-1)/8)*8 + 1
}
