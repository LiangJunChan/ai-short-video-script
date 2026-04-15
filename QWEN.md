# AI短视频脚本平台 - 项目上下文

## 项目概览

**项目定位**：AI驱动的爆款短视频拆解工作台，帮助内容创作者从爆款视频快速提取文案、分析结构、仿写生成新脚本。

**核心价值**：蝉妈妈找爆款 → 本工具拆解文案结构 → AI仿写直接产出可使用脚本，填补了数据分析之后文案层拆解的空白。

**技术架构**：前后端分离架构
- **后端**：Go 1.21+ + Gin 框架 + SQLite 数据库
- **前端**：React 19 + Vite + TypeScript + Tailwind CSS + Redux Toolkit RTK Query
- **AI服务**：Fun-ASR（本地离线语音识别）+ MiniMax/火山方舟（LLM文案分析和改写）
- **音视频处理**：FFmpeg（缩略图生成、音频提取）
- **链接提取**：Playwright（绕过抖音反爬）

## 功能特性

### 已实现功能
- ✅ 短视频上传（支持MP4/FLV/MOV，最大4GB）
- ✅ 抖音链接一键提取（自动下载视频）
- ✅ AI异步文案提取（Fun-ASR离线识别）
- ✅ AI文案改写（支持自定义提示词）
- ✅ **AI深度分析（V1.4）**：5个分析tab
  - 文案结构分析（钩子/主体/结尾拆解）- 5积分
  - 爆款点提炼 - 3积分
  - 选题标签提取 - 2积分
  - 口播节奏分析 - 4积分
  - 完整分析报告 - 6积分
- ✅ 积分系统（按次扣费，每日签到送50积分）
- ✅ 素材库管理（V1.6）：收藏夹分类、自定义标签
- ✅ 用户注册登录、多用户数据隔离

### 积分扣费标准
| 功能 | 积分消耗 |
|------|---------|
| 提取文案（上传/链接） | 5 |
| AI改写 | 10 |
| 文案结构分析 | 5 |
| 爆款点提炼 | 3 |
| 选题标签提取 | 2 |
| 口播节奏分析 | 4 |
| 完整分析报告 | 6 |

## 项目结构

```
ai-short-video-script/
├── backend/                    # Go后端
│   ├── main.go                 # 入口文件，路由配置
│   ├── go.mod / go.sum         # Go依赖管理
│   ├── .env.example            # 环境变量模板
│   ├── extract_douyin.py       # 抖音链接提取（Playwright）
│   ├── database/
│   │   └── db.go               # SQLite数据库操作
│   ├── handler/
│   │   └── video.go            # 视频相关API处理器
│   └── service/
│       ├── credit.go           # 积分扣减逻辑
│       ├── processor.go        # FFmpeg + Fun-ASR调用
│       ├── analysis.go         # AI深度分析prompt
│       ├── douyin.go           # 抖音提取服务
│       └── llm.go              # LLM调用（MiniMax/火山引擎）
├── frontend/                   # React前端
│   ├── src/
│   │   ├── store/
│   │   │   └── videoApi.ts     # RTK Query API定义
│   │   ├── components/         # 通用组件（VideoCard, Toast, Modal等）
│   │   └── pages/
│   │       ├── DetailPage.tsx  # 视频详情页（核心：包含5个深度分析tab）
│   │       ├── LibraryPage.tsx # 素材库页面（收藏夹+标签）
│   │       └── HomePage.tsx    # 视频列表首页
│   ├── package.json            # 依赖管理
│   ├── tailwind.config.js      # Tailwind配置
│   └── tsconfig.json           # TypeScript配置
├── uploads/                    # 上传的原始视频
├── thumbnails/                 # 视频缩略图
├── audio/                      # 提取的临时音频文件
├── nginx.conf                  # 生产环境Nginx配置
├── README.md                   # 项目说明和部署文档
├── PRODUCT_ROADMAP.md          # 产品路线规划
└── V1.6_产品实现计划.md        # 当前版本开发计划
```

## 构建与运行

### 依赖要求
- Go 1.21+
- Node.js 18+
- pnpm（前端包管理）
- FFmpeg
- Python 3.8+（Fun-ASR服务）
- Playwright（抖音链接提取）

### 开发命令

**后端**：
```bash
cd backend
cp .env.example .env
# 编辑.env填入API Keys
go mod tidy
go run main.go
# 后端服务运行在 http://localhost:3000
```

**前端**：
```bash
cd frontend
pnpm install
pnpm dev
# 前端开发服务运行在 http://localhost:5173
# Vite自动代理API请求到后端 3000 端口
```

**生产构建**：
```bash
# 构建前端
cd frontend && pnpm build

# 编译后端
cd backend && go build -o server

# 运行后端
./server
```

### 依赖外部服务
必须先部署 **Fun-ASR** 语音识别服务，默认地址 `http://localhost:8000`。部署文档见 [fun-asr-deploy](https://github.com/LiangJunChan/fun-asr-deploy)。

## 开发约定

### 前端
- 使用 **TypeScript**，保持类型安全
- **Tailwind CSS** 进行样式开发，采用Utility-first方式
- RTK Query 管理API调用，遵循Redux Toolkit约定
- 组件命名采用PascalCase，文件名使用PascalCase（如 `DetailPage.tsx`）
- 响应式设计：移动端优先，使用Tailwind断点系统
- 颜色风格：主要使用 `sky` 蓝色系作为主色调，`slate` 灰色系作为中性色

### 后端
- Go代码风格遵循官方格式化（`gofmt`）
- 采用分层架构：handler（路由层）→ service（业务层）→ database（数据层）
- SQLite数据库，简单查询直接手写SQL不用ORM
- 异步任务使用Goroutine处理（视频提取）

### UI组件约定
- 主按钮：`btn-primary`，次按钮：`btn-secondary`
- 卡片：`card` 类，圆角边框阴影
- 输入框：`input-field` 类
- 结果区域统一使用 `bg-sky-50 border-sky-100` 背景样式

### 功能位置
- **AI深度分析5个tab** 位于 `frontend/src/pages/DetailPage.tsx`
  - 文案结构 (`structure`)、爆款分析 (`viral_points`)、选题标签 (`tags`)、口播节奏 (`rhythm`)、完整报告 (`report`)
  - 每个tab对应独立的state存储结果
  - 最新修改：已添加复制按钮、统一背景风格、按tab显示不同积分

## 关键API接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/videos` | GET | 获取视频列表（分页） |
| `/api/upload` | POST | 上传视频 |
| `/api/extract-by-url` | POST | 抖音链接提取 |
| `/api/videos/:id/analyze` | POST | AI深度分析（`analysisType`指定分析类型） |
| `/api/videos/:id/reextract` | POST | 重新提取文案 |
| `/api/videos/:id/rewrite` | POST | AI改写文案 |
| `/api/videos/:id` | DELETE | 删除视频 |
| `/api/user/checkin` | POST | 每日签到 |
| `/api/user/credits` | GET | 查询用户积分 |

## 环境配置

后端配置通过环境变量（`backend/.env`）：

```
# LLM提供商选择：minimax 或 volcengine
LLM_PROVIDER=minimax

# Fun-ASR服务地址
ASR_API_URL=http://localhost:8000/asr

# MiniMax配置
MINIMAX_API_KEY=xxx
MINIMAX_MODEL=MiniMax-M2

# 火山引擎配置
VOLCANO_API_KEY=xxx
VOLCANO_MODEL=doubao-1.5-pro

# JWT密钥
JWT_SECRET=your_jwt_secret_here
```

## 产品迭代状态

当前处于 **V1.6 开发阶段**，主要实现：
- 素材库管理（收藏夹分类）
- 自定义标签系统
- AI深度分析（已完成基础功能，正在优化细节）

后续规划：V1.5 爆款仿写 → V1.7 选题发现 → V2.0 团队协作

## 部署说明

生产部署使用Nginx反向代理：
- 前端静态文件：`/path/to/ai-short-video-script/frontend/dist`
- API代理：`/api` → `http://127.0.0.1:3000`
- 详细配置见 `nginx.conf`
