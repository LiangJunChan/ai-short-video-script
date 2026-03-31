package service

import (
	"ai-short-video-backend/database"
	"bytes"
	"fmt"
	"log"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
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
	_, err = fmt.Scan(stdout.String(), &duration)
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

// RecognizeSpeech 语音识别 - 需要接入实际的Fun-ASR或其他语音识别服务
// 这里预留接口，实际使用时请替换为真实的语音识别API调用
func RecognizeSpeech(audioPath string) (string, error) {
	// TODO: 接入Fun-ASR或其他语音识别服务
	// 例如:
	// 1. 使用Fun-ASR本地模型
	// 2. 调用阿里云语音识别API
	// 3. 调用百度语音识别API
	// 这里返回空字符串表示识别失败，实际使用时请替换

	// 示例Fun-ASR调用逻辑（伪代码）:
	// result := funasr.Recognize(audioPath)
	// return result.Text, nil

	return "", fmt.Errorf("no speech recognition service configured")
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
