# Business Invariants

Non-negotiable rules that must always hold true. Enforced at the database layer where possible; otherwise in domain services inside transactions.

---

## Asset

- Asset Tag is **immutable** after creation
- Serial Number is **globally unique**
- Asset belongs to **exactly one** category
- Retired assets **cannot** be allocated
- Disposed assets **cannot** transition to any other status
- Lost assets **cannot** be booked
- Under Maintenance assets **cannot** be allocated
- Assets are **never hard-deleted**

---

## Allocation

- Only **one ACTIVE** allocation per asset at any time
- Return date must be **≥ allocation date**
- A returned allocation **cannot** become ACTIVE again
- Transfer always **closes** the previous allocation before opening a new one
- Allocation history is **immutable** (append-only)

---

## Booking

- End time must be **> start time**
- Asset must be in a **bookable** status
- Asset **cannot** be retired or disposed
- **No overlapping** bookings for the same asset (DB EXCLUDE constraint)
- Cancelled bookings **cannot** be edited
- Bookings are **never hard-deleted**

---

## Maintenance

- Only **one active** maintenance request per asset
- Rejected maintenance **cannot** be resolved
- Technician **cannot** approve their own request
- Resolution date must be **≥ approval date**
- Maintenance records are **never hard-deleted**

---

## Audit

- Closed audits are **immutable**
- Each asset can be verified **only once** per audit cycle
- Missing → Lost transition happens **only after** audit close
- Audits **cannot** be deleted after closure

---

## Organization

- Department hierarchy **cannot** contain cycles
- Deactivating a department with active employees is **blocked**
- Deactivating a category with active assets is **blocked**
- At least **one Admin** must always exist
- Inactive or suspended employees **cannot** log in
- Inactive employees **cannot** receive new allocations or create bookings

---

## Authentication

- Email addresses are stored **lowercased and trimmed**
- Identity is always derived from **server-side session**
- Signup always creates **`EMPLOYEE`** — no API accepts `role` in the signup body
- Only **Admin** can promote or demote roles via the employee directory
- If a user's **role or status** changes, all future authorization uses the **latest database state** — existing sessions do not retain revoked permissions
- Deactivating a user sets `status = INACTIVE`, deletes all sessions, and blocks login on the next request
- User status is `ACTIVE`, `INACTIVE`, or `SUSPENDED` — only `ACTIVE` users may authenticate and mutate
- Every role change produces an **activity log** entry (actor, target, old role, new role, timestamp)
- Forgot-password tokens expire in **15 minutes**, are **one-time use**, and stored **hashed**
- Issuing a new reset token **invalidates** previous tokens for that user
- Password reset **invalidates** all existing sessions

---

## Notifications

- Duplicate notifications are prevented by unique key: `(type, entityId, recipientId)`
- Notifications are **append-only**

---

## Activity Log

- Every state-changing action produces an activity log entry
- Activity log entries are **append-only** and **never modified**
- Each entry records: actor, action, entity, timestamp
- **Status transitions** must include both `oldValue` and `newValue` (e.g. `{ status: "ALLOCATED" }` → `{ status: "AVAILABLE" }`)
- Role changes must log old role and new role in `oldValue` / `newValue`
