# Execution Plan

Phased delivery plan for AssetFlow. Each phase produces a deployable, testable increment.

---

## Phase 1 — Foundation (Week 1)

### Goals

- Project scaffolding (TypeScript, ESLint, Prettier, Vitest)
- PostgreSQL schema with core tables and constraints
- Prisma setup with singleton client
- Auth module (login, session, forgot password)
- Organization module (departments, employees, roles)
- API foundation (`/api/v1`, error envelope, health check)

### Deliverables

- [ ] `prisma/schema.prisma` with Organization, User, Employee, Department tables
- [ ] Auth service with session management
- [ ] Department CRUD with hierarchy validation (no cycles)
- [ ] Employee CRUD with role assignment
- [ ] Activity log table and repository
- [ ] Seed data: Admin user, sample departments, sample employees
- [ ] `GET /api/v1/health`

### Exit Criteria

Admin can log in, create departments and employees, and all migrations + seeds pass CI.

---

## Phase 2 — Asset Core (Week 2)

### Goals

- Asset registration with auto-generated tags (`AF-000001`)
- Category management
- Status lifecycle enforcement
- File attachments
- Search with priority ranking

### Deliverables

- [ ] Asset CRUD with immutable tag and unique serial number
- [ ] Category CRUD with soft-deactivate
- [ ] Status transition service with lifecycle matrix
- [ ] Sequence number generation with row locking
- [ ] File upload (PNG/JPEG ≤ 5 MB, PDF ≤ 10 MB)
- [ ] Asset search endpoint with ranked results

### Exit Criteria

Assets can be created, categorized, searched, and transitioned through valid statuses. DB rejects duplicate serials and invalid transitions.

---

## Phase 3 — Allocation & Booking (Week 3)

### Goals

- Full allocation workflow (allocate, return, transfer)
- Booking with overlap protection
- Department-scoped manager permissions
- Notifications on state changes

### Deliverables

- [ ] Allocate / return / transfer services with transactions
- [ ] Booking service with EXCLUDE constraint
- [ ] Idempotent allocate and approve endpoints
- [ ] Permission policies for Department Head scope
- [ ] Notification service with deduplication key
- [ ] Business-rule tests: overlap, conflict, permissions

### Exit Criteria

Two simultaneous booking attempts result in one success and one 409. Allocation history is immutable. All four test dimensions pass (happy, failure, edge, auth).

---

## Phase 4 — Maintenance & Audit (Week 4)

### Goals

- Maintenance request lifecycle
- Audit cycle management
- Reporting with pagination
- Dashboard data endpoints

### Deliverables

- [ ] Maintenance: raise → approve → assign → resolve / reject
- [ ] Audit: start cycle → verify assets → close (immutable)
- [ ] Report endpoints with pagination (default 20, max 100)
- [ ] Dashboard summary endpoint
- [ ] Transactional audit close

### Exit Criteria

Closed audits are immutable. Maintenance lifecycle complete with authorization checks. Reports paginate correctly.

---

## Phase 5 — Frontend (Week 5)

### Goals

- Role-based UI for all workflows
- Reusable component library
- Responsive, accessible design
- Dashboard with live refresh

### Deliverables

- [ ] Auth pages (login, forgot password, reset)
- [ ] Asset list, detail, create/edit forms
- [ ] Allocation and booking interfaces
- [ ] Maintenance and audit workflows
- [ ] Admin panel (departments, employees, categories)
- [ ] Dashboard with SWR / 30 s polling

### Exit Criteria

All primary workflows completable from UI. No hardcoded data. Shared form components across modules.

---

## Phase 6 — Hardening & Deploy (Week 6)

### Goals

- Full test coverage on business rules
- CI/CD pipeline
- Rate limiting and security hardening
- Production deployment

### Deliverables

- [ ] Integration test suite
- [ ] GitHub Actions: lint → typecheck → test → build
- [ ] Rate limiting on auth endpoints (login 5/min, forgot-password 3/min)
- [ ] Error catalogue implemented (`docs/errors.md`)
- [ ] Production deploy (Railway / similar)
- [ ] Seed data checklist verified (every lifecycle stage represented)

### Exit Criteria

CI green on every PR. Application deployed and accessible. All business invariants enforced at DB + service level.

---

## Daily Workflow

```
1. Pick task from current phase
2. Write / update business invariant if new rule introduced
3. Implement: DB constraint → Prisma → Repository → Service → Controller
4. Write business-rule tests (not CRUD tests)
5. Self-review against .cursor/rules/review.mdc
6. lint → typecheck → test → build
7. Commit with conventional message
8. Open PR
```

---

## Seed Data Checklist

Every seed run must include at least one record in each state:

- [ ] Asset: Available, Allocated, Under Maintenance, Booked, Lost, Retired, Disposed
- [ ] Allocation: Active, Returned
- [ ] Booking: Active, Cancelled, Completed
- [ ] Maintenance: Pending, Approved, Assigned, Resolved, Rejected
- [ ] Audit: In Progress, Closed
- [ ] Notification: Unread, Read
- [ ] Employee: Active, Inactive
- [ ] Department: Active, Inactive
