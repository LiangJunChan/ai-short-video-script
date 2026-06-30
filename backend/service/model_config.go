package service

import (
	"ai-short-video-backend/database"
	"fmt"
	"os"
)

// ModelConfig 模型配置
type ModelConfig struct {
	Provider string `json:"provider"`
	ApiKey   string `json:"apiKey"`
	ApiBase  string `json:"apiBase"`
	Model    string `json:"model"`
}

// GetUserModelConfig 获取用户的模型配置（优先用户配置，回退全局默认）
// 返回 error：全局配置无效（如 LLM_PROVIDER 未设或不在白名单）时返回明确错误，调用方应透传给前端
func GetUserModelConfig(userID int, configType string) (ModelConfig, error) {
	userConfig, err := database.GetUserModelConfig(userID, configType)
	if err == nil && userConfig != nil && userConfig.Provider != "" {
		return ModelConfig{
			Provider: userConfig.Provider,
			ApiKey:   userConfig.ApiKey,
			ApiBase:  userConfig.ApiBase,
			Model:    userConfig.Model,
		}, nil
	}
	return getGlobalModelConfig(configType)
}

// getGlobalModelConfig 从 .env 获取全局默认配置
// case 精准匹配白名单 provider（minimax/volcano/agnes），default 走错误返回
// image/video 当前只支持 agnes，走默认；未来若新增 provider 需要在此显式加 case
func getGlobalModelConfig(configType string) (ModelConfig, error) {
	switch configType {
	case "llm":
		provider := os.Getenv("LLM_PROVIDER")
		switch provider {
		case "minimax", "volcengine", "volcano", "agnes":
			return ModelConfig{
				Provider: provider,
				ApiKey:   getLLMApiKeyForProvider(provider),
				ApiBase:  getLLMApiBaseForProvider(provider),
				Model:    getLLMModelForProvider(provider),
			}, nil
		default:
			return ModelConfig{}, fmt.Errorf("未识别的 LLM_PROVIDER=%q（必须是 minimax/volcano/agnes）", provider)
		}
	case "image":
		return ModelConfig{
			Provider: "agnes",
			ApiKey:   os.Getenv("AGNES_API_KEY"),
			ApiBase:  getEnvOrDefault("AGNES_API_BASE", defaultAgnesBaseURL),
			Model:    getEnvOrDefault("AGNES_IMAGE_MODEL", defaultAgnesImageModel),
		}, nil
	case "video":
		return ModelConfig{
			Provider: "agnes",
			ApiKey:   os.Getenv("AGNES_API_KEY"),
			ApiBase:  getEnvOrDefault("AGNES_API_BASE", defaultAgnesBaseURL),
			Model:    getEnvOrDefault("AGNES_VIDEO_MODEL", defaultAgnesVideoModel),
		}, nil
	default:
		return ModelConfig{}, fmt.Errorf("未知的 configType=%q", configType)
	}
}

// getLLMApiKeyForProvider 根据 provider 获取 API Key（case 精准匹配）
func getLLMApiKeyForProvider(provider string) string {
	switch provider {
	case "minimax":
		return os.Getenv("MINIMAX_API_KEY")
	case "volcengine", "volcano":
		return os.Getenv("VOLCANO_API_KEY")
	case "agnes":
		return os.Getenv("AGNES_API_KEY")
	default:
		return ""
	}
}

// getLLMApiBaseForProvider 根据 provider 获取 API Base（case 精准匹配）
func getLLMApiBaseForProvider(provider string) string {
	switch provider {
	case "minimax":
		return getEnvOrDefault("MINIMAX_API_BASE", "https://api.minimaxi.com")
	case "volcengine", "volcano":
		return getEnvOrDefault("VOLCANO_API_BASE", "https://ark.cn-beijing.volces.com")
	case "agnes":
		return getEnvOrDefault("AGNES_API_BASE", defaultAgnesBaseURL)
	default:
		return ""
	}
}

// getLLMModelForProvider 根据 provider 获取模型名（case 精准匹配）
func getLLMModelForProvider(provider string) string {
	switch provider {
	case "minimax":
		return getEnvOrDefault("MINIMAX_MODEL", "MiniMax-M2")
	case "volcengine", "volcano":
		return getEnvOrDefault("VOLCANO_MODEL", "doubao-1.5-pro")
	case "agnes":
		return getEnvOrDefault("AGNES_LLM_MODEL", "agnes-2.0-flash")
	default:
		return ""
	}
}

// GetProviderForUser 获取用户级 LLM Provider
// case 精准匹配 provider（minimax/volcano/agnes），default 走错误
// 配置获取失败或 provider 未识别都返回 error
func GetProviderForUser(userID int) (LLMProvider, error) {
	config, err := GetUserModelConfig(userID, "llm")
	if err != nil {
		return nil, err
	}
	switch config.Provider {
	case "minimax":
		return &MinimaxProvider{
			apiKey:  config.ApiKey,
			baseURL: config.ApiBase,
			model:   config.Model,
		}, nil
	case "volcengine", "volcano":
		return &VolcanoEngineProvider{
			apiKey:  config.ApiKey,
			baseURL: config.ApiBase,
			model:   config.Model,
		}, nil
	case "agnes":
		return &AgnesLLMProvider{
			apiKey:  config.ApiKey,
			baseURL: config.ApiBase,
			model:   config.Model,
		}, nil
	default:
		return nil, fmt.Errorf("未识别的 provider=%q（必须是 minimax/volcano/agnes）", config.Provider)
	}
}

// GetGlobalDefaultConfigs 获取全局默认配置（供前端展示）
// 任意 configType 获取失败（如 LLM_PROVIDER 未配置）返回 error
func GetGlobalDefaultConfigs() (map[string]ModelConfig, error) {
	configs := make(map[string]ModelConfig)
	for _, t := range []string{"llm", "image", "video"} {
		c, err := getGlobalModelConfig(t)
		if err != nil {
			return nil, fmt.Errorf("getGlobalModelConfig(%q): %w", t, err)
		}
		configs[t] = c
	}
	return configs, nil
}