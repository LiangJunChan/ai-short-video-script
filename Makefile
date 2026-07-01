.PHONY: bootstrap dev dev-backend dev-frontend dev-asr up stop check

# 首次配置 —— 检测依赖 + 建 venv + 装 chromium + 拉 pnpm deps
bootstrap:
	./bootstrap.sh

# 只体检不装依赖
check:
	./bootstrap.sh --check

# 起全部服务（前台，Ctrl+C 停）
dev:
	./start.sh

dev-backend:
	cd backend && go run .

dev-frontend:
	cd frontend && pnpm dev

# ASR 直接调 venv 的 python，无需 activate（bootstrap.sh 已建好 asr/.venv）
dev-asr:
	./asr/.venv/bin/python asr/app.py

up:
	docker compose up --build

stop:
	./stop.sh
