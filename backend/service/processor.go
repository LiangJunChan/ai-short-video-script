package service

import (
	"ai-short-video-backend/database"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// 中文数字到阿拉伯数字的映射
var chineseNumbers = map[rune]rune{
	'零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
	'五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
}

func InitFFmpeg() {
	// 检查FFmpeg是否可用
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		log.Printf("Warning: ffmpeg not found in PATH: %v", err)
		log.Printf("Please install ffmpeg before using audio extraction feature")
	} else {
		log.Println("FFmpeg found in PATH")
	}
}

// ExtractAudio 从视频提取音频为WAV格式
func ExtractAudio(videoPath, outputPath string) error {
	cmd := exec.Command(
		"ffmpeg",
		"-y",
		"-i", videoPath,
		"-acodec", "pcm_s16le",
		"-ar", "16000",
		"-ac", "1",
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("ffmpeg extract audio failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

// GetVideoDuration 获取视频时长
func GetVideoDuration(videoPath string) (float64, error) {
	cmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return 0, fmt.Errorf("ffprobe get duration failed: %v, stderr: %s", err, stderr.String())
	}

	var duration float64
	_, err = fmt.Sscan(stdout.String(), &duration)
	if err != nil {
		return 0, err
	}

	return duration, nil
}

// CaptureThumbnail 截取视频第一帧作为缩略图
func CaptureThumbnail(videoPath, outputPath string) error {
	cmd := exec.Command(
		"ffmpeg",
		"-y",
		"-ss", "00:00:01",
		"-i", videoPath,
		"-vframes", "1",
		"-s", "320x180",
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("ffmpeg capture thumbnail failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

// RecognizeSpeech 调用本地 Fun-ASR 服务进行语音识别
func RecognizeSpeech(audioPath string) (string, error) {
	// 打开音频文件
	file, err := os.Open(audioPath)
	if err != nil {
		return "", fmt.Errorf("failed to open audio file: %w", err)
	}
	defer file.Close()

	// 创建 multipart form 请求
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// 添加音频文件字段（字段名必须与 Fun-ASR 服务端一致: "file"）
	part, err := writer.CreateFormFile("file", filepath.Base(audioPath))
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := io.Copy(part, file); err != nil {
		return "", fmt.Errorf("failed to copy audio data: %w", err)
	}
	writer.Close()

	// 发送 POST 请求到 Fun-ASR 服务
	req, err := http.NewRequest("POST", "http://localhost:8000/asr", body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Fun-ASR: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Fun-ASR returned status %d: %s", resp.StatusCode, string(respBody))
	}

	// 解析响应 JSON
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// Fun-ASR 返回格式: {"text": "识别文字内容"}
	var result struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		// 如果 JSON 格式不同，尝试直接返回原始内容
		return strings.TrimSpace(string(respBody)), nil
	}

	return result.Text, nil
}

// PostProcessText 文本后处理
func PostProcessText(text string) string {
	// 中文数字年份转阿拉伯数字
	re := regexp.MustCompile(`([零一二三四五六七八九]{4})年`)
	text = re.ReplaceAllStringFunc(text, func(s string) string {
		yearPart := s[:len(s)-1]
		var result strings.Builder
		for _, c := range yearPart {
			if num, ok := chineseNumbers[c]; ok {
				result.WriteRune(num)
			} else {
				result.WriteRune(c)
			}
		}
		result.WriteRune('年')
		return result.String()
	})

	// 规整空格和换行
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)
	text = regexp.MustCompile(`([。！？；])`).ReplaceAllString(text, "$1\n")

	return text
}

// ProcessVideoAI 异步处理视频AI提取
func ProcessVideoAI(videoID int, videoPath string) {
	go func() {
		log.Printf("Starting AI processing for video %d", videoID)

		// 创建音频文件路径
		ext := filepath.Ext(videoPath)
		baseName := filepath.Base(videoPath[:len(videoPath)-len(ext)])
		audioPath := filepath.Join("../audio", baseName+".wav")

		// 提取音频
		err := ExtractAudio(videoPath, audioPath)
		if err != nil {
			log.Printf("Failed to extract audio for video %d: %v", videoID, err)
			database.UpdateVideoAIResult(videoID, nil, "failed")
			return
		}

		// 语音识别
		aiText, err := RecognizeSpeech(audioPath)
		if err != nil || aiText == "" {
			log.Printf("Failed to recognize speech for video %d: %v", videoID, err)
			database.UpdateVideoAIResult(videoID, nil, "failed")
			return
		}

		// 后处理
		aiText = PostProcessText(aiText)

		// 更新数据库
		aiTextPtr := &aiText
		err = database.UpdateVideoAIResult(videoID, aiTextPtr, "done")
		if err != nil {
			log.Printf("Failed to update AI result for video %d: %v", videoID, err)
			return
		}

		// 可选: 删除临时音频文件
		// os.Remove(audioPath)

		log.Printf("AI processing completed for video %d", videoID)
	}()
}

// ValidateVideoFormat 验证视频格式
func ValidateVideoFormat(filename string) bool {
	allowedExts := map[string]bool{
		".mp4":  true,
		".flv":  true,
		".mov":  true,
	}
	ext := strings.ToLower(filepath.Ext(filename))
	return allowedExts[ext]
}

// ValidateVideoDuration 验证视频时长
func ValidateVideoDuration(duration float64) (bool, string) {
	if duration < 15 {
		return false, "视频时长过短，要求15秒-10分钟"
	}
	if duration > 600 {
		return false, "视频时长过长，要求15秒-10分钟"
	}
	return true, ""
}
