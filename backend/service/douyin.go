package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// 预编译正则表达式（只编译一次）
var (
	reURLExtract        = regexp.MustCompile(`https?://[^\s]+`)
	reVideoID          = regexp.MustCompile(`/video/(\d+)`)
	reNoteID           = regexp.MustCompile(`/note/(\d+)`)
)

// ExtractVideoByDouyinURL 从抖音分享链接提取视频并下载到本地
// 使用Playwright无头浏览器绕过反爬
// 返回: 保存路径, 文件名, 标题, 错误
func ExtractVideoByDouyinURL(shareURL string) (string, string, string, error) {
	// 1. 规范化链接
	shareURL = normalizeShareURL(shareURL)
	if shareURL == "" {
		return "", "", "", errors.New("无效的抖音链接")
	}
	log.Printf("Extracting video from: %s", shareURL)

	// 2. 使用Playwright提取视频URL和标题
	videoURL, title, err := extractWithPlaywright(shareURL)
	if err != nil {
		log.Printf("Playwright extraction failed: %v", err)
		return "", "", "", fmt.Errorf("提取失败: %w", err)
	}

	if videoURL == "" {
		return "", "", "", errors.New("无法提取视频地址")
	}
	log.Printf("Extracted video URL: %s, title: %s", videoURL, title)

	// 3. 下载视频到本地
	savePath, filename, err := downloadVideoToFile(videoURL, shareURL)
	if err != nil {
		return "", "", "", err
	}

	return savePath, filename, title, nil
}

// ExtractionResult 提取结果
type ExtractionResult struct {
	VideoURL string `json:"video_url"`
	Title   string `json:"title"`
	Error   string `json:"error"`
}

// extractWithPlaywright 使用Python Playwright提取视频URL和标题
func extractWithPlaywright(shareURL string) (string, string, error) {
	// 获取当前目录下的Python脚本路径
	execDir, err := os.Executable()
	if err != nil {
		execDir = "."
	}
	scriptPath := filepath.Join(filepath.Dir(execDir), "extract_douyin.py")

	// 如果脚本不存在，尝试当前工作目录
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		scriptPath = "extract_douyin.py"
	}

	log.Printf("Calling extraction script: %s", scriptPath)

	// 调用Python脚本
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "python3", scriptPath, shareURL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		log.Printf("Extraction script error: %v, stderr: %s", err, stderr.String())
		return "", "", fmt.Errorf("提取脚本执行失败: %w", err)
	}

	output := strings.TrimSpace(stdout.String())
	if output == "" {
		log.Printf("No output from script, stderr: %s", stderr.String())
		return "", "", errors.New("脚本未返回数据")
	}

	// 解析JSON响应
	var result ExtractionResult
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		// 如果不是JSON，尝试直接作为URL处理（旧格式兼容）
		log.Printf("Failed to parse JSON, treating as direct URL: %v", err)
		videoURL := strings.ReplaceAll(output, "\\", "")
		videoURL = strings.TrimSpace(videoURL)
		return videoURL, "", nil
	}

	if result.Error != "" {
		return "", "", fmt.Errorf("提取错误: %s", result.Error)
	}

	if result.VideoURL == "" {
		return "", "", errors.New("脚本未返回视频地址")
	}

	// 清理URL中的转义字符
	videoURL := strings.ReplaceAll(result.VideoURL, "\\", "")
	videoURL = strings.TrimSpace(videoURL)

	// 清理标题
	title := strings.TrimSpace(result.Title)

	return videoURL, title, nil
}

// downloadVideoToFile 下载视频URL到本地文件
func downloadVideoToFile(videoURL string, originalURL string) (string, string, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return "", "", err
	}
	client := &http.Client{
		Timeout: 2 * time.Minute,
		Jar:     jar,
	}

	// 生成文件名和保存路径
	uuid := uuid.New().String()
	filename := fmt.Sprintf("video_%s.mp4", uuid)
	uploadDir := filepath.Join("..", "uploads")
	savePath := filepath.Join(uploadDir, filename)

	// 确保uploads目录存在
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("创建uploads目录失败: %w", err)
	}

	// 创建输出文件
	outFile, err := os.Create(savePath)
	if err != nil {
		return "", "", err
	}
	defer outFile.Close()

	// 流式下载
	err = downloadVideo(videoURL, outFile, client)
	if err != nil {
		os.Remove(savePath)
		return "", "", err
	}

	log.Printf("Successfully downloaded video from %s -> %s", originalURL, savePath)
	return savePath, filename, nil
}

// downloadVideo 流式下载视频并直接写入文件
func downloadVideo(videoURL string, outFile *os.File, client *http.Client) error {
	if !strings.HasPrefix(videoURL, "http") {
		if strings.HasPrefix(videoURL, "//") {
			videoURL = "https:" + videoURL
		} else {
			return errors.New("无效的视频URL: " + videoURL)
		}
	}

	parsedURL, err := url.Parse(videoURL)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("GET", parsedURL.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.douyin.com/")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Origin", "https://www.douyin.com")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载视频失败，状态码: %d", resp.StatusCode)
	}

	written, err := io.Copy(outFile, resp.Body)
	if err != nil {
		return err
	}

	if written == 0 {
		return errors.New("下载视频为空")
	}

	if written > 4*1024*1024*1024 {
		return errors.New("视频文件超过4GB限制")
	}

	return nil
}

// extractVideoID 从抖音分享链接提取视频ID
func extractVideoID(shareURL string) string {
	if match := reVideoID.FindStringSubmatch(shareURL); len(match) >= 2 {
		return match[1]
	}
	if match := reNoteID.FindStringSubmatch(shareURL); len(match) >= 2 {
		return match[1]
	}
	return ""
}

// normalizeShareURL 处理各种格式的抖音分享链接
func normalizeShareURL(input string) string {
	input = strings.TrimSpace(input)
	input = strings.TrimSuffix(input, "/")

	if strings.HasPrefix(input, "http") {
		return input
	}
	if strings.HasPrefix(input, "v.douyin.com") {
		return "https://" + input
	}

	match := reURLExtract.FindString(input)
	return match
}

// ValidateDouyinURL 验证是否是抖音链接
func ValidateDouyinURL(url string) bool {
	url = strings.TrimSpace(url)
	return strings.Contains(url, "douyin.com") || strings.Contains(url, "iesdouyin.com")
}
