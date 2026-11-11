# Olentra Website

The Olentra repository is an npm-workspaces monorepo: two separately deployable
Next.js App Router applications, shared packages, and two dedicated Bun backends. Public URLs and the internship protocol namespace use `intern`;
the internal service, environment, and script naming uses `internship`.

See [the architecture and route reference](docs/architecture-and-routes.md) for
the canonical service boundaries, complete route tree, health endpoints, and
configuration names.
See [the website guide](apps/web/README.md) for the public site source, assets,
configuration, and tests.

| Path | Package | What it is | Dev port |
| --- | --- | --- | --- |
| `apps/web` | `@olentra/web` | Public website and internship portal | 3000 |
| `apps/admin` | `@olentra/admin` | Company workspace (admin panel), deployed separately | 3002 |
| `packages/site-features` | `@olentra/site-features` | Feature-switch rules, server store, origin checks, React provider | — |
| `packages/ui` | `@olentra/ui` | Global styles, theme tokens/presets, Tailwind preset, loading indicator | — |
| `packages/realtime` | `@olentra/realtime` | Realtime presence client and visitor tracker | — |

The admin app writes and the website reads one shared feature-switch file,
`.data/site-features.json` at the repository root (`OLENTRA_FEATURE_STORE_PATH`
overrides it for both apps). Website links to `/dashboard` redirect to the admin
app (`OLENTRA_ADMIN_URL`, default `http://localhost:3002`).
See [the backend architecture guide](backend/README.md) for service-local
layers, ownership boundaries, Docker baselines, and operational commands.

## Local development

Install every app and package from the repository root once:

```sh
npm install
```

Run the website, admin app and backends together in one terminal:

```sh
npm run dev:all
```

On macOS/Linux, every `npm run dev:all` starts fresh: it first stops verified
servers belonging to this same checkout, including leftovers from an earlier
run, waits for shutdown, then checks the configured addresses and starts the
stack. Running it in another terminal also stops the previous stack; the old
terminal's command exits. Processes belonging to another checkout or another
application are left running. If an occupied address cannot be safely cleared,
the command exits with inspection instructions. Windows retains the manual
conflict-recovery behavior.

`start:all` checks the configured addresses without automatically replacing
running servers. Both commands reject conflicting service addresses. The
website uses an explicit port: `3000` by default, or the exported `PORT` value;
the admin app uses `3002`, or the exported `ADMIN_PORT`. Neither moves
automatically onto another service port.

You can still stop the stack with **Ctrl+C** and wait for the shell prompt to
return. On macOS/Linux the runner stops each service's whole process group,
including nested npm/Bun processes. Shutdown allows 10 seconds for graceful
cleanup before forcing remaining owned processes to stop; a second interrupt
forces cleanup immediately. Automatic restart also waits up to 10 seconds
before force-stopping verified old processes.

The individual commands remain available when a service needs to be isolated:

```sh
npm run dev
npm run dev:admin
npm run email:dev
npm run realtime:dev
```

The dedicated services listen on port `3001` (email/contact) and port `3003`
(unified realtime). Configure the website in `apps/web/.env.local`, the admin app in
`apps/admin/.env.local`, and each
Bun service in its service-local `.env` file, using the canonical variable
names from `apps/web/.env.example`, `apps/admin/.env.example` and the service-local `.env.example` files.
Deprecated aliases remain supported for one compatibility cycle and emit a
warning when used.

Backend port checks use those same service-local environment settings. Be aware
that an exported `PORT` also reaches the email server and is a legacy fallback
for realtime, so setting it globally can create a configuration conflict.

### Inspecting a remaining port conflict on macOS

Use these steps if automatic restart cannot verify an old process, or if
`start:all` reports a conflict. For an application or checkout you intend to keep
running, choose different service addresses instead. If the old stack still has
a terminal, stop it there with **Ctrl+C**. Otherwise, find the listeners
(substitute your configured ports when different):

```sh
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3003 -sTCP:LISTEN
```

For each listener, replace `PID` below with its process ID. Check its command,
parent, process group (`PGID`), and working directory:

```sh
ps -p PID -o pid,ppid,pgid,command
lsof -a -p PID -d cwd
```

Replace `PGID` below with the group ID reported by `ps`, then inspect **every**
member and its working directory:

```sh
ps -axo pid,ppid,pgid,command | awk -v group=PGID '$3 == group'
lsof -a -g PGID -d cwd
```

Only continue if the group is dedicated to this checkout's Olentra service.
npm wrappers use the repository root; Next uses `apps/web` or `apps/admin`, and Bun
backends use their respective service directories. A group containing your
shell or unrelated commands must not be terminated as a group.

Stop each verified service group, replacing `PGID` with its numeric ID and
keeping the leading minus sign:

```sh
kill -TERM -- -PGID
```

Wait up to 10 seconds, then repeat the listener and group inspections. If that
same verified group still has running processes, use `kill -KILL -- -PGID` and
check again. Once the required addresses are free, run `npm run dev:all`.
Killing the supervisor with `SIGKILL` prevents it from cleaning up its services;
`dev:all` will attempt to identify and stop those leftovers on its next run.
Use manual recovery if their ownership cannot be verified.

## Verification

```sh
npm run email:test
npm run presence:test
npm run test:admin
npm run test:naming
npm run test:services
npm run build
```

Build and run the complete production stack locally:

```sh
npm run build:all
npm run start:all
```

`build:all` creates both Next.js production outputs and Bun server bundles under
the ignored `backend/*/dist/` directories. Run it before `start:all`; the latter
starts both compiled Next.js apps and both compiled Bun services. `compile:all` is a
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

