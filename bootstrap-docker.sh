#!/usr/bin/env bash
# bootstrap-docker.sh — 一键 Docker 部署(macOS + Linux 通用)
#
# 用法:
#   ./bootstrap-docker.sh          # 检测 docker → 生成 .env → build (前台流式) → up -d
#   ./bootstrap-docker.sh --check  # 只体检
#   ./bootstrap-docker.sh --logs   # 部署后 tail -f 三个服务日志
#   ./bootstrap-docker.sh down     # 停 + 删容器(卷保留)
#
# 与 bootstrap.sh 的区别:
#   - bootstrap.sh 面向本机开发(vite dev + go run,热重载),仅 Mac
#   - bootstrap-docker.sh 面向部署(镜像 build + nginx serve),跨 Mac/Linux
#
# 首次 build 约 15-30 分钟(chromium 400M + funasr torch 2G),后续增量 build 快
set -e

# ============================================================
# 颜色
# ============================================================
if [ -t 1 ]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; NC=""
fi
info() { printf "${BLUE}[docker]${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}[ ok ]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[warn]${NC} %s\n" "$*"; }
fail() { printf "${RED}[fail]${NC} %s\n" "$*" >&2; exit 1; }

# ============================================================
# 项目根
# ============================================================
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

MODE="up"
for arg in "$@"; do
  case "$arg" in
    --check) MODE="check" ;;
    --logs)  MODE="up-logs" ;;
    down)    MODE="down" ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) fail "未知参数: $arg" ;;
  esac
done

# ============================================================
# 平台探测
# ============================================================
OS=$(uname -s)
case "$OS" in
  Darwin) PLATFORM="macOS" ;;
  Linux)  PLATFORM="Linux" ;;
  *) fail "不支持的操作系统: $OS(仅支持 macOS / Linux)" ;;
esac
info "运行平台: $PLATFORM"

# ============================================================
# 体检: docker CLI
# ============================================================
if ! command -v docker >/dev/null 2>&1; then
  cat >&2 <<EOF

${RED}❌ 未检测到 Docker。${NC}请任选其一安装后重试:

$(if [ "$PLATFORM" = "macOS" ]; then cat <<'MAC'
【macOS】
  1. Docker Desktop(官方,最省心,个人免费)
     https://www.docker.com/products/docker-desktop/
     或: brew install --cask docker
  2. OrbStack(推荐 Mac 用户,比 Docker Desktop 快很多)
     https://orbstack.dev/
     或: brew install --cask orbstack
  3. Colima(命令行党)
     brew install colima docker && colima start
MAC
else cat <<'LINUX'
【Linux】
  1. Docker Engine 官方安装脚本:
     curl -fsSL https://get.docker.com | sh
     sudo usermod -aG docker $USER   # 加 docker 组免 sudo,需重开终端
  2. Debian/Ubuntu 官方仓库:
     sudo apt-get install -y docker.io docker-compose-v2
  3. RHEL/CentOS:
     sudo dnf install -y docker docker-compose
     sudo systemctl enable --now docker
LINUX
fi)

装好后确保 \`docker ps\` 能正常输出,再运行本脚本。
EOF
  exit 1
fi
ok "docker CLI: $(docker --version)"

# ============================================================
# 体检: docker daemon 在跑
# ============================================================
if ! docker info >/dev/null 2>&1; then
  if [ "$PLATFORM" = "macOS" ]; then
    fail "docker 装了但 daemon 未运行。请启动 Docker Desktop / OrbStack / colima start,再重跑。"
  else
    fail "docker 装了但 daemon 未运行。请执行: sudo systemctl start docker(或加当前用户到 docker 组: sudo usermod -aG docker \$USER 后重开终端)"
  fi
fi
ok "docker daemon 正常"

# ============================================================
# 体检: docker compose(v2 或 v1)
# ============================================================
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
  warn "使用旧版 docker-compose(v1),建议升级到 v2: docker compose"
else
  fail "docker compose 不可用。macOS Docker Desktop / OrbStack 默认自带;Linux 请装 docker-compose-v2 或 docker-compose-plugin"
fi
ok "compose: $($COMPOSE version | head -1)"

# ============================================================
# 网络自检:能不能拉 Docker Hub 镜像
# 国内用户常见坑:registry-1.docker.io 直连被限速/拒绝,需配 registry-mirrors
# 注:macOS 默认没有 GNU `timeout` 命令,所以用 Perl 做 30 秒硬超时(macOS/Linux 都自带 perl)
# ============================================================
info "网络自检: 尝试 pull hello-world 探针镜像(2MB,30 秒内应完成)..."
if ! perl -e 'alarm shift; exec @ARGV' 30 docker pull hello-world >/dev/null 2>&1; then
  cat >&2 <<EOF

${RED}❌ 无法从 Docker Hub 拉镜像(hello-world 探针失败)。${NC}

$(if [ "$PLATFORM" = "macOS" ]; then cat <<'MAC'
【macOS 常见原因】国内直连 registry-1.docker.io 已基本不可用,需配镜像加速器:

── 如果用 Docker Desktop ─────────────────────────────────
  Settings → Docker Engine → 编辑 JSON,加入:

  {
    "registry-mirrors": [
      "https://docker.m.daocloud.io",
      "https://dockerproxy.com",
      "https://docker.mirrors.ustc.edu.cn",
      "https://mirror.baidubce.com"
    ]
  }

  然后 Apply & Restart

── 如果用 OrbStack ───────────────────────────────────────
  mkdir -p ~/.orbstack/config
  cat > ~/.orbstack/config/docker.json <<'JSON'
  {
    "registry-mirrors": [
      "https://docker.m.daocloud.io",
      "https://dockerproxy.com",
      "https://docker.mirrors.ustc.edu.cn",
      "https://mirror.baidubce.com"
    ]
  }
  JSON
  orbctl restart docker

── 如果用 Colima ─────────────────────────────────────────
  编辑 ~/.colima/default/colima.yaml,加:
    docker:
      registry-mirrors:
        - "https://docker.m.daocloud.io"
        - "https://dockerproxy.com"
  然后: colima restart

配好后重跑本脚本。
MAC
else cat <<'LINUX'
【Linux 常见原因】国内直连 registry-1.docker.io 已基本不可用,需配镜像加速器:

  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json <<'JSON'
  {
    "registry-mirrors": [
      "https://docker.m.daocloud.io",
      "https://dockerproxy.com",
      "https://docker.mirrors.ustc.edu.cn",
      "https://mirror.baidubce.com"
    ]
  }
  JSON
  sudo systemctl restart docker

配好后重跑本脚本。
LINUX
fi)

或者:如果你的服务器在境外,可能是别的网络问题(防火墙/代理),请单独排查。
EOF
  exit 1
fi
ok "Docker Hub 网络自检通过"

if [ "$MODE" = "check" ]; then
  info "--check 模式,跳过 build/up"
  exit 0
fi

# ============================================================
# down: 停 + 清容器(卷保留)
# ============================================================
if [ "$MODE" = "down" ]; then
  info "停止并删除容器(数据卷保留)..."
  $COMPOSE down
  ok "已停止。数据卷 modelscope-cache/hf-cache/host uploads 均保留"
  exit 0
fi

# ============================================================
# .env 检查(compose 里 env_file 指向 backend/.env)
# ============================================================
if [ ! -f backend/.env ]; then
  info "生成 backend/.env(从 .env.example)"
  cp backend/.env.example backend/.env
  warn "已生成 backend/.env —— 请填入 API Key 后再重跑本脚本"
  cat <<EOF

需要填的最少字段:
  LLM_PROVIDER=minimax     # 或 volcano / agnes
  MINIMAX_API_KEY=...      # 若选 minimax
  AGNES_API_KEY=...        # 若选 agnes
  ...

编辑完成后重跑: ./bootstrap-docker.sh
EOF
  exit 0
fi

# 提示 API Key 未填
if grep -q "your_.*_api_key_here\|your_key_here" backend/.env; then
  warn "backend/.env 里似乎还有占位符 API Key,请确认已填真实值(继续 build 需 Ctrl+C 5 秒内取消)"
  sleep 5
fi

# ============================================================
# 建运行时目录 + 数据目录
# ============================================================
mkdir -p uploads thumbnails audio thumbnails/square data

# ============================================================
# build (前台流式输出,能看到 pip / apt / chromium 下载进度)
# ============================================================
info "开始 build 三个镜像(首次约 10-25 分钟,进度会实时打印在下方)..."
info "  - backend  ~800MB(Go binary + chromium + ffmpeg + playwright)"
info "  - asr      ~3GB(torch 2GB 是大头,pip 会显示百分比)"
info "  - frontend ~50MB(node build + nginx)"
info ""
info "如果某一步长时间没动:"
info "  - pip 下 torch: 正常,2GB 走清华源约 5-10 分钟"
info "  - playwright install chromium: 正常,下 100MB + apt 装 libnss3 等系统库"
info "  - apt-get update: <10 秒;超过 30 秒说明 apt 源慢,可 Ctrl+C 后手改 Dockerfile"
info ""
info "==================== BUILD 开始 ===================="

# --progress=plain 强制流式纯文本输出(不用交互式 TTY 进度条,便于日志可见)
# 不加 -d,前台跑,build 完再 up
if ! $COMPOSE build --progress=plain; then
  fail "build 失败。scrollback 里找最后一个 ERROR 行(通常是网络/依赖问题),把它贴出来。"
fi

info ""
info "==================== BUILD 完成,启动服务 ===================="
$COMPOSE up -d

# ============================================================
# 等就绪
# ============================================================
info "等待服务就绪(最多 60 秒)..."
for i in $(seq 1 30); do
  # backend + frontend 就位就算 OK,ASR 首次下模型会更久,前端能起就先给 URL
  if $COMPOSE ps 2>/dev/null | grep -q "backend.*Up" && \
     $COMPOSE ps 2>/dev/null | grep -q "frontend.*Up"; then
    ok "backend + frontend 已启动"
    break
  fi
  sleep 2
done

# ============================================================
# 汇报
# ============================================================
cat <<EOF

${GREEN}✅ Docker 环境已启动${NC}

访问:
  ${BLUE}前端:${NC} http://localhost:5173
  ${BLUE}后端:${NC} http://localhost:3000
  ${BLUE}ASR :${NC} http://localhost:8000

常用命令:
  查看日志:       $COMPOSE logs -f [backend|frontend|asr]
  查看状态:       $COMPOSE ps
  重启单服务:     $COMPOSE restart backend
  停止全部:       ./bootstrap-docker.sh down
  清理数据卷:     $COMPOSE down -v(⚠️ 会删掉 FunASR 1.9G 模型,下次要重下)

注意:
  - ASR 首次调用会阻塞下载 FunASR 模型(约 1.9G),期间前端可能显示"文案提取失败"
  - 抖音提取所需 chromium 已内置于 backend 镜像
  - backend/.env 里的 API Key 修改后需重启 backend: $COMPOSE restart backend
EOF

if [ "$MODE" = "up-logs" ]; then
  info "跟随日志(Ctrl+C 退出,不影响服务运行)..."
  $COMPOSE logs -f
fi
