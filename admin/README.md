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

## Auth (Phase 0)

Access control is the existing shared `ADMIN_API_TOKEN` bearer (same
gate that protects `POST /api/admin/device-claims` on the server). The
admin app reads it from `KOI_ADMIN_TOKEN` in `.env.local` (gitignored).
**Anyone with the token can view the dashboard.** Run the admin only
locally — never expose port 3001 publicly until per-user admin auth
(`User.isAdmin` + login screen) lands.

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
