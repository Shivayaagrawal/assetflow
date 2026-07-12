# AssetFlow

Production-grade asset management platform for organizations that need reliable tracking of assets, allocations, bookings, maintenance, and audits. Built with a **PostgreSQL-first**, **layered backend** and engineering standards modeled on senior Odoo-style review practices.

---

## Overview

AssetFlow covers the full asset lifecycle across six core domains:

| Module | Responsibility |
|--------|----------------|
| **Assets** | Registration, categorization, status lifecycle, document attachments |
| **Allocations** | Assign, return, and transfer assets to employees |
| **Bookings** | Reserve bookable assets with overlap protection |
| **Maintenance** | Raise, approve, assign, and resolve maintenance requests |
| **Audits** | Cycle-based verification with immutable closure |
| **Organization** | Departments, employees, roles, and permissions |

Supporting capabilities include **authentication**, **notifications**, **activity logging**, **reporting**, and a **dashboard**.

---

## Architecture

### Layered Design

Dependencies flow downward only. Upper layers never bypass lower layers.

```
Presentation  →  Controllers / API routes
Application   →  Services (workflows, business rules)
Domain        →  Policies, invariants, domain services
Repository    →  Prisma data access (single client)
Database      →  PostgreSQL (constraints, indexes, transactions)
```

### Design Principles

- **Thin controllers, fat services** — HTTP layer parses and responds; services own workflows
- **Repository pattern** — Prisma is confined to repositories; services orchestrate multiple repos
- **PostgreSQL-first** — enforce invariants with FKs, CHECK, EXCLUDE constraints before application code
- **SOLID, DRY, KISS, YAGNI** — modularity over framework cleverness
- **REST API** at `/api/v1` with a consistent response envelope (`success`, `data`, `error`, `meta`)

### Solution Priority

When implementing business logic, evaluate in this order:

1. PostgreSQL feature (constraint, FK, index, view, transaction)
2. Prisma capability
3. Application service
4. Utility / helper
5. External library

### System Guarantees

| Concern | Approach |
|---------|----------|
| Booking overlap | PostgreSQL `EXCLUDE` constraint on time ranges |
| Single active allocation | Unique partial index + service transaction |
| Audit closure | Atomic transaction across cycle, assets, report, notifications |
| Auth | Session-derived identity — never trust client-supplied `userId` or `role` |
| Data retention | Soft-delete / deactivate — assets, bookings, audits are never hard-deleted |
| Time | Store UTC in DB as ISO 8601; display local time in frontend |
| Performance | Target &lt;150 ms per endpoint, &lt;3 queries, selective Prisma projections |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + TypeScript |
| Framework | Express (or Fastify) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Session / JWT with policy-based authorization |
| Email | Transactional provider (password reset, notifications) |
| Frontend | React + TypeScript (responsive, accessible UI) |
| Tooling | ESLint, Prettier, Vitest / Jest |

---

## Repository Structure

```
assetflow/
├── .cursor/rules/          # Engineering standards (12 focused rule files)
├── docs/
│   ├── architecture.md     # HLD — backend & infrastructure
│   ├── business-invariants.md
│   ├── execution-plan.md   # Phased delivery plan
│   └── errors.md           # Error catalogue (AUTH_*, ASSET_*, etc.)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── api/                # Routes, controllers, middleware
│   ├── domain/             # Policies, invariants, domain types
│   ├── services/           # Workflow orchestration
│   ├── repositories/       # Prisma data access
│   ├── lib/                # Shared utilities (db client, logger)
│   └── jobs/               # Cron / background tasks
├── tests/
│   ├── unit/
│   └── integration/
└── frontend/               # React application
```

---

## Implementation Workflow

Delivery follows a phased execution plan. Each phase ends with a working, testable vertical slice.

### Phase 1 — Foundation

- PostgreSQL schema with constraints, indexes, and seed data
- Prisma schema + singleton client + repository interfaces
- Auth (login, session, forgot-password flow)
- Organization module (departments, employees, roles)
- Health check, `/api/v1` routing, error envelope
- Activity log foundation

**Exit criteria:** Admin can log in, create departments/employees, and all migrations pass.

### Phase 2 — Asset Core

- Asset CRUD with immutable tag (`AF-000001` sequence)
- Category management (soft-deactivate)
- Status lifecycle matrix (Available → Allocated → Maintenance → …)
- File upload rules (images, PDFs)
- Asset search (tag → serial → QR → name → location)

**Exit criteria:** Full asset lifecycle with DB-enforced serial uniqueness and status rules.

### Phase 3 — Allocation & Booking

- Allocate, return, transfer (transactional, idempotent)
- Booking with EXCLUDE overlap protection
- Department-scoped permissions for managers
- Notifications on state changes

**Exit criteria:** Business-rule tests pass for overlap, conflict, and permission scenarios.

### Phase 4 — Maintenance & Audit

- Maintenance request workflow (raise → approve → assign → resolve)
- Audit cycles (start → verify → close with immutable history)
- Reporting endpoints with pagination (default 20, max 100)

**Exit criteria:** End-to-end audit close in a single transaction; maintenance lifecycle complete.

### Phase 5 — Frontend & Dashboard

- Role-based UI (Employee, Department Head, Admin)
- Reusable components — no duplicated forms
- Dashboard with SWR / 30 s polling refresh
- Accessible, responsive layouts

**Exit criteria:** All primary workflows achievable from the UI without API tools.

### Phase 6 — Hardening

- Integration test suite (happy, failure, edge, authorization)
- Rate limiting on auth endpoints
- Notification deduplication (`type` + `entity` + `recipient`)
- CI pipeline: lint → typecheck → tests → build

**Exit criteria:** CI green; performance budget met on critical endpoints.

---

## Development Workflow

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm (recommended)

### Local Setup

```bash
git clone https://github.com/Shivayaagrawal/assetflow.git
cd assetflow
cp .env.example .env        # configure DATABASE_URL, SESSION_SECRET, etc.
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

### Before Every Commit

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Commit Convention

```
feat(asset): add bulk import endpoint
fix(booking): prevent overlap on concurrent creates
refactor(auth): extract permission policy to domain layer
test(allocation): add department-scoped authorization cases
```

### Pull Request Checklist

- [ ] Lint, typecheck, tests, and build pass
- [ ] Business rules tested (not just CRUD)
- [ ] Database constraints added where Postgres can enforce the rule
- [ ] Transaction boundaries defined for multi-step operations
- [ ] No Prisma usage outside repositories
- [ ] API returns correct HTTP status (never 200 with error)

---

## Engineering Standards

Cursor rules in `.cursor/rules/` enforce senior backend review practices across 12 focused concerns:

| Rule | Scope |
|------|-------|
| `architecture.mdc` | Layered design, SOLID, PostgreSQL-first priority |
| `backend.mdc` | Thin controllers, repository pattern |
| `database.mdc` | Constraints, transactions, EXCLUDE/CHECK |
| `prisma.mdc` | Single client, no N+1, selective projections |
| `auth.mdc` | Session → permission → policy |
| `api.mdc` | REST, response envelope, HTTP codes |
| `services.mdc` | Service ownership, repo boundaries |
| `testing.mdc` | Business-rule tests, four coverage dimensions |
| `git.mdc` | CI gates, conventional commits |
| `frontend.mdc` | Reusable, accessible, responsive UI |
| `performance.mdc` | One query → map, SQL aggregation |
| `review.mdc` | Mandatory self-review before returning code |

Every generated change is evaluated against: **Can Postgres do this? Is the service focused? Is there duplicate logic? Would a senior reviewer approve this immediately?**

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/architecture.md](docs/architecture.md) | Backend & infrastructure HLD |
| [docs/execution-plan.md](docs/execution-plan.md) | Phased delivery plan with exit criteria |
| [docs/business-invariants.md](docs/business-invariants.md) | Non-negotiable rules per module |
| [docs/errors.md](docs/errors.md) | Error catalogue for consistent API responses |

---

## Asset Status Lifecycle

| Current Status | Allowed Transitions |
|----------------|---------------------|
| Available | Allocated, Under Maintenance, Booked |
| Allocated | Available (return), Under Maintenance |
| Under Maintenance | Available |
| Booked | Available (cancel / complete) |
| Lost | Retired |
| Retired | — (terminal) |
| Disposed | — (terminal) |

---

## License

See [LICENSE](LICENSE).
