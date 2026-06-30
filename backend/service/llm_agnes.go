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

// AgnesLLMProvider Agnes 2.0 Flash 文本模型 provider
// 复用现有 AGNES_API_KEY / AGNES_API_BASE（与 agnes image/video 同一供应商）
// 调用 POST {base}/v1/chat/completions（OpenAI 兼容）
type AgnesLLMProvider struct {
	apiKey  string
	baseURL string
	model   string
}

func NewAgnesLLMProvider() *AgnesLLMProvider {
	return &AgnesLLMProvider{
		apiKey:  os.Getenv("AGNES_API_KEY"),
		baseURL: getEnvOrDefault("AGNES_API_BASE", defaultAgnesBaseURL),
		model:   getEnvOrDefault("AGNES_LLM_MODEL", "agnes-2.0-flash"),
	}
}

func (p *AgnesLLMProvider) Name() string {
	return "agnes"
}

func (p *AgnesLLMProvider) Chat(messages []ChatMessage) (string, error) {
	if p.apiKey == "" {
		return "", fmt.Errorf("AGNES_API_KEY environment variable not set")
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
		"max_tokens":  4000,
		"temperature": 0.7,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// 兼容用户自定义 base：去尾 /，确保 /v1 后缀
	url := strings.TrimRight(p.baseURL, "/")
	if !strings.HasSuffix(url, "/v1") {
		url += "/v1"
	}
	url += "/chat/completions"

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Agnes LLM API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Agnes LLM API returned status %d: %s", resp.StatusCode, string(respBody))
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
		return "", fmt.Errorf("no response from Agnes LLM")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}