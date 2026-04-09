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
- [x] 每日签到（+20积分）
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

- Go 1.21+
- Node.js 18+
- FFmpeg
- Python 3.8+（Fun-ASR）
- Playwright（`pip install playwright && playwright install chromium`）

### 1. 部署 Fun-ASR 服务

推荐使用 [fun-asr-deploy](https://github.com/LiangJunChan/fun-asr-deploy) 项目部署 Fun-ASR 服务（基于阿里巴巴 Fun-ASR 框架，支持 ASR + 标点恢复，开箱即用）。

#### 功能特性

- **语音识别（ASR）**：基于 Paraformer-large 模型，中文识别精度高
- **标点恢复**：自动添加句号、逗号、问号等标点
- **多格式支持**：支持 wav / mp3 / m4a
- **本地部署**：模型在本地，无需联网调用 API
- **RESTful API**：HTTP 接口，方便集成

#### 环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | macOS (Apple Silicon) / Linux |
| Python | 3.13+ |
| 内存 | 推荐 8GB+ |
| 磁盘 | 预留 2GB+（模型约 1.9GB） |

#### 快速开始

```bash
# 克隆项目
git clone git@github.com:LiangJunChan/fun-asr-deploy.git /opt/fun-asr
cd /opt/fun-asr

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

首次启动时，模型会自动从 [ModelScope](https://www.modelscope.cn) 下载（约 1.9GB），请耐心等待。

```
INFO:     Uvicorn running on http://127.0.0.1:8000
模型加载完成，服务已就绪
```

#### API 接口

启动后可通过浏览器访问交互式文档：

| 文档类型 | 地址 |
|---------|------|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

**语音识别** `POST /asr`

```bash
# 识别 wav 文件
curl -X POST "http://localhost:8000/asr" \
  -F "file=@./audio.wav"
```

**响应示例**：

```json
{
  "success": true,
  "text": "今天天气很好，我们下午去逛街吧，然后去看电影，怎么样？",
  "filename": "audio.wav",
  "punctuation": true
}
```

**健康检查** `GET /health`

```bash
curl http://localhost:8000/health
```

> **注意**：Fun-ASR 服务需要与后端部署在同一服务器或网络可达的后端服务器上。后端默认调用地址为 `http://localhost:8000/asr`。

### 2. 部署后端

```bash
cd backend

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 安装依赖并启动
go mod tidy
go build -o server
./server
```

服务启动后访问 `http://localhost:3000`

### 3. 部署前端

```bash
cd frontend

# 安装依赖（推荐 pnpm）
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
```

前端开发模式 `http://localhost:5173`，会自动代理 API 到后端。

## 📁 项目结构

```
ai-short-video-script/
├── backend/
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
├── frontend/
│   ├── src/
│   │   ├── store/
│   │   │   └── videoApi.ts     # RTK Query API
│   │   ├── components/         # VideoCard · UploadModal · UrlExtractModal · Toast
│   │   └── pages/
│   │       └── DetailPage.tsx  # 详情页（左右布局）
│   └── tailwind.config.js
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
