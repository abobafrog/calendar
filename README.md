# TimeTogether

TimeTogether is a web MVP for private collaborative scheduling. Users sign up with a username/password, add busy intervals, connect with friends, find common free slots and propose meetings.

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
APP_SECRET_KEY=development-only-not-for-production-change-this-64-characters-now
DATABASE_URL=postgresql+asyncpg://timetogether:timetogether@postgres:5432/timetogether
REDIS_URL=redis://redis:6379/0
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
VITE_API_URL=/api/v1
```

Docker Compose builds the frontend into static files served by unprivileged Nginx. Nginx proxies `/api` requests to the backend container; Vite is used only by `npm run dev` during local frontend development.

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

Password auth stores only a PBKDF2-SHA256 hash with a per-password random salt. After login, the backend issues a signed JWT session with an eight-hour maximum lifetime. The browser receives it in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production), so frontend JavaScript cannot read or copy the token. Every private API request validates its signature, expiry, issuer, audience and session ID, then loads the user from the database. Logout revokes that session ID in Redis until expiry and removes the cookie. Telegram login validates fresh signed Mini App launch data before creating the same kind of session.

The production container generates a persistent random signing key in the `backend_secrets` Docker volume. For a non-Docker deployment, generate `APP_SECRET_KEY` with `openssl rand -base64 48`; changing it signs every user out.

Authentication endpoints and high-volume write/search operations are rate-limited in Redis. Browser writes also validate the `Origin` header, request bodies are capped at 1 MiB, and production responses include defensive security headers.

## Deployment Notes

For Caddy on a single domain (both published ports are loopback-only):

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
- Accepted friends see the title and short summary only when an interval is marked as visible to friends.
- A private interval still occupies its time range, but friends receive only the status `Busy`, without its title.
- Non-friends cannot request a calendar at all; interval IDs are also checked against their owner before edits or deletion.
- Calendar and meeting endpoints run backend permission checks; frontend state is not trusted.

## Demo Payment

The 99 ₽ payment sheet is intentionally a UI simulation. It offers VISA, SBP and Mir Pay, shows four delayed processing messages, and creates the calendar interval only after the simulated confirmation. It does not collect card data, contact a payment provider or charge money; a real launch needs a server-side payment provider and webhook verification.
