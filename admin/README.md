# Koi Admin

> **Koi . Care . Peace.**

Internal admin dashboard for the koi pond water quality monitor system.
Next.js 14 (App Router) + Tailwind. Sister to the NestJS server in this
same repo (`../src/`) and the React Native mobile app in
[koi_pond_water_quality_monitor_mobile](https://github.com/johnbxl1970/koi_pond_water_quality_monitor_mobile).

## Status

Phase 0 shell. The dashboard renders, brand assets are in place, sidebar
navigation works — but the stat numbers are **placeholder zeros**. The
matching `/api/admin/stats` endpoint on the NestJS server hasn't been
built yet; the dashboard banner makes that obvious instead of faking
real-looking numbers.

## Run locally

```bash
cd admin
npm install
npm run dev    # http://localhost:3001
```

`next.config.mjs` rewrites `/api/*` → `http://localhost:3000/api/*` so
the admin UI hits the same routes the mobile app does. Override with
`KOI_SERVER_URL` if you're running the NestJS server elsewhere.

## What's intentionally not here yet

- **Auth.** No login screen yet. Will reuse the NestJS JWT auth + add a
  `User.isAdmin` flag (currently every registered user is just a regular
  pond owner). Until then, run the admin only locally — never expose to
  the network.
- **Live data.** `src/lib/server-stats.ts` returns zeros. Replace with a
  fetch to `/api/admin/stats` once that controller exists.
- **Mutations.** Listing screens (`/users`, `/ponds`, `/devices`, etc.)
  are stubs. Read-before-write — start with read views, add cert revoke /
  user disable / claim cancel only after the views surface enough state
  to make those decisions safely.
- **shadcn/ui.** Skipped for v0 since plain Tailwind covers the dashboard
  primitives we need. Add when the surface area justifies it.

## Brand

The koi yin-yang logo lives at `public/logo.jpg` (full-res for header) +
`public/icon.png` (64x64 favicon) + `public/icon-192.png` (192x192 for
touch icons). Brand constants — slogan, name, asset paths — are
centralized in `src/lib/brand.ts` so admin and any future surfaces stay
in sync.
