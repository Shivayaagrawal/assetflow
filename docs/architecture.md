# Backend & Infrastructure Architecture

Infrastructure patterns for AssetFlow — Docker, CI, auth, and notification design.

> System design: [hld.md](./hld.md) · Implementation detail: [lld.md](./lld.md)

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15, App Router, TypeScript strict |
| ORM | Prisma |
| Database | PostgreSQL 16 in Docker |
| Auth | Better Auth |
| Validation | Zod (`lib/env.ts` + feature schemas) |
| Containerization | Docker Compose multi-stage build |
| CI | GitHub Actions + Postgres service container |

---

## Layered Architecture

```
app/ (routing)  →  features/ (business logic)  →  lib/ (infrastructure)  →  prisma/
```

| Layer | Owns |
|-------|------|
| `app/` | Pages, layouts, route handlers — no business logic |
| `features/*` | `actions.ts`, `queries.ts`, `schemas.ts` per domain |
| `lib/` | Prisma singleton, auth, session helpers, env, logger |
| PostgreSQL | Constraints, indexes, transactions |

---

## Database Constraints

### Booking Overlap (EXCLUDE)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING GIST (
    "assetId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status IN ('UPCOMING', 'ONGOING'));
```

API catches `23P01` → `409 BOOKING_002`.

### Active Allocation (Partial Unique Index)

```sql
CREATE UNIQUE INDEX one_active_allocation_per_asset
  ON "Allocation" ("assetId") WHERE status = 'ACTIVE';
```

API catches `23505` → holder identity + transfer offer.

### Auto-Install `btree_gist`

`docker/init-extensions.sql` runs on first Postgres container start — no manual step required.

---

## Prisma Singleton

`src/lib/db.ts` — one `PrismaClient` instance, never duplicated.

```
DATABASE_URL=...?connection_limit=10&pool_timeout=20
```

For the single-container Docker deployment: `connection_limit=10` (not serverless `connection_limit=1`).

---

## Notification Architecture

| Trigger type | Pattern |
|--------------|---------|
| Event (allocate, book, approve, close audit) | `createNotification(tx, ...)` inside same `$transaction` |
| Time (overdue return) | `GET /api/cron/overdue-check` with `Bearer CRON_SECRET` |

Frontend: SWR polling against notification queries.

---

## Auth — Defense in Depth

| Layer | File | Role |
|-------|------|------|
| 1 | `middleware.ts` | Cookie-existence redirect (optimistic) |
| 2 | `lib/session.ts` | `requireSession()`, `requireRole()`, `requireDepartmentAccess()` |

Every Server Action starts with Layer 2. Identity never comes from request body.

---

## Docker

```bash
# Dev — Postgres only
docker compose up -d postgres
npm run dev

# Full stack
docker compose up --build

# Dev hot-reload
docker compose -f docker-compose.yml -f docker/docker-compose.override.yml up
```

Health: `GET /api/health` returns 503 when DB is unreachable.

---

## CI Pipeline

`.github/workflows/ci.yml`:

```
install → btree_gist → prisma generate → lint → typecheck → test → build
```

`.github/workflows/migrate-check.yml` — validates constraint migrations on PRs touching `prisma/`.

---

## Transaction Boundaries

| Workflow | Atomic steps |
|----------|-------------|
| Allocate | Allocation → asset status → activity log → notification |
| Approve maintenance | Request status → asset UNDER_MAINTENANCE → activity → notification |
| Resolve maintenance | Request RESOLVED → asset AVAILABLE → activity → notification |
| Close audit | Lock cycle → Missing → Lost → report → notifications |

---

## Environment Variables

Validated at boot via `src/lib/env.ts`. See `.env.example`.

---

## Related Documents

- [hld.md](./hld.md) — high-level system design
- [lld.md](./lld.md) — schema, sequences, API contracts
- [execution-plan.md](./execution-plan.md) — build timeline
