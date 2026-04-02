package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// ChatMessage 消息结构
type ChatMessage struct {
	Role    string
	Content string
}

// LLMProvider 接口
type LLMProvider interface {
	Chat(messages []ChatMessage) (string, error)
	Name() string
}

// MiniMax Provider
type MinimaxProvider struct {
	apiKey  string
	baseURL string
	model   string
}

func NewMinimaxProvider() *MinimaxProvider {
	return &MinimaxProvider{
		apiKey:  os.Getenv("MINIMAX_API_KEY"),
		baseURL: getEnvOrDefault("MINIMAX_API_BASE", "https://api.minimaxi.com"),
		model:   getEnvOrDefault("MINIMAX_MODEL", "MiniMax-M2"),
	}
}

func (p *MinimaxProvider) Name() string {
	return "minimax"
}

func (p *MinimaxProvider) Chat(messages []ChatMessage) (string, error) {
	if p.apiKey == "" {
		return "", fmt.Errorf("MINIMAX_API_KEY environment variable not set")
	}

	reqBody := map[string]interface{}{
		"model": p.model,
		"messages": func() []map[string]string {
			result := make([]map[string]string, len(messages))
			for i, msg := range messages {
				result[i] = map[string]string{"role": msg.Role, "content": msg.Content}
			}
			return result
		}(),
		"max_tokens": 2000,
		"temperature": 0.7,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := p.baseURL + "/v1/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call MiniMax API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("MiniMax API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from MiniMax")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}

// VolcanoEngine Provider
type VolcanoEngineProvider struct {
	apiKey  string
	baseURL string
	model   string
}

func NewVolcanoEngineProvider() *VolcanoEngineProvider {
	return &VolcanoEngineProvider{
		apiKey:  os.Getenv("VOLCANO_API_KEY"),
		baseURL: getEnvOrDefault("VOLCANO_API_BASE", "https://ark.cn-beijing.volces.com/api/coding/v3"),
		model:   getEnvOrDefault("VOLCANO_MODEL", "ark-code-latest"),
	}
}

func (p *VolcanoEngineProvider) Name() string {
	return "volcengine"
}

func (p *VolcanoEngineProvider) Chat(messages []ChatMessage) (string, error) {
	if p.apiKey == "" {
		return "", fmt.Errorf("VOLCANO_API_KEY environment variable not set")
	}

	reqBody := map[string]interface{}{
		"model": p.model,
		"messages": func() []map[string]string {
			result := make([]map[string]string, len(messages))
			for i, msg := range messages {
				result[i] = map[string]string{"role": msg.Role, "content": msg.Content}
			}
			return result
		}(),
		"max_tokens": 2000,
		"temperature": 0.7,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := p.baseURL + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Volcano Engine API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Volcano Engine API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from Volcano Engine")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}

// 全局 LLM Provider
var currentProvider LLMProvider

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// getCurrentProvider 根据环境变量获取当前 Provider
func getCurrentProvider() LLMProvider {
	providerType := os.Getenv("LLM_PROVIDER")
	switch providerType {
	case "volcengine":
		return NewVolcanoEngineProvider()
	default:
		return NewMinimaxProvider()
	}
}

// getSystemPrompt 读取系统提示词文件
var systemPromptCache = ""

func getSystemPrompt() string {
	if systemPromptCache != "" {
		return systemPromptCache
	}

	// 尝试多个路径
	paths := []string{
		"prompts/rewrite_system_prompt.txt",
		"../prompts/rewrite_system_prompt.txt",
		"./prompts/rewrite_system_prompt.txt",
	}

	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err == nil {
			systemPromptCache = strings.TrimSpace(string(data))
			return systemPromptCache
		}
	}

	// 默认提示词
	defaultPrompt := `你是一个专业的文案改写助手。用户会提供一段原始文案和改写要求，
请根据用户的要求对文案进行改写，保持核心信息不变，只优化表达方式。
直接输出改写后的文案，不要添加任何解释或思考过程，不要输出与改写无关的内容。`
	systemPromptCache = defaultPrompt
	return defaultPrompt
}

// RewriteText 调用 LLM 对文案进行改写
func RewriteText(originalText, userPrompt string) (string, error) {
	provider := getCurrentProvider()

	if originalText == "" {
		return "", fmt.Errorf("原文案为空，无法进行改写")
	}

	systemPrompt := getSystemPrompt()
	userContent := fmt.Sprintf("原始文案：\n%s\n\n改写要求：%s", originalText, userPrompt)

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userContent},
	}

	return provider.Chat(messages)
}
