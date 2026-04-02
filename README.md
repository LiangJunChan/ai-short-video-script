# AI短视频脚本平台 V1.0

一款轻量化AI短视频脚本辅助平台，核心价值是实现用户上传短视频的集中展示，以及通过AI技术自动提取视频文案并呈现，降低用户查看、获取短视频文案的成本，适配个人创作者、内容运营者等用户群体。

## 技术栈

- **后端**：Go 1.21+ + Gin 框架 + SQLite 数据库
- **前端**：React 19 + Vite
- **音视频处理**：FFmpeg
- **AI语音识别**：Fun-ASR（阿里开源）
- **AI文案改写**：MiniMax / 火山方舟（可切换）

## 功能特性

- 短视频上传（支持MP4/FLV/MOV，大小≤4GB，时长15秒-10分钟）
- 短视频列表卡片展示（3列网格，分页，按时间倒序）
- 短视频详情页（自适应播放器 + AI文案展示）
- 自动截取视频缩略图
- 异步AI文案提取
- 一键复制文案功能
- AI文案改写（支持多种LLM）
- 完善的异常处理

## 项目结构

```
ai-short-video-script/
├── backend/                # Go + Gin 后端
│   ├── main.go            # 入口文件
│   ├── .env               # 环境配置（LLM API Key等）
│   ├── database/
│   │   └── db.go         # SQLite数据库操作
│   ├── handler/
│   │   └── video.go      # API处理器
│   ├── service/
│   │   ├── processor.go  # 音视频处理和AI识别
│   │   └── llm.go        # LLM调用（MiniMax/火山方舟）
│   └── prompts/
│       └── rewrite_system_prompt.txt  # 文案改写系统提示词
├── frontend/              # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js         # API调用
│   │   ├── components/   # 组件（VideoCard, UploadModal, Toast等）
│   │   └── pages/        # 页面（DetailPage）
│   └── vite.config.js
├── uploads/               # 上传视频存储
├── thumbnails/            # 缩略图存储
├── audio/                 # 临时音频存储
└── nginx.conf            # Nginx 生产配置
```

## 环境要求

- Go 1.21+
- Node.js 18+
- FFmpeg（用于视频处理和音频提取）
- Python 3.8+（用于 Fun-ASR 服务）
- PyTorch（Fun-ASR 依赖）

## 部署指南

### 1. 部署 Fun-ASR 服务（语音识别）

Fun-ASR 是阿里开源的语音识别服务，提供本地部署的离线语音识别能力。

#### 安装步骤

```bash
# 创建 Fun-ASR 目录
mkdir -p /opt/funasr && cd /opt/funasr

# 克隆 Fun-ASR 仓库
git clone https://github.com/modelscope/FunASR.git

# 进入目录
cd Fun-ASR

# 安装 Python 依赖
pip install -r requirements.txt

# 安装 FunASR runtime server
pip install funasr
```

#### 启动 Fun-ASR 服务

```bash
# 使用默认模型启动服务（端口 8000）
python -m funasr_server_sdk.main

# 或使用 GPU 加速（如果有多GPU或GPU服务器）
python -m funasr_server_sdk.main --gpu 0
```

服务启动后验证：

```bash
# 测试服务是否正常运行
curl -X POST http://localhost:8000/asr \
  -F "file=@/path/to/test.wav"
```

**注意**：Fun-ASR 服务需要与后端部署在同一服务器或网络可达的后端服务器上，默认调用地址为 `http://localhost:8000/asr`。

### 2. 部署后端

```bash
cd backend

# 安装 Go 依赖
go mod tidy

# 构建后端
go build -o server

# 运行后端服务
./server
```

后端服务默认运行在 `http://localhost:3000`

### 3. 部署前端

```bash
cd frontend

# 安装前端依赖
npm install

# 开发模式运行
npm run dev

# 或生产环境构建
npm run build
```

前端开发模式运行在 `http://localhost:5173`，会自动代理 API 请求到后端。

### 4. Nginx 生产部署

项目根目录提供了 `nginx.conf` 配置文件，可用于生产环境部署：

```bash
# 复制 nginx 配置
sudo cp nginx.conf /etc/nginx/sites-available/ai-video

# 启用站点
sudo ln -s /etc/nginx/sites-available/ai-video /etc/nginx/sites-enabled/

# 测试配置并重载
sudo nginx -t && sudo nginx -s reload
```

前端静态文件构建后放在 `frontend/dist`，通过 Nginx 直接服务。

## LLM 配置

系统支持切换不同的 LLM 提供者进行文案改写，通过修改 `backend/.env` 文件配置：

```bash
# 选择 LLM Provider: minimax | volcengine
LLM_PROVIDER=volcengine

# ============ MiniMax 配置 ============
MINIMAX_API_KEY=your_minimax_api_key_here
MINIMAX_API_BASE=https://api.minimaxi.com
MINIMAX_MODEL=MiniMax-M2.7

# ============ 火山方舟配置 ============
VOLCANO_API_KEY=your_volcano_api_key_here
VOLCANO_API_BASE=https://ark.cn-beijing.volces.com/api/coding/v3
VOLCANO_MODEL=Doubao-Seed-2.0-lite
```

### 切换 LLM 提供者

只需修改 `LLM_PROVIDER` 的值：
- `minimax` - 使用 MiniMax M2 模型
- `volcengine` - 使用火山方舟 Doubao/Ark 模型

修改后重启后端服务即可生效。

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/videos` | GET | 获取视频列表（支持分页参数 `page` 和 `pageSize`） |
| `/api/videos/:id` | GET | 获取视频详情（包含文案、状态等） |
| `/api/upload` | POST | 上传视频（multipart/form-data，字段：video, title, uploader） |
| `/api/videos/:id/reextract` | POST | 重新提取视频文案 |
| `/api/videos/:id/rewrite` | POST | AI改写文案（body: `{"prompt": "改写要求"}`） |
| `/api/videos/:id/copy` | GET | 获取AI文案用于复制 |
| `/api/videos/:id` | DELETE | 删除视频 |

## 数据存储

- **SQLite 数据库**：`backend/videos.db`
- **上传视频**：`backend/uploads/`
- **视频缩略图**：`backend/thumbnails/`
- **临时音频**：`backend/audio/`

## 视频格式要求

- 支持格式：MP4、FLV、MOV
- 文件大小：最大 4GB
- 视频时长：15秒 - 10分钟
- 音频要求：需要包含中文语音以便识别

## 后续迭代规划

- **V1.1**：用户注册登录、视频管理、优化AI提取精度
- **V1.2**：视频搜索分类、文案编辑
- **V1.3**：AI脚本生成、视频收藏分享
- **V2.0**：视频编辑、批量上传、移动端适配

## 许可证

MIT
