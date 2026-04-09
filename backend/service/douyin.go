package service

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// 预编译正则表达式（只编译一次）
var (
	reURLExtract     = regexp.MustCompile(`https?://[^\s]+`)
	reVideoTag       = regexp.MustCompile(`<video[^>]+src="([^"]+)"`)
	rePlayAddrScript = regexp.MustCompile(`"playAddr":\["([^"]+)"\]`)
	reVmURL          = regexp.MustCompile(`vm\.url\s*=\s*"([^"]+)"`)
)

// ExtractVideoByDouyinURL 从抖音分享链接提取视频并下载到本地
// 返回: 本地文件路径, 文件名, 错误
func ExtractVideoByDouyinURL(shareURL string) (string, string, error) {
	// 1. 规范化链接（处理用户粘贴的各种格式）
	shareURL = normalizeShareURL(shareURL)
	if shareURL == "" {
		return "", "", errors.New("无效的抖音链接")
	}

	// 2. 请求链接，跟随重定向获取最终页面
	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// 允许最多10次重定向
			if len(via) >= 10 {
				return errors.New("太多重定向")
			}
			return nil
		},
	}

	req, err := http.NewRequest("GET", shareURL, nil)
	if err != nil {
		return "", "", err
	}
	// 设置User-Agent模拟浏览器
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("请求页面失败，状态码: %d", resp.StatusCode)
	}

	// 3. 读取HTML内容（HTML页面不大，io.ReadAll在这里是可接受的）
	html, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}
	htmlStr := string(html)

	// 4. 从HTML提取视频URL
	videoURL := extractVideoURL(htmlStr)
	if videoURL == "" {
		return "", "", errors.New("无法提取视频地址，请检查链接是否正确")
	}

	// 5. 生成文件名和保存路径
	uuid := uuid.New().String()
	filename := fmt.Sprintf("video_%s.mp4", uuid)

	// 使用 filepath.Join 处理路径（相对于项目根目录的backend目录）
	uploadDir := filepath.Join("..", "uploads")
	savePath := filepath.Join(uploadDir, filename)

	// 6. 确保uploads目录存在
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("创建uploads目录失败: %w", err)
	}

	// 7. 创建输出文件
	outFile, err := os.Create(savePath)
	if err != nil {
		return "", "", err
	}
	defer outFile.Close()

	// 8. 流式下载视频直接写入文件，不加载整个视频到内存
	err = downloadVideo(videoURL, outFile, client)
	if err != nil {
		// 下载失败删除已创建的文件
		os.Remove(savePath)
		return "", "", err
	}

	log.Printf("Successfully downloaded video from douyin URL: %s -> %s", shareURL, savePath)
	return savePath, filename, nil
}

// normalizeShareURL 处理各种格式的抖音分享链接
func normalizeShareURL(input string) string {
	input = strings.TrimSpace(input)
	input = strings.TrimSuffix(input, "/")

	// 如果已经是完整URL
	if strings.HasPrefix(input, "http") {
		return input
	}

	// 如果只复制了v.douyin.com/ABC部分，没有scheme
	if strings.HasPrefix(input, "v.douyin.com") {
		return "https://" + input
	}

	// 如果用户复制了整个分享文本，提取链接
	match := reURLExtract.FindString(input)
	return match
}

// extractVideoURL 从抖音页面HTML提取视频播放地址
func extractVideoURL(html string) string {
	// 尝试多种提取方式

	// 1. 寻找 video 标签的 src
	match := reVideoTag.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "") // 解编码 &amp;
		return url
	}

	// 2. 寻找 script 中的 video url 匹配 pattern
	match = rePlayAddrScript.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "")
		return url
	}

	// 3. 尝试匹配 vm.url 模式
	match = reVmURL.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "")
		return url
	}

	return ""
}

// downloadVideo 流式下载视频并直接写入文件，避免内存占用
func downloadVideo(videoURL string, outFile *os.File, client *http.Client) error {
	// 处理相对URL
	if !strings.HasPrefix(videoURL, "http") {
		if strings.HasPrefix(videoURL, "//") {
			videoURL = "https:" + videoURL
		} else {
			return errors.New("无效的视频URL: " + videoURL)
		}
	}

	// URL解码
	parsedURL, err := url.Parse(videoURL)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("GET", parsedURL.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")
	req.Header.Set("Referer", "https://www.douyin.com/")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载视频失败，状态码: %d", resp.StatusCode)
	}

	// 使用 io.Copy 直接流式传输，不加载整个文件到内存
	written, err := io.Copy(outFile, resp.Body)
	if err != nil {
		return err
	}

	if written == 0 {
		return errors.New("下载视频为空")
	}

	// 检查大小限制 (4GB)
	if written > 4*1024*1024*1024 {
		return errors.New("视频文件超过4GB限制")
	}

	return nil
}

// ValidateDouyinURL 验证是否是抖音链接
func ValidateDouyinURL(url string) bool {
	url = strings.TrimSpace(url)
	return strings.Contains(url, "douyin.com") || strings.Contains(url, "iesdouyin.com")
}
