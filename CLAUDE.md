# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Server for the koi pond water quality monitor. One of three repos:
- **devices** — ESP32 / RP2040-W firmware (separate repo)
- **server** — this repo (NestJS backend + MQTT ingest + REST/SSE API)
- **mobile** — iOS + Android apps (separate repo)

The web dashboard is in its own repo and consumes this server's OpenAPI spec.

## Common commands

```bash
# Local dev stack (Postgres+Timescale, Redis, EMQX)
docker compose up -d

# Install
npm install

# Prisma
npx prisma generate
npx prisma migrate dev        # applies schema.prisma + raw SQL in prisma/migrations/

# Run the API
npm run start:dev             # watch mode, http://localhost:3000/api (Swagger at /api/docs)

# Tests
npm test                      # jest unit
npm run test:watch
npx jest src/recommendations/free-nh3.spec.ts   # single file

# Lint / format
npm run lint
npm run format

# Emit openapi.yaml for mobile/web repos
npm run openapi:emit

# Manual telemetry test (device simulator)
mosquitto_pub -h localhost -t koi/<hardwareId>/telemetry \
  -m '{"phVal":7.8,"tempC":22.5,"doMgL":8.1,"nh3TotalPpm":0.2}'
```

## Architecture (big picture)

```
device ──MQTT QoS1──> EMQX ──> IngestService (src/ingest/)
                                   │
                                   ├─> Prisma → TimescaleDB hypertable (Telemetry)
                                   ├─> Redis pub/sub → StreamController (SSE)
                                   └─> AlertsService → AlertEvent + FcmService
REST/Swagger (src/api/ponds,devices,telemetry) ─> Prisma
Recommendations (src/recommendations/) ─> reads latest telemetry + pond metadata
Weather (src/weather/) ─> @Cron hourly → Open-Meteo → WeatherForecast rows
```

### Hot paths to understand before making changes

- **`src/ingest/ingest.service.ts`** — single MQTT subscriber. Parses `koi/{hardwareId}/telemetry`, validates with zod, looks up device, writes to `Telemetry`, publishes to Redis `telemetry:{pondId}`, then calls `AlertsService.evaluate`. **Free NH3 is computed here at ingest time** (`computeFreeNh3` from `src/recommendations/free-nh3.ts`) so alert rules can threshold on `nh3FreePpm` directly. If you add a new derived field, add it here — don't split the computation across services.
- **`prisma/schema.prisma` + `prisma/migrations/00000000000001_timescale_hypertable/migration.sql`** — the `Telemetry` table is a Timescale hypertable. Its composite primary key is `(deviceId, time)` because hypertables require the time column in any unique index. Do not add an `@id` on a single column. Retention is 2 years, compression kicks in after 30 days.
- **`src/stream/stream.controller.ts`** — SSE endpoint duplicates the `REDIS_SUB` connection per subscriber so subscription state is isolated. Keep it that way; a shared subscriber leaks messages across ponds.
- **`src/recommendations/free-nh3.ts`** — Emerson (1975) equation. Don't rewrite it with an approximation — it's the canonical koi-pond formula and the tests encode the expected behavior.

### Device provisioning

- Design doc: `docs/device-onboarding.md`. Read it before touching `src/provisioning/` — the trust model (bootstrap cert → CSR over MQTT → operational cert issued after user claim) is load-bearing and can't be simplified without re-doing the security review.
- `CaService` loads the operational CA from `CA_CERT_PEM` / `CA_KEY_PEM` env vars. In dev, run `npm run dev:gen-ca` to produce them. The private key lives in memory only — never log it, never write it back to disk from the running server.
- `ProvisioningService.onIssued` is a callback deliberately wired by `IngestService` so issued certs publish over the same MQTT connection that ingests telemetry. If you add a second MQTT client, don't use it here.
- Claim tokens are hashed with argon2id. `ProvisioningService.claim` does an O(n) scan over pending claims because we can't look up by plaintext. That's fine at hobbyist scale; add an HMAC-prefix index if pending claims ever exceed a few hundred.

### What's intentionally not here yet

- Auth. `src/api/*` endpoints have no guards. A JWT guard + RLS-style pond membership check is the next milestone. Do not build features that assume multi-tenant isolation until the guard lands.
- `POST /api/admin/device-claims` is also unguarded. It must be admin-only before this server is exposed to the internet.
- FCM is stubbed (`src/alerts/fcm.service.ts`). Wire `firebase-admin` when creds are provisioned; don't invent a parallel push abstraction.
- EMQX ACLs (bootstrap cert can only touch `provisioning/+/request`, operational cert can only touch its own `koi/<hwid>/*`) need to be configured on the broker side — see `docs/device-onboarding.md` "MQTT topics" table. Not enforced by the server code alone.
- Local-first mode is deferred to post-v1 but the stack is deliberately self-hostable — no managed-service SDKs in hot paths. Keep it that way.

## Conventions

- TypeScript strict mode is on. No `any` unless there's a comment explaining why.
- DTOs use `class-validator` + `@nestjs/swagger` decorators so OpenAPI generation stays accurate.
- Env config flows through `src/config/env.schema.ts` (zod) → `AppConfig`. Don't read `process.env` directly outside that file.
- Prisma is the only DB client. For Timescale-specific SQL (hyperfunctions, time_bucket), use `prisma.$queryRaw` — don't open a second pool.

## Plan of record

The architecture decisions and market research driving this server live in `~/.claude/plans/agile-orbiting-nebula.md`. Read it before proposing structural changes.
