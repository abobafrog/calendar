.PHONY: up down migrate seed test lint format typecheck frontend-test

up:
	docker compose up --build

down:
	docker compose down

migrate:
	docker compose run --rm backend alembic upgrade head

seed:
	docker compose run --rm backend python -m app.db.seed

test:
	docker compose run --rm backend sh -c "PYTHONPATH=. pytest"

lint:
	docker compose run --rm backend ruff check .
	cd frontend && npm run lint

format:
	docker compose run --rm backend ruff format .
	cd frontend && npm run format

typecheck:
	docker compose run --rm backend mypy app
	cd frontend && npm run typecheck

frontend-test:
	cd frontend && npm test -- --run
