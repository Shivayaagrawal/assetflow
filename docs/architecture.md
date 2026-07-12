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
| Validation | Zod (`lib/env.ts` + module validators) |
| Containerization | Docker Compose multi-stage build |
| CI | GitHub Actions + Postgres service container |

---

## Layered Architecture

```
app/ (routing)  →  modules/ (domain)  →  shared/ (cross-cutting)  →  lib/ (infrastructure)
```

| Layer | Owns |
|-------|------|
| `app/` | Pages, layouts, route handlers — no business logic |
| `modules/*` | `actions/`, `validators/`, `policies/`, `services/`, `repositories/` per domain |
| `shared/` | Auth, errors, transactions, validation, types |
| `lib/` | Prisma singleton, Better Auth, env, logger |
| PostgreSQL | Constraints, indexes, transactions |

### Request Flow (mutations)

```
Server Action → Validator → Policy → Application Service → Repository → PostgreSQL
```

- **One workflow = one service** (`AllocateAssetService`, not `AssetService`)
- **Every module has one repository from day one** — small, focused, no generic base
- Repositories never call other repositories; services orchestrate
- Transaction boundaries open in services via `withTransaction()`
- **Repositories never start transactions** — only services call `withTransaction()`
- Modules depend on `shared/` only — never import from other modules

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

### Active Maintenance (Partial Unique Index)

```sql
CREATE UNIQUE INDEX one_active_maintenance_per_asset
  ON "MaintenanceRequest" ("assetId")
  WHERE status NOT IN ('REJECTED', 'RESOLVED');
```

### Notification Deduplication

```sql
CREATE UNIQUE INDEX notification_dedup_key
  ON "Notification" ("type", "relatedEntityId", "recipientId");
```

Full inventory: [backend/database/constraints.md](../backend/database/constraints.md).

### Auto-Install `btree_gist`

`docker/init-extensions.sql` runs on first Postgres container start — no manual step required.

---

## Prisma Singleton

`src/lib/db.ts` — one `PrismaClient` instance, never duplicated.

```
DATABASE_URL=...?connection_limit=10&pool_timeout=20
```

For the single-container Docker deployment: `connection_limit=10` (not serverless `connection_limit=1`).

Repositories accept an optional transaction client for use inside `withTransaction()`.

---

## Notification Architecture

| Trigger type | Pattern |
|--------------|---------|
| Event (allocate, book, approve, close audit) | `createNotification(tx, ...)` inside same `$transaction` |
| Time (overdue return) | `GET /api/cron/overdue-check` with `Bearer CRON_SECRET` |

Frontend: SWR polling against notification queries.

---

## Auth — Defense in Depth

Engineering reference: [auth-lifecycle.md](../backend/engineering/auth-lifecycle.md) · [security.md](../backend/engineering/security.md)

| Layer | File | Role |
|-------|------|------|
| 1 | `middleware.ts` | Cookie-existence redirect (optimistic) |
| 2 | `shared/auth/session.ts` | `requireSession()` — token validation |
| 3 | `shared/auth/session.ts` | `requireSessionUser()` — fresh DB lookup (role + status) |
| 4 | `modules/*/policies/` | `canX()` / `assertRole()` / `assertDepartmentAccess()` |

Every Server Action starts with `requireSessionUser()`. Authorization decisions live in policies — not inline role checks.

---

## Concurrency & Idempotency

Every workflow documents: race condition, transaction, DB constraint, failure response.

| Workflow | Race | Protection | Response |
|----------|------|------------|----------|
| Allocate | Two managers allocate simultaneously | Partial unique index | 409 ASSET_004 |
| Booking | Overlapping slots | EXCLUDE constraint | 409 BOOKING_002 |
| Transfer | Approve twice | `WHERE status = 'PENDING'` | 409 |
| Return | Double click | Status validation | 409 ALLOC_003 |
| Close audit | Close twice | Cycle status check | 409 AUDIT_003 |

Idempotency rule: every mutation answers "if repeated, what happens?" — see [lld.md §10](./lld.md).

---

## Docker

Local development uses **PostgreSQL 16 in Docker only** (no Redis, message queues, or extra services).

```bash
docker compose up -d postgres   # localhost:5433 → container 5432
npm run dev
```

`DATABASE_URL` must point at `localhost:5433` (see `.env.example`). This avoids conflicts with Homebrew PostgreSQL or other projects on port 5432.

Health: `GET /api/health` runs `SELECT 1` via Prisma; returns 503 when DB is unreachable.

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
- [errors.md](./errors.md) — canonical error catalogue
- [execution-plan.md](./execution-plan.md) — build timeline
- [../backend/database/constraints.md](../backend/database/constraints.md) — PostgreSQL guarantees
- [../backend/engineering/state-transition-matrix.md](../backend/engineering/state-transition-matrix.md) — asset lifecycle
