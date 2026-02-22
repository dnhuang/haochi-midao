## Backend
.PHONY: install-backend dev-backend test-backend lint-backend

install-backend:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

test-backend:
	cd backend && .venv/bin/pytest

lint-backend:
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .

## Frontend
.PHONY: install-frontend dev-frontend test-frontend lint-frontend

install-frontend:
	cd frontend && pnpm install

dev-frontend:
	cd frontend && pnpm dev

test-frontend:
	. ~/.nvm/nvm.sh && nvm use 22 && cd frontend && pnpm test -- --run

lint-frontend:
	. ~/.nvm/nvm.sh && nvm use 22 && cd frontend && pnpm run lint

## Combined
.PHONY: install dev test lint

install: install-backend install-frontend

dev:
	@trap 'kill 0' EXIT; \
	(cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && pnpm dev) & \
	wait

test: test-backend test-frontend

lint: lint-backend lint-frontend
