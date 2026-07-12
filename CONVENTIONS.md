# AssetFlow Conventions

## API Response Envelope

```json
{
  "success": true,
  "data": {},
  "error": { "code": "BOOKING_002", "message": "Booking overlap detected" },
  "meta": { "page": 1, "total": 42 }
}
```

## Prisma Model Names

`User`, `Department`, `AssetCategory`, `Asset`, `Allocation`, `TransferRequest`, `Booking`, `MaintenanceRequest`, `AuditCycle`, `AuditCycleAuditor`, `AuditItem`, `Notification`, `ActivityLog`

## Branches

- `p1/foundation-employee`
- `p2/depthead`
- `p3/assetmanager-audit`

## Commit Format

```
feat(booking): add EXCLUDE constraint migration
fix(allocation): surface holder name on conflict
test(audit): close cycle sets missing assets to lost
```

## Shared-File Rules

- `prisma/schema.prisma` — P1 only after schema lock
- Booking EXCLUDE migration SQL — P1 only, permanently
- `src/lib/db.ts` — singleton, never duplicate `PrismaClient`
- `createNotification(tx, ...)` — always inside caller's transaction

## Auth Rules

- Signup always creates `EMPLOYEE`
- Role promotion only via Admin → Employee Directory
- `requireSession()` / `requireRole()` on every Server Action
- Never trust client-supplied `userId`, `role`, or `departmentId`

## Feature Module Pattern

Each `features/<domain>/` folder contains:
- `schemas.ts` — Zod validation
- `queries.ts` — read-only Prisma
- `actions.ts` — mutations + transactions
