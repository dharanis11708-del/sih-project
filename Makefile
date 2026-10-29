.PHONY: help up down restart logs build migrate seed test lint fmt clean

help:
	@echo "ApprovalTrack - Automation & Compliance Platform"
	@echo "Usage:"
	@echo "  make up          Start multi-container production stack"
	@echo "  make down        Stop all containers"
	@echo "  make restart     Restart containers"
	@echo "  make logs        Tail service logs"
	@echo "  make build       Rebuild Docker containers"
	@echo "  make migrate     Run Alembic migrations"
	@echo "  make seed        Run realistic database seed"
	@echo "  make test        Execute test suites"
	@echo "  make lint        Run ruff / flake8 / ESLint"
	@echo "  make fmt         Format backend and frontend code"

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

build:
	docker compose build

seed:
	cd backend && python -m app.db.seed

test:
	cd backend && pytest
	cd frontend && npm test

clean:
	docker compose down -v
	rm -rf backend/__pycache__ frontend/dist

