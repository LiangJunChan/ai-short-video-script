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
| 语音识别 | **双引擎**：sherpa-onnx + SenseVoice int8（低内存，默认）/ Fun-ASR + torch（高内存） |
| LLM 文案 | MiniMax M2 / 火山方舟 Doubao / **Agnes 2.0 Flash** |
| AI 图片/视频 | Agnes（image-2.1-flash / video-v2.0） |
| 链接提取 | Playwright（抖音反爬绕过，支持可选登录态） |
| 字体 | Inter + JetBrains Mono（Google Fonts） |

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 | 装法 |
|------|------|------|
| Homebrew | 最新 | [官网](https://brew.sh) |
| Go | 1.21+ | `brew install go` |
| Node.js | 18+ | `brew install node` |
| pnpm | 最新 | `brew install pnpm` |
| Python | 3.13 | `brew install python@3.13` |
| FFmpeg | 最新 | `brew install ffmpeg` |

> 抖音链接提取所需的 **Playwright + Chromium** 由 `bootstrap.sh` 自动装到 `backend/.venv`(约 130MB Chromium 二进制 + 依赖)，无需手动 `pip install`。

### 方式一：一键启动(推荐 macOS)

```bash
# 1. 克隆
git clone git@github.com:LiangJunChan/ai-short-video-script.git
cd ai-short-video-script

# 2. 一键初始化环境
#    体检 brew/node/pnpm/go/ffmpeg/python@3.13 —— 缺什么会明确报错并给安装命令
#    然后建 asr/.venv + backend/.venv、装 Playwright + Chromium、拉 pnpm 依赖、
#    生成 backend/.env(追加 PYTHON_BIN 让 Go 稳定命中 venv)
./bootstrap.sh

# 3. 填 API Key(LLM_PROVIDER / MINIMAX_API_KEY 或 AGNES_API_KEY 等)
vim backend/.env

# 4. 一键启动 🎉
make dev
# 等价于 ./start.sh
```

启动后同时运行三个服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:5173 | React 开发服务器，自动代理 API |
| 后端 | http://localhost:3000 | Go API 服务 |
| ASR | http://localhost:8000 | Fun-ASR 语音识别服务 |

> **首次 ASR 启动**会自动从 [ModelScope](https://www.modelscope.cn) 下载 FunASR 模型(约 1.9GB)，需数分钟；后续启动直接读缓存。

**常用命令：**

```bash
./bootstrap.sh --check   # 只体检，不装依赖
make dev                 # 起全部
make dev-backend         # 单起后端
make dev-frontend        # 单起前端
make dev-asr             # 单起 ASR
./start.sh --frp         # 起服务并顺带拉 FRP 隧道(见 docs/DEPLOY-FRP.md)
./stop.sh                # 停全部
```

### 方式二：Docker Compose(跨 macOS / Linux)

适合生产部署或不想本地装 Node/Go/Python 的场景。

```bash
git clone git@github.com:LiangJunChan/ai-short-video-script.git
cd ai-short-video-script

./bootstrap-docker.sh
# → 缺 docker：报错 + macOS/Linux 差异化安装指引
# → daemon 未起：提示启动方式
# → OK：生成 backend/.env 模板(首次需你填 API Key)、build 三个镜像、up -d 启动
```

**首次执行的取舍：**

- backend 镜像约 1.5GB（Go binary + chromium + ffmpeg + playwright）
- ASR 镜像大小取决于引擎：**sherpa ~600MB** / **funasr ~3GB**（torch 是大头）
- 首次 `docker compose build`：sherpa 约 3-5 分钟 / funasr 约 15-30 分钟
- 上传视频 / 缩略图 / 音频挂 host 目录（`./uploads` / `./thumbnails` / `./audio`），不入镜像

### 🎙️ ASR 语音识别双引擎（按内存自动切换）

`bootstrap-docker.sh` 会**自动检测机器总内存**决定用哪个 ASR 引擎，无需手动配置：

| 引擎 | 触发条件 | 内存占用 | 模型来源 | 适用 |
|---|---|---|---|---|
| **sherpa**（默认） | 总内存 **< 3G** | 峰值 ~450MB | int8 ONNX（229MB），首次由脚本从 hf-mirror 下载到 `asr/models/` 并打包进镜像 | 阿里云等小内存 VPS |
| **funasr** | 总内存 **≥ 3G** | 加载即 700MB+，峰值 1.5G+ | 运行时由 modelscope 自动下载（缓存到 `modelscope-cache` 卷） | MacBook 等开发机 |

两种引擎**对外 HTTP 接口完全一致**（`POST /asr`、`GET /health`），业务代码无感。

**手动指定引擎**（覆盖自动检测）：

```bash
ASR_ENGINE=funasr ./bootstrap-docker.sh   # 强制用 funasr（torch）
ASR_ENGINE=sherpa ./bootstrap-docker.sh   # 强制用 sherpa（低内存）
# 或写进 backend/.env / shell 环境变量,docker-compose 会读取
```

> ⚠️ **1.8G 等小内存机器注意**：sherpa 引擎的 chromium（抖音提取）已内置激进省内存参数，可与 ASR 共存。但若强行在小内存机器上用 funasr，会因 OOM 无限重启，务必用默认 sherpa。

### 🔑 抖音提取登录态（可选）

抖音对**机房 IP + 未登录**的无头浏览器会触发 bdturing 滑块风控，导致视频详情接口返回空。解决办法是注入登录态：

- **有** `backend/douyin_state.json`（含有效 cookies）→ 以登录态访问，绕过风控（推荐服务器部署）
- **无 / 空文件** → 走匿名逻辑（本地 IP 通常够用，如 MacBook 开发）

`bootstrap-docker.sh` 会自动创建空占位文件。要启用登录态，用浏览器 Cookie 导出扩展（能导出 httpOnly cookie）导出抖音登录 cookie（需含 `sessionid_ss`/`sid_guard`/`ttwid` 等），包装成 Playwright storage_state 格式：

```json
{"cookies": [{"name":"sessionid_ss","value":"...","domain":".douyin.com","path":"/","httpOnly":true,"secure":true,"sameSite":"None"}, ...], "origins": []}
```

存到 `backend/douyin_state.json` 即可（该文件已 gitignore，含账号凭证不入库）。cookie 有有效期（`sid_guard` 约 60 天），失效后重新导出替换即可，**无需重建镜像**（compose 只读挂载，实时生效）。

**常用命令：**

```bash
./bootstrap-docker.sh --check   # 只体检 docker / compose
./bootstrap-docker.sh --logs    # 启动 + 跟随日志
./bootstrap-docker.sh down      # 停 + 清容器(数据卷保留)
docker compose logs -f backend  # 单看某服务
docker compose restart backend  # 改 .env 后重启后端生效
docker compose down -v          # ⚠️ 连数据卷一起删,funasr 引擎模型要重下
```

**Linux 部署要点：**

- Docker 需要 v20+ 且 `docker compose`（v2 插件）；老 `docker-compose` v1 也兼容但会警告
- 非 root 用户需加入 `docker` 组：`sudo usermod -aG docker $USER`（重开终端生效）
- 抖音链接提取的 Chromium 在容器内以 `--no-sandbox` 运行（`extract_douyin.py` 检测 `DOCKER=1` env 自动开启）

**⚠️ 国内网络必配 Docker Hub 镜像加速器**（不配大概率报 `Bad Gateway`）：

推荐 mirror 列表（免费公开源）：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://mirror.baidubce.com"
  ]
}
```

各家 Docker 运行时的配置位置：

| 运行时 | 配置文件 | 重启命令 |
|---|---|---|
| Docker Desktop | Settings → Docker Engine 里的 JSON 输入框 | 点 Apply & Restart |
| OrbStack | `~/.orbstack/config/docker.json` | `orbctl restart docker` |
| Colima | `~/.colima/default/colima.yaml` 的 `docker.registry-mirrors:` | `colima restart` |
| Linux 原生 | `/etc/docker/daemon.json` | `sudo systemctl restart docker` |

`./bootstrap-docker.sh` 会自动 pull 一个 hello-world 探针镜像做网络自检，失败时会打印上述完整配置指引。

**⚠️ Dockerfile 内其它国内镜像**（已内置，无需你手配）：

| 依赖源 | 默认 | Dockerfile 内改用 | 影响 |
|---|---|---|---|
| Go module | `proxy.golang.org`（被墙） | `goproxy.cn` + `mirrors.aliyun.com` | backend build 时下 Go 依赖 |
| Go checksum | `sum.golang.org`（被墙） | `sum.golang.google.cn` | 同上 |
| PyPI | `pypi.org`（慢/timeout） | `pypi.tuna.tsinghua.edu.cn` | backend / asr 装 pip 包（funasr 引擎的 torch 2GB 尤甚） |
| Debian apt | `deb.debian.org` | 保持不变（CDN 覆盖国内 OK） | ffmpeg / chromium 系统库 |

**在境外服务器部署时**，如果不需要这些国内镜像（甚至可能因为镜像不同步导致包版本落后），可以在 build 时通过 `--build-arg` 或修改 Dockerfile 覆盖，比如：

```bash
# 恢复默认（境外或墙外主机）
docker compose build --build-arg GOPROXY=direct --build-arg PIP_INDEX_URL=https://pypi.org/simple backend
```

或直接编辑 `backend/Dockerfile` / `asr/Dockerfile` 顶部的 `ENV` 行。


## 🛡️ 抖音反爬策略

> **目的**：向后来者解释"抖音链接提取为什么这么复杂"，以及为什么不能简单 `requests.get` 拿视频 URL。本节是工程语境说明，不是运维指南；细节定位请直接查 `backend/extract_douyin.py`。

抖音从 2024 年起逐步上线多层反爬，2026 年中已形成"按访问路径分级拦截"的产品化体系。本项目是 headless chromium 自动化访问，**完全无状态**（不持久登录 cookie），属于抖音拦截优先级最高的场景。

### 抖音反爬链与本项目应对

| 层 | 抖音的反爬手段 | 我们怎么绕 |
|---|---|---|
| **1. User-Agent 检测** | headless chromium 默认 UA 含 `HeadlessChrome`，立刻 403 | launch args `--disable-blink-features=AutomationControlled` + 把 UA 声明成"Mac + Chrome 149"（对齐容器里真实的 chromium build） |
| **2. JS 指纹** | 检测 `navigator.webdriver=true`、`window.chrome` 缺失等自动化特征 | `context.add_init_script` 抹掉 `navigator.webdriver`、注入 `window.chrome` 对象、补全 `navigator.plugins/languages` |
| **3. WAF challenge** | 第一步返回纯 JS 挑战页（`<script>` 含 `waf-jschallenge`），客户端通过后才放完整 HTML | `_wait_until_page_ready()` 轮询。判定逻辑要正确——HTML < 20KB 判为 shell；含 `render_data/aweme_detail/sigi_state/play_addr` 直接判真页（不要只看关键词，否则真实页也会被误判） |
| **4. URL 分级拦截** | 不同入口的反爬严格度完全不同 | 见下方"URL 路由表" |
| **5. 接口签名** | `aweme/v1/web/aweme/detail/` API 要求 `_signature` / `X-Bogus` 戳，缺了 403 | 不直接调 API；从 SSR HTML 的 `<script id="SIGI_STATE">` 或 `window.__INIT_PROPS__` 里挖 JSON，让浏览器在 SPA 渲染中"自然触发"请求并被 `handle_response` 拦到 |
| **6. 登录态** | `www.douyin.com/video/<id>` 未登录会被重定向到首页 feed | 不是所有 URL 都能匿名看；详见下方替代品 |

### URL 路由表（核心）

抖音根据入口路径给反爬规则分级，本项目实测发现：

| URL | 反爬严格度 | 能否拿 aweme_detail | 备注 |
|---|---|---|---|
| `v.douyin.com/<短链>` | 重定向，不直连 | — | 用户粘贴的入口，302 到下面之一 |
| `iesdouyin.com/share/video/<id>?...` | **最严** | ❌ WAF JS challenge 完全过不了 | 移动分享页，不要走这条路 |
| `www.douyin.com/video/<id>` | 中 | ❌ 未登录跳首页 feed | 即使页面有 `<video>` 元素，API 拿不到 payload |
| `www.douyin.com/discover?modal_id=<id>` | **宽松** | ✅ | **首选**，抖音站内推荐弹窗用此格式 |
| `www.douyin.com/note/<id>` | 较严 | ⚠️ 备份 | 部分视频用此格式 |

### 提取流程（当前实现）

```
用户粘贴 v.douyin.com/CQehcb6iXAo/
  ↓ Playwright goto
短链 302 落到某个 URL(可能是 share 或 video 或有别的)
  ↓
用 5 种 regex(/share/video/<id> / /video/<id> / /note/<id> /
   ?modal_id=<id> / aweme_detail?aweme_id=<id>)抽 aweme_id
  ↓
依次 goto 三个候选 URL(discover → note → video)各等 8 秒
每个都给 handle_response 一段窗口拦 aweme_detail API
  ↓ 拿到 payload 就 break
等 SPA 渲染完成 + 主动 click 播放按钮触发懒加载
从 aweme_detail_payload.video.bit_rate[0].play_addr.url_list[0]
  拿到真实 mp4 URL,填入 result
  ↓
Go 后端用 net/http 配浏览器同套 UA/Referer 直下 mp4 到 ./uploads/
```

### 设计上的几个明确决策

| 项 | 选择 | 为什么 |
|---|---|---|
| **不持久登录 cookie** | 完全匿名 + 每次新 context | 部署到公网环境后，cookie 风险归不到具体用户头上；本项目不是发布工作流，只是收藏场景 |
| **不在后台跑轮询 cookie 服务** | 不做 | 即便做了，抖音的 token 刷新策略 1-3 月会变，维护成本高；不如每次重新跑隐身 |
| **不依赖单个视频 API** | 从 SSR HTML 里挖 JSON | API 要 `_signature` 戳；HTML 跟请求是浏览器自然发的，抖音只验浏览器行为不验这层 |
| **discover?modal_id 优先** | discover/note/video 三选一 | 实测这个格式反爬最松，资源加载最快，拿到 payload 后再 break |

### 已知/未来风险

抖音反爬每 1-3 月会升级一次。当下面任意一个症状出现时，意味着现在这套可能失效：

- 所有 URL 变体拿不到 aweme_detail，但 WAF challenge 通过；说明 SPA 数据接口路径变了，需抓取新的 `handle_response` 拦截关键词
- `_looks_like_waf_challenge` 永远判 false 但 HTML 始终 < 20KB；说明 WAF 升级到无 JS 警告式，需要看 HTTP 503 响应
- `discover?modal_id=` 也被识别成自动化；说明抖音针对单一 URL 做了指纹累计；考虑走 `webcast.amemv.com`（直播挂载路径）或导出本机 cookie 注入

所有策略代码集中在 `backend/extract_douyin.py` 单文件（约 500 行），无 Python 包或外部依赖；将来维护以这一个文件为主战场。


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
│       ├── processor.go        # FFmpeg · ASR 调用
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
├── asr/                        # ASR 语音识别服务（Python + FastAPI，双引擎）
│   ├── app.py                  # 双引擎调度（ASR_ENGINE=sherpa/funasr）
│   ├── Dockerfile              # ARG ASR_ENGINE 构建期选依赖
│   ├── requirements.sherpa.txt # sherpa-onnx 依赖（低内存）
│   ├── requirements.funasr.txt # funasr + torch 依赖（高内存）
│   └── models/                 # sherpa int8 ONNX 模型（bootstrap 下载，不入库）
├── backend/douyin_state.json   # 抖音登录态（可选，不入库；见"抖音提取登录态"）
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
- [x] **Docker 部署适配（小内存友好）**：ASR 双引擎（sherpa-onnx 低内存 / funasr torch，按内存自动切换）、抖音提取可选登录态（绕过 bdturing 风控）、chromium 省内存参数，可在 1.8G VPS 稳定运行

## 📄 许可证

MIT License
