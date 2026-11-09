# Frontend workspace

This directory contains the Olentra Next.js App Router application and its
frontend-only assets, configuration, and verification scripts.

## Structure

- `src/` — App Router routes, components, data, hooks, and client/server libraries.
- `public/` — browser-served images, fonts, videos, and downloadable assets.
- `scripts/` — frontend contract, admin, presence-client, and media tooling.
- `next.config.js`, `postcss.config.js`, `tailwind.config.js`, `jsconfig.json` — frontend build configuration.

This workspace owns the Next.js dependencies in `package.json`,
`package-lock.json`, `.npmrc`, and `node_modules/`. Install them from the
repository root with `npm install --prefix frontend`.

Copy `.env.example` to `.env.local` for local frontend configuration. Keep
deployment secrets in the hosting provider's environment settings.

The repository-level `package.json` is a lightweight orchestration boundary.
Its `dev`, `build`, `start`, `test:admin`, and `presence:test` commands delegate
to this workspace, so existing local and CI commands remain unchanged.

The independently deployable Bun services live in `../backend/`. The canonical
browser endpoints are `NEXT_PUBLIC_REALTIME_WS_URL` for the unified realtime
WebSocket origin (port 3003) and `NEXT_PUBLIC_INTERNSHIP_BACKEND_URL` for its
HTTP API. `VisitorTracker` is mounted from the global layout and opens the
anonymous `/ws?role=visitor&visitorId=...` connection on every frontend route;
internship pages separately open `/ws/intern` after their workflow is active.
