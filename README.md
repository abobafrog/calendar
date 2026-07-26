# TimeTogether

TimeTogether is an MVP Telegram Mini App for private collaborative scheduling. It lets a small group see only accepted friends' availability, calculate common free time, and propose meetings without leaking private event details.

## Run locally

1. Install Docker Desktop and start it.
2. From this directory run:

```bash
cp .env.example .env
docker compose up --build
```

The Mini App is available at `http://localhost:5173`, the API at `http://localhost:8000`, and API docs at `http://localhost:8000/docs` in development. Configure a real `BOT_TOKEN` and public HTTPS `MINI_APP_URL` before using Telegram. The stack starts only real-user mode; no demo users are created automatically.

## Useful commands

```bash
make migrate       # apply Alembic migrations
make lint          # Ruff and ESLint
make typecheck     # mypy and TypeScript
```

The backend uses Python 3.12, FastAPI, SQLAlchemy async, Alembic, PostgreSQL, Redis, Pydantic v2 and aiogram 3. The Mini App uses React, TypeScript, Vite, TanStack Query, React Router, `@tma.js/sdk-react`, Lucide icons and regular CSS.

## Architecture

```text
Telegram Mini App -> REST API -> services -> repositories -> PostgreSQL
       |                 |             |             |
       |                 |             |             +-- users, friendships, calendars,
       |                 |             |                 meetings, notifications
       |                 |             +-- permissions, interval merging, availability,
       |                 |                 meeting conflicts
       |                 +-- Telegram init data verification -> short-lived JWT
       +-- tma.js SDK: theme params, viewport, safe-area, raw init data

Telegram Bot -> aiogram handlers -> services
                         ^
Redis rate limiting + one-time init-data replay keys + notification queue
```

Routers contain transport validation and dependency wiring only. Business rules live in services; object-level access is centralized in `app/services/permissions.py`. Repositories own SQLAlchemy queries.

## Privacy decisions

- Calendar access is allowed for the owner or an `accepted` friendship only.
- `private` intervals expose only the busy fact to a friend; title is removed.
- `friends` intervals expose the title to a friend.
- `hidden` intervals are omitted from calendar responses but are included in availability calculations.
- Exact username lookup, invite codes and Telegram deep links are supported. There is no public directory search.
- The backend never trusts user identity fields from frontend payloads; it verifies Telegram init data, finds/creates by Telegram ID, and issues a short-lived JWT.
- Init data is accepted only within its short IANA-time-aware validity window; invitations and lookup/availability searches are rate limited. Fresh init data can be reused when Telegram reloads the Mini App.

## Time and meeting decisions

- All stored datetimes are timezone-aware UTC values. IANA timezone names are validated with `zoneinfo`.
- API request ranges use ISO 8601 offsets and are normalized to UTC.
- Intervals use the half-open convention `[start_at, end_at)`.
- Overlapping and touching personal busy intervals merge automatically. If merged intervals have different visibility, the result is downgraded to `private`.
- Availability windows are defined in the requester's IANA timezone, converted to UTC, then intersected with the union of all participants' busy time. DST transitions are handled by local-time round trips.
- A meeting is confirmed only after every participant accepts. Before confirmation, all participant rows are locked and conflicts are checked again. A conflict returns HTTP 409 with a generic warning and leaves the meeting pending.
- Confirmed meetings create `BusyInterval` rows linked to the meeting. Cancelling a meeting removes those linked calendar rows.

## MVP boundary

Included: Telegram auth, users/settings, exact friend discovery, incoming/outgoing invitations, accept/reject/block/remove, private calendar intervals with bulk creation and merging, day/week-oriented Mini App calendar, friend overlay, common availability search, meeting proposals and responses, conflict checks, notification queue, bot commands and inline actions, themes, safe-area responsive UI, Docker Compose, Ruff, mypy, ESLint and Prettier.

Intentionally deferred: real-time WebSocket updates, recurring rules beyond bulk repeated dates, calendar-provider sync, file attachments, group ownership/roles, full chat threads, push notification analytics, and production Telegram webhook deployment. These are outside the smallest privacy-safe MVP and can be added without moving business logic into routers or bot handlers.
