Consistent error codes returned in the API `error` field. Format: `{ code, message }`.

**Implementation:** `src/shared/errors/codes.ts` · thrown via `AppError` subclasses.

**Engineering reference:** [backend/engineering/error-catalog.md](../backend/engineering/error-catalog.md) (usage only — this file is canonical).

---

## Authentication (`AUTH_*`)

| Code | Message | HTTP |
|------|---------|------|
| `AUTH_001` | Invalid credentials | 401 |
| `AUTH_002` | Session expired | 401 |
| `AUTH_003` | Account is inactive | 403 |
| `AUTH_004` | Reset token is invalid or expired | 400 |
| `AUTH_005` | Reset token has already been used | 400 |
| `AUTH_006` | Email is already registered | 409 |
| `AUTH_007` | Insufficient permissions | 403 |

---

## Asset (`ASSET_*`)

| Code | Message | HTTP |
|------|---------|------|
| `ASSET_001` | Asset not found | 404 |
| `ASSET_002` | Serial number already exists | 409 |
| `ASSET_003` | Invalid status transition | 400 |
| `ASSET_004` | Asset is already allocated | 409 |
| `ASSET_005` | Asset is under maintenance | 409 |
| `ASSET_006` | Asset is retired or disposed | 400 |
| `ASSET_007` | Asset tag cannot be modified | 400 |
| `ASSET_008` | Unsupported file type | 400 |
| `ASSET_009` | File exceeds size limit | 400 |

---

## Allocation (`ALLOC_*`)

| Code | Message | HTTP |
|------|---------|------|
| `ALLOC_001` | Allocation not found | 404 |
| `ALLOC_002` | Asset is not available for allocation | 409 |
| `ALLOC_003` | Allocation has already been returned | 409 |
| `ALLOC_004` | Cannot transfer to the same employee | 400 |
| `ALLOC_005` | Target employee is inactive | 400 |
| `ALLOC_006` | Return date must be on or after allocation date | 400 |

---

## Booking (`BOOKING_*`)

| Code | Message | HTTP |
|------|---------|------|
| `BOOKING_001` | Booking not found | 404 |
| `BOOKING_002` | Booking overlap detected | 409 |
| `BOOKING_003` | End time must be after start time | 400 |
| `BOOKING_004` | Asset is not bookable | 400 |
| `BOOKING_005` | Cancelled booking cannot be modified | 400 |

---

## Maintenance (`MAINT_*`)

| Code | Message | HTTP |
|------|---------|------|
| `MAINT_001` | Maintenance request not found | 404 |
| `MAINT_002` | Active maintenance already exists for this asset | 409 |
| `MAINT_003` | Cannot approve your own request | 403 |
| `MAINT_004` | Rejected maintenance cannot be resolved | 400 |
| `MAINT_005` | Request is not in a valid state for this action | 400 |

---

## Audit (`AUDIT_*`)

| Code | Message | HTTP |
|------|---------|------|
| `AUDIT_001` | Audit cycle not found | 404 |
| `AUDIT_002` | Asset already verified in this cycle | 409 |
| `AUDIT_003` | Audit is already closed | 409 |
| `AUDIT_004` | Closed audit cannot be modified | 400 |
| `AUDIT_005` | Overlapping audit cycle exists for this scope | 409 |

---

## Organization (`ORG_*`)

| Code | Message | HTTP |
|------|---------|------|
| `ORG_001` | Department not found | 404 |
| `ORG_002` | Department hierarchy would create a cycle | 400 |
| `ORG_003` | Cannot deactivate department with active employees | 409 |
| `ORG_004` | Cannot deactivate category with active assets | 409 |
| `ORG_005` | Cannot remove the last admin | 409 |
| `ORG_006` | Employee not found | 404 |

---

## General (`GEN_*`)

| Code | Message | HTTP |
|------|---------|------|
| `GEN_001` | Validation failed | 400 |
| `GEN_002` | Resource not found | 404 |
| `GEN_003` | Internal server error | 500 |
| `GEN_004` | Rate limit exceeded | 429 |

---

## Response Example

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BOOKING_002",
    "message": "Booking overlap detected"
  },
  "meta": null
}
```
