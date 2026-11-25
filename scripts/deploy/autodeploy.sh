#!/usr/bin/env bash
# Pull-based auto-deploy for the OCI Ampere server.
#
# A systemd timer (scripts/deploy/olentra-autodeploy.timer) runs this every
# minute. When origin/main has a new commit whose GitHub checks all passed, it:
#   1. moves the checkout to that commit,
#   2. rebuilds only the apps the commit touched (web, admin, realtime, email),
#   3. swaps each new build in, restarts that service and checks its health,
#   4. puts the previous build back if the health check fails.
# Web and admin are built in a separate copy, so the live site keeps serving
# its current build until the new one is ready.
#
# Logs: journalctl -u olentra-autodeploy -f
# Deploy now without waiting:   sudo systemctl start olentra-autodeploy
# Force a commit through even if checks failed: FORCE=1 scripts/deploy/autodeploy.sh
set -Eeuo pipefail

# Pulling rewrites this file, and bash reads scripts as it goes, so run from a copy.
if [ -z "${AUTODEPLOY_COPY:-}" ]; then
  copy="$(mktemp)"; cp "$0" "$copy"
  AUTODEPLOY_COPY="$copy" exec bash "$copy" "$@"
fi
trap 'rm -f "$AUTODEPLOY_COPY"' EXIT

APP_DIR="${OLENTRA_APP_DIR:-/home/ubuntu/olentra-website}"
BUILD_DIR="${OLENTRA_BUILD_DIR:-/home/ubuntu/olentra-build}"
STATE_DIR="${OLENTRA_STATE_DIR:-/home/ubuntu/.olentra-deploy}"
REPOSITORY="${OLENTRA_REPOSITORY:-olentratechnologies/olentra-website}"
BRANCH=main
export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/lock"
flock -n 9 || { echo "Another deploy is running."; exit 0; }

log() { printf '[autodeploy] %s\n' "$*"; }

cd "$APP_DIR"
git fetch --quiet origin "$BRANCH"
target="$(git rev-parse "origin/$BRANCH")"
current="$(cat "$STATE_DIR/deployed" 2>/dev/null || git rev-parse HEAD)"
[ "$target" != "$current" ] || exit 0
short="${target:0:7}"

# A commit whose checks failed is skipped once and not retried every minute.
if [ "$(cat "$STATE_DIR/skipped" 2>/dev/null)" = "$target" ] && [ -z "${FORCE:-}" ]; then exit 0; fi

# Wait for GitHub's checks on this commit (public API, no token needed).
if [ -z "${FORCE:-}" ]; then
  checks="$(curl -fsS --max-time 15 -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$REPOSITORY/commits/$target/check-runs?per_page=100" || true)"
  if [ -z "$checks" ]; then log "Couldn't read GitHub checks for $short; will retry."; exit 0; fi
  verdict="$(printf '%s' "$checks" | python3 -c '
import json, sys
runs = json.load(sys.stdin).get("check_runs", [])
if not runs: print("waiting")
elif any(r["status"] != "completed" for r in runs): print("waiting")
elif all(r["conclusion"] in ("success", "skipped", "neutral") for r in runs): print("passed")
else: print("failed:" + ",".join(r["name"] for r in runs if r["conclusion"] not in ("success", "skipped", "neutral")))
')"
  case "$verdict" in
    waiting) log "Waiting for GitHub checks on $short."; exit 0 ;;
    failed:*) log "Not deploying $short: checks failed (${verdict#failed:})."; echo "$target" > "$STATE_DIR/skipped"; exit 0 ;;
  esac
fi

log "Deploying $short (was ${current:0:7})."
# The AI resume review reads PDFs with poppler and old .doc files with antiword.
if ! command -v pdftotext >/dev/null || ! command -v pdftoppm >/dev/null || ! command -v antiword >/dev/null; then
  log "Installing resume readers (poppler-utils, antiword)."
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends poppler-utils antiword >/dev/null || log "Couldn't install resume readers; AI review will send resumes to manual review."
fi
changed="$(git diff --name-only "$current" "$target" 2>/dev/null || echo '*')"
touched() { [ "$changed" = '*' ] || printf '%s\n' "$changed" | grep -qE "$1"; }
git reset --quiet --hard "$target"

deps_changed=false; touched '^(package\.json|package-lock\.json|apps/[^/]+/package\.json|packages/[^/]+/package\.json)$' && deps_changed=true
web=false;   touched '^(apps/web/|packages/|package(-lock)?\.json$)' && web=true
admin=false; touched '^(apps/admin/|packages/|package(-lock)?\.json$)' && admin=true
realtime=false; touched '^backend/realtime-server/' && realtime=true
email=false;    touched '^backend/email-server/' && email=true
failed=()

wait_for() { # url  — waits up to 60 s for a non-5xx answer
  local code=""
  for _ in $(seq 1 60); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" || true)"
    case "$code" in 2??|3??|4??) return 0 ;; esac
    sleep 1
  done
  log "Health check failed for $1 (last status: ${code:-none})."; return 1
}

# --- Next.js apps: build in a separate copy, then swap the build in --------
if $web || $admin; then
  mkdir -p "$BUILD_DIR"
  rsync -a --delete --exclude node_modules --exclude .next --exclude /.git "$APP_DIR"/ "$BUILD_DIR"/
  if $deps_changed || [ ! -d "$BUILD_DIR/node_modules" ]; then
    log "Installing npm dependencies in the build copy."
    (cd "$BUILD_DIR" && npm ci --no-audit --no-fund --loglevel=error)
  fi
  for app in web admin; do
    if [ "$app" = web ] && ! $web; then continue; fi
    if [ "$app" = admin ] && ! $admin; then continue; fi
    port=3000; [ "$app" = admin ] && port=3002
    log "Building $app."
    if ! (cd "$BUILD_DIR" && nice npm run "build:$app" > "$STATE_DIR/build-$app.log" 2>&1); then
      log "The $app build failed; the live $app is unchanged. See $STATE_DIR/build-$app.log"; tail -20 "$STATE_DIR/build-$app.log"; failed+=("$app"); continue
    fi
    if $deps_changed; then rsync -a --delete "$BUILD_DIR/node_modules/" "$APP_DIR/node_modules/"; fi
    live="$APP_DIR/apps/$app"
    rm -rf "$live/.next.new" "$live/.next.old"
    cp -a "$BUILD_DIR/apps/$app/.next" "$live/.next.new"
    mv "$live/.next" "$live/.next.old"; mv "$live/.next.new" "$live/.next"
    sudo systemctl restart "olentra-$app"
    if ! wait_for "http://127.0.0.1:$port/"; then
      log "Rolling $app back to the previous build."
      rm -rf "$live/.next"; mv "$live/.next.old" "$live/.next"; sudo systemctl restart "olentra-$app"; failed+=("$app")
    else log "$app is live."; fi
  done
fi

# --- Bun services: build, keep the previous bundle for rollback ------------
deploy_bun() { # name dir bundle port health-path
  local name="$1" dir="$APP_DIR/backend/$2" bundle="$3" port="$4" path="$5"
  log "Building $name."
  cd "$dir"
  $deps_changed || touched "^backend/$2/(package\.json|bun\.lockb?)$" && bun install --frozen-lockfile > /dev/null
  cp -a "dist/$bundle" "dist/$bundle.previous" 2>/dev/null || true
  if ! bun run build > "$STATE_DIR/build-$name.log" 2>&1; then
    log "The $name build failed; the running $name is unchanged."; tail -20 "$STATE_DIR/build-$name.log"
    [ -f "dist/$bundle.previous" ] && mv "dist/$bundle.previous" "dist/$bundle"; failed+=("$name"); cd "$APP_DIR"; return
  fi
  sudo systemctl restart "olentra-$name"
  if ! wait_for "http://127.0.0.1:$port$path"; then
    log "Rolling $name back to the previous bundle."
    mv "dist/$bundle.previous" "dist/$bundle"; sudo systemctl restart "olentra-$name"; failed+=("$name")
  else log "$name is live."; fi
  cd "$APP_DIR"
}
$realtime && deploy_bun realtime realtime-server realtime-server.js 3003 /intern/health
$email && deploy_bun email email-server email-server.js 3001 /health

echo "$target" > "$STATE_DIR/deployed"
if [ ${#failed[@]} -gt 0 ]; then
  log "Deployed $short with problems in: ${failed[*]} (those kept their previous build)."; exit 1
fi
log "Deployed $short."
