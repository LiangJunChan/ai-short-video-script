#!/usr/bin/env bash
# bootstrap.sh — 一键初始化本机开发环境（仅 macOS）
#
# 用法：
#   ./bootstrap.sh          # 默认：检测缺依赖时报错并给安装命令
#   ./bootstrap.sh --check  # 只做体检、不装 pip / npm 依赖
#
# 完成后：
#   1. asr/.venv     → FunASR + FastAPI
#   2. backend/.venv → Playwright + Chromium
#   3. frontend/node_modules → pnpm 依赖
#   4. backend/.env  → 从 .env.example 拷贝（若不存在），并写入 PYTHON_BIN
#
# 设计原则：
#   - 缺 brew / node / go / ffmpeg / python@3.13 一律报错 + 给命令，不代装
#   - Python 用绝对路径找 3.13，不依赖 `python3` 这个名字
#   - Go 端通过 backend/.env 里的 PYTHON_BIN 稳定命中 venv
set -e

# ============================================================
# 颜色输出
# ============================================================
if [ -t 1 ]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; NC=""
fi

info()  { printf "${BLUE}[bootstrap]${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}[ ok ]${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}[warn]${NC} %s\n" "$*"; }
fail()  { printf "${RED}[fail]${NC} %s\n" "$*" >&2; exit 1; }

# ============================================================
# 定位项目根
# ============================================================
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 清除可能干扰 venv 的环境变量（TRAE 等 IDE 可能设置 PYTHONHOME）
unset PYTHONHOME

CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) fail "未知参数：$arg（--help 查看用法）" ;;
  esac
done

# ============================================================
# 体检：仅 macOS
# ============================================================
if [ "$(uname -s)" != "Darwin" ]; then
  fail "本脚本仅支持 macOS。Linux 请参考 docs/DEPLOY-FRP.md 或 docker-compose.yml（后者暂不完整）。"
fi

# ============================================================
# 体检：brew
# ============================================================
if ! command -v brew >/dev/null 2>&1; then
  cat >&2 <<EOF

${RED}❌ 未检测到 Homebrew。${NC}

请先运行下面这条官方命令安装（会要求 sudo 密码，装完记得按提示 source ~/.zprofile 让 brew 进 PATH）：

  /bin/bash -c "\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

装好后重新运行 ./bootstrap.sh 即可。
EOF
  exit 1
fi
ok "Homebrew 已安装：$(brew --version | head -1)"

# ============================================================
# 体检：Node / pnpm / Go / FFmpeg / Python 3.13
# ============================================================
missing=()

command -v node    >/dev/null 2>&1 || missing+=("node")
command -v pnpm    >/dev/null 2>&1 || missing+=("pnpm")
command -v go      >/dev/null 2>&1 || missing+=("go")
command -v ffmpeg  >/dev/null 2>&1 || missing+=("ffmpeg")

# 找 python3.13 —— 不依赖 `python3` 这个名字
PYTHON_BIN=""
for candidate in \
    /opt/homebrew/opt/python@3.13/bin/python3.13 \
    /usr/local/opt/python@3.13/bin/python3.13 \
    "$(command -v python3.13 2>/dev/null || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  missing+=("python@3.13")
fi

if [ ${#missing[@]} -gt 0 ]; then
  cat >&2 <<EOF

${RED}❌ 缺以下依赖：${missing[*]}${NC}

请运行下面这条命令一次装齐：

  brew install ${missing[*]}

若已通过其它方式安装（pyenv / asdf / nvm），请确保命令在 PATH 里，再重跑 ./bootstrap.sh。
EOF
  exit 1
fi

ok "Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"
ok "Node:   $(node --version)"
ok "pnpm:   $(pnpm --version)"
ok "Go:     $(go version | awk '{print $3}')"
ok "FFmpeg: $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"

if [ "$CHECK_ONLY" -eq 1 ]; then
  info "--check 模式，跳过 pip/pnpm/venv 步骤。"
  exit 0
fi

# ============================================================
# ASR 引擎自动选择（按可用内存，与 bootstrap-docker.sh 逻辑一致）
#   sherpa (低内存 ONNX): 总内存 < 3G → 阿里云等小机器
#   funasr (torch 高内存): 总内存 >= 3G → MacBook 等开发机
# 用户可显式覆盖: ASR_ENGINE=sherpa ./bootstrap.sh
# ============================================================
if [ -n "$ASR_ENGINE" ]; then
  ASR_ENGINE_LOCAL="$ASR_ENGINE"
else
  ASR_ENGINE_LOCAL=""
fi

if [ -z "$ASR_ENGINE_LOCAL" ]; then
  MEM_MB=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%d", $1/1024/1024}' || echo 0)
  if [ "$MEM_MB" -gt 0 ] && [ "$MEM_MB" -lt 3072 ]; then
    ASR_ENGINE_LOCAL="sherpa"
    info "检测到内存 ${MEM_MB}MB (<3G) → ASR 引擎自动选 sherpa(低内存 ONNX)"
  else
    ASR_ENGINE_LOCAL="funasr"
    info "检测到内存 ${MEM_MB}MB (>=3G) → ASR 引擎自动选 funasr(torch)"
  fi
else
  info "ASR_ENGINE 已由环境指定为: $ASR_ENGINE_LOCAL"
fi

# 根据引擎选择对应的 requirements 文件
if [ "$ASR_ENGINE_LOCAL" = "sherpa" ]; then
  ASR_REQ_FILE="asr/requirements.sherpa.txt"
else
  ASR_REQ_FILE="asr/requirements.funasr.txt"
fi

# ============================================================
# 建 ASR venv
# ============================================================
info "[1/4] 初始化 asr/.venv (引擎: ${ASR_ENGINE_LOCAL})..."
if [ ! -x asr/.venv/bin/python ]; then
  "$PYTHON_BIN" -m venv asr/.venv
  asr/.venv/bin/pip install --quiet --upgrade pip
  asr/.venv/bin/pip install --quiet -r "$ASR_REQ_FILE"
  ok "asr/.venv 已创建并装好依赖 (引擎: ${ASR_ENGINE_LOCAL})"
else
  # 根据引擎类型检测关键模块
  if [ "$ASR_ENGINE_LOCAL" = "funasr" ]; then
    CHECK_IMPORT="import funasr, fastapi"
  else
    CHECK_IMPORT="import sherpa_onnx, fastapi"
  fi
  if ! asr/.venv/bin/python -c "$CHECK_IMPORT" 2>/dev/null; then
    info "     → 检测到 asr/.venv 存在但依赖不完整(引擎: ${ASR_ENGINE_LOCAL})，补装..."
    asr/.venv/bin/pip install --quiet -r "$ASR_REQ_FILE"
    ok "asr/.venv 依赖补齐 (引擎: ${ASR_ENGINE_LOCAL})"
  else
    ok "asr/.venv 已就绪(跳过 pip)"
  fi
fi

# ============================================================
# 建 backend venv + Playwright + Chromium
# ============================================================
info "[2/4] 初始化 backend/.venv (Playwright)..."
if [ ! -x backend/.venv/bin/python ]; then
  "$PYTHON_BIN" -m venv backend/.venv
  backend/.venv/bin/pip install --quiet --upgrade pip
  backend/.venv/bin/pip install --quiet -r backend/requirements.txt
  ok "backend/.venv 已创建并装好 playwright"
elif ! backend/.venv/bin/python -c "import playwright" 2>/dev/null; then
  info "     → 检测到 backend/.venv 存在但缺 playwright，补装..."
  backend/.venv/bin/pip install --quiet -r backend/requirements.txt
  ok "backend/.venv playwright 补齐"
else
  ok "backend/.venv 已就绪(跳过 pip)"
fi

# Chromium 自身幂等：已装会输出 "chromium is already installed"，未装才下载
# 注意:playwright 1.49+ 用 chromium-headless-shell(小型 headless 专用二进制),
# `p.chromium.launch(headless=True)` 优先找它,不装会报 "Executable doesn't exist"
info "     → 确认 Chromium + headless-shell 已装(playwright install 自身幂等)..."
if backend/.venv/bin/python -m playwright install chromium chromium-headless-shell 2>&1 | grep -qi "downloaded\|installing"; then
  ok "Chromium 首次装完(缓存在 ~/Library/Caches/ms-playwright/)"
else
  ok "Chromium + headless-shell 已在缓存,复用现有(勿再下)"
fi

# ============================================================
# 前端 deps
# ============================================================
info "[3/4] 安装前端依赖 (pnpm install)..."
if [ -d frontend/node_modules ] && [ -f frontend/pnpm-lock.yaml ]; then
  # 已有依赖:跑 frozen-lockfile 快速校验(锁文件与已装一致时秒完成)
  if (cd frontend && pnpm install --frozen-lockfile --silent) 2>/dev/null; then
    ok "frontend/node_modules 已就绪(pnpm 校验通过)"
  else
    info "     → 锁文件变动,重跑 pnpm install..."
    (cd frontend && pnpm install --silent)
    ok "frontend/node_modules 已更新"
  fi
else
  (cd frontend && pnpm install --silent)
  ok "frontend/node_modules 已装好"
fi

# ============================================================
# .env 模板
# ============================================================
info "[4/4] 生成 backend/.env (若不存在)..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  # 追加 PYTHON_BIN，让 Go 稳定命中 venv 里的 python
  printf '\n# 抖音提取脚本用的 Python（由 bootstrap.sh 写入，勿手改）\nPYTHON_BIN=%s/backend/.venv/bin/python\n' "$PROJECT_ROOT" >> backend/.env
  warn "已从 .env.example 生成 backend/.env —— 请填入你的 API Key 后再启动服务"
else
  # 已有 .env：只补 PYTHON_BIN（如果没有）
  if ! grep -q "^PYTHON_BIN=" backend/.env; then
    printf '\n# 抖音提取脚本用的 Python（由 bootstrap.sh 写入，勿手改）\nPYTHON_BIN=%s/backend/.venv/bin/python\n' "$PROJECT_ROOT" >> backend/.env
    ok "已向现有 backend/.env 追加 PYTHON_BIN"
  else
    ok "backend/.env 已有 PYTHON_BIN，跳过"
  fi
fi

# ============================================================
# 建运行时目录
# ============================================================
mkdir -p uploads thumbnails audio thumbnails/square

# ============================================================
# 冒烟测试
# ============================================================
info "冒烟测试..."
if ! backend/.venv/bin/python -c "import playwright; import sys; sys.exit(0)" 2>/dev/null; then
  fail "backend/.venv 无法 import playwright"
fi
# 冒烟测试也根据引擎类型检测
if [ "$ASR_ENGINE_LOCAL" = "funasr" ]; then
  SMOKE_IMPORT="import funasr, fastapi"
else
  SMOKE_IMPORT="import sherpa_onnx, fastapi"
fi
if ! asr/.venv/bin/python -c "$SMOKE_IMPORT; import sys; sys.exit(0)" 2>/dev/null; then
  fail "asr/.venv 无法 import ${ASR_ENGINE_LOCAL}/fastapi，请运行: asr/.venv/bin/pip install -r ${ASR_REQ_FILE}"
fi
ok "Python 依赖 import 检查通过 (ASR 引擎: ${ASR_ENGINE_LOCAL})"

# ============================================================
# 完成
# ============================================================
cat <<EOF

${GREEN}✅ 环境就绪！${NC}

下一步：
  1. 编辑 ${BLUE}backend/.env${NC} 填入你的 API Key（LLM / Agnes 等）
  2. 启动所有服务：
       ${BLUE}make dev${NC}
     或
       ${BLUE}./start.sh${NC}
  3. 打开 http://localhost:5173

提示：
  - ASR 引擎: ${GREEN}${ASR_ENGINE_LOCAL}${NC}（可根据内存自动选择，也可 ASR_ENGINE=sherpa ./bootstrap.sh 覆盖）
$(if [ "$ASR_ENGINE_LOCAL" = "funasr" ]; then
  echo "  - ASR 首次启动会从 ModelScope 下载 ~1.9G FunASR 模型，请耐心等待"
else
  echo "  - ASR 使用 sherpa-onnx 引擎，模型已包含在 asr/models/ 目录"
fi)
  - 抖音链接提取需要 Chromium（已自动装）
  - 只体检不装依赖：./bootstrap.sh --check
EOF
