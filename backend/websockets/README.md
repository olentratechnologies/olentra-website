# Live browser presence

A dedicated single-node Bun WebSocket service supplies the existing dashboard's
live-user count. One browser profile with a shared `visitorId` counts once across
multiple connected tabs. This is connected-browser presence, not a count of humans
or historical analytics. The frontend falls back to a per-tab ID when shared
browser storage is unavailable. Legacy connections without `visitorId` each count
separately.

## Run

```sh
bun install --frozen-lockfile
bun run typecheck
bun run dev
# Production:
bun run start
```

The root project also provides `npm run ws:dev` / `npm run ws:start`. Copy the
settings in `.env.example` if needed. Starting the CLI preserves its existing
`0.0.0.0:3002` default; tests and benchmarks bind their own ephemeral loopback port.

| Setting | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3002` | Service port. |
| `HOST` | `0.0.0.0` | CLI listening address. |
| `ALLOWED_ORIGINS` | empty | Existing comma-separated browser-origin policy. |
| `PRESENCE_BROADCAST_INTERVAL_MS` | `100` | One-shot coalescing window, in milliseconds. |
| `PRESENCE_LOG` | `false` | Enables startup/handler diagnostics; no per-connection logging. |

## Protocol and performance behavior

- Visitor: `/ws?role=visitor&visitorId=<stable-browser-id>`.
- Dashboard: `/ws?role=dashboard`.
- Browser IDs start with a letter or digit and contain at most 128 characters from
  letters, digits, `.`, `_`, `:`, and `-`. Each connection receives a separate
  server-generated ID; caller-provided `id` never controls cleanup.
- A new dashboard immediately receives
  `{type:"presence",activeVisitors,totalConnections,timestamp}`. `totalConnections`
  includes every visitor tab and dashboard socket. Browser refcounts keep a user
  present until its final connection closes.
- Membership updates are synchronous. Broadcasts coalesce into the latest count
  after 100ms; intermediate counts within that window may disappear. A burst that
  returns to the previously broadcast counts sends no update. There is no polling
  interval and no automatic presence serialization or fanout without subscribers.
- The legacy `ping`, JSON `{type:"ping"}`, and `{type:"get_presence"}` messages
  remain compatible. Explicit snapshot requests are answered even without other
  dashboard subscribers.
- Native WebSocket pings are enabled, with a 30-second WebSocket idle timeout.
  Browsers answer protocol pings automatically. No application heartbeat is
  necessary. Keep the deployment proxy's idle timeout above this setting (at least
  60 seconds for the current configuration).
- Incoming frames are limited to 1 KiB; each socket's backpressure limit is 64 KiB and
  slow sockets close when the native limit is reached. Compression is disabled for
  these small snapshots. No obsolete-snapshot replay queue is maintained.
- `/stats` exposes current counts, timestamp and counters. `/health` preserves
  process uptime, RSS and basic liveness fields. Counter `snapshots` counts JSON
  serialization, `serializedBytes` counts payload bytes before fanout, `broadcasts`
  counts publish attempts, and backpressure/drop counters reflect publish return
  values (not a per-recipient delivery guarantee).
- SIGINT/SIGTERM close service connections and cancel a pending broadcast. Counts
  and pub/sub belong to this one process; replicas do not share or aggregate state.

## Tests

```sh
bun run test
# Compatibility with the earlier connection-test command:
bun test-connection.ts
```

No existing server is required or contacted. Deterministic core tests cover
coalescing, net-zero bursts, no-subscriber work, refcounts and cleanup. Integration
checks create a loopback server on port 0, wait for observed messages with deadlines,
and check browser deduplication, independent connection ownership, dashboard totals,
legacy messages, HTTP fields and the full 0→1→2→1→0 sequence.

## Local benchmark

```sh
bun run bench --users 1000 --tabs 2 --dashboards 10 --duration 120
```

The benchmark starts an isolated child server; it does not restart or use the
existing service on 3002. Its JSON/Markdown report records workload, latency, CPU,
RSS, timer lag and counting checks. Results describe the tested hardware and local
transport only, rather than an unmeasured production throughput promise.
