# AI短视频脚本平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Platform](https://img.shields.io/badge/Platform-macOS%2FLinux-green.svg)]()

> 一款轻量化的 AI 短视频脚本辅助平台，帮助用户快速上传短视频、自动提取语音文案，并支持 AI 文案改写。

## ✨ 功能特性

### 视频管理
- [x] 短视频上传（MP4/FLV/MOV，最大 4GB，15秒-10分钟）
- [x] 视频列表展示（3列网格、竖屏缩略图、分页）
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
- [x] AI 文案改写（MiniMax / 火山引擎，可切换）
- [x] 重新提取文案

### 积分系统
- [x] 每日签到（+50积分）
- [x] 积分不足友好提示
- [x] 提取文案（5积分）/ 改写文案（10积分）

### 技术特点
- [x] 前后端分离，JSON API 通信
- [x] 竖屏 9:16 视频适配
- [x] 响应式设计
- [x] 异步任务处理（Go Goroutine）

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.21+ · Gin 框架 · SQLite |
| 前端 | React 19 · Vite · TypeScript · Tailwind CSS · RTK Query |
| 音视频 | FFmpeg（缩略图 + 音频提取） |
| 语音识别 | Fun-ASR（阿里开源，离线部署） |
| 文案改写 | MiniMax M2 / 火山方舟 Doubao |
| 链接提取 | Playwright（抖音反爬绕过） |

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
│   ├── database/
│   │   └── db.go               # SQLite CRUD
│   ├── handler/
│   │   └── video.go            # API 处理器
│   └── service/
│       ├── processor.go        # FFmpeg · Fun-ASR 调用
│       ├── douyin.go           # 抖音提取服务
│       └── llm.go              # MiniMax / 火山方舟
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── store/
│   │   │   └── videoApi.ts     # RTK Query API
│   │   ├── components/         # VideoCard · UploadModal · UrlExtractModal · Toast
│   │   └── pages/
│   │       └── DetailPage.tsx  # 详情页（左右布局）
│   └── tailwind.config.js
├── asr/                        # ASR 语音识别服务（Python + FastAPI）
│   ├── app.py                  # 服务主程序
│   ├── requirements.txt        # Python 依赖
│   └── Dockerfile              # Docker 构建文件
├── docker-compose.yml          # 三服务统一编排
├── Makefile                    # 开发快捷命令
├── uploads/                    # 原始视频
├── thumbnails/                 # 缩略图
├── audio/                      # 临时音频
└── nginx.conf                  # 生产 Nginx 配置
```

## ⚙️ LLM 配置

编辑 `backend/.env`：

```bash
# 选择 Provider
LLM_PROVIDER=minimax        # 或 volcengine

# MiniMax
MINIMAX_API_KEY=your_key_here
MINIMAX_API_BASE=https://api.minimaxi.com
MINIMAX_MODEL=MiniMax-M2

# 火山方舟
VOLCANO_API_KEY=your_key_here
VOLCANO_API_BASE=https://ark.cn-beijing.volces.com
VOLCANO_MODEL=doubao-1.5-pro
```

## 🌐 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/videos` | GET | 视频列表（分页） |
| `/api/videos/:id` | GET | 视频详情 |
| `/api/upload` | POST | 上传视频 |
| `/api/extract-by-url` | POST | 抖音链接提取 |
| `/api/videos/:id/reextract` | POST | 重新提取文案 |
| `/api/videos/:id/rewrite` | POST | AI 改写文案 |
| `/api/videos/:id/copy` | GET | 获取文案（复制） |
| `/api/videos/:id` | DELETE | 删除视频 |
| `/api/user/checkin` | GET/POST | 每日签到 |
| `/api/user/credits` | GET | 查询积分 |

## 📦 数据存储

| 类型 | 路径 |
|------|------|
| SQLite 数据库 | `backend/videos.db` |
| 上传视频 | `uploads/` |
| 缩略图 | `thumbnails/` |
| 临时音频 | `audio/` |

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
- [ ] V2.0 - 视频编辑、批量上传、移动端适配

## 📄 许可证

MIT License
