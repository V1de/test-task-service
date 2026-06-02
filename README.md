# PSP/GSP Service

NestJS + TypeScript backend for identity management and payment/game-state provider callback handling.

## Quick start (Docker)

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env

docker-compose up --build
```

App will be available at `http://localhost:3000`.  
OpenAPI docs: `http://localhost:3000/api`.

## Quick start (local)

**Prerequisites:** Node 20+, PostgreSQL 17+

```bash
npm install

# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env

npm run start:dev
```

## Running tests

> Requires `npm install` to have been run first.

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires a running Postgres on localhost:5432)
npm run test:e2e
```

## Project structure

```
src/
  app.module.ts              # Root module, applies CorrelationId middleware globally
  main.ts                    # Bootstrap, Swagger, global pipes/filters
  common/
    decorators/              # @CurrentUser, @BrandId param decorators
    filters/                 # Global HTTP exception filter (structured errors)
    guards/                  # JwtAuthGuard
    middleware/              # CorrelationIdMiddleware
  database/
    database.module.ts       # TypeORM async config
    entities/                # user, session, raw_event, idempotency_key
  identity/
    identity.module.ts
    auth/                    # POST /auth/register, POST /auth/login
    profile/                 # GET /profile/me (JWT-protected)
  webhooks/
    webhooks.module.ts
    psp/                     # POST /webhooks/psp/:provider
    gsp/                     # POST /webhooks/gsp/:provider
test/
  tenant-isolation.e2e-spec.ts
```
