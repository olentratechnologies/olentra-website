# Company workspace (`apps/admin`)

The Olentra company workspace (admin panel), as a Next.js App Router application
(`@olentra/admin`). It is deployed separately from the public website in
[`../web`](../web/README.md) and serves only `/dashboard/**` and the
website-controls API (`/api/site-features`, its `session` and `stream`).

```sh
npm run dev:admin      # http://localhost:3002/dashboard
npm run build:admin
npm run test:admin     # workspace tests plus @olentra/site-features tests
```

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_SITE_URL` is the website
origin used for "View website" and preview links. Feature switches are written
to the shared `.data/site-features.json` at the repository root, the same file
the website reads (override with `OLENTRA_FEATURE_STORE_PATH` in both apps).

The workspace's accounts and data are still the local JSON demo described in
[`docs/admin-dashboard-data.md`](../../docs/admin-dashboard-data.md); do not
expose this app publicly until it has real server-side authentication.
