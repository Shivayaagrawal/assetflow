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
    Features["features/* modules"]
    Prisma["Prisma ORM"]
    PG["PostgreSQL 16"]
  end
  Next --> Features --> Prisma --> PG
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

## Quick Start

```bash
git clone https://github.com/Shivayaagrawal/assetflow.git
cd assetflow
cp .env.example .env
# Fill POSTGRES_PASSWORD, BETTER_AUTH_SECRET, CRON_SECRET

docker compose up -d postgres
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Health check: `GET http://localhost:3000/api/health`

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
│   └── errors.md
├── prisma/schema.prisma    # 17 models — P1-owned after lock
├── src/
│   ├── app/                # Routing only
│   ├── features/           # Domain modules (P1/P2/P3 ownership)
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
| **P1** | Schema, auth, org-setup, booking (EXCLUDE), employee vertical |
| **P2** | Department Head vertical, dept-scoped approvals |
| **P3** | Assets, maintenance, audit, notifications, search/QR |

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
| [docs/errors.md](docs/errors.md) | Error catalogue |

---

## License

See [LICENSE](LICENSE).
