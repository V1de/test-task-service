# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev        # dev server with hot-reload
npm run build            # compile to dist/
npm run test             # unit tests (Jest)
npm run test:cov         # unit tests with coverage
npm run test:e2e         # e2e tests (requires running Postgres)
npm run lint             # ESLint fix

# Run a single test file
npx jest src/identity/auth/auth.service.spec.ts
```

One-command local stack (app + Postgres):
```bash
cp .env.example .env && docker-compose up --build
```

## Architecture

Three top-level NestJS modules wired in `AppModule`:

| Module | Path | Purpose |
|---|---|---|
| `DatabaseModule` | `src/database/` | TypeORM config; owns all entities |
| `IdentityModule` | `src/identity/` | Auth (register/login/JWT) + profile reads |
| `WebhooksModule` | `src/webhooks/` | PSP + GSP callback ingestion |

**Request lifecycle:**
1. `CorrelationIdMiddleware` stamps `x-correlation-id` on every request/response.
2. `JwtAuthGuard` (Passport `jwt` strategy) protects routes in `IdentityModule/profile` only.
3. `HttpExceptionFilter` (global) formats all errors, embedding `correlationId`.

## Key design rules (enforced, not aspirational)

- **Tenant isolation:** every DB query must be scoped by `brandId`. The `@BrandId()` decorator extracts it from the JWT payload — use it instead of reading `req.user` directly.
- **No balance/state mutations in webhook adapters.** `PspService` and `GspService` only write to `raw_events` + `idempotency_keys`. Side effects belong in a downstream processor.
- **Idempotency:** callbacks deduplicate on `(idempotency_key, brandId)` via the `idempotency_keys` table. Return `{ status: "duplicate" }` — never a 4xx — for repeated events.

## Data model

| Table | Entity | Notes |
|---|---|---|
| `users` | `User` | unique on `(email, brandId)` |
| `sessions` | `Session` | server-side revocable JWT sessions |
| `raw_events` | `RawEvent` | append-only callback log |
| `idempotency_keys` | `IdempotencyKey` | unique on `key`; links to `raw_events` |

`synchronize: true` is enabled in non-production — use explicit TypeORM migrations for production deploys.

## Tests

- **Unit:** co-located `*.spec.ts` files; mock repos with `jest.fn()` values.
- **E2E:** `test/` directory; use `test/jest-e2e.json` config; require a live Postgres instance.
- Tenant leakage test lives in `test/tenant-isolation.e2e-spec.ts`.
