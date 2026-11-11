# Website (`apps/web`)

The public Olentra website and internship portal, as a Next.js App Router
application (`@olentra/web`). It is deployed separately from the company
workspace in [`../admin`](../admin/README.md).

## Structure

- `src/` — App Router routes, components, data, hooks, and client/server libraries.
- `public/` — browser-served images, fonts, videos, and downloadable assets.
- `scripts/` — intern, presence-client, and media tooling and tests.
- `next.config.js`, `postcss.config.js`, `tailwind.config.js`, `jsconfig.json` — build configuration.

Shared code comes from the workspace packages: `@olentra/site-features`
(feature switches), `@olentra/ui` (global styles, theme, Tailwind preset,
loading indicator) and `@olentra/realtime` (presence client, visitor tracker).
Install everything from the repository root with `npm install`; the root
`package-lock.json` and `.npmrc` cover every workspace.

Copy `.env.example` to `.env.local` for local configuration. Keep deployment
secrets in the hosting provider's environment settings.

The website only reads feature switches (`GET /api/site-features` and the
`/api/site-features/stream` SSE endpoint); the company workspace changes them.
Links to `/dashboard` redirect to the workspace origin (`OLENTRA_ADMIN_URL`,
default `http://localhost:3002`).

The repository-level `package.json` delegates `dev`, `build`, `start`, `lint`
and `presence:test` to this workspace.

The independently deployable Bun services live in `../../backend/`. The canonical
browser endpoints are `NEXT_PUBLIC_REALTIME_WS_URL` for the unified realtime
WebSocket origin (port 3003) and `NEXT_PUBLIC_INTERNSHIP_BACKEND_URL` for its
HTTP API. `VisitorTracker` is mounted from the global layout and opens the
anonymous `/ws?role=visitor&visitorId=...` connection on every website route;
internship pages separately open `/ws/intern` after their workflow is active.
