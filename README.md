# AI短视频脚本平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Platform](https://img.shields.io/badge/Platform-macOS%2FLinux-green.svg)]()

> 一款轻量化的 AI 短视频脚本辅助平台，帮助用户快速上传短视频、自动提取语音文案，并支持可视化工作流编排（分镜脚本 → AI 文案 → AI 图片 → AI 视频 → TTS）、AI 深度分析、抖音链接提取，以及多 LLM/AI provider 切换。

## ✨ 功能特性

### 视频管理
- [x] 短视频上传（MP4/FLV/MOV，最大 4GB，15秒-10分钟）
- [x] 视频列表展示（竖屏缩略图、分页、批量选择）
- [x] 视频详情页（竖屏播放器 + 左右布局）
- [x] 自动截取视频缩略图
- [x] 一键删除视频

### 抖音链接提取（V1.3）
- [x] 抖音分享链接一键提取（粘贴链接即可下载视频）
- [x] Playwright 无头浏览器绕过反爬机制
- [x] 自动提取视频标题和上传者
- [x] 支持完整视频（非预览版本）自动识别

### AI 能力
- [x] 异步 AI 文案提取（Fun-ASR 离线识别）
- [x] 一键复制文案
- [x] AI 文案改写（MiniMax / 火山方舟 / Agnes 2.0 Flash，可切换）
- [x] 重新提取文案
- [x] **AI 深度分析**（V1.5）：文案结构、爆款点、选题标签、口播节奏、完整分析报告

### 可视化工作流（V2.0 / V2.5）
- [x] React Flow 画布编辑器：拖拽连线、右键建节点、自动布局
- [x] 节点类型：分镜(scene)、AI 文案、AI 图片、AI 视频、AI 分镜、TTS 配音
- [x] **异步执行 + 实时进度**（V2.5）：点执行秒回 runId，1.5s 轮询画布节点状态变色 + 顶部进度条，防重入（409）
- [x] 节点级"强制重新执行"勾选（存 config_json，OR 全局 force）
- [x] 执行历史记录 + 孤儿 run 兜底清理（30 分钟）
- [x] AI 智能分镜（一键文案→分镜节点）
- [x] 模板保存/应用、Markdown 导出

### 素材库与广场（V1.6）
- [x] 收藏夹管理（创建/删除/批量导入导出 Markdown）
- [x] 标签系统（按标签筛选视频）
- [x] 全文搜索（关键词 / 标签 / 收藏夹）
- [x] 短视频广场（公开视频流，热门/最新排序，一键收藏）

### 积分系统
- [x] 每日签到（+30积分）
- [x] 积分不足友好提示
- [x] 提取文案（5积分）/ 改写文案（10积分）/ 各类深度分析（2-6积分）

### 用户与配置
- [x] JWT 注册登录、用户类型（normal/vip/admin）
- [x] **注册功能开关**（`SIGN_UP` env）：可一键关闭注册入口（前后端联动，关闭时 /register 重定向 + API 返回 403）
- [x] **用户级模型配置**（admin/vip）：每个用户可自定义 LLM / 图片 / 视频 / TTS 的 provider + key + base + model
- [x] 修改密码

### 设计与体验
- [x] **暗色科技感设计系统**（基于 `DESIGN_SPEC.md`）：`#08090d` 暗背景 + `#06d6a0` 青绿主色 + `#4cc9f0` 电蓝辅助 + neon-border / glassmorphism / grid-bg 等特效
- [x] 前后端分离，JSON API 通信
- [x] 竖屏 9:16 视频适配
- [x] 响应式设计
- [x] 异步任务处理（Go Goroutine）
- [x] `prefers-reduced-motion` 无障碍支持

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.21+ · Gin 框架 · SQLite |
| 前端 | React 19 · Vite · TypeScript · Tailwind CSS · RTK Query · React Flow 11 |
| 画布工作流 | React Flow（节点拖拽 / 连线 / 自动布局） |
| 音视频 | FFmpeg（缩略图 + 音频提取） |
| 语音识别 | Fun-ASR（阿里开源，离线部署） |
| LLM 文案 | MiniMax M2 / 火山方舟 Doubao / **Agnes 2.0 Flash** |
| AI 图片/视频 | Agnes（image-2.1-flash / video-v2.0） |
| 链接提取 | Playwright（抖音反爬绕过） |
| 字体 | Inter + JetBrains Mono（Google Fonts） |

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 | 用途 |
|------|------|------|
| Go | 1.21+ | 后端服务 |
| Node.js | 18+ | 前端开发 |
| pnpm | 最新 | 前端包管理 |
| Python | 3.13+ | ASR 语音识别服务 |
| FFmpeg | 最新 | 音视频处理 |
| Playwright | 最新 | 抖音链接提取 |

> **首次使用需安装 Playwright 浏览器**：`pip install playwright && playwright install chromium`

### 方式一：一键启动（推荐）

项目提供了 `Makefile`，可以一条命令启动所有服务：

```bash
# 1. 克隆项目
git clone git@github.com:LiangJunChan/ai-short-video-script.git
cd ai-short-video-script

# 2. 首次运行：初始化 ASR 虚拟环境
cd asr
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# 3. 首次运行：初始化前端依赖
cd frontend && pnpm install && cd ..

# 4. 首次运行：配置后端环境变量
cd backend
cp .env.example .env
# 编辑 .env 填入你的 API Key（MiniMax 或火山方舟）
cd ..

# 5. 一键启动所有服务 🎉
make dev
```

启动后将同时运行三个服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:5173 | React 开发服务器，自动代理 API |
| 后端 | http://localhost:3000 | Go API 服务 |
| ASR | http://localhost:8000 | Fun-ASR 语音识别服务 |

> **注意**：ASR 服务首次启动时会自动从 [ModelScope](https://www.modelscope.cn) 下载模型（约 1.9GB），请耐心等待。后续启动将直接使用缓存模型，无需重复下载。

### 方式二：Docker Compose 一键部署

适合生产环境或不想本地安装依赖的场景：

```bash
# 构建并启动所有服务
docker compose up --build

# 后台运行
docker compose up --build -d

# 停止所有服务
docker compose down
```

或使用 Make 命令：

```bash
make up     # 构建并启动
make stop   # 停止所有服务
```

### 方式三：逐个启动

如需单独启动某个服务，可使用以下命令：

```bash
# 启动 ASR 语音识别服务
make dev-asr

# 启动后端 API 服务
make dev-backend

# 启动前端开发服务器
make dev-frontend
```

### ASR 服务说明

ASR 服务位于 `asr/` 目录，基于阿里巴巴 Fun-ASR 框架，提供以下能力：

- **语音识别（ASR）**：基于 Paraformer-large 模型，中文识别精度高
- **标点恢复**：自动添加句号、逗号、问号等标点
- **多格式支持**：支持 wav / mp3 / m4a
- **本地部署**：模型在本地，无需联网调用 API

启动后可通过浏览器访问交互式 API 文档：

| 文档类型 | 地址 |
|---------|------|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

**健康检查**：

```bash
curl http://localhost:8000/health
# {"status":"ok","model":"paraformer","punctuation":true}
```

> 后端默认调用地址为 `http://localhost:8000/asr`，如需修改请编辑 `backend/service/processor.go` 中的 `RecognizeSpeech` 函数。

## 📁 项目结构

```
ai-short-video-script/
├── backend/                    # Go 后端服务
│   ├── main.go                 # 入口 · 路由 · 中间件
│   ├── .env.example            # 环境变量模板
│   ├── extract_douyin.py       # 抖音链接提取脚本（Playwright）
│   ├── database/               # SQLite CRUD · 迁移
│   ├── handler/                # API 处理器（video/storyboard/auth/user_profile...）
│   └── service/
│       ├── processor.go        # FFmpeg · Fun-ASR 调用
│       ├── douyin.go           # 抖音提取服务
│       ├── llm.go              # LLMProvider 接口 · MiniMax / 火山方舟
│       ├── llm_agnes.go        # Agnes 2.0 Flash LLM provider
│       ├── agnes.go            # Agnes 图片/视频生成
│       ├── model_config.go     # 用户级模型配置 + provider 路由
│       ├── workflow_engine.go  # 工作流执行引擎（异步 goroutine）
│       ├── storyboard_split.go # AI 智能分镜
│       └── analysis.go         # AI 深度分析（结构/爆款/标签/节奏/报告）
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── store/videoApi.ts   # RTK Query API
│   │   ├── config/features.ts  # 前端功能开关（VITE_SIGN_UP 等）
│   │   ├── components/
│   │   │   ├── storyboard/     # 画布组件（Canvas/Toolbar/NodeConfigPanel/节点...）
│   │   │   └── profile/        # 模型配置卡片
│   │   └── pages/              # 全部页面（含画布编辑器）
│   ├── tailwind.config.js      # 暗色 av- 设计系统
│   └── src/index.css           # 暗色设计 token + 组件类
├── asr/                        # ASR 语音识别服务（Python + FastAPI）
├── DESIGN_SPEC.md              # 暗色设计规范文档
├── docker-compose.yml          # 三服务统一编排
├── Makefile                    # 开发快捷命令
├── uploads/                    # 原始视频
├── thumbnails/                 # 缩略图
└── audio/                      # 临时音频
```

## ⚙️ LLM 配置

编辑 `backend/.env`。Provider 采用 **case 精准匹配**，未识别的 `LLM_PROVIDER` 不再静默兜底到 minimax，而是直接返回错误（避免"配置错了却在跑别的模型"）：

```bash
# 选择 Provider：minimax / volcengine / agnes（必填，未识别会报错）
LLM_PROVIDER=minimax

# MiniMax
MINIMAX_API_KEY=your_key_here
MINIMAX_API_BASE=https://api.minimaxi.com
MINIMAX_MODEL=MiniMax-M2

# 火山方舟
VOLCANO_API_KEY=your_key_here
VOLCANO_API_BASE=https://ark.cn-beijing.volces.com
VOLCANO_MODEL=doubao-1.5-pro

# Agnes 2.0 Flash（LLM 文本，复用图片/视频的同一 key 和 base）
AGNES_API_KEY=your_agnes_key_here
AGNES_API_BASE=https://apihub.agnes-ai.com/v1
AGNES_LLM_MODEL=agnes-2.0-flash
AGNES_IMAGE_MODEL=agnes-image-2.1-flash
AGNES_VIDEO_MODEL=agnes-video-v2.0

# 功能开关
SIGN_UP=true   # false 时关闭注册（前端隐藏入口 + 后端 /auth/register 返回 403）
```

### Provider 优先级
用户级配置（ProfilePage → 模型配置，admin/vip 可用）> `.env` 全局 `LLM_PROVIDER` > 硬编码错误。即：用户在页面选过的 provider 会覆盖 `.env`，删除用户配置后才回退到 `.env`。

## 🌐 API 接口

### 视频与文案
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/videos` | GET | 视频列表（分页） |
| `/api/videos/:id` | GET | 视频详情 |
| `/api/upload` | POST | 上传视频 |
| `/api/video/extract-by-url` | POST | 抖音链接提取 |
| `/api/videos/:id/reextract` | POST | 重新提取文案 |
| `/api/videos/:id/rewrite` | POST | AI 改写文案 |
| `/api/videos/:id/analyze` | POST | AI 深度分析（structure/viral_points/tags/rhythm/report） |
| `/api/videos/:id` | DELETE | 删除视频 |

### 工作流画布
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/storyboards` | GET/POST | 画布列表 / 创建画布 |
| `/api/storyboards/:id` | GET/PUT/DELETE | 画布详情 / 更新 / 删除 |
| `/api/storyboards/:id/batch` | PUT | 批量保存节点+边 |
| `/api/storyboards/:id/auto-split` | POST | AI 智能分镜 |
| `/api/storyboards/:id/execute` | POST | 异步执行工作流（秒回 runId） |
| `/api/storyboards/:id/runs/:runId` | GET | 轮询执行进度 |
| `/api/storyboards/:id/nodes/:nodeId/execute` | POST | 单节点执行 |

### 收藏夹 / 标签 / 广场 / 搜索
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/collections` | GET/POST | 收藏夹列表 / 创建 |
| `/api/collections/:id/videos` | POST | 视频加入收藏夹 |
| `/api/tags` | GET | 标签列表 |
| `/api/tags/:id/videos` | GET | 按标签筛选视频 |
| `/api/square/videos` | GET | 广场公开视频 |
| `/api/square/collect/:id` | POST | 收藏广场视频 |
| `/api/videos/search` | GET | 全文搜索 |
| `/api/export/markdown` | POST | 导出文案为 Markdown |

### 用户
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册（`SIGN_UP=false` 时返回 403） |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/me` | GET | 当前用户信息 |
| `/api/user/checkin` | GET/POST | 每日签到 |
| `/api/user/credits` | GET | 查询积分 |
| `/api/user/model-configs` | GET/PUT/DELETE | 用户级模型配置 |

## 📦 数据存储

| 类型 | 路径 |
|------|------|
| SQLite 数据库 | `backend/short_video.db` |
| 上传视频 | `uploads/` |
| 缩略图 | `thumbnails/` |
| 临时音频 | `audio/` |
| 广场缩略图 | `thumbnails/square/` |

## 📝 视频要求

- 格式：MP4、FLV、MOV
- 大小：最大 4GB
- 时长：15秒 - 10分钟
- 音频：需包含中文语音

## 🔧 生产部署

```bash
# 构建前端
cd frontend && pnpm build

# 配置 Nginx
sudo cp nginx.conf /etc/nginx/sites-available/ai-video
sudo ln -s /etc/nginx/sites-available/ai-video /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

## 📅 版本历史

- [x] V1.0 - 核心功能：视频上传、AI文案提取、文案改写
- [x] V1.1 - 用户注册登录、积分系统
- [x] V1.2 - 视频搜索分类、文案编辑
- [x] V1.3 - 抖音链接一键提取
- [x] V1.4 - 改写优化、UI 改版
- [x] V1.5 - AI 深度分析（结构/爆款/标签/节奏/报告）
- [x] V1.6 - 收藏夹、标签、搜索、广场公开视频流
- [x] V1.7 - 积分体系完善、用户类型（normal/vip/admin）
- [x] V2.0 - 可视化工作流画布（React Flow + AI 节点类型）
- [x] V2.5 - 异步工作流执行 + 顶部进度条 + 节点实时变色
- [x] V2.6 - 节点级强制重新执行、AI 视频竖屏分辨率
- [x] **前端功能开关（SIGN_UP env）**：可一键关闭注册入口（前后端联动）
- [x] **用户级模型配置**（admin/vip）：每个用户可自定义 LLM/图片/视频/TTS 的 provider+key+base+model
- [x] **暗色科技感设计系统**（基于 `DESIGN_SPEC.md`，`<html class="dark">`，av-bg/av-text/av-primary/av-glow 等）
- [x] **LLM 新增 Agnes 2.0 Flash provider**：OpenAI 兼容 `/v1/chat/completions`
- [x] **LLM provider 配置错误化**：所有 provider case 精准匹配，`default` 不再静默兜底到 minimax，未配置时明确报错

## 📄 许可证

MIT License
