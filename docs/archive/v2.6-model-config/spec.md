# 用户增强模块 - 设计文档

> 新增"我的"页面，支持修改密码和 admin/vip 用户自定义模型配置

## 一、需求概述

### 1.1 功能需求

| 功能 | 说明 | 权限 |
|------|------|------|
| "我的"页面 | 登录后可访问，展示用户信息 | 所有用户 |
| 修改密码 | 旧密码 + 新密码 + 确认密码 | 所有用户 |
| 模型配置 | 按用途分别配置 AI 模型参数 | admin / vip |

### 1.2 模型配置优先级

```
用户个人配置（user_model_configs 表）
       ↓ 优先使用
全局默认配置（.env 文件）
```

### 1.3 模型用途分类

| 用途 | config_type | 说明 | 对应节点 |
|------|-------------|------|---------|
| LLM 文案类 | `llm` | 文案生成、改写、分析、分镜拆分 | ai_text, ai_split |
| AI 图片生成 | `image` | 关键帧图片生成 | ai_image |
| TTS 语音合成 | `tts` | 配音生成 | tts |
| AI 视频生成 | `video` | 视频片段生成 | ai_video |

---

## 二、数据库设计

### 2.1 新增表：user_model_configs

```sql
CREATE TABLE user_model_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    config_type TEXT NOT NULL,        -- llm / image / tts / video
    provider TEXT,                    -- 提供商（minimax / volcano / flux / kling / ...）
    api_key TEXT,                     -- API 密钥
    api_base TEXT,                    -- API 地址
    model TEXT,                       -- 模型名称
    extra_json TEXT,                  -- 扩展配置（JSON，预留）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, config_type)
);
```

### 2.2 用户表无变更

现有 users 表结构足够，无需新增字段。

---

## 三、API 接口设计

### 3.1 用户信息

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/user/me` | GET | 获取当前用户信息 | 已登录 |

### 3.2 修改密码

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/user/password` | PUT | 修改密码 | 已登录 |

**请求体**：
```json
{
  "old_password": "原密码",
  "new_password": "新密码"
}
```

**校验规则**：
- 旧密码必须正确
- 新密码长度 >= 6 位
- 新密码不能与旧密码相同

### 3.3 模型配置

| 接口 | 方法 | 说明 | 权限 |
|------|------|------|------|
| `/api/user/model-configs` | GET | 获取用户所有模型配置 | admin / vip |
| `/api/user/model-configs/:type` | PUT | 更新指定用途的模型配置 | admin / vip |
| `/api/user/model-configs/:type` | DELETE | 删除指定用途的配置（恢复默认） | admin / vip |

**GET 响应**：
```json
{
  "code": 200,
  "data": {
    "configs": {
      "llm": {
        "provider": "minimax",
        "api_key": "***abc",
        "api_base": "https://api.minimaxi.com",
        "model": "MiniMax-M2"
      },
      "image": null,
      "tts": null,
      "video": null
    },
    "global_defaults": {
      "llm": {
        "provider": "minimax",
        "api_base": "https://api.minimaxi.com",
        "model": "MiniMax-M2"
      }
    }
  }
}
```

**PUT 请求体**：
```json
{
  "provider": "volcano",
  "api_key": "your_api_key",
  "api_base": "https://ark.cn-beijing.volces.com",
  "model": "doubao-1.5-pro"
}
```

---

## 四、前端设计

### 4.1 路由

```
/profile    -- "我的"页面（新增）
```

### 4.2 页面结构

```
pages/
  ProfilePage.tsx           -- "我的"页面

components/profile/
  UserInfoCard.tsx          -- 用户基本信息卡片
  ChangePasswordForm.tsx    -- 修改密码表单
  ModelConfigSection.tsx    -- 模型配置区域（admin/vip可见）
  ModelConfigCard.tsx       -- 单个用途的配置卡片
```

### 4.3 "我的"页面布局

```
┌─────────────────────────────────────────────┐
│  Header（现有，新增"我的"入口）              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ 基本信息 ─────────────────────────────┐ │
│  │  用户名：luka（不可修改）               │ │
│  │  类型：admin                            │ │
│  │  积分：1200                             │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ 修改密码 ─────────────────────────────┐ │
│  │  旧密码：[________________]            │ │
│  │  新密码：[________________]            │ │
│  │  确认密码：[________________]          │ │
│  │  [保存修改]                             │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ 模型配置（仅 admin/vip 可见）─────────┐ │
│  │                                        │ │
│  │  📝 LLM 文案生成                       │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │ Provider: [minimax         ▾]   │  │ │
│  │  │ API Key:  [********************]│  │ │
│  │  │ API Base: [https://api.mini...] │  │ │
│  │  │ Model:    [MiniMax-M2     ▾]   │  │ │
│  │  │ [保存]  [恢复默认]              │  │ │
│  │  └──────────────────────────────────┘  │ │
│  │                                        │ │
│  │  🖼️ AI 图片生成                        │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │ Provider: [flux            ▾]   │  │ │
│  │  │ ...                              │  │ │
│  │  └──────────────────────────────────┘  │ │
│  │                                        │ │
│  │  🎙️ TTS 语音合成                       │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │ ...                              │  │ │
│  │  └──────────────────────────────────┘  │ │
│  │                                        │ │
│  │  🎬 AI 视频生成                        │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │ ...                              │  │ │
│  │  └──────────────────────────────────┘  │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.4 Header 改动

在现有 Header 的用户区域，新增"我的"入口：

```
当前：  用户名 | 链接提取 | 上传视频 | 退出
改为：  用户名 | 我的 | 链接提取 | 上传视频 | 退出
```

点击"我的"跳转到 `/profile`。

---

## 五、后端实现

### 5.1 新增文件

```
backend/
  handler/
    user_profile.go       -- 用户信息、修改密码、模型配置的 handler
  database/
    user_model_config.go  -- user_model_configs 表的 CRUD
  service/
    model_config.go       -- 获取模型配置的服务（含优先级逻辑）
```

### 5.2 模型配置优先级逻辑

```go
// service/model_config.go

// GetUserModelConfig 获取用户的模型配置（优先用户配置，回退全局默认）
func GetUserModelConfig(userID int, configType string) ModelConfig {
    // 1. 查询用户个人配置
    userConfig, err := database.GetUserModelConfig(userID, configType)
    if err == nil && userConfig.Provider != "" {
        return userConfig
    }

    // 2. 回退到全局 .env 配置
    return getGlobalConfig(configType)
}

// getGlobalConfig 从 .env 读取全局默认配置
func getGlobalConfig(configType string) ModelConfig {
    switch configType {
    case "llm":
        return ModelConfig{
            Provider: os.Getenv("LLM_PROVIDER"),
            ApiKey:   getLLMApiKey(),
            ApiBase:  getLLMApiBase(),
            Model:    getLLMModel(),
        }
    case "image":
        // 未来扩展
    case "tts":
        // 未来扩展
    case "video":
        // 未来扩展
    }
}
```

### 5.3 改造现有 LLM 服务

当前 `service/llm.go` 直接读 .env。改造后需要传入 userID：

```go
// 改造前
func CallLLM(messages []Message) (string, error) {
    provider := os.Getenv("LLM_PROVIDER")
    // ...
}

// 改造后
func CallLLM(userID int, messages []Message) (string, error) {
    config := GetUserModelConfig(userID, "llm")
    provider := config.Provider
    // ...
}
```

所有调用 CallLLM 的地方都需要传入 userID（handler 层已有）。

---

## 六、Provider 预设列表

### 6.1 LLM Provider

| Provider | 名称 | api_base 默认值 |
|----------|------|----------------|
| minimax | MiniMax | https://api.minimaxi.com |
| volcano | 火山方舟 | https://ark.cn-beijing.volces.com |
| openai | OpenAI | https://api.openai.com |
| deepseek | DeepSeek | https://api.deepseek.com |
| custom | 自定义 | 用户填写 |

### 6.2 图片生成 Provider

| Provider | 名称 | 说明 |
|----------|------|------|
| flux | Flux | 开源，高质量 |
| dalle | DALL-E | OpenAI |
| midjourney | Midjourney | 艺术风格 |
| custom | 自定义 | 用户填写 |

### 6.3 TTS Provider

| Provider | 名称 | 说明 |
|----------|------|------|
| volcano | 火山引擎 TTS | 中文效果好 |
| edge | Edge TTS | 免费 |
| minimax | MiniMax TTS | 情感表达好 |
| custom | 自定义 | 用户填写 |

### 6.4 视频生成 Provider

| Provider | 名称 | 说明 |
|----------|------|------|
| kling | 可灵 | 快手，中文场景好 |
| runway | Runway | 专业级 |
| pika | Pika | 快速便宜 |
| custom | 自定义 | 用户填写 |

---

## 七、安全考虑

| 措施 | 说明 |
|------|------|
| API Key 脱敏 | GET 接口返回时只显示后 4 位：`***abc` |
| 权限校验 | 模型配置接口严格校验 user_type 为 admin 或 vip |
| 密码哈希 | 修改密码使用 bcrypt 哈希存储 |
| 旧密码验证 | 修改密码必须验证旧密码正确 |

---

## 八、实施范围

### 本次实现

- [x] 数据库：user_model_configs 表
- [x] 后端：修改密码 API
- [x] 后端：模型配置 CRUD API
- [x] 后端：模型配置优先级服务
- [x] 后端：改造 LLM 服务使用用户配置
- [x] 前端："我的"页面（ProfilePage）
- [x] 前端：修改密码表单
- [x] 前端：模型配置卡片（admin/vip 可见）
- [x] 前端：Header 新增"我的"入口

### 未来扩展

- [ ] 图片/TTS/视频生成服务接入用户配置
- [ ] 模型配置测试功能（调用 API 验证配置是否正确）
- [ ] 用户头像上传
- [ ] 绑定邮箱/手机
