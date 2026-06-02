# API Reference

Base URL: `http://localhost:3000`  
Full interactive docs: `http://localhost:3000/api` (Swagger UI)

All error responses follow the shape:
```json
{
  "code": "INTERNAL_ERROR",
  "message": "Human-readable error description",
  "correlationId": "uuid-v4",
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

The HTTP status code communicates the error category (e.g. 400, 401, 404, 409, 500), while the code field provides a stable machine-readable identifier for client-side handling and monitoring.

correlationId is generated per request and included in both logs and API responses to simplify tracing and debugging across system boundaries.

Alternative considered: wrapping errors in an additional error object:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "...",
    "correlationId": "...",
    "timestamp": "..."
  }
}
```


This approach can improve consistency when successful responses are also wrapped (e.g. { "data": ... }), but was not adopted to keep the API response shape simple for this MVP.

---

## Identity

### POST /auth/register

Register a new user within a tenant.

**Request**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "brandId": "brandA",
  "name": "Jane Doe"
}
```

**Response `201`**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "userId": "uuid",
  "brandId": "brandA"
}
```

---

### POST /auth/login

**Request**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "brandId": "brandA"
}
```

**Response `200`**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "userId": "uuid",
  "brandId": "brandA"
}
```

---

### GET /profile/me

Returns the authenticated user's profile. Requires `Authorization: Bearer <jwt>`.

**Response `200`**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "brandId": "brandA",
  "name": "Jane Doe",
  "createdAt": "2026-06-01T12:00:00.000Z"
}
```

---

## Webhooks

Both PSP and GSP endpoints share the same request/response contract.

### POST /webhooks/psp/:provider

`:provider` examples: `stripe`, `adyen`, `paypal`

**Request**
```http
POST /webhooks/psp/stripe
Content-Type: application/json

{
  "eventId": "evt_unique_123",
  "brandId": "brandA",
  "payload": {
    "type": "payment_intent.succeeded",
    "data": { "amount": 5000, "currency": "usd" }
  }
}
```

**Response `200` — new event**
```json
{ "status": "accepted", "eventId": "evt_unique_123" }
```

**Response `200` — duplicate**
```json
{ "status": "duplicate", "eventId": "evt_unique_123" }
```

---

### POST /webhooks/gsp/:provider

`:provider` examples: `evolution`, `pragmatic`

Same request/response contract as PSP callbacks.
