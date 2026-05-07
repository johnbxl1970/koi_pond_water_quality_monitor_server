# Koi Admin

> **Koi . Care . Peace.**

Internal admin dashboard for the koi pond water quality monitor system.
Next.js 14 (App Router) + Tailwind. Sister to the NestJS server in this
same repo (`../src/`) and the React Native mobile app in
[koi_pond_water_quality_monitor_mobile](https://github.com/johnbxl1970/koi_pond_water_quality_monitor_mobile).

## Status

Phase 0 dashboard shell **is live**. The dashboard renders real fleet
counts (users, ponds, devices, alerts, AI predictions, system health)
fetched server-side from the NestJS `/api/admin/stats` endpoint. The
list pages (`/users`, `/ponds`, etc.) are still stubs — read-before-
write, those land next.

## Run locally

```bash
cd admin
cp .env.local.example .env.local   # if you don't already have it
# Set KOI_ADMIN_TOKEN to the same value as ADMIN_API_TOKEN in ../.env
npm install
npm run dev    # http://localhost:3001
```

`next.config.mjs` rewrites browser-facing `/api/*` → `http://localhost:3000/api/*`
for any future client-side calls. The dashboard's stat fetch happens
**server-side** in a Server Component, with the bearer token attached
from `KOI_ADMIN_TOKEN` — the token never reaches the browser.

## Auth

Per-user admin auth via JWT + cookies. To get in:

1. Register the user normally via `POST /api/auth/register`.
2. Promote them on the server: `npx ts-node scripts/promote-admin.ts you@example.com`
3. Visit `http://localhost:3001/login`, enter the same credentials.

The login Server Action verifies the user has `isAdmin=true` via `/api/auth/me`
before storing the session cookies (`koi_admin_at`, `koi_admin_rt`, both HttpOnly).
Edge middleware at `src/middleware.ts` decodes the access JWT's `exp` and
transparently refreshes via `/api/auth/refresh` when the access token is
within 30 seconds of expiring — admins stay signed in across the server's
15-minute access TTL until the 30-day refresh token expires.

The shared `ADMIN_API_TOKEN` bearer is no longer used by this app. It still
exists on the server, but only to gate `POST /api/admin/device-claims` for
the device-flashing tool.

## What's intentionally not here yet

- **Per-user admin auth.** No login screen yet. The dashboard is gated
  by the shared `ADMIN_API_TOKEN`. Will reuse the NestJS JWT auth + add
  a `User.isAdmin` flag (currently every registered user is just a
  regular pond owner). Until then, run the admin only locally.
- **List pages.** `/users`, `/ponds`, `/devices`, `/alerts`,
  `/predictions` are stubs. Read-before-write — start with read views,
  add cert revoke / user disable / claim cancel only after the views
  surface enough state to make those decisions safely.
- **shadcn/ui.** Skipped for v0 since plain Tailwind covers the dashboard
  primitives we need. Add when the surface area justifies it.

## Brand

The koi yin-yang logo lives at `public/logo.jpg` (full-res for header) +
`public/icon.png` (64x64 favicon) + `public/icon-192.png` (192x192 for
touch icons). Brand constants — slogan, name, asset paths — are
centralized in `src/lib/brand.ts` so admin and any future surfaces stay
in sync.
