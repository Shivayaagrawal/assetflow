# AssetFlow — Low-Level Design (LLD)

**Companion to [hld.md](./hld.md) — implementation contracts, schema, and sequences**

---

## 1. Repository Layout

```
assetflow/
├── .github/workflows/
│   ├── ci.yml
│   └── migrate-check.yml
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.override.yml
│   └── init-extensions.sql
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma          # P1-owned after schema lock
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/                   # Routing only — no business logic
│   │   ├── (auth)/login, signup
│   │   ├── (dashboard)/       # Screens 2–10
│   │   └── api/
│   │       ├── auth/[...all]/route.ts
│   │       ├── health/route.ts
│   │       └── cron/overdue-check/route.ts
│   ├── modules/               # Domain modules — one folder per bounded context
│   │   ├── identity/
│   │   ├── organization/
│   │   ├── asset/
│   │   ├── allocation/
│   │   ├── booking/
│   │   ├── maintenance/
│   │   ├── audit/
│   │   ├── notification/
│   │   ├── activity/
│   │   └── reporting/
│   ├── shared/                # Cross-cutting — modules depend on shared only
│   │   ├── auth/
│   │   ├── database/
│   │   ├── errors/
│   │   ├── transactions/
│   │   ├── validation/
│   │   └── types/
│   ├── components/            # Shared UI (DepartmentPicker, RecentActivityFeed, …)
│   └── lib/                   # Framework infrastructure
│       ├── db.ts
│       ├── env.ts
│       ├── auth.ts
│       ├── auth-client.ts
│       ├── session.ts         # Re-exports shared/auth/session
│       └── logger.ts
├── tests/
│   ├── unit/
│   └── integration/
└── CONVENTIONS.md
```

### Module Contract

Every `modules/<domain>/` folder exposes:

| File / Folder | Responsibility |
|---------------|----------------|
| `validators/*.schema.ts` | Zod input/output types |
| `policies/*.policy.ts` | Authorization (`canAllocate`, `canManage`, …) |
| `services/*.service.ts` | One workflow per service — transaction boundary |
| `repositories/*.repository.ts` | All Prisma access for this module |
| `actions/*.action.ts` | Thin Server Actions — parse, delegate, envelope |

```mermaid
flowchart LR
  Page["page.tsx"] --> Action["actions/*.action.ts"]
  Action --> Validator["validators/*.schema.ts"]
  Action --> Session["requireSession()"]
  Validator --> Policy["policies/*.policy.ts"]
  Policy --> Service["services/*.service.ts"]
  Service --> Repo["repositories/*.repository.ts"]
  Service --> Tx["withTransaction()"]
  Tx --> Notif["createNotification(tx)"]
  Tx --> Log["logActivity(tx)"]
```

### Dependency Rule

```
app/ → modules/ → shared/ → lib/
```

Modules never import from other modules. Cross-module orchestration happens inside services calling multiple repositories within one transaction.

---

## 2. Prisma Schema Overview

### 2.1 Model Inventory (17 core + 1 optional)

```mermaid
erDiagram
  User ||--o{ Session : has
  User ||--o{ Account : has
  User }o--|| Department : belongs_to
  Department ||--o{ Department : parent
  Department ||--o| User : headed_by
  AssetCategory ||--o{ Asset : categorizes
  Asset ||--o{ Allocation : has
  Asset ||--o{ Booking : has
  Asset ||--o{ MaintenanceRequest : has
  Asset ||--o{ AuditItem : verified_in
  Allocation ||--o| TransferRequest : may_trigger
  AuditCycle ||--o{ AuditCycleAuditor : has
  AuditCycle ||--o{ AuditItem : contains
  User ||--o{ Notification : receives
  User ||--o{ ActivityLog : performs

  User {
    string id PK
    string email UK
    enum role
    string departmentId FK
    enum status
  }
  Asset {
    string id PK
    string assetTag UK
    string serialNumber UK
    enum status
    bool isBookable
  }
  Allocation {
    string id PK
    string assetId FK
    enum status
    enum holderType
  }
  Booking {
    string id PK
    string assetId FK
    datetime startTime
    datetime endTime
    enum status
  }
```

### 2.2 Enums

```prisma
enum UserRole { EMPLOYEE DEPARTMENT_HEAD ASSET_MANAGER ADMIN }
enum UserStatus { ACTIVE INACTIVE }
enum DepartmentStatus { ACTIVE INACTIVE }
enum AssetStatus { AVAILABLE ALLOCATED RESERVED UNDER_MAINTENANCE LOST RETIRED DISPOSED }
enum AllocationStatus { ACTIVE RETURNED }
enum HolderType { EMPLOYEE DEPARTMENT }
enum BookingStatus { UPCOMING ONGOING COMPLETED CANCELLED }
enum MaintenanceStatus { PENDING APPROVED REJECTED TECHNICIAN_ASSIGNED IN_PROGRESS RESOLVED }
enum MaintenancePriority { LOW MEDIUM HIGH CRITICAL }
enum AuditCycleStatus { OPEN CLOSED }
enum VerificationStatus { PENDING VERIFIED MISSING DAMAGED }
enum TransferStatus { REQUESTED APPROVED REJECTED COMPLETED }
enum NotificationType {
  ASSET_ASSIGNED MAINTENANCE_APPROVED MAINTENANCE_REJECTED
  BOOKING_CONFIRMED BOOKING_CANCELLED BOOKING_REMINDER
  TRANSFER_APPROVED OVERDUE_RETURN_ALERT AUDIT_DISCREPANCY_FLAGGED
}
```

### 2.3 Database Constraints (Raw SQL Migrations)

**Booking overlap** — hand-edited migration (P1-only):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING GIST (
    "assetId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status IN ('UPCOMING', 'ONGOING'));
```

**Allocation conflict** — partial unique index:

```sql
CREATE UNIQUE INDEX one_active_allocation_per_asset
  ON "Allocation" ("assetId") WHERE status = 'ACTIVE';
```

**Maintenance — one active request per asset** — partial unique index:

```sql
CREATE UNIQUE INDEX one_active_maintenance_per_asset
  ON "MaintenanceRequest" ("assetId")
  WHERE status NOT IN ('REJECTED', 'RESOLVED');
```

**Notification deduplication** — unique index:

```sql
CREATE UNIQUE INDEX notification_dedup_key
  ON "Notification" ("type", "relatedEntityId", "recipientId");
```

**Additional CHECK constraints:**

```sql
ALTER TABLE "Booking" ADD CONSTRAINT booking_end_after_start CHECK ("endTime" > "startTime");
ALTER TABLE "Allocation" ADD CONSTRAINT return_after_allocate CHECK (
  "actualReturnDate" IS NULL OR "actualReturnDate" >= "allocatedAt"
);
ALTER TABLE "Asset" ADD CONSTRAINT cost_non_negative CHECK ("acquisitionCost" >= 0);
```

### 2.4 Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `Asset` | `assetTag`, `serialNumber` | Search (Screen 4) |
| `Asset` | `status`, `categoryId`, `location` | Filter |
| All FKs | `@@index` on foreign keys | Join performance |
| `Notification` | `(recipientId, isRead, createdAt)` | Unread feed |
| `ActivityLog` | `(createdAt DESC)` | Recent activity |

---

## 3. Data Model

See [business-invariants.md](./business-invariants.md) for rules each model must uphold.

### Asset Tag Generation

```
Format: AF-000001 (sequential, not UUID)
Strategy: PostgreSQL sequence — nextval('asset_tag_seq') inside transaction
```

```sql
CREATE SEQUENCE asset_tag_seq START 1;
-- SELECT nextval('asset_tag_seq') → format as AF-000001 in AssetRepository
```

Never use `SELECT MAX(asset_tag)` or `count() + 1` — both are race-prone under concurrency.

### Live Query Contracts (Dashboard / Reporting)

All KPIs and reports are computed per request from PostgreSQL:

| KPI | SQL pattern |
|-----|-------------|
| Assets Available | `COUNT(*) WHERE status = 'AVAILABLE'` |
| Assets Allocated | `COUNT(*) WHERE status = 'ALLOCATED'` |
| Pending Maintenance | `COUNT(*) WHERE status = 'PENDING'` |
| Overdue Returns | `COUNT(*) FROM Allocation WHERE status = 'ACTIVE' AND expectedReturnDate < NOW()` |

Reports use `GROUP BY department_id`, `GROUP BY category_id` with `COUNT`, `SUM`, `AVG` — no cached JSON.

---

## 4. API & Server Action Contracts

### 4.1 Identity (`modules/identity/`)

| Action | Auth | Rule |
|--------|------|------|
| `signUp` | Public | Always creates `EMPLOYEE`; ignores any `role` in body |
| `signIn` | Public | Session cookie on success |
| `forgotPassword` | Public | 15-min token, hashed, one-time |
| `promoteEmployee` | `ADMIN` only | Only path to change roles |

### 4.2 Organization (`modules/organization/`)

| Action | Auth | Rule |
|--------|------|------|
| `createDepartment` | `ADMIN` | Validates no hierarchy cycle |
| `updateDepartment` | `ADMIN` | Live data for `DepartmentPicker` |
| `deactivateDepartment` | `ADMIN` | Blocked if active employees exist |
| `createCategory` | `ADMIN` | Optional JSON custom fields |
| `promoteEmployee` | `ADMIN` | Employee → Dept Head / Asset Manager |

### 4.3 Asset (`modules/asset/`)

| Action | Auth | Rule |
|--------|------|------|
| `registerAsset` | `ASSET_MANAGER` | Auto-generates tag, enforces unique serial |
| `searchAssets` | Authenticated | ILIKE on tag, serial, name, location; ranked |
| `updateAssetStatus` | `ASSET_MANAGER` | `AssetStateMachine` validation |

### 4.4 Allocation (`modules/allocation/`)

| Action | Auth | Rule |
|--------|------|------|
| `allocateAsset` | `ASSET_MANAGER` | Partial unique index; on conflict return holder name + transfer offer |
| `returnAsset` | `ASSET_MANAGER` / holder | Condition notes, status → Available |
| `requestTransfer` | `EMPLOYEE` | Creates TransferRequest |
| `approveTransfer` | `DEPT_HEAD` / `ASSET_MANAGER` | Closes old allocation, opens new |

### 4.5 Booking (`modules/booking/`)

| Action | Auth | Rule |
|--------|------|------|
| `bookResource` | Authenticated | Catches `23P01` → "conflict — slot unavailable" |
| `cancelBooking` | Owner / manager | Status → CANCELLED |
| `rescheduleBooking` | Owner / manager | Cancel + rebook in transaction |

### 4.6 Maintenance (`modules/maintenance/`)

| Action | Auth | Rule |
|--------|------|------|
| `raiseRequest` | Authenticated | Creates PENDING |
| `approveRequest` | `ASSET_MANAGER` | Asset → UNDER_MAINTENANCE |
| `assignTechnician` | `ASSET_MANAGER` | Status → TECHNICIAN_ASSIGNED |
| `resolveRequest` | `ASSET_MANAGER` | Asset → AVAILABLE |

### 4.7 Audit (`modules/audit/`)

| Action | Auth | Rule |
|--------|------|------|
| `createCycle` | `ASSET_MANAGER` | Scope + date range + auditors |
| `verifyAsset` | Assigned auditor | VERIFIED / MISSING / DAMAGED |
| `closeCycle` | `ASSET_MANAGER` | Lock cycle, Missing → Lost, discrepancy report |

---

## 5. Sequence Diagrams

### 5.1 Allocate Asset (with conflict)

```mermaid
sequenceDiagram
  actor AM as Asset Manager
  participant Action as allocation/actions
  participant Service as AllocateAssetService
  participant DB as PostgreSQL

  AM->>Action: allocateAsset(assetId, employeeId)
  Action->>Action: requireSession()
  Action->>Service: execute(user, input)
  Service->>Service: AllocationPolicy.assertCanAllocate()
  Service->>DB: BEGIN TRANSACTION
  Service->>DB: INSERT Allocation ACTIVE

  alt Asset already allocated
    DB-->>Service: 23505 unique violation
    Service->>DB: SELECT current holder
    Service->>DB: ROLLBACK
    Service-->>Action: ConflictError ASSET_004
    Action-->>AM: 409 "Currently held by Priya Shah" + transfer offer
  else Success
    Service->>DB: UPDATE Asset status ALLOCATED
    Service->>DB: INSERT ActivityLog
    Service->>DB: INSERT Notification ASSET_ASSIGNED
    Service->>DB: COMMIT
    Service-->>Action: success
    Action-->>AM: 201 success
  end
```

### 5.2 Book Resource (overlap rejection)

```mermaid
sequenceDiagram
  actor Emp as Employee
  participant Action as booking/actions
  participant Service as CreateBookingService
  participant DB as PostgreSQL

  Emp->>Action: bookResource(assetId, 09:30, 10:30)
  Action->>Action: requireSession()
  Action->>Service: execute(user, input)
  Service->>DB: BEGIN TRANSACTION
  Service->>DB: INSERT Booking UPCOMING

  alt Overlaps 09:00-10:00 booking
    DB-->>Service: 23P01 exclusion_violation
    Service->>DB: ROLLBACK
    Service-->>Action: ConflictError BOOKING_002
    Action-->>Emp: 409 "conflict — slot unavailable"
  else No overlap (e.g. 10:00-11:00)
    Service->>DB: INSERT Notification BOOKING_CONFIRMED
    Service->>DB: INSERT ActivityLog
    Service->>DB: COMMIT
    Service-->>Action: success
    Action-->>Emp: 201 success
  end
```

### 5.3 Maintenance Approval Cascade

```mermaid
sequenceDiagram
  actor AM as Asset Manager
  participant Action as maintenance/actions
  participant Service as ApproveMaintenanceService
  participant Repo as MaintenanceRepository
  participant DB as PostgreSQL

  AM->>Action: approveRequest(requestId)
  Action->>Action: requireSession()
  Action->>Service: execute(user, input)
  Service->>Service: MaintenancePolicy.assertCanApprove()
  Service->>Service: AssetStateMachine.assertTransition(AVAILABLE, UNDER_MAINTENANCE)
  Service->>DB: BEGIN TRANSACTION
  Service->>Repo: updateStatus(requestId, APPROVED)
  Service->>Repo: updateAssetStatus(assetId, UNDER_MAINTENANCE)
  Service->>DB: INSERT ActivityLog
  Service->>DB: INSERT Notification MAINTENANCE_APPROVED
  Service->>DB: COMMIT
  Service-->>Action: success
  Action-->>AM: 200 success
```

### 5.4 Close Audit Cycle

```mermaid
sequenceDiagram
  actor AM as Asset Manager
  participant Action as audit/actions
  participant Service as CloseAuditService
  participant Repo as AuditRepository
  participant DB as PostgreSQL

  AM->>Action: closeCycle(cycleId)
  Action->>Action: requireSession()
  Action->>Service: execute(user, input)
  Service->>Service: AuditPolicy.assertCanClose()
  Service->>DB: BEGIN TRANSACTION
  Service->>Repo: lockCycleForUpdate(cycleId)
  Service->>Repo: closeCycle(cycleId)
  Service->>Repo: markMissingAssetsLost(cycleId)
  Service->>Repo: generateDiscrepancyReport(cycleId)
  Service->>DB: INSERT Notifications AUDIT_DISCREPANCY_FLAGGED
  Service->>DB: INSERT ActivityLog
  Service->>DB: COMMIT
  Service-->>Action: success
  Action-->>AM: 200 report + updated statuses
```

---

## 6. Notification Architecture

```mermaid
flowchart TB
  subgraph EventTriggered["Event-Triggered (same transaction)"]
    M1["allocateAsset"] --> N1["createNotification(tx)"]
    M2["approveMaintenance"] --> N2["createNotification(tx)"]
    M3["bookResource"] --> N3["createNotification(tx)"]
    M4["closeAudit"] --> N4["createNotification(tx)"]
  end

  subgraph TimeTriggered["Time-Triggered (cron scan)"]
    Cron["GET /api/cron/overdue-check"] --> Scan["runOverdueScan()"]
    Scan --> Dedup{"Existing OVERDUE_RETURN?"}
    Dedup -->|no| N5["createNotification"]
    Dedup -->|yes| Skip["Skip — idempotent"]
  end

  subgraph Frontend["Frontend"]
    SWR["SWR polling"] --> Feed["Notifications page + Dashboard feed"]
  end

  N1 & N2 & N3 & N4 & N5 --> DB[(Notification table)]
  DB --> SWR
```

### `createNotification` signature

```typescript
export async function createNotification(
  tx: Prisma.TransactionClient,
  input: {
    recipientId: string;
    type: NotificationType;
    message: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }
): Promise<Notification>;
```

---

## 7. Auth Layer Detail

```mermaid
flowchart TB
  Request["Incoming Request"] --> MW["middleware.ts<br/>cookie exists?"]
  MW -->|no cookie| Redirect["Redirect /login"]
  MW -->|cookie| Page["Page / Action"]
  Page --> RS["requireSession() — shared/auth/session"]
  RS -->|invalid| Err401["AUTH_002 UNAUTHORIZED"]
  RS -->|valid| Policy["Policy.canX() / assertRole()"]
  Policy -->|denied| Err403["AUTH_007 FORBIDDEN"]
  Policy -->|allowed| Service["Application Service"]
```

### Department scoping (P2)

```typescript
// organization/policies/department.policy.ts
export function assertDepartmentAccess(
  user: SessionUser,
  departmentId: string
) {
  if (
    user.role === "DEPARTMENT_HEAD" &&
    user.departmentId !== departmentId
  ) {
    throw new AuthorizationError("AUTH_007");
  }
}
```

---

## 8. Shared Components

| Component | Used By | Data Source |
|-----------|---------|-------------|
| `DepartmentPicker` | Org Setup, Asset Registration, Allocation | `organization/repositories` |
| `RecentActivityFeed` | Dashboard (Screen 2), Notifications (Screen 10) | `activity` + `notification` queries |
| `MaintenanceKanban` | Maintenance (Screen 7) | 5 columns, click-to-advance |
| `AssetQRCode` | Asset detail | `react-qr-code` encoding `assetTag` |

---

## 9. Seed Data (Demo Cast)

Aligned with mockup scenarios for coherent demo walkthrough:

| Entity | Seed Value |
|--------|------------|
| Departments | Engineering (Aditi Rao), Field Ops East (Sana Iqbal, Inactive), Facilities (Rohan Mehta) |
| Assets | `AF-0114` Dell Laptop → Priya Shah; `AF-0062` Projector mid-maintenance; Conference Room B2 (bookable) |
| Booking | Room B2 09:00–10:00 Procurement Team (enables 09:30 conflict demo) |
| Audit | Engineering cycle, auditors Aditi Rao + Sana Iqbal, mixed verification results |

---

## 10. Concurrency Protection

Every workflow documents: race condition, transaction, DB constraint, failure response.

| Workflow | Race | Protection | Response |
|----------|------|------------|----------|
| Allocate | Two managers allocate simultaneously | Partial unique index `one_active_allocation_per_asset` | 409 `ASSET_004` |
| Booking | Overlapping time slots | EXCLUDE constraint `no_overlapping_bookings` | 409 `BOOKING_002` |
| Transfer | Approve twice | `UPDATE … WHERE status = 'REQUESTED'` | 409 |
| Return | Double click | Status validation before update | 409 `ALLOC_003` |
| Close audit | Close twice | Cycle status check | 409 `AUDIT_003` |
| Maintenance | Duplicate active request | Partial unique index `one_active_maintenance_per_asset` | 409 `MAINT_002` |
| Overdue notification | Cron runs twice | Unique index `notification_dedup_key` | Skip (idempotent) |

---

## 11. Idempotency

Every mutation answers: **if this request is repeated, what happens?**

| Action | Repeated response |
|--------|-------------------|
| Allocate | Already allocated → 409 `ASSET_004` |
| Return | Already returned → 409 `ALLOC_003` |
| Approve maintenance | Already approved → success or 409 |
| Close audit | Already closed → 409 `AUDIT_003` |
| Book resource | Overlap or duplicate → 409 `BOOKING_002` |

---

## 12. Testing Contracts

Tests are organized by **workflow**, not by module:

```
Allocate Asset
  ├── Happy path
  ├── Already allocated
  ├── Inactive employee
  ├── Retired asset
  ├── Double click
  └── Concurrent allocation
```

| Owner | Integration Test |
|-------|------------------|
| P1 | Booking overlap 09:00 vs 09:30 rejects, 10:00–11:00 accepts; signup ignores client `role` |
| P2 | Dept Head cannot approve other department; overdue allocation flagged |
| P3 | Allocation conflict returns holder name; audit close → Lost; maintenance cascade |

---

## 13. Performance Budget

| Metric | Target |
|--------|--------|
| Response time | < 150 ms (p95) |
| Queries per request | < 3 |
| Pagination default | 20, max 100 |
| Prisma | `select` projections only; no blind `include` |

---

## 14. Environment Variables

Validated at boot via `lib/env.ts` (Zod). See `.env.example`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled connection (`connection_limit=10`) |
| `DIRECT_URL` | Unpooled — migrations |
| `BETTER_AUTH_SECRET` | Session signing (min 32 chars) |
| `BETTER_AUTH_URL` | App base URL |
| `CRON_SECRET` | Guards `/api/cron/overdue-check` |
