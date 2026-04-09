package service

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
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

	// 3. 读取HTML内容
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

	// 5. 下载视频到本地
	videoData, err := downloadVideo(videoURL, client)
	if err != nil {
		return "", "", err
	}

	// 6. 保存到uploads目录
	uuid := uuid.New().String()
	filename := fmt.Sprintf("video_%s.mp4", uuid)
	savePath := fmt.Sprintf("../uploads/%s", filename)

	err = os.WriteFile(savePath, videoData, 0644)
	if err != nil {
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
	re := regexp.MustCompile(`https?://[^\s]+`)
	match := re.FindString(input)
	return match
}

// extractVideoURL 从抖音页面HTML提取视频播放地址
func extractVideoURL(html string) string {
	// 尝试多种提取方式

	// 1. 寻找 video 标签的 src
	reVideo := regexp.MustCompile(`<video[^>]+src="([^"]+)"`)
	match := reVideo.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "") // 解编码 &amp;
		return url
	}

	// 2. 寻找 script 中的 video url 匹配 pattern
	reScript := regexp.MustCompile(`"playAddr":\["([^"]+)"\]`)
	match = reScript.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "")
		return url
	}

	// 3. 尝试匹配 vm.url 模式
	reVm := regexp.MustCompile(`vm\.url\s*=\s*"([^"]+)"`)
	match = reVm.FindStringSubmatch(html)
	if len(match) >= 2 {
		url := strings.ReplaceAll(match[1], "amp;", "")
		return url
	}

	return ""
}

// downloadVideo 下载视频
func downloadVideo(videoURL string, client *http.Client) ([]byte, error) {
	// 处理相对URL
	if !strings.HasPrefix(videoURL, "http") {
		if strings.HasPrefix(videoURL, "//") {
			videoURL = "https:" + videoURL
		} else {
			return nil, errors.New("无效的视频URL: " + videoURL)
		}
	}

	// URL解码
	parsedURL, err := url.Parse(videoURL)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", parsedURL.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")
	req.Header.Set("Referer", "https://www.douyin.com/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("下载视频失败，状态码: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if len(data) == 0 {
		return nil, errors.New("下载视频为空")
	}

	// 检查大小限制 (4GB)
	if len(data) > 4*1024*1024*1024 {
		return nil, errors.New("视频文件超过4GB限制")
	}

	return data, nil
}

// ValidateDouyinURL 验证是否是抖音链接
func ValidateDouyinURL(url string) bool {
	url = strings.TrimSpace(url)
	return strings.Contains(url, "douyin.com") || strings.Contains(url, "iesdouyin.com")
}
