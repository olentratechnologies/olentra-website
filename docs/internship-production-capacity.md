# Internship production capacity review

## Rollout status

On 18 November 2026, the Oracle Caddy configuration was updated to discard inbound `CF-Connecting-IP` and overwrite `X-Real-IP` with the direct peer address. The public realtime hostname resolves directly to Oracle. Bun listens on loopback, and a systemd drop-in enables `REALTIME_TRUST_PROXY=true` for the running service. Caddy validated successfully and the restarted service passed its internal and external health checks. One public WebSocket subscription returned the application snapshot in 286 ms, including connection setup. The change removed the shared proxy address from the upload and submit limit keys. Applicants on one campus network can still share a public IP. The review did not submit live applications or consume live upload quotas to verify this from two networks.

The application code now has a protected upload mode. The browser presents a Turnstile challenge. The backend validates the response, hostname, and action and issues a signed grant for a single draft with a 15-minute lifetime and three upload attempts. MongoDB tracks these attempts atomically. The upload endpoint still enforces its file type checks, 5 MiB resume ceiling, and private access rules. Logged-in attachment uploads maintain their current rules.

Protected mode requires the matching Cloudflare widget site key in `NEXT_PUBLIC_INTERNSHIP_TURNSTILE_SITE_KEY` at web build time and the secret in `INTERNSHIP_TURNSTILE_SECRET_KEY` on the backend. The keys were not present in the local environment and the new code has not been deployed to production. Release both settings and code together after staging verification, with intake paused during the rollout if needed. Test a real challenge on the production hostname before reopening intake. Production currently uses the per-IP limits after the proxy fix. No database tier or storage provider was changed.

## Limits per public client IP

| Operation | Current production | Protected mode |
|---|---:|---:|
| Grant requests | Not applicable | 240 per rolling hour |
| Public resume uploads | 10 attempts per rolling hour | 360 attempts per rolling hour, plus 3 per grant |
| Application submits | 20 attempts per rolling hour | 240 attempts per rolling hour |
| Application submits to one email | 5 attempts per rolling hour | 5 attempts per rolling hour |
| Resume file size | 5 MiB | 5 MiB |
| Signed-in work file size | 10 MiB | 10 MiB |

Limits count attempts. On one public IP, protected mode allows at most 240 unique drafts per hour if each uses one grant and one submit. If every applicant uses two upload attempts, the upload limit reduces that ceiling to 180. These are admission ceilings for one network. They do not measure backend throughput or guarantee completion.

## Isolated upload, submit, and live feed benchmark

Ran with Bun 1.4.4, MongoDB 8.0.16 on a disposable loopback replica set, and synthetic file contents on an 8-core, 8 GiB Mac. Each journey obtained an authorization, streamed the resume to GridFS, and submitted through the application WebSocket. All stages ran with 500 Insights subscribers connected. Cloudflare verification and email delivery were stubbed. The web production build ran concurrently with the second pass, so latency includes local contention. These short bursts do not model WAN latency, the Oracle VM, Atlas throttling, or real delivery speed.

| Concurrent applicants | Resume size | Accepted | Measured applications/sec | Upload p95 | Submit p95 | Full journey p95 |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 512 KiB | 20/20 | 3.1 | 274 ms | 231 ms | 674 ms |
| 5 | 512 KiB | 30/30 | 5.0 | 1,317 ms | 793 ms | 2,184 ms |
| 15 | 512 KiB | 60/60 | 10.8 | 1,150 ms | 974 ms | 1,966 ms |
| 5 | 5 MiB | 20/20 | 1.0 | 4,966 ms | 3,867 ms | 6,566 ms |

All 130 records persisted. All 130 confirmations reached the delivery stub, and all 500 live subscribers received the final total. The benchmark process, which hosted both traffic and the Bun server, finished at 91 MiB RSS. The protected flow also rejected a missing grant, a replayed challenge, and a fourth upload on one grant. These results verify correctness during the tested load. Five hundred subscribers are a demonstrated local test point, not the verified concurrency limit on Oracle.

To reproduce on a disposable local replica set named `olentra_intake_bench` bound to port 37128:

```sh
cd backend/realtime-server
INTERNSHIP_TEST_MONGODB_URI='mongodb://127.0.0.1:37128/olentra_test?replicaSet=olentra_intake_bench' bun scripts/bench-intake.ts
```

## Production planning

The reviewed Oracle instance has 2 vCPUs, 956 MiB of RAM, and no swap. Atlas Free is the likely first throughput constraint during upload bursts. It has a shared 100 read/write operations per second limit, a 512 MB storage quota including indexes, and a published 500-connection limit. The application uses a MongoDB pool, shares cached insights across viewers and broadcasts updates through Bun. Browser WebSockets do not each open a MongoDB connection. Viewers still consume Oracle and Caddy socket capacity. Measure memory, CPU, reconnects and update delivery lag before setting a viewer target.

Using the reported 7.57 MB of Atlas usage and a conservative 400 MB budget for new resumes:

| Average resume size | Approximate stored resumes |
|---:|---:|
| 143 KiB, current small sample | 2,700 |
| 500 KiB | 780 |
| 1 MiB | 380 |
| 5 MiB | 75 |

These are rounded file-only estimates. Failed submissions, other uploads, indexes, and application records also use storage. Monitor actual average file size and remaining Atlas capacity. Atlas Free provides no managed backups. Set up and verify a restore before opening intake. Atlas Flex is the quickest path to more space and a higher operations ceiling without rewriting the existing module. A private object store is the more scalable option for resume bytes if storage grows. It changes neither the existing application rate limits nor the live WebSocket delivery path by itself.

To establish production capacity, load test an Oracle-sized staging VM against an isolated Atlas project on the intended tier. Ramp sustained traffic at 10, 25, 50 and 100 application journeys per minute, with realistic 512 KiB and 5 MiB files and concurrent Insights viewers. Include a shared-campus source IP. At each step, record successful persisted applications per minute, upload and submit p95, 429/5xx responses, Atlas operations and connections, live update lag and pending email age. Stop increasing load when latency, error rate or queue age no longer recovers. Confirmation sending is asynchronous, with up to 20 queued items per worker pass and a 2-second scheduling interval. Measure actual provider delivery separately. The highest clean sustained stage gives a practical admission target with room for bursts. No safe sustained production throughput has been measured yet.

- [MongoDB Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- [Atlas Flex capacity and pricing](https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
