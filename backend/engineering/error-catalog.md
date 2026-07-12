# Error Catalogue

Implemented in `src/shared/errors/codes.ts` and thrown via `AppError` subclasses.

| Code | Message | HTTP | Module |
|------|---------|------|--------|
| AUTH_001 | Invalid credentials | 401 | identity |
| AUTH_002 | Session expired | 401 | identity |
| AUTH_003 | Account is inactive | 403 | identity |
| AUTH_006 | Email is already registered | 409 | identity |
| AUTH_007 | Insufficient permissions | 403 | shared |
| ASSET_001 | Asset not found | 404 | asset |
| ASSET_002 | Serial number already exists | 409 | asset |
| ASSET_004 | Asset is already allocated | 409 | allocation |
| ASSET_005 | Asset is under maintenance | 409 | asset |
| ASSET_006 | Asset is retired or disposed | 400 | asset |
| ALLOC_001 | Allocation not found | 404 | allocation |
| ALLOC_002 | Asset is not available for allocation | 409 | allocation |
| ALLOC_003 | Allocation has already been returned | 409 | allocation |
| BOOKING_002 | Booking overlap detected | 409 | booking |
| BOOKING_003 | End time must be after start time | 400 | booking |
| BOOKING_004 | Asset is not bookable | 400 | booking |
| GEN_001 | Validation failed | 400 | shared |
| GEN_003 | Internal server error | 500 | shared |

## Usage

```typescript
throw new ConflictError("BOOKING_002");
throw new AuthorizationError("AUTH_007");
```

## Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_002",
    "message": "Booking overlap detected"
  }
}
```
