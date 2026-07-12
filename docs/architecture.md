# Backend & Infrastructure Architecture

High-level design for AssetFlow's production backend.

---

## Stack

- **PostgreSQL 15+** — primary data store with constraint-driven integrity
- **Prisma** — type-safe ORM, used exclusively inside repositories
- **Node.js + TypeScript** — application runtime
- **Express** — HTTP layer with versioned routes at `/api/v1`

---

## Layered Architecture

```
┌─────────────────────────────────────────┐
│  Presentation  (routes, controllers)    │
├─────────────────────────────────────────┤
│  Application   (services, workflows)    │
├─────────────────────────────────────────┤
│  Domain        (policies, invariants)   │
├─────────────────────────────────────────┤
│  Repository    (Prisma queries)         │
├─────────────────────────────────────────┤
│  Database      (PostgreSQL)               │
└─────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Owns | Must Not |
|-------|------|----------|
| Controllers | Request parsing, response mapping, HTTP codes | Business logic, Prisma calls |
| Services | Workflows, transactions, business rules | Direct SQL, HTTP concerns |
| Domain | Policies, invariant checks, pure functions | I/O |
| Repositories | CRUD, queries, Prisma | Business rules, calling other repos |
| Database | Constraints, indexes, views | Application logic |

---

## Module Map

```
Organization ──┐
Auth ──────────┤
Assets ────────┼──► Services ──► Repositories ──► PostgreSQL
Allocations ───┤
Bookings ──────┤
Maintenance ───┤
Audits ────────┘
       │
       └──► Notifications, ActivityLog, Reports
```

Each module owns its domain through the full stack. Cross-module coordination happens in services, never in repositories.

---

## API Contract

### Versioning

All endpoints are prefixed with `/api/v1`.

### Response Envelope

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": { "page": 1, "total": 42 }
}
```

### Pagination

- Default page size: **20**
- Maximum page size: **100**
- Offset-based pagination with `page` and `limit` query params
- Sorting via `sortBy` and `sortOrder` (explicit allow-list per endpoint)

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful read / update |
| 201 | Successful create |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (policy denied) |
| 404 | Resource not found |
| 409 | Conflict (constraint violation, duplicate) |
| 500 | Unexpected server error |

---

## Database Design

### Constraint Strategy

| Rule | Enforcement |
|------|-------------|
| Booking overlap | `EXCLUDE` on `(asset_id, tsrange)` |
| One active allocation per asset | Partial unique index `WHERE status = 'ACTIVE'` |
| End > Start (bookings) | `CHECK (end_at > start_at)` |
| Return >= Allocation date | `CHECK (return_date >= allocation_date)` |
| Cost >= 0 | `CHECK (cost >= 0)` |
| Status / priority enums | `CHECK` or PostgreSQL enum type |
| Serial number uniqueness | `UNIQUE` constraint |
| Asset tag immutability | Application guard + no UPDATE on tag column |

### Transaction Boundaries

Multi-step operations commit atomically:

**Allocate Asset**
```
BEGIN → Create Allocation → Update Asset Status → Activity Log → Notification → COMMIT
```

**Maintenance Approval**
```
BEGIN → Update Maintenance Status → Update Asset Status → Activity Log → Notification → COMMIT
```

**Audit Close**
```
BEGIN → Lock Cycle → Update Assets → Generate Report → Notification → COMMIT
```

### Soft Delete Policy

| Entity | Strategy |
|--------|----------|
| Departments | Deactivate (`isActive = false`) |
| Assets | Never delete — status transitions only |
| Users / Employees | Inactive flag |
| Categories | Deactivate |
| Bookings, Maintenance, Audits | Never delete — status transitions only |

---

## Authentication & Sessions

```
Request → Session Middleware → Permission Check → Policy Evaluation → Handler
```

- Identity derived from server-side session, never from request body
- Department Head actions scoped to `session.departmentId`
- Password reset: 15-minute token expiry, one-time use, hashed storage
- Password reset invalidates existing sessions
- Inactive employees cannot log in

---

## Concurrency & Idempotency

| Operation | Protection |
|-----------|------------|
| Booking overlap | PostgreSQL `EXCLUDE` constraint |
| Double-click allocate | Idempotency key + unique active allocation index |
| Approve maintenance twice | Status check inside transaction |
| Transfer approve twice | Idempotent state transition |
| Audit close (two managers) | Row-level lock on audit cycle within transaction |

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Response time | < 150 ms (p95) on standard endpoints |
| Queries per request | < 3 |
| Prisma | `select` only needed fields; no blind `include` |
| Search | Indexed columns, case-insensitive partial match |

---

## Infrastructure

```
┌──────────┐     ┌──────────┐     ┌────────────┐
│ Frontend │────►│ API      │────►│ PostgreSQL │
│ (React)  │     │ (Node)   │     │            │
└──────────┘     └────┬─────┘     └────────────┘
                      │
                      ▼
               ┌────────────┐
               │ Cron Jobs  │  (audit reminders, digest)
               └────────────┘
```

- Health endpoint: `GET /api/v1/health` (returns 503 when DB unreachable)
- Migrations run on deploy via `prisma migrate deploy`
- Environment config via `.env` (never committed)

---

## Repository Contracts

Each repository exposes a typed interface. Services depend on interfaces, not implementations.

```typescript
interface AssetRepository {
  findById(id: string): Promise<Asset | null>;
  findByTag(tag: string): Promise<Asset | null>;
  create(data: CreateAssetInput): Promise<Asset>;
  updateStatus(id: string, status: AssetStatus): Promise<Asset>;
  search(params: AssetSearchParams): Promise<PaginatedResult<Asset>>;
}

interface BookingRepository { /* ... */ }
interface AllocationRepository { /* ... */ }
interface NotificationRepository { /* ... */ }
```

---

## Audit Trail

Every state-changing action records:

| Field | Description |
|-------|-------------|
| `actorId` | Who performed the action |
| `action` | What happened (e.g. `asset.allocated`) |
| `entityType` | Module entity (e.g. `Asset`) |
| `entityId` | Target record ID |
| `oldValue` | Previous state (JSON) |
| `newValue` | New state (JSON) |
| `reason` | Optional justification |
| `createdAt` | Timestamp (UTC) |

Activity log entries are append-only and never modified.
