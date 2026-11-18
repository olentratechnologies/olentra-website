# Production OCI uploads

The server at `140.245.210.172` runs `olentra-realtime` as `ubuntu` from `/home/ubuntu/olentra-website/backend/realtime-server`. Caddy exposes it at `https://ws.olentratechnologies.com` and the process listens on localhost port 3003.

## Authentication and runtime

OCI Compute uses instance principals. This identity was verified against both private storage buckets; no laptop API private key is needed on this host. IAM grants must target the Compute dynamic group, as shown in `deploy/storage-iam.policy.example`, rather than the Object Storage service principal.

Configure the server environment (keep its existing MongoDB, JWT, origin, and email settings):

```dotenv
NODE_ENV=production
INTERNSHIP_FILE_STORAGE=oci
OCI_AUTH_MODE=instance_principal
OCI_STORAGE_NAMESPACE=axoi3mp9fcx5
OCI_STORAGE_REGION=ap-hyderabad-1
OCI_STORAGE_BUCKET=olentrainternship
OCI_QUARANTINE_BUCKET=olentrainternship-quarantine
# Explicit launch choice: uploads are not scanned for malware.
INTERNSHIP_FILE_SCAN_MODE=disabled
```

To enable scanning later, change the mode to `clamav`, configure `CLAMAV_HOST=127.0.0.1` and `CLAMAV_PORT=3310`, update signatures, start the private scanner, and verify clean-file acceptance and antivirus-test-file rejection before restarting the backend. Never expose the scanner port publicly.

Anonymous resume uploads separately require the Cloudflare Turnstile site key in the web deployment and its matching secret in `INTERNSHIP_TURNSTILE_SECRET_KEY` on the backend. Missing credentials leave that route unavailable; disabling malware scanning does not bypass bot verification.

## Deploy and verify

Run `bash deploy-oci-uploads.sh` on the server. It fast-forwards a clean checkout, installs locked dependencies, builds the service, restarts it, and checks both presence and internship health.

Verify:

```sh
curl -fsS http://127.0.0.1:3003/health
curl -fsS http://127.0.0.1:3003/intern/health
curl -fsS http://127.0.0.1:3003/intern/files/config
sudo journalctl -u olentra-realtime -n 30 --no-pager
```

`bun scripts/storage-smoke.ts` exercises real OCI transport with uniquely named synthetic objects, then deletes those test objects. It checks private buckets, browser CORS, direct PUT, URL revocation, bounded read, clean write, and download. It does not validate malware scanning or a real applicant submission.

To roll back a release, restore the previous built artifact and restart the service. Keep environment backups private and outside Git. Changing storage mode does not remove existing OCI objects.
