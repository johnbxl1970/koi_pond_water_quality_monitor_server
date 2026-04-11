# koi_pond_water_quality_monitor_server

Server component of the koi pond water quality monitor system. NestJS + TimescaleDB + MQTT (EMQX) + Redis.

See [`CLAUDE.md`](./CLAUDE.md) for architecture, dev commands, and the hot paths to understand before making changes.

## Quick start

```bash
docker compose up -d
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev
```

API runs at http://localhost:3000/api. Swagger UI at http://localhost:3000/api/docs.

Send a fake telemetry message:

```bash
mosquitto_pub -h localhost -t koi/<hardwareId>/telemetry \
  -m '{"phVal":7.8,"tempC":22.5,"doMgL":8.1,"nh3TotalPpm":0.2}'
```

## Companion repos

- Devices (RP2040 / ESP32 firmware) — separate repo
- Mobile app (iOS / Android) — separate repo
- Web dashboard — separate repo, consumes `openapi.yaml`
