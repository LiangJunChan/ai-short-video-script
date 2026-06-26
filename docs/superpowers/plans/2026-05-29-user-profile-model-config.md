# 用户增强模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增"我的"页面，支持修改密码和 admin/vip 用户自定义模型配置

**Architecture:** 后端新增 user_model_configs 表存储用户级模型配置，优先级为 用户配置 > .env 全局配置。前端新增 ProfilePage 页面，admin/vip 用户可见模型配置卡片。改造现有 LLM 服务支持按用户获取配置。

**Tech Stack:** Go/Gin (后端) + React/RTK Query (前端) + SQLite + bcrypt

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `backend/database/user_model_config.go` | user_model_configs 表 CRUD |
| `backend/handler/user_profile.go` | 修改密码 + 模型配置 API handler |
| `backend/service/model_config.go` | 模型配置优先级服务 |
| `frontend/src/pages/ProfilePage.tsx` | "我的"页面 |
| `frontend/src/components/profile/UserInfoCard.tsx` | 用户信息卡片 |
| `frontend/src/components/profile/ChangePasswordForm.tsx` | 修改密码表单 |
| `frontend/src/components/profile/ModelConfigSection.tsx` | 模型配置区域 |
| `frontend/src/components/profile/ModelConfigCard.tsx` | 单个用途配置卡片 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/database/db.go` | 新增 user_model_configs 建表语句 |
| `backend/main.go` | 注册新路由 |
| `backend/service/llm.go` | 新增 GetProviderForUser 函数 |
| `backend/service/analysis.go` | 改用 GetProviderForUser |
| `frontend/src/types/index.ts` | 新增 ModelConfig 类型 |
| `frontend/src/store/videoApi.ts` | 新增模型配置和修改密码 endpoints |
| `frontend/src/components/Header.tsx` | 新增"我的"入口 |
| `frontend/src/main.tsx` | 新增 /profile 路由 |

---

## Task 1: 数据库 - user_model_configs 表

**Files:**
- Modify: `backend/database/db.go`
- Create: `backend/database/user_model_config.go`

- [ ] **Step 1: 在 db.go 中添加建表语句**

在 `backend/database/db.go` 的 `InitDB()` 函数中，在现有建表语句末尾追加：

```go
// 创建 user_model_configs 表（用户级模型配置）
DB.Exec(`
    CREATE TABLE IF NOT EXISTS user_model_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        config_type TEXT NOT NULL,
        provider TEXT,
        api_key TEXT,
        api_base TEXT,
        model TEXT,
        extra_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, config_type)
    );
`)
```

- [ ] **Step 2: 创建 user_model_config.go**

创建 `backend/database/user_model_config.go`：

```go
package database

import (
	"database/sql"
	"time"
)

// UserModelConfig 用户模型配置
type UserModelConfig struct {
	ID         int        `json:"id"`
	UserID     int        `json:"userId"`
	ConfigType string     `json:"configType"`
	Provider   string     `json:"provider"`
	ApiKey     string     `json:"apiKey"`
	ApiBase    string     `json:"apiBase"`
	Model      string     `json:"model"`
	ExtraJSON  string     `json:"extraJson,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

// GetUserModelConfig 获取用户指定类型的模型配置
func GetUserModelConfig(userID int, configType string) (*UserModelConfig, error) {
	var c UserModelConfig
	err := DB.QueryRow(`
		SELECT id, user_id, config_type, provider, api_key, api_base, model, extra_json, created_at, updated_at
		FROM user_model_configs
		WHERE user_id = ? AND config_type = ?
	`, userID, configType).Scan(
		&c.ID, &c.UserID, &c.ConfigType, &c.Provider, &c.ApiKey,
		&c.ApiBase, &c.Model, &c.ExtraJSON, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// GetAllUserModelConfigs 获取用户所有模型配置
func GetAllUserModelConfigs(userID int) (map[string]*UserModelConfig, error) {
	rows, err := DB.Query(`
		SELECT id, user_id, config_type, provider, api_key, api_base, model, extra_json, created_at, updated_at
		FROM user_model_configs
		WHERE user_id = ?
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	configs := make(map[string]*UserModelConfig)
	for rows.Next() {
		var c UserModelConfig
		err := rows.Scan(
			&c.ID, &c.UserID, &c.ConfigType, &c.Provider, &c.ApiKey,
			&c.ApiBase, &c.Model, &c.ExtraJSON, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		configs[c.ConfigType] = &c
	}
	return configs, nil
}

// UpsertUserModelConfig 创建或更新用户模型配置
func UpsertUserModelConfig(userID int, configType, provider, apiKey, apiBase, model string) error {
	_, err := DB.Exec(`
		INSERT INTO user_model_configs (user_id, config_type, provider, api_key, api_base, model, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, config_type) DO UPDATE SET
			provider = excluded.provider,
			api_key = excluded.api_key,
			api_base = excluded.api_base,
			model = excluded.model,
			updated_at = excluded.updated_at
	`, userID, configType, provider, apiKey, apiBase, model, time.Now())
	return err
}

// DeleteUserModelConfig 删除用户模型配置（恢复默认）
func DeleteUserModelConfig(userID int, configType string) error {
	_, err := DB.Exec(`
		DELETE FROM user_model_configs
		WHERE user_id = ? AND config_type = ?
	`, userID, configType)
	return err
}
```

- [ ] **Step 3: 验证编译通过**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

Expected: 编译成功，无错误

- [ ] **Step 4: Commit**

```bash
git add backend/database/db.go backend/database/user_model_config.go
git commit -m "feat: add user_model_configs table and CRUD"
```

---

## Task 2: 后端服务 - 模型配置优先级

**Files:**
- Create: `backend/service/model_config.go`

- [ ] **Step 1: 创建 model_config.go**

创建 `backend/service/model_config.go`：

```go
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
```

- [ ] **Step 2: 验证编译通过**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add backend/service/model_config.go
git commit -m "feat: add model config priority service"
```

---

## Task 3: 后端 Handler - 用户信息与修改密码

**Files:**
- Create: `backend/handler/user_profile.go`

- [ ] **Step 1: 创建 user_profile.go**

创建 `backend/handler/user_profile.go`：

```go
package handler

import (
	"net/http"

	"ai-short-video-backend/database"
	"ai-short-video-backend/middleware"
	"ai-short-video-backend/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ChangePassword 修改密码
func ChangePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "参数错误：新密码需要6-50个字符",
		})
		return
	}

	if req.OldPassword == req.NewPassword {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "新密码不能与旧密码相同",
		})
		return
	}

	userId := middleware.GetUserID(c)
	user, err := database.GetUserByID(userId)
	if err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Code:    404,
			Message: "用户不存在",
		})
		return
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "旧密码错误",
		})
		return
	}

	// 生成新密码哈希
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "密码加密失败",
		})
		return
	}

	// 更新密码
	_, err = database.DB.Exec("UPDATE users SET password_hash = ? WHERE id = ?", string(hash), userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "更新密码失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "密码修改成功",
	})
}

// GetModelConfigs 获取用户所有模型配置
func GetModelConfigs(c *gin.Context) {
	userId := middleware.GetUserID(c)
	userType := middleware.GetUserType(c)

	// 只有 admin 和 vip 可以访问
	if userType != "admin" && userType != "vip" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "仅 admin 和 vip 用户可配置模型",
		})
		return
	}

	configs, err := database.GetAllUserModelConfigs(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "获取配置失败",
		})
		return
	}

	// 构建响应，API Key 脱敏
	result := make(map[string]interface{})
	types := []string{"llm", "image", "tts", "video"}
	for _, t := range types {
		if c, ok := configs[t]; ok {
			result[t] = gin.H{
				"provider": c.Provider,
				"api_key":  maskApiKey(c.ApiKey),
				"api_base": c.ApiBase,
				"model":    c.Model,
			}
		} else {
			result[t] = nil
		}
	}

	// 全局默认配置
	globalDefaults := service.GetGlobalDefaultConfigs()
	defaults := make(map[string]interface{})
	for k, v := range globalDefaults {
		defaults[k] = gin.H{
			"provider": v.Provider,
			"api_base": v.ApiBase,
			"model":    v.Model,
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "获取成功",
		Data: gin.H{
			"configs":         result,
			"global_defaults": defaults,
		},
	})
}

// UpdateModelConfig 更新指定类型的模型配置
func UpdateModelConfig(c *gin.Context) {
	userId := middleware.GetUserID(c)
	userType := middleware.GetUserType(c)
	configType := c.Param("type")

	if userType != "admin" && userType != "vip" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "仅 admin 和 vip 用户可配置模型",
		})
		return
	}

	// 校验 configType
	validTypes := map[string]bool{"llm": true, "image": true, "tts": true, "video": true}
	if !validTypes[configType] {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "无效的配置类型",
		})
		return
	}

	var req struct {
		Provider string `json:"provider" binding:"required"`
		ApiKey   string `json:"api_key" binding:"required"`
		ApiBase  string `json:"api_base" binding:"required"`
		Model    string `json:"model" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Code:    400,
			Message: "请填写完整的配置信息",
		})
		return
	}

	err := database.UpsertUserModelConfig(userId, configType, req.Provider, req.ApiKey, req.ApiBase, req.Model)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "保存配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "配置保存成功",
	})
}

// DeleteModelConfig 删除指定类型的模型配置（恢复默认）
func DeleteModelConfig(c *gin.Context) {
	userId := middleware.GetUserID(c)
	userType := middleware.GetUserType(c)
	configType := c.Param("type")

	if userType != "admin" && userType != "vip" {
		c.JSON(http.StatusForbidden, APIResponse{
			Code:    403,
			Message: "仅 admin 和 vip 用户可配置模型",
		})
		return
	}

	err := database.DeleteUserModelConfig(userId, configType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Code:    500,
			Message: "删除配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Code:    200,
		Message: "已恢复默认配置",
	})
}

// maskApiKey API Key 脱敏，只显示后4位
func maskApiKey(key string) string {
	if len(key) <= 4 {
		return "***"
	}
	return "***" + key[len(key)-4:]
}
```

- [ ] **Step 2: 验证编译通过**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add backend/handler/user_profile.go
git commit -m "feat: add user profile handlers (password change + model config)"
```

---

## Task 4: 后端 - 注册路由

**Files:**
- Modify: `backend/main.go`

- [ ] **Step 1: 在 main.go 中添加路由**

在 `backend/main.go` 的 `auth` 路由组中，找到现有路由（约第 64 行 `auth.POST("/user/checkin", handler.DoCheckin)` 之后），添加：

```go
		// 用户中心
		auth.PUT("/user/password", handler.ChangePassword)
		auth.GET("/user/model-configs", handler.GetModelConfigs)
		auth.PUT("/user/model-configs/:type", handler.UpdateModelConfig)
		auth.DELETE("/user/model-configs/:type", handler.DeleteModelConfig)
```

- [ ] **Step 2: 验证编译通过**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add backend/main.go
git commit -m "feat: register user profile API routes"
```

---

## Task 5: 后端 - 改造 LLM 服务支持用户配置

**Files:**
- Modify: `backend/service/llm.go`
- Modify: `backend/service/analysis.go`

- [ ] **Step 1: 在 llm.go 中添加 GetProviderForUser 的便捷函数**

在 `backend/service/llm.go` 的 `getCurrentProvider()` 函数之后，添加：

```go
// GetProviderForUser 获取用户级 LLM Provider（已在 model_config.go 中定义）
// 此处仅为向后兼容，保留 getCurrentProvider 用于无 userID 的场景
```

注意：`GetProviderForUser` 已在 `model_config.go` 中定义，无需重复。

- [ ] **Step 2: 修改 analysis.go 中的函数签名**

将 `backend/service/analysis.go` 中所有分析函数添加 `userID int` 参数。需要修改的函数：

```go
// 改前
func AnalyzeVideoStructure(text string, duration float64) (string, error) {
	provider := getCurrentProvider()
	// ...
}

// 改后
func AnalyzeVideoStructure(userID int, text string, duration float64) (string, error) {
	provider := GetProviderForUser(userID)
	// ...
}
```

需要修改的函数列表（共 5 个）：
- `AnalyzeVideoStructure` → 添加 `userID int` 参数，`getCurrentProvider()` 改为 `GetProviderForUser(userID)`
- `AnalyzeViralPoints` → 同上
- `ExtractTags` → 同上
- `AnalyzeRhythm` → 同上
- `GenerateReport` → 同上

- [ ] **Step 3: 修改 llm.go 中的 RewriteText 函数**

```go
// 改前
func RewriteText(originalText, userPrompt string) (string, error) {
	provider := getCurrentProvider()
	// ...
}

// 改后
func RewriteText(userID int, originalText, userPrompt string) (string, error) {
	provider := GetProviderForUser(userID)
	// ...
}
```

- [ ] **Step 4: 更新 handler 层调用**

修改 `backend/handler/video_analysis.go` 中的调用，传入 userID：

```go
// 改前
result, err = service.AnalyzeVideoStructure(originalText, duration)

// 改后
result, err = service.AnalyzeVideoStructure(userId, originalText, duration)
```

同样修改 `AnalyzeViralPoints`、`ExtractTags`、`AnalyzeRhythm`、`GenerateReport` 的调用。

修改 `backend/handler/video_rewrite.go`（或包含 Rewrite 调用的 handler）：

```go
// 改前
result, err := service.RewriteText(originalText, userPrompt)

// 改后
result, err := service.RewriteText(userId, originalText, userPrompt)
```

- [ ] **Step 5: 验证编译通过**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go build ./...
```

Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add backend/service/analysis.go backend/service/llm.go backend/handler/
git commit -m "feat: LLM service uses user-level model config"
```

---

## Task 6: 前端 - 类型定义与 API Endpoints

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/store/videoApi.ts`

- [ ] **Step 1: 在 types/index.ts 中添加类型**

在 `frontend/src/types/index.ts` 末尾追加：

```typescript
// 模型配置类型
export interface ModelConfig {
  provider: string
  api_key: string
  api_base: string
  model: string
}

export interface ModelConfigsData {
  configs: {
    llm: ModelConfig | null
    image: ModelConfig | null
    tts: ModelConfig | null
    video: ModelConfig | null
  }
  global_defaults: {
    llm: Omit<ModelConfig, 'api_key'> | null
    image: Omit<ModelConfig, 'api_key'> | null
    tts: Omit<ModelConfig, 'api_key'> | null
    video: Omit<ModelConfig, 'api_key'> | null
  }
}

export interface ModelConfigsResponse {
  code: number
  message: string
  data: ModelConfigsData
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface UpdateModelConfigRequest {
  provider: string
  api_key: string
  api_base: string
  model: string
}
```

- [ ] **Step 2: 在 videoApi.ts 中添加 endpoints**

在 `frontend/src/store/videoApi.ts` 的 `endpoints` 中，在 `doCheckin` 之后添加：

```typescript
    // User Profile
    changePassword: builder.mutation<{ code: number; message: string }, ChangePasswordRequest>({
      query: (body) => ({
        url: '/user/password',
        method: 'PUT',
        body,
      }),
    }),
    getModelConfigs: builder.query<ModelConfigsResponse, void>({
      query: () => '/user/model-configs',
      providesTags: ['User'],
    }),
    updateModelConfig: builder.mutation<
      { code: number; message: string },
      { type: string } & UpdateModelConfigRequest
    >({
      query: ({ type, ...body }) => ({
        url: `/user/model-configs/${type}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    deleteModelConfig: builder.mutation<{ code: number; message: string }, string>({
      query: (type) => ({
        url: `/user/model-configs/${type}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
```

确保在文件顶部的 import 中添加新类型：

```typescript
import type {
  // ... existing imports ...
  ModelConfigsResponse,
  ChangePasswordRequest,
  UpdateModelConfigRequest,
} from '../types'
```

- [ ] **Step 3: 验证前端编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/store/videoApi.ts
git commit -m "feat: add model config types and API endpoints"
```

---

## Task 7: 前端 - ProfilePage 与子组件

**Files:**
- Create: `frontend/src/components/profile/UserInfoCard.tsx`
- Create: `frontend/src/components/profile/ChangePasswordForm.tsx`
- Create: `frontend/src/components/profile/ModelConfigCard.tsx`
- Create: `frontend/src/components/profile/ModelConfigSection.tsx`
- Create: `frontend/src/pages/ProfilePage.tsx`

- [ ] **Step 1: 创建 UserInfoCard.tsx**

创建 `frontend/src/components/profile/UserInfoCard.tsx`：

```tsx
import { User } from '../../types'

interface UserInfoCardProps {
  user: User
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const typeLabels: Record<string, string> = {
    normal: '普通用户',
    vip: 'VIP 用户',
    admin: '管理员',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">用户名</span>
          <span className="text-sm font-medium text-slate-900">{user.username}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">类型</span>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            user.user_type === 'admin' ? 'bg-red-50 text-red-700' :
            user.user_type === 'vip' ? 'bg-amber-50 text-amber-700' :
            'bg-slate-50 text-slate-700'
          }`}>
            {typeLabels[user.user_type] || user.user_type}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">积分</span>
          <span className="text-sm font-medium text-sky-700">{user.credits}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 ChangePasswordForm.tsx**

创建 `frontend/src/components/profile/ChangePasswordForm.tsx`：

```tsx
import { useState } from 'react'
import { videoApi } from '../../store/videoApi'

interface ChangePasswordFormProps {
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

export default function ChangePasswordForm({ onSuccess, onError }: ChangePasswordFormProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [changePassword, { isLoading }] = videoApi.useChangePasswordMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      onError('新密码需要至少6个字符')
      return
    }
    if (newPassword !== confirmPassword) {
      onError('两次输入的密码不一致')
      return
    }
    if (oldPassword === newPassword) {
      onError('新密码不能与旧密码相同')
      return
    }

    try {
      const result = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      }).unwrap()
      onSuccess(result.message || '密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      onError(err.data?.message || '密码修改失败')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">修改密码</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">旧密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存修改'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: 创建 ModelConfigCard.tsx**

创建 `frontend/src/components/profile/ModelConfigCard.tsx`：

```tsx
import { useState, useEffect } from 'react'
import { ModelConfig } from '../../types'

interface ModelConfigCardProps {
  title: string
  icon: string
  configType: string
  config: ModelConfig | null
  globalDefault: { provider: string; api_base: string; model: string } | null
  providers: { value: string; label: string }[]
  isLoading: boolean
  onSave: (type: string, config: ModelConfig) => void
  onDelete: (type: string) => void
}

export default function ModelConfigCard({
  title,
  icon,
  configType,
  config,
  globalDefault,
  providers,
  isLoading,
  onSave,
  onDelete,
}: ModelConfigCardProps) {
  const [provider, setProvider] = useState(config?.provider || '')
  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState(config?.api_base || '')
  const [model, setModel] = useState(config?.model || '')

  useEffect(() => {
    if (config) {
      setProvider(config.provider)
      setApiBase(config.api_base)
      setModel(config.model)
      setApiKey('') // 不回填密钥
    } else {
      setProvider('')
      setApiKey('')
      setApiBase('')
      setModel('')
    }
  }, [config])

  const handleSave = () => {
    if (!provider || !apiKey || !apiBase || !model) return
    onSave(configType, { provider, api_key: apiKey, api_base: apiBase, model })
  }

  const hasConfig = config !== null

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">
          {icon} {title}
        </h3>
        {hasConfig && (
          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">自定义</span>
        )}
      </div>

      {globalDefault && !hasConfig && (
        <p className="text-xs text-slate-400 mb-3">
          当前使用全局默认：{globalDefault.provider} / {globalDefault.model}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">选择 Provider</option>
            {providers.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasConfig ? '已设置，留空保持不变' : '输入 API Key'}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {hasConfig && config?.api_key && (
            <p className="text-xs text-slate-400 mt-1">当前：{config.api_key}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">API Base</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="模型名称"
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={isLoading || !provider || !apiBase || !model}
          className="px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        {hasConfig && (
          <button
            onClick={() => onDelete(configType)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            恢复默认
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建 ModelConfigSection.tsx**

创建 `frontend/src/components/profile/ModelConfigSection.tsx`：

```tsx
import { videoApi } from '../../store/videoApi'
import { ModelConfig } from '../../types'
import ModelConfigCard from './ModelConfigCard'

interface ModelConfigSectionProps {
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

const LLM_PROVIDERS = [
  { value: 'minimax', label: 'MiniMax' },
  { value: 'volcano', label: '火山方舟' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: '自定义' },
]

const IMAGE_PROVIDERS = [
  { value: 'flux', label: 'Flux' },
  { value: 'dalle', label: 'DALL-E' },
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'custom', label: '自定义' },
]

const TTS_PROVIDERS = [
  { value: 'volcano', label: '火山引擎 TTS' },
  { value: 'edge', label: 'Edge TTS' },
  { value: 'minimax', label: 'MiniMax TTS' },
  { value: 'custom', label: '自定义' },
]

const VIDEO_PROVIDERS = [
  { value: 'kling', label: '可灵' },
  { value: 'runway', label: 'Runway' },
  { value: 'pika', label: 'Pika' },
  { value: 'custom', label: '自定义' },
]

export default function ModelConfigSection({ onSuccess, onError }: ModelConfigSectionProps) {
  const { data: configsData, isLoading } = videoApi.useGetModelConfigsQuery()
  const [updateConfig, { isLoading: isUpdating }] = videoApi.useUpdateModelConfigMutation()
  const [deleteConfig] = videoApi.useDeleteModelConfigMutation()

  const configs = configsData?.data?.configs
  const defaults = configsData?.data?.global_defaults

  const handleSave = async (type: string, config: ModelConfig) => {
    try {
      await updateConfig({ type, ...config }).unwrap()
      onSuccess('配置保存成功')
    } catch (err: any) {
      onError(err.data?.message || '保存失败')
    }
  }

  const handleDelete = async (type: string) => {
    try {
      await deleteConfig(type).unwrap()
      onSuccess('已恢复默认配置')
    } catch (err: any) {
      onError(err.data?.message || '操作失败')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">模型配置</h2>
        <p className="text-sm text-slate-400">加载中...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">模型配置</h2>
      <p className="text-xs text-slate-400 mb-4">
        自定义你的 AI 模型配置。未配置的用途将使用全局默认设置。
      </p>
      <div className="space-y-4">
        <ModelConfigCard
          title="LLM 文案生成"
          icon="📝"
          configType="llm"
          config={configs?.llm ?? null}
          globalDefault={defaults?.llm ?? null}
          providers={LLM_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ModelConfigCard
          title="AI 图片生成"
          icon="🖼️"
          configType="image"
          config={configs?.image ?? null}
          globalDefault={defaults?.image ?? null}
          providers={IMAGE_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ModelConfigCard
          title="TTS 语音合成"
          icon="🎙️"
          configType="tts"
          config={configs?.tts ?? null}
          globalDefault={defaults?.tts ?? null}
          providers={TTS_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <ModelConfigCard
          title="AI 视频生成"
          icon="🎬"
          configType="video"
          config={configs?.video ?? null}
          globalDefault={defaults?.video ?? null}
          providers={VIDEO_PROVIDERS}
          isLoading={isUpdating}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 创建 ProfilePage.tsx**

创建 `frontend/src/pages/ProfilePage.tsx`：

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import UserInfoCard from '../components/profile/UserInfoCard'
import ChangePasswordForm from '../components/profile/ChangePasswordForm'
import ModelConfigSection from '../components/profile/ModelConfigSection'

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  if (!isAuthenticated || !user) {
    navigate('/login')
    return null
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const showSuccess = (msg: string) => showToast(msg)
  const showError = (msg: string) => showToast(msg)

  const canConfigureModel = user.user_type === 'admin' || user.user_type === 'vip'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center h-16 px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回首页
          </button>
          <h1 className="text-lg font-semibold text-slate-900 ml-4">我的</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <UserInfoCard user={user} />
        <ChangePasswordForm onSuccess={showSuccess} onError={showError} />
        {canConfigureModel && (
          <ModelConfigSection onSuccess={showSuccess} onError={showError} />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: 验证前端编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/profile/ frontend/src/pages/ProfilePage.tsx
git commit -m "feat: add ProfilePage with password change and model config"
```

---

## Task 8: 前端 - Header 与路由

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: 修改 Header.tsx 添加"我的"入口**

在 `frontend/src/components/Header.tsx` 中，找到用户信息显示区域（约第 122 行 `<span className="text-sm text-slate-500 px-2">{user.username}</span>`），将其改为可点击的"我的"按钮：

```tsx
              {/* Profile */}
              <button
                onClick={() => navigate('/profile')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === '/profile'
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {user.username}
              </button>
```

- [ ] **Step 2: 在 main.tsx 中添加 /profile 路由**

在 `frontend/src/main.tsx` 中，添加 ProfilePage import 和路由：

import 添加：
```typescript
import ProfilePage from './pages/ProfilePage'
```

路由添加（在 `/square` 路由之后，`/login` 路由之前）：
```typescript
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
```

- [ ] **Step 3: 验证前端编译**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Header.tsx frontend/src/main.tsx
git commit -m "feat: add profile route and header navigation"
```

---

## Task 9: 端到端验证

- [ ] **Step 1: 启动后端**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/backend && go run .
```

Expected: 服务正常启动在 :3000

- [ ] **Step 2: 测试修改密码 API**

```bash
# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"luka","password":"your_password"}' | jq -r '.data.token')

# 测试修改密码
curl -X PUT http://localhost:3000/api/user/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"old_password":"old_pass","new_password":"new_pass_123"}'
```

Expected: `{"code":200,"message":"密码修改成功"}`

- [ ] **Step 3: 测试模型配置 API**

```bash
# 获取配置
curl -s http://localhost:3000/api/user/model-configs \
  -H "Authorization: Bearer $TOKEN" | jq .

# 更新 LLM 配置
curl -X PUT http://localhost:3000/api/user/model-configs/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"provider":"volcano","api_key":"test_key","api_base":"https://ark.cn-beijing.volces.com","model":"doubao-1.5-pro"}'

# 删除配置（恢复默认）
curl -X DELETE http://localhost:3000/api/user/model-configs/llm \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 4: 启动前端并验证页面**

```bash
cd /Users/chenliangjun/code/project/ai-short-video-script/frontend && pnpm dev
```

访问 http://localhost:5173/profile，验证：
- 用户信息卡片正确显示
- 修改密码表单可提交
- admin/vip 用户可以看到模型配置区域
- normal 用户看不到模型配置区域

- [ ] **Step 5: Final Commit**

```bash
git add -A
git commit -m "feat: complete user profile and model config feature"
```
