#!/usr/bin/env bash
# Deploy k9x-studio to any remote Podman host (Linux, Mac, or any SSH-accessible server)
#
# Usage:
#   REMOTE_HOST=192.168.1.50 REMOTE_USER=ravi ./deployment/deploy-remote.sh
#
# Run from the k9x-ecosystem/ root directory.

set -euo pipefail

# ── Config (override via env vars) ───────────────────────────────────────────
REMOTE_HOST="${REMOTE_HOST:?Set REMOTE_HOST to your server IP or hostname}"
REMOTE_USER="${REMOTE_USER:-$(whoami)}"
REMOTE_DEPLOY_DIR="${REMOTE_DEPLOY_DIR:-~/k9x-studio}"
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

# ── Step 3: Copy to remote host ──────────────────────────────────────────────
log "Copying to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DEPLOY_DIR} …"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DEPLOY_DIR}"
scp "$ARCHIVE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DEPLOY_DIR}/k9x-studio.tar.gz"
scp "$SCRIPT_DIR/k9x-ecosystem-pod.sh" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DEPLOY_DIR}/k9x-ecosystem-pod.sh"
log "Files copied."

# ── Step 4: Load image + restart pod on remote ───────────────────────────────
log "Loading image and restarting pod on ${REMOTE_HOST} …"
ssh "${REMOTE_USER}@${REMOTE_HOST}" bash <<REMOTE
  set -e
  cd ${REMOTE_DEPLOY_DIR}

  echo "[remote] Loading image …"
  podman load < k9x-studio.tar.gz

  echo "[remote] Restarting pod …"
  chmod +x k9x-ecosystem-pod.sh
  PORT=${HOST_PORT} OLLAMA_URL=${OLLAMA_URL} ./k9x-ecosystem-pod.sh restart

  echo "[remote] Done."
REMOTE

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "  k9x_studio deployed"
echo "  Studio  →  http://${REMOTE_HOST}:${HOST_PORT}"
echo "  Ollama  →  ${OLLAMA_URL}"
echo ""
echo "  Logs:   ssh ${REMOTE_USER}@${REMOTE_HOST} 'podman logs -f k9x_studio'"
echo "  Stop:   ssh ${REMOTE_USER}@${REMOTE_HOST} '${REMOTE_DEPLOY_DIR}/k9x-ecosystem-pod.sh stop'"
