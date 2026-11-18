# OCI attachment uploads

The implementation plan is in [plans/oci-uploads.md](plans/oci-uploads.md). New uploads are opt-in; existing GridFS attachments remain readable. No existing data is migrated.

## Flow and API

- `GET /intern/files/config` returns `{ok:true,data:{directUploads:boolean}}`.
- `POST /intern/files/uploads` uses the existing bearer or anonymous resume-grant authorization. Supply `X-File-Name`, `X-File-Kind` (`resume` or `work`) and `X-File-Size`; response data includes `id`, `name`, server-selected `type`, `size`, `status`, `accessToken`, `uploadUrl`, and millisecond `expiresAt`. Never log the URL or capability. URLs expire after five minutes and grant write access to exactly one quarantine object.
- Browser PUTs bytes to `uploadUrl` with only Content-Type and no application credentials. It then sends `POST /intern/files/uploads/:id/complete` with `X-File-Token: accessToken`.
- `GET /intern/files/uploads/:id` with that capability or the owning application session returns current status. Completion is idempotent. Browser polling recovers missed notifications; an intent becomes eligible for reconciliation 30 seconds after URL expiry even without completion.
- WebSocket `files.subscribe` accepts `{id,accessToken}` and returns current status. `intern.file_status` events contain only `{id,status}`; subscriptions are private, capability-authorized, and limited to eight per connection. MongoDB event change streams deliver updates across backend replicas. The browser uses a short-lived dedicated connection per upload and HTTP as the authoritative recovery path.
- Statuses are `uploading`, `pending`, `processing`, `ready`, `rejected`, and `deleting`. Six attempts with exponential backoff reject permanently failing scans. Scanner errors never mark a file ready. Existing application commands accept only ready attachments.
- Downloads retain `GET /intern/files/:id`, existing owner/staff permission checks and attachment response headers. Bun streams approved OCI bytes; quarantine is never served. Download traffic still traverses Bun; signed downloads/CDN are a separate future optimization.

The MongoDB file record is also the durable processing queue, so there is no queue/database dual-write gap. Workers claim records atomically with five-minute leases and unique fencing tokens. Each attempt publishes to a fresh clean key, using the exact bounded buffer scanned by ClamAV. A stale worker cannot overwrite a published object. Pending work survives process restarts. Worker loops run inside the Bun service; a separate worker deployment is not required for this version.

## Cloud resources and identity

Created and verified in Hyderabad (`ap-hyderabad-1`):

- Namespace `axoi3mp9fcx5`.
- Clean bucket `olentrainternship` (existing, private).
- Quarantine bucket `olentrainternship-quarantine` (created, private).

The storage smoke script verifies both buckets remain private at initialization. The native OCI endpoint returns fixed CORS headers; there are no editable bucket CORS rules for this API. Preflight with PUT and Content-Type was verified against the real upload endpoint. Application origins are still restricted by `REALTIME_ALLOWED_ORIGINS`; CORS is not a replacement for authorization.

For production, create a dynamic group matching the exact Bun Compute instance OCID. Apply the bucket-scoped policy in `backend/realtime-server/deploy/storage-iam.policy.example`, replacing its two placeholders. Do not match all tenancy instances. If running Bun in Docker, verify access to the instance metadata endpoint from that container. The SDK defaults to instance principals; user session credentials are rejected when NODE_ENV=production. The local OLENTRA CLI profile is only for development and transport smoke checks.

Two running Compute instances were found. No workload IAM policy has been applied because the deployment instance has not been identified. No new Compute resources were created.

## Scanner and activation

Use an approved digest of the official `clamav/clamav` image with `deploy/compose.scanner.yml` and `deploy/clamd.conf`. Set `BACKEND_DOCKER_NETWORK` to Bun's private network. Port 3310 must never be exposed publicly: clamd TCP is unencrypted and unauthenticated. The scanner needs outbound access to update signatures. Keep signatures current and monitor update failures. The configuration rejects encrypted archives and scan-limit violations rather than silently permitting them. Allow roughly 2 GiB RAM for signatures and scanning; benchmark before scaling concurrency.

Set these in the deployment environment, not committed secrets:

```dotenv
INTERNSHIP_FILE_STORAGE=oci
OCI_STORAGE_NAMESPACE=axoi3mp9fcx5
OCI_STORAGE_REGION=ap-hyderabad-1
OCI_STORAGE_BUCKET=olentrainternship
OCI_QUARANTINE_BUCKET=olentrainternship-quarantine
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
```

Anonymous resume uploads additionally require the existing `INTERNSHIP_TURNSTILE_SECRET_KEY` and frontend site key. Missing verification configuration fails closed in OCI mode. Existing per-account/draft rate limits apply. Post-upload validation enforces actual bytes and declared size: resume limit 5 MiB, work limit 10 MiB. A PAR cannot enforce this size before storage receives bytes; if a hard transfer-byte budget is required, use an enforcing upload gateway. Signature checks recognize the existing file allowlist; Office ZIP/compound-container checks are not a substitute for document sanitization. Malware scanning cannot guarantee that every malicious document is detected.

Deploy the scanner first, verify fresh signatures and EICAR rejection in an isolated test, then deploy/restart Bun with this configuration. Deploy the web helper with Bun; it discovers the transport at runtime. Before production activation, run isolated MongoDB integration tests, a real browser upload/resume submission/download, an unauthorized download, and restart recovery. Never enable a mock scanner in production.

For local transport verification use `OCI_AUTH_MODE=session`, `OCI_CLI_PROFILE=OLENTRA` and the four OCI variables above, then run `bun run scripts/storage-smoke.ts` from the backend directory. The script creates uniquely named synthetic objects, verifies preflight/direct upload/revocation/read/clean write/download, and deletes them. It does not certify malware scanning.

Rollback new uploads by setting `INTERNSHIP_FILE_STORAGE=gridfs`, keeping all OCI and scanner settings: existing OCI reads, cleanup and pending scans remain active. Do not remove OCI settings or IAM while OCI attachments exist.

## Cleanup, monitoring and validation

A minute-based cleanup worker removes terminal quarantine objects after upload authorization expires, reclaims stale candidate objects, and removes unattached uploads older than a day. Applicant erasure leaves an inaccessible deletion tombstone in the same MongoDB transaction; cleanup retries byte deletion and retains the tombstone long enough for stale workers/in-flight uploads to finish. GridFS orphan cleanup excludes OCI rows. Candidate keys and tombstones make storage deletion retryable. Reconcile storage inventory periodically as an additional operational check, especially if MongoDB is restored independently of object storage.

Monitor counts/oldest age of pending and processing rows, rejected counts, expired leases, deleting tombstones, worker errors, scanner availability and signature freshness. Alert if pending work exceeds five minutes or deleting tombstones exceed an hour. Existing structured logs report worker/cleanup infrastructure failures; use collection queries for backlog and rejection metrics. Do not log request bodies, PAR URLs, or upload capabilities. No monitoring service or alert destination was provisioned.

Verification performed: backend TypeScript, upload/queue/scanner protocol unit tests, frontend transport and existing WebSocket client tests, and live OCI transport smoke test. Local Docker is not running, so a real ClamAV scan and MongoDB-backed end-to-end activation have not been verified. Existing email-template suite failures are unrelated to storage changes. This implementation remains disabled by default until deployment prerequisites and acceptance checks are complete.

Official references: [OCI PARs](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingpreauthenticatedrequests.htm), [OCI Object Storage FAQ (CORS)](https://www.oracle.com/cloud/storage/object-storage/faq/), [TypeScript SDK](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/typescriptsdk.htm).
