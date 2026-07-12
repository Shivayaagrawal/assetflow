# AssetFlow

**Odoo Hackathon 2026 · Enterprise Asset & Resource Management**

Production-grade asset management platform for tracking assets, allocations, bookings, maintenance, and audits. Built with a **PostgreSQL-first**, **layered backend** and database-enforced business rules.

---

## Overview

| Module | Responsibility |
|--------|----------------|
| **Assets** | Registration, categorization, 7-state lifecycle, search/QR |
| **Allocations** | Assign, return, transfer — one active holder per asset |
| **Bookings** | Non-overlapping time-slot reservations for bookable assets |
| **Maintenance** | Kanban workflow with automatic asset status cascade |
| **Audits** | Cycle-based verification with immutable closure |
| **Organization** | Departments, categories, employees, role promotion |

---

## Architecture Highlights

Two Tier 1 guarantees are enforced **in PostgreSQL**:

```
Booking overlap     →  EXCLUDE USING GIST (tstzrange)
Active allocation   →  Partial unique index WHERE status = 'ACTIVE'
```

Event-triggered notifications use a **transactional outbox** — `createNotification(tx, ...)` runs inside the same transaction as the triggering mutation.

```mermaid
flowchart LR
  subgraph Stack
    Next["Next.js 15 App Router"]
    Modules["modules/* + shared/"]
    Prisma["Prisma ORM"]
    PG["PostgreSQL 16"]
  end
  Next --> Modules --> Prisma --> PG
  PG -.->|EXCLUDE + partial index| PG
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15, App Router, TypeScript strict |
| ORM | Prisma (`partialIndexes` preview) |
| Database | PostgreSQL 16 (Docker) |
| Auth | Better Auth (session-based) |
| Validation | Zod |
| Frontend data | SWR polling |
| Testing | Vitest |
| Deploy | Docker Compose |

---

## Requirements

Verify tooling before setup:

```bash
node -v          # Node.js 22 LTS recommended
npm -v           # npm 10+
docker --version
docker compose version
```

| Tool | Version |
|------|---------|
| Node.js | 22 LTS (20+ supported) |
| npm | 10+ |
| Docker Desktop | 4.x+ |
| Docker Compose | v2+ |

PostgreSQL is **not** installed on the host — it runs in Docker (local PostgreSQL 16 container).

---

## Quick Start

```bash
git clone https://github.com/Shivayaagrawal/assetflow.git
cd assetflow
cp .env.example .env

docker compose up -d postgres
npx prisma migrate dev
npm run seed
npm run dev
```

Set `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, and `CRON_SECRET` in `.env` before the first migrate (see `.env.example`).

Health check: `GET http://localhost:3000/api/health` — runs `SELECT 1` through Prisma.

---

## Troubleshooting

If Prisma reports `P1010` (user denied access) or password authentication failed:

1. Check Docker Postgres is running:
   ```bash
   docker ps
   ```
2. If not running:
   ```bash
   docker compose up -d postgres
   ```
3. Confirm `.env` uses port **5433** (Docker maps `5433` → container `5432`):
   ```
   DATABASE_URL=postgresql://assetflow:...@localhost:5433/assetflow
   ```
4. If Homebrew PostgreSQL is using port 5432, either stop it:
   ```bash
   brew services stop postgresql@17
   ```
   or keep using Docker on **5433** (recommended — no conflict with other local databases).

---

## Repository Structure

```
assetflow/
├── docs/
│   ├── hld.md              # High-level design
│   ├── lld.md              # Low-level design + sequences
│   ├── execution-plan.md   # Hackathon day-of plan
│   ├── architecture.md     # Infrastructure patterns
│   ├── business-invariants.md
│   └── errors.md           # Canonical error catalogue
├── backend/
│   ├── database/constraints.md
│   └── engineering/        # State transitions, edge cases, permissions
├── prisma/schema.prisma    # 16 core models + Better Auth tables
├── src/
│   ├── app/                # Routing only
│   ├── modules/            # Domain modules (identity, organization, booking, …)
│   ├── shared/             # Auth, errors, transactions, validation
│   ├── components/         # Shared UI
│   └── lib/                # db, auth, session, env, logger
├── docker/                 # Dockerfile + init-extensions.sql
├── tests/
└── CONVENTIONS.md
```

---

## Features by Role

| Role | Capabilities |
|------|-------------|
| **Employee** | View allocations, book resources, raise maintenance, request return/transfer |
| **Department Head** | Dept-scoped dashboard, approve requests within department |
| **Asset Manager** | Register/allocate assets, maintenance Kanban, audit cycles, search/QR |
| **Admin** | Organization Setup — departments, categories, employee directory, role promotion |

Signup creates **Employee** only. Roles are promoted exclusively via Admin → Employee Directory.

---

## Team Ownership

| Person | Owns |
|--------|------|
| **P1** | Schema, auth, identity, organization, booking (EXCLUDE), employee vertical |
| **P2** | Department Head vertical, dept-scoped approvals |
| **P3** | Assets, maintenance, audit, notifications, search/QR |

---

## P1 Gap Analysis

**Status: Demo-ready · Architecture migration complete**

P1 code now lives under `src/modules/` following the frozen stack: **Action → Policy → Service → Repository → PostgreSQL**. The legacy `src/features/` directory has been removed.

### Completion vs Execution Plan

| P1 vertical | Tier 1 requirement | Status | Notes |
|-------------|-------------------|--------|-------|
| **Schema** | 16+ models, business constraints, `btree_gist` | **Complete** | EXCLUDE + partial unique index live in migrations |
| **Auth** | Signup → Employee only, forgot/reset, logout, session purge | **Complete** | Inactive users blocked at sign-in (`AUTH_003`) |
| **Identity** | Per-request DB role/status lookup | **Complete** | `requireSessionUser()` on protected reads |
| **Organization** | Departments, categories, employee directory, promote | **Complete** | Cycle detection (`ORG_002`), last-admin guard (`ORG_005`) |
| **Booking** | EXCLUDE constraint, overlap rejection | **Complete** | DB + server-action integration test |
| **Employee vertical** | Dashboard, allocations, booking, maintenance | **Complete** | Pages wired; query identity binding needs hardening |

### Rules Compliance Matrix

Audited against `.cursor/rules/*.mdc` and `docs/*.md`, `backend/engineering/permission-matrix.md`.

| Rule source | Topic | Verdict | Summary |
|-------------|-------|---------|---------|
| `architecture.mdc` | Module layout (`src/modules/`) | **Compliant** | P1 migrated from `features/` to modules |
| `backend.mdc` | Thin actions → service → repository | **Compliant** | All P1 workflows follow the pattern |
| `api.mdc` | Response envelope on mutations | **Compliant** | `runAction` + `throwOnFailure` wrappers for forms |
| `auth.mdc` | Never trust client `userId` | **Compliant** | Session-bound queries throughout |
| `policies.mdc` | Policy objects, no inline role checks | **Compliant** | `DepartmentPolicy`, `UserPolicy`, `BookingPolicy`, etc. |
| `prisma.mdc` | Prisma only in repositories | **Compliant** | All persistence in `repositories/` |
| `services.mdc` | One workflow = one service | **Compliant** | Per-workflow services in each module |
| `performance.mdc` | No loop-then-query | **Partial** | Dept cycle walk is sequential; maintenance notifications loop |
| `review.mdc` | SOLID, DRY, KISS | **Partial** | `org-setup/actions.ts` is a multi-workflow file (~370 lines) |
| `testing.mdc` | Business rules, not CRUD | **Partial** | Cycle, last-admin, overlap covered; employee auth paths thin |
| `frontend.mdc` | No hardcoded data | **Compliant** | Dropdowns and KPIs query PostgreSQL |
| `docs/business-invariants.md` | Auth, org, booking rules | **Strong** | Core invariants enforced; email normalization pending |
| `docs/errors.md` | Canonical `AppError` codes | **Strong** | P0 cleanup replaced raw `Error("ORG_*")` / `"FORBIDDEN"` |
| `docs/lld.md` | Module contracts | **Partial** | `modules/identity/` not built; contracts live under `features/` |
| `docs/hld.md` | System design alignment | **Strong** | EXCLUDE, session re-fetch, transactional notifications match HLD |

### Target vs Actual (P1)

```mermaid
flowchart TD
  subgraph target [Target per architecture.mdc]
    PageT[app pages] --> ActionT["modules/*/actions"]
    ActionT --> PolicyT[policies]
    PolicyT --> ServiceT[services]
    ServiceT --> RepoT[repositories]
    RepoT --> DBT[(PostgreSQL)]
  end

  subgraph actual [P1 current]
    PageA[app pages] --> FeatureA["features/*/actions + queries"]
    FeatureA --> PrismaA[prisma direct]
    PrismaA --> DBA[(PostgreSQL)]
    Stub[DepartmentPolicy unused]
  end
```

**Reference implementations** (correct pattern, outside P1 scope): `src/modules/booking/`, `src/modules/allocation/`.

### Gaps by Priority

#### P0 — Correctness / security

| Gap | Rule | Location | Status |
|-----|------|----------|--------|
| Employee queries accepted `userId` without session binding | `auth.mdc` | `src/features/employee/queries.ts` | **Fixed** — identity derived from `requireSessionUser()` |
| `listDepartmentPeers` did not scope to caller's department | `auth.mdc`, `policies.mdc` | `src/features/employee/queries.ts` | **Fixed** — uses `user.departmentId` from session |

#### P1 — If time permits (not demo blockers)

| Gap | Rule | Location |
|-----|------|----------|
| P1 workflows in `features/` not `modules/` | `architecture.mdc`, `backend.mdc` | `src/features/org-setup/`, `src/features/employee/` |
| `DepartmentRepository` + `DepartmentPolicy` unused | `architecture.mdc`, `policies.mdc` | `src/modules/organization/` |
| Org/employee mutations skip `runAction` envelope | `api.mdc` | `src/features/org-setup/actions.ts` |
| No workflow services for org/employee | `services.mdc` | Missing `CreateDepartmentService`, etc. |
| `deactivateEmployee` action not exposed in UI | — | `src/features/org-setup/actions.ts` |
| Email normalization on signup persist | `business-invariants.md` | `src/lib/auth.ts` (sign-in only today) |
| Employee transfer/maintenance auth tests missing | `testing.mdc` | `tests/workflows/` |

#### P2 — Post-hackathon

| Gap | Rule |
|-----|------|
| Build `modules/identity/` per LLD | `docs/lld.md` §4.1 |
| Consolidate `lib/session.ts` → `shared/auth/session.ts` | `review.mdc` DRY |
| `runAction` envelope on all mutations | `api.mdc` |
| Batch maintenance notifications (remove loop-then-insert) | `performance.mdc` |
| Password complexity / `changePassword` | Not in Odoo brief — skip unless required |
| Repository refactor for all Prisma access | `prisma.mdc` |

### What P1 Gets Right

These are strengths an Odoo reviewer should see:

- **PostgreSQL-first design** — EXCLUDE constraint, partial unique index, CHECK constraints, `btree_gist` via Docker init
- **Business rules at the DB layer** — overlap and allocation conflicts cannot be bypassed by application bugs
- **Auth defense in depth** — role locked at signup (`input: false`), inactive blocked at login, `requireSessionUser()` re-fetches DB state
- **Typed error catalogue** — `AUTH_*`, `ORG_*`, `BOOKING_*` via `AppError` subclasses matching `docs/errors.md`
- **Transaction boundaries** — org mutations, employee workflows, booking creation all use `prisma.$transaction`
- **Activity log + notifications** — side effects inside the same transaction as the mutation
- **Focused helpers** — `assertNoDepartmentCycle`, `assertLastAdminGuard`, `purgeUserSessions` (no over-abstraction)
- **Test coverage on critical rules** — booking overlap (DB + server action), department cycles, last-admin guard, signup role lock

### P1 Test Inventory

| Test | Rule verified |
|------|---------------|
| `tests/integration/booking-overlap.test.ts` | EXCLUDE at PostgreSQL |
| `tests/integration/booking-action-overlap.test.ts` | Action → service → repository → EXCLUDE |
| `tests/workflows/department-cycle.test.ts` | `ORG_002` hierarchy cycles |
| `tests/workflows/org-last-admin.test.ts` | `ORG_005` last admin |
| `tests/workflows/signup-role.test.ts` | Signup role lock + `AUTH_003` |
| `tests/unit/department-scope.test.ts` | Department Head scope |

### Modularity & Clean Code Assessment

| Principle | P1 score | Notes |
|-----------|----------|-------|
| **No unnecessary abstractions** | Good | Guards extracted only where reused; no `BaseRepository` |
| **No unnecessary functions** | Good | `actorIdFrom`, cycle guard, session helpers earn their place |
| **API design** | Mixed | Module path (`createBookingAction` + envelope) is correct; feature path returns raw Prisma entities |
| **Modularity** | Mixed | Booking module is the template; org/employee are feature-layer shortcuts for hackathon speed |
| **Clean code** | Good | Zod at boundaries, consistent naming, transactions grouped logically |
| **Rule enforcement** | Partial | Rules are documented and partially followed; biggest drift is `features/` vs `modules/` |

**Bottom line:** P1 matches the Odoo problem statement and documented business rules. The codebase is **intentionally pragmatic** for a one-day hackathon — strong on PostgreSQL and domain rules, lighter on full layered module migration. Closing the P0 identity-binding gaps and optionally migrating org/employee to `modules/` would bring full alignment with the frozen architecture.

---

## Development Workflow

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Commit format: `feat(booking): add overlap constraint migration`

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/hld.md](docs/hld.md) | System context, modules, design decisions |
| [docs/lld.md](docs/lld.md) | Schema, API contracts, sequence diagrams |
| [docs/execution-plan.md](docs/execution-plan.md) | Day-of timeline and validation gates |
| [docs/architecture.md](docs/architecture.md) | Docker, CI, auth layers, notifications |
| [docs/business-invariants.md](docs/business-invariants.md) | Domain rules |
| [docs/errors.md](docs/errors.md) | Canonical API error catalogue |
| [backend/database/constraints.md](backend/database/constraints.md) | PostgreSQL guarantees |
| [backend/engineering/edge-cases.md](backend/engineering/edge-cases.md) | Prioritized edge cases |

---

## License

See [LICENSE](LICENSE).
