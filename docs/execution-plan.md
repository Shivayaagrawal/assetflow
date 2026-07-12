# AssetFlow — Odoo Hackathon 2026 Execution Plan

**12 July 2026 · 9:00 AM – 5:00 PM IST · Team of 3**

Enterprise Asset & Resource Management System — personalized build plan aligned with the spec and mockup.

---

## Core Workflow (One Sentence)

> An asset moves through a lifecycle; it can be allocated to one holder at a time or booked in non-overlapping time slots; maintenance and audits gate and update its status; every state change notifies the right people.

---

## Tier 1 — Must Be 100% Real

- **Auth**: Signup creates Employee only; roles promoted only via Admin Employee Directory; Better Auth sessions; forgot-password flow
- **Organization Setup** (Screen 3): Departments, categories, employee directory with promote action
- **Asset Registration** (Screen 4): Auto tag, 7-state lifecycle, server-enforced transitions, per-asset history
- **Allocation & Transfer** (Screen 5): Partial unique index; conflict surfaces holder name + transfer offer
- **Resource Booking** (Screen 6): EXCLUDE constraint on overlapping slots
- **Maintenance** (Screen 7): Kanban board; asset status cascade on approve/resolve
- **Asset Audit** (Screen 8): Full cycle workflow; close locks cycle; Missing → Lost
- **Dashboard** (Screen 2): Real KPI queries; overdue returns highlighted
- **Search/QR** (Screen 4): Postgres search; QR generate-and-display
- **Notifications** (Screen 10): Real rows for all trigger events; SWR polling
- **Activity log**: Append-only across all mutations
- **Three role dashboards**: Employee, Department Head, Asset Manager (+ thin Admin org screen)

## Tier 2 — If Ahead at 1:30 PM or 3:30 PM Gate

- Reports & Analytics (Screen 9) with named widgets
- Shared `RecentActivityFeed` on Dashboard + Notifications
- CSV export, category custom fields (JSON), calendar booking view, real file upload

## Tier 3 — Explicit Cut

Depreciation/accounting, QR camera scanning, PDF export, multi-company, ML recommendations, fourth Admin dashboard.

---

## Team Split

| Person | Tier 1 Ownership | Stretch |
|--------|------------------|---------|
| **P1** | Schema (locked after design), auth, org-setup, booking (EXCLUDE), employee vertical | Calendar view, custom fields |
| **P2** | Department Head dashboard, dept-scoped approvals, booking reuse | Reports & Analytics |
| **P3** | Assets, allocation (manager), maintenance Kanban, audit, notifications, search/QR | CSV export, file upload |

**Schema lock:** Only P1 edits `prisma/schema.prisma` after the 10:50 AM push. Booking EXCLUDE migration SQL is P1-only permanently.

---

## Timeline

| Time | Milestone |
|------|-----------|
| **9:00–9:45** | Confirm workflow, roles, fill `CONVENTIONS.md`, repo ready |
| **9:45–11:00** | Co-design schema (17–20 models), P1 pushes, all regenerate |
| **11:00–12:00** | Seed data (mockup cast), first real commits, CI green |
| **12:00–3:30** | Parallel vertical build (P1/P2/P3 branches) |
| **~1:30** | Merge gate: EXCLUDE + allocation conflict E2E, notification handoff |
| **~3:30** | Build complete: all Tier 1 verticals merged |
| **3:30–4:30** | Business-rule tests per vertical |
| **4:30–5:30** | Integration smoke (mockup scenarios), `docker compose up` clean clone |
| **5:30–6:30** | Documentation matches reality |
| **Last 30 min** | Ship with margin |

---

## Git Workflow

Branches: `p1/foundation-employee`, `p2/depthead`, `p3/assetmanager-audit`

Merge every 45–60 minutes. Pull-resolve-push. Never force-push. Conventional commits.

---

## Validation Gates

### 11:00 AM
- `npx prisma validate` passes
- Migration applies on fresh Postgres
- `btree_gist` extension confirmed
- 3-role gut-check passes

### 1:30 PM
- All branches merge and build
- Booking overlap rejected via API (09:30 vs seeded 09:00)
- Allocation conflict returns holder name
- `createNotification()` coordinated across P1/P2/P3
- No `new PrismaClient()` outside `lib/db.ts`

### 3:30 PM
- Each role's Tier 1 actions work end-to-end
- Maintenance cascade verified
- Audit close → Lost verified

### 4:30 PM Integration Smoke
- AF-0114 allocate to Priya → re-allocate blocked → transfer offered
- Room B2: 09:30–10:30 rejected, 10:00–11:00 accepted
- Department rename live-updates `DepartmentPicker`
- Maintenance approve → asset Under Maintenance
- Every notification type fired at least once
- `docker compose up` from clean clone succeeds

---

## Seed Data (Mockup Cast)

- **Departments:** Engineering (Aditi Rao), Field Ops East (Sana Iqbal, Inactive), Facilities (Rohan Mehta)
- **Assets:** AF-0114 Dell Laptop → Priya Shah; AF-0062 Projector (mid-maintenance); Conference Room B2 (bookable)
- **Booking:** Room B2 09:00–10:00 Procurement Team
- **People:** Priya Shah, Arjun Nair (past return, condition: good)
- **Audit:** Engineering cycle, auditors Aditi Rao + Sana Iqbal, mixed results
- **15–20 assets** across all 7 lifecycle states

---

## Self-Audit Checklist

- [ ] Booking EXCLUDE constraint live (`\d+ "Booking"` in psql)
- [ ] Allocation partial unique index live (`\d+ "Allocation"`)
- [ ] Signup cannot set role via request body
- [ ] Department Head cannot access other department via forged ID
- [ ] All 6+ notification types visible in Notification table
- [ ] Maintenance cascade (approve → Under Maintenance, resolve → Available) verified twice
- [ ] Audit close cascade (Missing → Lost) verified twice
- [ ] `btree_gist` auto-installed via Docker init script

---

## Related Documents

- [hld.md](./hld.md) — system architecture
- [lld.md](./lld.md) — implementation contracts
- [architecture.md](./architecture.md) — infrastructure (Docker, CI, auth)
- [business-invariants.md](./business-invariants.md) — domain rules
