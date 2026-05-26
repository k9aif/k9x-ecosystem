#!/usr/bin/env bash
# Deploy k9x-studio to a RHEL Podman host
#
# Usage:
#   ./deployment/deploy-rhel.sh                        # uses defaults below
#   RHEL_HOST=192.168.1.50 RHEL_USER=ravi ./deployment/deploy-rhel.sh
#
# Run from the k9x-ecosystem/ root directory.

set -euo pipefail

# ── Config (override via env vars) ───────────────────────────────────────────
RHEL_HOST="${RHEL_HOST:?Set RHEL_HOST to your server IP or hostname}"
RHEL_USER="${RHEL_USER:-$(whoami)}"
RHEL_DEPLOY_DIR="${RHEL_DEPLOY_DIR:-~/k9x-studio}"
HOST_PORT="${PORT:-8080}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
IMAGE_NAME="k9x-studio"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ARCHIVE="/tmp/k9x-studio.tar.gz"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log() { echo "[deploy] $*"; }

# ── Step 1: Build image ───────────────────────────────────────────────────────
log "Building $IMAGE_NAME:$IMAGE_TAG …"
cd "$ROOT_DIR"
podman build -f deployment/Dockerfile -t "$IMAGE_NAME:$IMAGE_TAG" .
log "Build complete."

# ── Step 2: Save image to tar.gz ─────────────────────────────────────────────
log "Saving image to $ARCHIVE …"
podman save "$IMAGE_NAME:$IMAGE_TAG" | gzip > "$ARCHIVE"
SIZE=$(du -sh "$ARCHIVE" | cut -f1)
log "Saved ($SIZE)."

# ── Step 3: Copy to RHEL ─────────────────────────────────────────────────────
log "Copying to ${RHEL_USER}@${RHEL_HOST}:${RHEL_DEPLOY_DIR} …"
ssh "${RHEL_USER}@${RHEL_HOST}" "mkdir -p ${RHEL_DEPLOY_DIR}"
scp "$ARCHIVE" "${RHEL_USER}@${RHEL_HOST}:${RHEL_DEPLOY_DIR}/k9x-studio.tar.gz"
scp "$SCRIPT_DIR/k9x-ecosystem-pod.sh" "${RHEL_USER}@${RHEL_HOST}:${RHEL_DEPLOY_DIR}/k9x-ecosystem-pod.sh"
log "Files copied."

# ── Step 4: Load image + restart pod on RHEL ─────────────────────────────────
log "Loading image and restarting pod on RHEL …"
ssh "${RHEL_USER}@${RHEL_HOST}" bash <<REMOTE
  set -e
  cd ${RHEL_DEPLOY_DIR}

  echo "[rhel] Loading image …"
  podman load < k9x-studio.tar.gz

  echo "[rhel] Restarting pod …"
  chmod +x k9x-ecosystem-pod.sh
  PORT=${HOST_PORT} OLLAMA_URL=${OLLAMA_URL} ./k9x-ecosystem-pod.sh restart

  echo "[rhel] Done."
REMOTE

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "  k9x_studio deployed"
echo "  Studio  →  http://${RHEL_HOST}:${HOST_PORT}"
echo "  Ollama  →  ${OLLAMA_URL}"
echo ""
echo "  Logs:   ssh ${RHEL_USER}@${RHEL_HOST} 'podman logs -f k9x-studio'"
echo "  Stop:   ssh ${RHEL_USER}@${RHEL_HOST} '${RHEL_DEPLOY_DIR}/k9x-ecosystem-pod.sh stop'"
