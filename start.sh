#!/usr/bin/env bash
# start.sh — 启动全部本地服务（ASR + backend + frontend）
#
# 用法：
#   ./start.sh          启动 ASR + backend + frontend
#   ./start.sh --frp    额外启动 FRP 隧道（需先按 docs/DEPLOY-FRP.md 配置）
#
# 依赖 bootstrap.sh 已跑过（asr/.venv、backend/.venv、frontend/node_modules 存在）
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

USE_FRP=0
for arg in "$@"; do
  case "$arg" in
    --frp) USE_FRP=1 ;;
    *) echo "未知参数：$arg（--frp 启用 FRP 隧道）" >&2; exit 1 ;;
  esac
done

# ============================================================
# 前置检查
# ============================================================
if [ ! -x "$PROJECT_DIR/asr/.venv/bin/python" ] || [ ! -x "$PROJECT_DIR/backend/.venv/bin/python" ]; then
  echo "❌ 未检测到 asr/.venv 或 backend/.venv，请先运行 ./bootstrap.sh" >&2
  exit 1
fi

if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
  echo "❌ backend/.env 不存在，请先运行 ./bootstrap.sh" >&2
  exit 1
fi

# ============================================================
# 清理旧进程
# ============================================================
echo ">>> 清理旧进程..."
pkill -f "node.*vite"        2>/dev/null || true
pkill -f "go run \."         2>/dev/null || true
pkill -f "python.*app\.py"   2>/dev/null || true
if [ "$USE_FRP" -eq 1 ]; then
  pkill -f "frpc -c"         2>/dev/null || true
fi
# 按端口兜底
lsof -i :5173 -i :3000 -i :8000 -t 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

PIDS=()

# ============================================================
# FRP（可选）
# ============================================================
if [ "$USE_FRP" -eq 1 ]; then
  FRP_DIR=$(find "$PROJECT_DIR" -maxdepth 2 -type d -name "frp_*" 2>/dev/null | head -1)
  if [ -n "$FRP_DIR" ] && [ -x "$FRP_DIR/frpc" ] && [ -f "$FRP_DIR/frpc.toml" ]; then
    echo ">>> 启动 frpc 隧道 ($FRP_DIR)..."
    (cd "$FRP_DIR" && ./frpc -c frpc.toml &)
    PIDS+=($!)
  else
    echo "⚠️  --frp 已指定但没找到可用的 frpc（预期路径 frp_*/frpc + frpc.toml），跳过"
  fi
fi

# ============================================================
# ASR
# ============================================================
echo ">>> 启动 ASR 服务 (:8000)..."
"$PROJECT_DIR/asr/.venv/bin/python" "$PROJECT_DIR/asr/app.py" &
PIDS+=($!)

# ============================================================
# Backend
# ============================================================
echo ">>> 启动后端 (:3000)..."
(cd "$PROJECT_DIR/backend" && go run . &)
PIDS+=($!)

# ============================================================
# Frontend
# ============================================================
echo ">>> 启动前端 (:5173)..."
(cd "$PROJECT_DIR/frontend" && pnpm dev -- --host &)
PIDS+=($!)

sleep 5

# ============================================================
# 端口验证
# ============================================================
P5173=$(lsof -i :5173 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')
P3000=$(lsof -i :3000 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')
P8000=$(lsof -i :8000 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')

echo ""
echo "=== 服务状态 ==="
if [[ "$P5173" -gt 0 && "$P3000" -gt 0 && "$P8000" -gt 0 ]]; then
  echo "✅ 全部服务启动成功"
  echo "   前端: http://localhost:5173"
  echo "   后端: http://localhost:3000"
  echo "   ASR : http://localhost:8000"
else
  echo "⚠️  部分服务可能未就绪"
  [[ "$P5173" -eq 0 ]] && echo "   frontend :5173  未监听"
  [[ "$P3000" -eq 0 ]] && echo "   backend  :3000  未监听（首次启动 ASR 会阻塞下载 1.9G 模型，请稍等）"
  [[ "$P8000" -eq 0 ]] && echo "   ASR      :8000  未监听"
fi

# 保存 PID 供 stop.sh 用
printf '%s ' "${PIDS[@]}" > "$PROJECT_DIR/.services.pids"
