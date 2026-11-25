# Auto-deploy (OCI Ampere server)

Production (web, admin, realtime, email) runs on the OCI Ampere server from a
Git checkout of `main` at `/home/ubuntu/olentra-website`. Every push to `main`
deploys itself:

1. GitHub runs the checks (`Repository checks`, `Realtime Server Checks`).
2. Every minute the server's `olentra-autodeploy.timer` runs
   [`autodeploy.sh`](autodeploy.sh). When `main` has moved and every check on
   the new commit passed, it pulls the commit and rebuilds **only what
   changed**:

   | Changed paths | Rebuilt and restarted |
   |---|---|
   | `apps/web/`, `packages/`, root `package*.json` | `olentra-web` (:3000) |
   | `apps/admin/`, `packages/`, root `package*.json` | `olentra-admin` (:3002) |
   | `backend/realtime-server/` | `olentra-realtime` (:3003) |
   | `backend/email-server/` | `olentra-email` (:3001) |

3. Web and admin are built in `/home/ubuntu/olentra-build`, so the live site
   keeps serving until the new build is swapped in. Each service is
   health-checked after restart, and the previous build is put back if it
   fails.

A commit whose checks fail is not deployed; fix it with a new commit.
Each deploy also makes sure the AI resume review's file readers are installed
(`poppler-utils` for PDFs, `antiword` for old .doc files); without them every
resume goes to "Needs manual review".
Runtime secrets stay in the untracked `.env` files on the server.

## Day to day

```bash
# Watch deploys
ssh ubuntu@129.159.20.255 journalctl -u olentra-autodeploy -f
# Deploy right now instead of waiting up to a minute
ssh ubuntu@129.159.20.255 sudo systemctl start olentra-autodeploy
# Deploy a commit even though its checks failed
ssh ubuntu@129.159.20.255 'FORCE=1 ~/olentra-website/scripts/deploy/autodeploy.sh'
# Pause / resume auto-deploy
ssh ubuntu@129.159.20.255 sudo systemctl disable --now olentra-autodeploy.timer
ssh ubuntu@129.159.20.255 sudo systemctl enable --now olentra-autodeploy.timer
```

## One-time install

```bash
sudo cp ~/olentra-website/scripts/deploy/olentra-autodeploy.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now olentra-autodeploy.timer
```
