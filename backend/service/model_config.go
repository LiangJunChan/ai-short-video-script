package service

import (
	"ai-short-video-backend/database"
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
func GetUserModelConfig(userID int, configType string) ModelConfig {
	// 1. 尝试用户个人配置
	userConfig, err := database.GetUserModelConfig(userID, configType)
	if err == nil && userConfig != nil && userConfig.Provider != "" {
		return ModelConfig{
			Provider: userConfig.Provider,
			ApiKey:   userConfig.ApiKey,
			ApiBase:  userConfig.ApiBase,
			Model:    userConfig.Model,
		}
	}

	// 2. 回退全局 .env 配置
	return getGlobalModelConfig(configType)
}

// getGlobalModelConfig 从 .env 获取全局默认配置
func getGlobalModelConfig(configType string) ModelConfig {
	switch configType {
	case "llm":
		provider := os.Getenv("LLM_PROVIDER")
		if provider == "" {
			provider = "minimax"
		}
		return ModelConfig{
			Provider: provider,
			ApiKey:   getLLMApiKeyForProvider(provider),
			ApiBase:  getLLMApiBaseForProvider(provider),
			Model:    getLLMModelForProvider(provider),
		}
	default:
		return ModelConfig{}
	}
}

// getLLMApiKeyForProvider 根据 provider 获取 API Key
func getLLMApiKeyForProvider(provider string) string {
	switch provider {
	case "volcengine", "volcano":
		return os.Getenv("VOLCANO_API_KEY")
	default:
		return os.Getenv("MINIMAX_API_KEY")
	}
}

// getLLMApiBaseForProvider 根据 provider 获取 API Base
func getLLMApiBaseForProvider(provider string) string {
	switch provider {
	case "volcengine", "volcano":
		return getEnvOrDefault("VOLCANO_API_BASE", "https://ark.cn-beijing.volces.com")
	default:
		return getEnvOrDefault("MINIMAX_API_BASE", "https://api.minimaxi.com")
	}
}

// getLLMModelForProvider 根据 provider 获取模型名
func getLLMModelForProvider(provider string) string {
	switch provider {
	case "volcengine", "volcano":
		return getEnvOrDefault("VOLCANO_MODEL", "doubao-1.5-pro")
	default:
		return getEnvOrDefault("MINIMAX_MODEL", "MiniMax-M2")
	}
}

// GetProviderForUser 获取用户级 LLM Provider
func GetProviderForUser(userID int) LLMProvider {
	config := GetUserModelConfig(userID, "llm")
	switch config.Provider {
	case "volcengine", "volcano":
		return &VolcanoEngineProvider{
			apiKey:  config.ApiKey,
			baseURL: config.ApiBase,
			model:   config.Model,
		}
	default:
		return &MinimaxProvider{
			apiKey:  config.ApiKey,
			baseURL: config.ApiBase,
			model:   config.Model,
		}
	}
}

// GetGlobalDefaultConfigs 获取全局默认配置（供前端展示）
func GetGlobalDefaultConfigs() map[string]ModelConfig {
	configs := make(map[string]ModelConfig)
	configs["llm"] = getGlobalModelConfig("llm")
	return configs
}
