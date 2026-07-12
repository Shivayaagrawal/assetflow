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
- `requireSession()` / `assertRole()` on every Server Action
- Never trust client-supplied `userId`, `role`, or `departmentId`
- Authorization lives in policies — not inline `if (user.role === ...)`

## Module Pattern

Each `modules/<domain>/` folder contains:

| Folder / File | Responsibility |
|---------------|----------------|
| `validators/*.schema.ts` | Zod validation |
| `policies/*.policy.ts` | Authorization |
| `services/*.service.ts` | One workflow per service |
| `repositories/*.repository.ts` | All Prisma access |
| `actions/*.action.ts` | Thin Server Actions |

### Dependency Rule

```
app/ → modules/ → shared/ → lib/
```

Modules never import from other modules.

## Dynamic Data

No hardcoded business data in UI — all pickers, dashboards, and reports query repositories backed by PostgreSQL. Static JSON is permitted only in `prisma/seed.ts` and test fixtures.

## Error Handling

Use typed errors from `shared/errors/` — never `throw new Error("...")`:

```typescript
throw new ConflictError("BOOKING_002");
throw new AuthorizationError("AUTH_007");
```

Canonical catalogue: [docs/errors.md](docs/errors.md) · Implementation: `src/shared/errors/codes.ts`

## Testing

Write tests by **workflow**, not by module:

```
Allocate Asset
  ├── Happy path
  ├── Already allocated
  ├── Inactive employee
  ├── Retired asset
  ├── Double click
  └── Concurrent allocation
```
