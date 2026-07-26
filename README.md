# TimeTogether

TimeTogether is a web MVP for private collaborative scheduling. Users sign up with email/password, add busy intervals, connect with friends, find common free slots and propose meetings.

## Local Run

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

- Web app: http://localhost:5173
- API health: http://localhost:8000/health
- API docs in development: http://localhost:8000/docs

## Environment

Required:

```env
APP_SECRET_KEY=replace-with-at-least-32-random-characters
DATABASE_URL=postgresql+asyncpg://timetogether:timetogether@postgres:5432/timetogether
REDIS_URL=redis://redis:6379/0
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
VITE_API_URL=/api/v1
```

The frontend Vite dev server proxies `/api` requests to the backend container.

## Architecture

```text
React/Vite web app
  -> FastAPI routers
  -> services
  -> repositories
  -> SQLAlchemy async models
  -> PostgreSQL

Redis powers existing rate limiting and background queues.
```

Core layers:

- `backend/app/api/v1` - REST routers
- `backend/app/schemas` - Pydantic request/response schemas
- `backend/app/services` - business logic
- `backend/app/repositories` - persistence queries
- `backend/app/models` - database models
- `backend/app/core/security.py` - JWT, password hashing, auth dependencies
- `frontend/src/pages` - app screens
- `frontend/src/components` - reusable glass UI components

## Auth

The web app supports:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Email/password auth stores only a PBKDF2 password hash and issues a short-lived TimeTogether JWT.

## Deployment Notes

For Caddy on a single domain:

```caddyfile
froklalol.ru {
    reverse_proxy /api/* localhost:8000
    reverse_proxy localhost:5173
}
```

Then set:

```env
FRONTEND_URL=https://froklalol.ru
ALLOWED_ORIGINS=https://froklalol.ru
VITE_API_URL=/api/v1
```

## Commands

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.db.seed
```

## Privacy Rules

- A user sees full details of their own intervals.
- Friends see availability only after an accepted friendship.
- Private friend intervals expose only busy status.
- Hidden intervals are used for availability calculations but not shown as details.
- Calendar and meeting endpoints run backend permission checks; frontend state is not trusted.
