# OCI direct upload implementation

Use the existing Bun HTTP service and private WebSocket transport. Preserve GridFS downloads and keep OCI opt-in (`INTERNSHIP_FILE_STORAGE=oci`).

1. Issue a five-minute, object-specific write PAR after existing authentication, resume challenge and rate-limit checks. Persist an upload intent first; never persist or log the URL.
2. Browser PUTs directly to a private quarantine bucket, then calls completion. Intent rows are a MongoDB durable queue; reconciliation also discovers abandoned completion calls. Atomically lease work, retry transient failures, and fail closed on unavailable scanning.
3. Revoke upload access, read bounded bytes, check exact size and file signature, scan with ClamAV INSTREAM, then write those same scanned bytes to a separate clean key. Only then mark ready. Never serve quarantine bytes.
4. Expose authorized status and existing downloads. Private per-upload WebSocket subscriptions require the upload capability; HTTP polling recovers lost notifications and reconnects. Preserve the existing saveAttachment return shape and ready-only attachment binding.
5. Reclaim expired and rejected objects, and queue OCI deletion when applicant data is erased. Document IAM, CORS, scanner networking, activation and rollback.

Validation: unit tests for ownership/capabilities, expiry, duplicate completion, size/signature/malware rejection, scanner outages, lease retries and stale workers, clean-byte promotion; frontend direct upload and polling tests; existing backend checks. Live activation requires deployment identity and scanner configuration; local CLI authentication is not production identity.
