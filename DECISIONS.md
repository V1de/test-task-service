# Design Decisions & Trade-offs

## Module boundaries

The project is split into three top-level modules:

| Module | Responsibility |
|---|---|
| `IdentityModule` | User registration, login, JWT issuance, profile reads |
| `WebhooksModule` | PSP + GSP callback ingestion, idempotency, raw event persistence |
| `DatabaseModule` | TypeORM config; entity definitions shared across modules |

**Why:** Clear separation ensures that the webhook ingestion flow remains isolated from identity concerns and cannot directly affect user state (e.g. balances). This also enables future extension with a dedicated ledger or processing module that consumes `raw_events` without coupling to ingestion logic.

**Note:** Module names were chosen based on domain-driven design (DDD) and logical bounded contexts, rather than directly mirroring the task wording. This improves clarity of responsibilities and long-term maintainability.

If the system evolves to include downstream business processing (beyond pure ingestion), the module boundaries and naming may be revisited to better reflect the expanded domain scope.

---

## Idempotency approach

Callbacks are deduplicated using an `idempotency_keys` table with a unique constraint on `(brandId, provider, key)`, where `key` is derived from the external `eventId`.

This ensures idempotency at the database level and guarantees safe processing under retries and concurrent webhook delivery.

**Alternative considered:** relying solely on a unique constraint on `raw_events` (e.g. `externalEventId`). This approach was rejected because it couples idempotency with event storage and reduces flexibility for future event processing pipelines (e.g. reprocessing, replay, or partial ingestion workflows).

**Trade-off:** two writes per accepted event (idempotency key + raw event). This is acceptable for MVP-scale systems and provides a clear separation between deduplication logic and event persistence. At a higher scale, this could be optimized using a single-event table with a unique constraint or transactional upsert patterns.

---

## Tenant isolation (brandId)

`brandId` is embedded in the JWT payload at login time. Every service method that reads or writes data receives `brandId` as an explicit parameter and must scope all queries with it (e.g., `WHERE brand_id = $1`).

## Possible alternative multi-tenant isolation approaches
- **Database Row Level Security (RLS)** — DB enforces tenant isolation via policies.
- **Schema-per-tenant** — each tenant has its own DB schema.
- **Database-per-tenant** — each tenant has a separate database.
- **Hybrid model** — mix of shared and dedicated DBs depending on tenant size.

---

## No direct balance updates in adapters

PSP and GSP services only write to `raw_events`. Balance or game-state mutations are intentionally deferred to a downstream processor (not in scope here). This satisfies the "outbox-like" pattern: events are durably stored before any side effects occur.

---

## Structured error responses

A global `HttpExceptionFilter` transforms all exceptions into a consistent shape including `correlationId`. This makes log correlation trivial — every error response carries the same ID logged by `CorrelationIdMiddleware`.

---

## JWT sessions

Sessions are persisted in the `sessions` table to enable server-side revocation and per-tenant security control.

This introduces statefulness compared to pure JWT, but is required for secure multi-tenant systems where compromised tokens must be invalidated.

**Trade-off:** Every authenticated request requires a database lookup to validate the session state. A Redis cache layer can be introduced to reduce a database load at scale, while keeping the database as the source of truth.

---

## TypeORM `synchronize: true` in non-production

Enabled only when `NODE_ENV !== 'production'` for fast local iteration. Production should use explicit migrations.

---

## OpenAPI / Swagger

`@nestjs/swagger` is wired in `main.ts`. All DTOs use `@ApiProperty` decorators so the spec is generated automatically from the code — no separate schema file to keep in sync.
