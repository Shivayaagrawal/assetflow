# Error Catalogue

> **Canonical source:** [docs/errors.md](../../docs/errors.md)
>
> **Implementation:** `src/shared/errors/codes.ts` · thrown via `AppError` subclasses in `src/shared/errors/app-error.ts`

Do not duplicate error codes here. Update `docs/errors.md` and `src/shared/errors/codes.ts` together.

## Usage

```typescript
import { ConflictError, AuthorizationError } from "@/shared/errors/app-error";

throw new ConflictError("BOOKING_002");
throw new AuthorizationError("AUTH_007");
```

## Response Envelope

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

HTTP status mapping lives in `ERROR_HTTP_STATUS` inside `src/shared/errors/codes.ts`.
