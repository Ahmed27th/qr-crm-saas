#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# run-openwa.sh — Launch OpenWA (wa-automate) via Docker alongside Convex dev
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── 1. Locate .env.local ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] .env.local not found at: $ENV_FILE" >&2
  echo "        Run 'npx convex dev' first to generate it." >&2
  exit 1
fi

# ── 2. Load VITE_CONVEX_SITE_URL ─────────────────────────────────────────────
# shellcheck disable=SC1090
source "$ENV_FILE"

if [ -z "${VITE_CONVEX_SITE_URL:-}" ]; then
  echo "[ERROR] VITE_CONVEX_SITE_URL is not set in .env.local" >&2
  echo "        Ensure 'npx convex dev' has started at least once." >&2
  exit 1
fi

# ── 3. Derive webhook URL ────────────────────────────────────────────────────
WEBHOOK_URL="${VITE_CONVEX_SITE_URL}/whatsapp-webhook"
echo "[INFO]  Webhook target: ${WEBHOOK_URL}"

# ── 4. Session ID & API key ──────────────────────────────────────────────────
SESSION_ID="${OPENWA_SESSION_ID:-test_restaurant_123}"
API_KEY="${OPENWA_API_KEY:-local_dev_secret_key_2026}"

echo "[INFO]  Session ID:   ${SESSION_ID}"

# ── 5. Verify Docker is available ────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[ERROR] docker is not installed or not on your PATH." >&2
  echo "        Install Docker Desktop from https://www.docker.com/products/docker-desktop/" >&2
  exit 1
fi

# ── 6. Pull latest image (silent if already current) ─────────────────────────
echo "[INFO]  Ensuring openwa/wa-automate image is up to date..."
docker pull openwa/wa-automate --quiet 1>/dev/null

# ── 7. Launch container ──────────────────────────────────────────────────────
# --init            reaps zombie processes inside the container
# -p 8080:8080      map host port 8080 to container port 8080
# --disable-spins   suppress spinner animations so the QR code prints cleanly
# --api-key         authenticate API calls from our backend
# --session-id      persistent session name (QR is re-linked once per session)
# --webhook         Convex HTTP action endpoint for incoming messages
echo "[INFO]  Starting OpenWA container..."
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Scan the QR code below with WhatsApp to link this device."
echo "  The container will stay running until you press Ctrl+C."
echo "═══════════════════════════════════════════════════════════════════"
echo ""

docker run --init \
  -p 8080:8080 \
  openwa/wa-automate \
  --api-key "${API_KEY}" \
  --session-id "${SESSION_ID}" \
  --disable-spins \
  --webhook "${WEBHOOK_URL}" \
  --webhook-events "message"

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "[WARN]  OpenWA container exited with code ${EXIT_CODE}." >&2
  echo "        Common causes:" >&2
  echo "        - Port 8080 is already in use (run: netstat -ano | findstr :8080)" >&2
  echo "        - Docker daemon is not running" >&2
  echo "        - Another OpenWA session is still active" >&2
  exit $EXIT_CODE
fi
