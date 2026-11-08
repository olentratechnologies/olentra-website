# Presence benchmark

Passed the configured local test. Measured on 2026-11-08T10:39:43.861Z.

- Load: 10 browser IDs, 2 tabs per ID (20 visitor sockets), 2 dashboard subscribers.
- Hold: 5.001462s; separate driver/server Bun 1.4.4 processes; 100ms coalescing.
- Hardware: Apple M1, 8 logical CPUs, 8192 MiB RAM, darwin/arm64.
- Server RSS MiB: p50 7.016, p95 7.454, p99 7.454, max 7.454.
- Server CPU % of one core: p50 0.677, p95 1.385, p99 1.385, max 1.385.
- Server10ms timer lag in ms: p50 2.024, p95 2.055, p99 2.17, max 3.014.
- Initial snapshot ms: p50 0.45, p95 3.837, p99 3.837, max 3.837.
- Per-subscriber count freshness ms: p50 101.554, p95 104.206, p99 104.206, max 104.206.
- Last-subscriber count freshness ms: p50 101.554, p95 104.206, p99 104.206, max 104.206.
- Broadcast reception maximum: 1 per rolling100ms; 2 per rolling1s.
- Checks: 14/14 passed.

## Measurement limits

- A browser ID is reused by all tabs. Every dashboard is excluded from the visitor count.
- Freshness begins before initiating each controlled disconnect/reconnect; it includes handshake or close processing, 100ms coalescing, loopback delivery and driver observation. Every subscriber must observe the target count within 5s.
- The hold phase includes bounded down/up pulses and otherwise preserves the target load. Sampled RSS/CPU belong only to the server child; the separate driver shares this machine and can still compete for resources.
- CPU percent is process user+system CPU time divided by elapsed wall time; 100% means one CPU core. Event-loop lag is nonnegative overshoot of a 10ms setInterval, not a native profiler histogram.
- Broadcast windows count presence frames observed by the first dashboard during load/hold, excluding its initial snapshot and explicit resync. Window boundaries and timer jitter can permit two frames within a rolling100ms interval.
- This is a single local machine/Node-instance-equivalent Bun process test, not an internet, distributed, TLS, proxy, mobile, browser-rendering, or production capacity guarantee. No existing server or external visitor traffic is used.

Raw measurements and individual checks: [presence-harness-smoke.json](presence-harness-smoke.json).
