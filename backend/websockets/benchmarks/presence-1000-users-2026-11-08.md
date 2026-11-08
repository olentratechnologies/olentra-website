# Presence benchmark

Passed the configured local test. Measured on 2026-11-08T10:40:01.672Z.

- Load: 1000 browser IDs, 2 tabs per ID (2000 visitor sockets), 10 dashboard subscribers.
- Hold: 120.002s; separate driver/server Bun 1.4.4 processes; 100ms coalescing.
- Hardware: Apple M1, 8 logical CPUs, 8192 MiB RAM, darwin/arm64.
- Server RSS MiB: p50 12.126, p95 12.36, p99 12.532, max 13.532.
- Server CPU % of one core: p50 0.579, p95 1.527, p99 2.716, max 20.199.
- Server 10ms timer lag in ms: p50 2.024, p95 2.059, p99 2.307, max 39.032.
- Initial snapshot ms: p50 0.223, p95 0.665, p99 0.665, max 0.665.
- Per-subscriber count freshness ms: p50 102.827, p95 106.476, p99 115.143, max 115.214.
- Last-subscriber count freshness ms: p50 102.827, p95 106.476, p99 115.214, max 115.214.
- Broadcast reception maximum: 1 per rolling100ms; 4 per rolling1s.
- Checks: 90/90 passed.

## Measurement limits

CPU interval caveat: the reported 20.199% maximum is a partial phase-boundary sample spanning 0.441 ms. The highest full sampling interval was 2.716% over about one second; p95 across all samples was 1.527%. The raw JSON retains every interval and value. The brief maximum does not establish sustained CPU demand.

- A browser ID is reused by all tabs. Every dashboard is excluded from the visitor count.
- Freshness begins before initiating each controlled disconnect/reconnect; it includes handshake or close processing, 100ms coalescing, loopback delivery and driver observation. Every subscriber must observe the target count within 5s.
- The hold phase includes bounded down/up pulses and otherwise preserves the target load. Sampled RSS/CPU belong only to the server child; the separate driver shares this machine and can still compete for resources.
- CPU percent is process user+system CPU time divided by elapsed wall time; 100% means one CPU core. Event-loop lag is nonnegative overshoot of a 10ms setInterval, not a native profiler histogram.
- Broadcast windows count presence frames observed by the first dashboard during load/hold, excluding its initial snapshot and explicit resync. Window boundaries and timer jitter can permit two frames within a rolling100ms interval.
- This is a single local machine/single Bun server process test, not an internet, distributed, TLS, proxy, mobile, browser-rendering, or production capacity guarantee. No existing server or external visitor traffic is used.

Raw measurements and individual checks: [presence-1000-users-2026-11-08.json](presence-1000-users-2026-11-08.json).
