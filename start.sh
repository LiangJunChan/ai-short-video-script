#!/bin/bash
# AI 短视频脚本 - 一键启动所有服务
set -e

PROJECT_DIR="/Users/chenliangjun/code/project/ai-short-video-script"
FRP_DIR="$PROJECT_DIR/frp_0.61.1_darwin_arm64"

echo ">>> 清理旧进程..."
# 杀掉已有的 frpc、node (vite)、go、asr python 进程
pkill -f "frpc -c" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true
pkill -f "go run \." 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
# 按端口杀掉
lsof -i :5173 -i :3000 -i :8000 -i :7000 -t 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

echo ">>> 启动 frpc 隧道..."
cd "$FRP_DIR"
./frpc -c frpc.toml &
FRPC_PID=$!

echo ">>> 启动 ASR 服务 (:8000)..."
$PROJECT_DIR/asr/.venv/bin/python $PROJECT_DIR/asr/app.py &
ASR_PID=$!

echo ">>> 启动后端 (:3000)..."
cd "$PROJECT_DIR/backend"
go run . &
BACKEND_PID=$!

echo ">>> 启动前端 (:5173)..."
cd "$PROJECT_DIR/frontend"
pnpm dev -- --host &
FRONTEND_PID=$!

sleep 5

echo ""
echo "=== 进程列表 ==="
echo "frpc     PID=$FRPC_PID"
echo "ASR      PID=$ASR_PID"
echo "backend  PID=$BACKEND_PID"
echo "frontend PID=$FRONTEND_PID"
echo ""

# 验证端口
P5173=$(lsof -i :5173 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')
P3000=$(lsof -i :3000 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')
P8000=$(lsof -i :8000 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')

if [[ "$P5173" -gt 0 && "$P3000" -gt 0 && "$P8000" -gt 0 ]]; then
    echo "✅ 全部服务启动成功"
    echo "访问地址: http://8.138.243.181"
else
    echo "⚠️  部分服务可能未就绪"
    [[ "$P5173" -eq 0 ]] && echo "  frontend :5173  未监听"
    [[ "$P3000" -eq 0 ]] && echo "  backend  :3000  未监听"
    [[ "$P8000" -eq 0 ]] && echo "  ASR      :8000  未监听"
fi

# 保存 PID
echo "$FRPC_PID $ASR_PID $BACKEND_PID $FRONTEND_PID" > "$PROJECT_DIR/.services.pids"
