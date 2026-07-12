# AssetFlow — High-Level Design (HLD)

**Odoo Hackathon 2026 Virtual Round · Enterprise Asset & Resource Management**

This document describes *what* the system is and *how major components interact*. Implementation detail lives in [lld.md](./lld.md).

---

## 1. System Context

AssetFlow is an enterprise asset management platform where:

- Assets move through a **7-state lifecycle**
- Each asset can be **allocated to one holder** at a time
- Bookable assets accept **non-overlapping time-slot reservations**
- **Maintenance** and **audit cycles** gate and update asset status
- Every state change **notifies the right people** and is recorded in an append-only activity log

```mermaid
C4Context
  title AssetFlow System Context

  Person(employee, "Employee", "Books resources, raises maintenance, views allocations")
  Person(deptHead, "Department Head", "Approves dept-scoped requests")
  Person(assetMgr, "Asset Manager", "Registers assets, runs audits, approves maintenance")
  Person(admin, "Admin", "Org configuration only")

  System(assetflow, "AssetFlow", "Next.js + PostgreSQL asset platform")
  System_Ext(email, "Email Provider", "Password reset, optional verification")

  Rel(employee, assetflow, "Uses")
  Rel(deptHead, assetflow, "Uses")
  Rel(assetMgr, assetflow, "Uses")
  Rel(admin, assetflow, "Configures org")
  Rel(assetflow, email, "Sends transactional email")
```

---

## 2. Roles & Capabilities

| Role | Primary Screens | Core Actions |
|------|-----------------|--------------|
| **Employee** | Dashboard, Allocation, Booking, Maintenance | View own allocations, book resources, raise maintenance, request return/transfer |
| **Department Head** | Dept dashboard, Approvals | Approve allocation/transfer within department, book on behalf of department |
| **Asset Manager** | Assets, Maintenance Kanban, Audit, Notifications | Register/allocate assets, approve maintenance/transfers, run audit cycles, search/QR |
| **Admin** | Organization Setup (3 tabs) | Departments, categories, employee directory, **only place roles are promoted** |

Signup always creates an **Employee** account. Role elevation happens exclusively via Admin → Employee Directory.

---

## 3. Architecture Overview

```mermaid
flowchart TB
  subgraph Presentation["Presentation Layer"]
    Pages["App Router Pages"]
    API["Route Handlers /api/*"]
    Actions["Server Actions"]
  end

  subgraph Application["Application Layer — features/*"]
    AuthF["auth"]
    OrgF["org-setup"]
    AssetsF["assets"]
    AllocF["allocation"]
    BookF["booking"]
    MaintF["maintenance"]
    AuditF["audit"]
    NotifF["notifications"]
    DashF["dashboard"]
    ActivityF["activity-log"]
  end

  subgraph Infrastructure["Infrastructure — lib/*"]
    Session["session.ts — requireSession / requireRole"]
    DB["db.ts — Prisma singleton"]
    Env["env.ts — Zod-validated env"]
    Logger["logger.ts"]
  end

  subgraph Data["Data Layer"]
  Prisma["Prisma ORM"]
  PG["PostgreSQL 16"]
  end

  Pages --> Actions
  Pages --> API
  Actions --> Application
  API --> Application
  Application --> Infrastructure
  Prisma --> PG

  PG -.->|EXCLUDE constraint| BookF
  PG -.->|Partial unique index| AllocF
```

### Dependency Rule

```
app/ → features/ → lib/ → prisma/
```

- `app/` is routing only — no business logic
- `features/*` owns domain workflows (`actions.ts`, `queries.ts`, `schemas.ts`)
- `lib/` provides shared infrastructure (db, auth, session, env)
- Prisma is never imported outside `lib/db.ts` and `features/*/queries.ts` / transactions in `actions.ts`

---

## 4. Core Design Decisions

### 4.1 Database-Enforced Correctness

Two Tier 1 guarantees are enforced **in PostgreSQL**, not only in application code:

| Rule | Mechanism | Benefit |
|------|-----------|---------|
| No overlapping bookings | `EXCLUDE USING GIST` on `(assetId, tstzrange)` | Structurally impossible to double-book under concurrency |
| One active allocation per asset | Partial unique index `WHERE status = 'ACTIVE'` | Race-safe single-holder guarantee |

```mermaid
flowchart LR
  subgraph Booking["Booking Insert"]
    B1["INSERT Booking"] --> B2{"EXCLUDE check"}
    B2 -->|overlap| B3["23P01 → 409 conflict"]
    B2 -->|ok| B4["Success"]
  end

  subgraph Allocation["Allocation Insert"]
    A1["INSERT Allocation ACTIVE"] --> A2{"Partial unique index"}
    A2 -->|duplicate| A3["23505 → holder identity + transfer offer"]
    A2 -->|ok| A4["Success"]
  end
```

### 4.2 Transactional Notifications

Event-triggered notifications (`Asset Assigned`, `Booking Confirmed`, `Maintenance Approved`, etc.) are written **inside the same Prisma transaction** as the triggering mutation via `createNotification(tx, ...)`.

This guarantees: mutation and notification either both commit or both roll back — no orphaned notifications, no silent misses.

Time-based alerts (`Overdue Return`) use a **cron-guarded scan route** (`GET /api/cron/overdue-check`) with idempotent deduplication.

### 4.3 Auth — Defense in Depth

| Layer | Responsibility |
|-------|----------------|
| Middleware | Optimistic cookie-existence redirect (fast, not secure alone) |
| `requireSession()` / `requireRole()` | Full session verification on every Server Action and Route Handler |
| `requireDepartmentAccess()` | Department Head scoped to `session.departmentId` |

Identity is always derived from the server session — never from request body fields.

---

## 5. Module Map

```mermaid
flowchart TB
  Org["Organization<br/>Department · Category · Employee"]
  Auth["Auth<br/>Better Auth · Sessions"]
  Asset["Assets<br/>Registry · Search · QR"]
  Alloc["Allocation<br/>Allocate · Return · Transfer"]
  Book["Booking<br/>EXCLUDE constraint"]
  Maint["Maintenance<br/>Kanban workflow"]
  Audit["Audit<br/>Cycle · Verify · Close"]
  Notif["Notifications<br/>Transactional outbox"]
  Activity["Activity Log<br/>Append-only audit trail"]
  Dash["Dashboard<br/>KPIs · RecentActivityFeed"]

  Org --> Asset
  Org --> Alloc
  Asset --> Alloc
  Asset --> Book
  Asset --> Maint
  Asset --> Audit
  Alloc --> Notif
  Book --> Notif
  Maint --> Notif
  Audit --> Notif
  Alloc --> Activity
  Book --> Activity
  Maint --> Activity
  Audit --> Activity
  Dash --> Asset
  Dash --> Alloc
  Dash --> Book
  Dash --> Notif
```

**17–18 Prisma models** map 1:1 to screens — see [lld.md §3](./lld.md#3-data-model).

---

## 6. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15, App Router, TypeScript strict |
| ORM | Prisma |
| Database | PostgreSQL 16 (Docker) |
| Auth | Better Auth (session-based) |
| Validation | Zod (forms + `lib/env.ts`) |
| Frontend data | SWR polling for notifications |
| Testing | Vitest (unit + integration against CI Postgres) |
| Containerization | Docker Compose (postgres + app) |
| CI | GitHub Actions with Postgres service container |

---

## 7. Deployment Topology

```mermaid
flowchart TB
  subgraph Host["Demo / Production Host"]
    subgraph Compose["Docker Compose"]
      App["Next.js standalone container<br/>:3000"]
      PG["PostgreSQL 16<br/>btree_gist via init script"]
    end
  end

  User["Browser"] --> App
  App --> PG
  Cron["Scheduled trigger<br/>GitHub Actions / manual"] -->|Bearer CRON_SECRET| App
```

**Primary path:** `docker compose up` from a clean clone — `btree_gist` installs automatically via `docker/init-extensions.sql`.

---

## 8. API Surface

| Prefix | Purpose |
|--------|---------|
| `/api/auth/[...all]` | Better Auth catch-all |
| `/api/health` | DB connectivity check (503 if down) |
| `/api/cron/overdue-check` | Time-based overdue return scan |
| Server Actions in `features/*/actions.ts` | All mutations |

Response envelope (all custom APIs):

```json
{ "success": true, "data": {}, "error": null, "meta": {} }
```

---

## 9. Transaction Boundaries (Atomic Operations)

| Workflow | Steps in one transaction |
|----------|--------------------------|
| **Allocate asset** | Create allocation → Update asset status → Activity log → Notification |
| **Approve maintenance** | Update request status → Asset → Under Maintenance → Activity → Notification |
| **Resolve maintenance** | Update request → Asset → Available → Activity → Notification |
| **Close audit cycle** | Lock cycle → Update missing assets → Lost → Generate report → Notifications |
| **Transfer approve** | Close old allocation → Create new → Activity → Notification |

---

## 10. Asset Status Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Available
  Available --> Allocated : allocate
  Available --> UnderMaintenance : maintenance approved
  Available --> Booked : book (bookable assets)
  Allocated --> Available : return
  Allocated --> UnderMaintenance : maintenance approved
  UnderMaintenance --> Available : resolved
  Booked --> Available : cancel / complete
  Available --> Lost : audit close (missing)
  Lost --> Retired : retire
  Available --> Retired : retire
  Available --> Disposed : dispose
  Retired --> [*]
  Disposed --> [*]
```

Invalid transitions are rejected server-side. Terminal states (Retired, Disposed) have no outbound transitions.

---

## 11. Team Ownership (Build Phase)

| Person | Owns |
|--------|------|
| **P1** | Schema (locked after design), auth, org-setup, booking (EXCLUDE), employee vertical |
| **P2** | Department Head vertical, dept-scoped approvals, reports (Tier 2) |
| **P3** | Assets, allocation (manager), maintenance Kanban, audit, notifications, search/QR |

Feature folders in `src/features/` map directly to this split to minimize merge conflicts.

---

## 12. Related Documents

| Document | Contents |
|----------|----------|
| [lld.md](./lld.md) | Low-level design, schema, sequences, file contracts |
| [execution-plan.md](./execution-plan.md) | Day-of hackathon timeline and gates |
| [business-invariants.md](./business-invariants.md) | Non-negotiable domain rules |
| [errors.md](./errors.md) | API error catalogue |
| [architecture.md](./architecture.md) | Infrastructure patterns (Docker, CI, auth layers) |
