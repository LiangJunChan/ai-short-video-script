.PHONY: dev dev-backend dev-frontend dev-asr up stop

dev:
	make dev-asr & make dev-backend & make dev-frontend

dev-backend:
	cd backend && go run .

dev-frontend:
	cd frontend && pnpm dev

dev-asr:
	cd asr && source .venv/bin/activate && python app.py

up:
	docker compose up --build

stop:
	docker compose down
