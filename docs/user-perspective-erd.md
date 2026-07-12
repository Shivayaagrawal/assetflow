# User-Perspective Data Model (ERD)

Companion to [lld.md](./lld.md) §2.1 (full technical ERD). These diagrams show **which entities each role reads or mutates** — the data surface from the user's point of view, not the entire database.

Legend:

| Symbol | Meaning |
|--------|---------|
| Solid relation | Role directly creates or updates records |
| Dashed relation | Role reads only (view / report) |

---

## Employee

Employees interact with **their own** allocations, bookings, maintenance requests, transfers, notifications, and activity.

```mermaid
erDiagram
  User ||--o{ Allocation : "holds (self)"
  User ||--o{ Booking : "creates"
  User ||--o{ MaintenanceRequest : "raises"
  User ||--o{ TransferRequest : "requests"
  User ||--o{ Notification : "receives"
  User ||--o{ ActivityLog : "performs (own)"

  Asset ||--o{ Allocation : "assigned via"
  Asset ||--o{ Booking : "reserved in"
  Asset ||--o{ MaintenanceRequest : "reported on"

  Allocation ||--o{ TransferRequest : "transfer of"

  User {
    string id PK
    string email
    enum role EMPLOYEE
    string departmentId FK
  }

  Asset {
    string assetTag
    string name
    enum status
    boolean isBookable
  }

  Allocation {
    enum status ACTIVE
    datetime allocatedAt
  }

  Booking {
    datetime startTime
    datetime endTime
    enum status
  }

  MaintenanceRequest {
    enum status
    enum priority
  }

  TransferRequest {
    enum status REQUESTED
  }
```

**Screens:** Dashboard, My Allocations, Book Resource, Maintenance, Notifications, Activity (own actions only).

---

## Department Head

Department heads see **department-scoped** allocations, transfers, bookings, and reports. They approve transfers within their department and may be assigned as audit auditors.

```mermaid
erDiagram
  User ||--o{ Department : "heads"
  Department ||--o{ User : "members"
  Department ||--o{ Asset : "owns"
  Department ||--o{ Allocation : "department holder"

  User ||--o{ TransferRequest : "approves (dept scope)"
  User ||--o{ AuditCycleAuditor : "assigned as auditor"
  AuditCycle ||--o{ AuditCycleAuditor : "assigns"
  AuditCycle ||--o{ AuditItem : "contains"
  Asset ||--o{ AuditItem : "verified in"

  User ||--o{ ActivityLog : "performs (dept scope)"

  User {
    string id PK
    enum role DEPARTMENT_HEAD
    string departmentId FK
  }

  Department {
    string name
    string headId FK
  }

  TransferRequest {
    enum status REQUESTED
  }

  AuditCycle {
    enum status OPEN
    datetime startDate
    datetime endDate
  }

  AuditItem {
    enum verificationStatus
  }
```

**Screens:** Department Dashboard, Approvals, Dept Booking, Reports (dept utilization), Activity (department scope).

---

## Asset Manager

Asset managers operate on the **full asset portfolio**: register assets, allocate, run maintenance queue, create/close audit cycles, and view org-wide activity.

```mermaid
erDiagram
  User ||--o{ Asset : "registers (via service)"
  AssetCategory ||--o{ Asset : "categorizes"
  Department ||--o{ Asset : "assigned to"

  Asset ||--o{ Allocation : "allocated"
  User ||--o{ Allocation : "employee holder"
  Allocation ||--o{ TransferRequest : "transfer"

  Asset ||--o{ Booking : "bookable slots"
  User ||--o{ Booking : "books"

  Asset ||--o{ MaintenanceRequest : "under maintenance"
  User ||--o{ MaintenanceRequest : "approves"

  User ||--o{ AuditCycle : "creates"
  AuditCycle ||--o{ AuditCycleAuditor : "assigns auditors"
  AuditCycle ||--o{ AuditItem : "verification items"
  Asset ||--o{ AuditItem : "audited asset"
  User ||--o{ AuditItem : "verifies"

  User ||--o{ Notification : "receives"
  User ||--o{ ActivityLog : "performs (org-wide)"

  Asset {
    string assetTag UK
    string serialNumber UK
    enum status
    boolean isBookable
  }

  Allocation {
    enum status ACTIVE
    enum holderType
  }

  AuditCycle {
    enum status OPEN
  }

  MaintenanceRequest {
    enum status PENDING
  }
```

**Screens:** Operations Dashboard, Asset Directory, Register Asset, Allocation, Maintenance Queue, Audit, Reports, Activity (org-wide).

---

## Admin

Admins configure **organization master data** and promote roles. They inherit asset-manager visibility for audits and reports but the primary write surface is org setup.

```mermaid
erDiagram
  User ||--o{ Department : "promotes members of"
  User ||--o{ ActivityLog : "role changes logged"

  Department ||--o{ Department : "parent hierarchy"
  Department ||--o| User : "department head"
  Department ||--o{ Asset : "owns"

  AssetCategory ||--o{ Asset : "categorizes"

  User {
    string id PK
    enum role ADMIN
    enum status ACTIVE
  }

  Department {
    string name UK
    enum status ACTIVE
    string parentId FK
    string headId FK
  }

  AssetCategory {
    string name UK
    json customFields
  }

  ActivityLog {
    string action EMPLOYEE_ROLE_UPDATED
    json oldValue
    json newValue
  }
```

**Screens:** Org Setup (departments, categories, employee directory), plus all Asset Manager routes when testing operations.

---

## Cross-Role Comparison

| Entity | Employee | Dept Head | Asset Manager | Admin |
|--------|----------|-----------|---------------|-------|
| Asset | Read (allocated/booked) | Read (dept) | Create, allocate, status | Read all |
| Allocation | Own ACTIVE | Dept view | Create, return | Read all |
| Booking | Create own | Dept book | Read all | Read all |
| Maintenance | Raise | Approve (dept) | Full queue | Full queue |
| Transfer | Request | Approve (dept) | Approve | Approve |
| Audit | Read if auditor | Verify if assigned | Create, verify, close | Create, verify, close |
| Department | Read own | Manage dept scope | Read all | Create, deactivate |
| ActivityLog | Own actions | Dept scope | Org-wide | Org-wide |
| User role | — | — | — | Promote only |

Full RBAC matrix: [backend/engineering/permission-matrix.md](../backend/engineering/permission-matrix.md).

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [lld.md](./lld.md) | Full technical ERD and schema |
| [hld.md](./hld.md) | System context and module boundaries |
| [business-invariants.md](./business-invariants.md) | Rules enforced on these entities |
