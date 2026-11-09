# Olentra Website

The Olentra website is a Next.js App Router application with two dedicated Bun
backends. Public URLs and the internship protocol namespace use `intern`;
the internal service, environment, and script naming uses `internship`.

See [the architecture and route reference](docs/architecture-and-routes.md) for
the canonical service boundaries, complete route tree, health endpoints, and
configuration names.
See [the frontend workspace guide](frontend/README.md) for the Next.js source,
asset, configuration, and frontend test layout.
See [the backend architecture guide](backend/README.md) for service-local
layers, ownership boundaries, Docker baselines, and operational commands.

## Local development

Install the frontend dependencies once:

```sh
npm install --prefix frontend
```

Run the frontend and backends together in one terminal:

```sh
npm run dev:all
```

The individual commands remain available when a service needs to be isolated:

```sh
npm run dev
npm run email:dev
npm run realtime:dev
```

The dedicated services listen on port `3001` (email/contact) and port `3003`
(unified realtime). Configure the Next.js application in `frontend/.env.local` and each
Bun service in its service-local `.env` file, using the canonical variable
names from `frontend/.env.example` and the service-local `.env.example` files.
Deprecated aliases remain supported for one compatibility cycle and emit a
warning when used.

## Verification

```sh
npm run email:test
npm run presence:test
npm run test:admin
npm run test:naming
npm run build
```

Build and run the complete production stack locally:

```sh
npm run build:all
npm run start:all
```

`build:all` creates the Next.js production output and Bun server bundles under
the ignored `backend/*/dist/` directories. Run it before `start:all`; the latter
starts the compiled frontend and both compiled Bun services. `compile:all` is a
convenience alias for `build:all`.

Internship integration tests and benchmarks require an explicitly isolated
`INTERNSHIP_TEST_MONGODB_URI`:

```sh
npm run internship:test
```

Without that variable, the integration test command exits successfully after
reporting that it was skipped; it never falls back to a runtime database.

## Operational health routes

The Next.js application exposes `/health`, `/health/live`, `/health/ready`,
`/health/errors`, `/health/simple`, and `/health/stats`. The contact backend
uses `/health`; the realtime backend uses `/health`, `/stats`, and
`/intern/health`.

