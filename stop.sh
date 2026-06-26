#!/bin/bash
# AI 短视频脚本 - 一键停止所有服务

PROJECT_DIR="/Users/chenliangjun/code/project/ai-short-video-script"
PID_FILE="$PROJECT_DIR/.services.pids"

echo ">>> 停止服务..."

# 方式1：按 PID 文件精确杀
if [[ -f "$PID_FILE" ]]; then
    read -r FRPC_PID ASR_PID BACKEND_PID FRONTEND_PID < "$PID_FILE"
    kill -9 $FRPC_PID $ASR_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm -f "$PID_FILE"
fi

# 方式2：按进程名兜底杀
pkill -f "frpc -c" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true
pkill -f "go run \." 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true

# 方式3：按端口杀
lsof -i :5173 -i :3000 -i :8000 -i :7000 -t 2>/dev/null | xargs kill -9 2>/dev/null || true

sleep 1

# 验证
REMAINING=$(lsof -i :5173 -i :3000 -i :8000 2>/dev/null | grep LISTEN | wc -l | tr -d ' ')
if [[ "$REMAINING" -eq 0 ]]; then
    echo "✅ 全部服务已停止，端口已释放。"
else
    echo "⚠️  仍有进程占用端口:"
    lsof -i :5173 -i :3000 -i :8000 2>/dev/null | grep LISTEN
fi
