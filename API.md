# API Reference

Base URL: `http://localhost:3000`  
Full interactive docs: `http://localhost:3000/api` (Swagger UI)

All error responses follow the shape:
```json
{
  "statusCode": 400,
  "timestamp": "2026-06-01T12:00:00.000Z",
  "path": "/auth/login",
  "correlationId": "uuid-v4",
  "error": { "message": "..." }
}
```

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
