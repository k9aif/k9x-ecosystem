#!/usr/bin/env bash
# k9x_studio — run locally with Podman (no build needed)
#
# Usage:
#   ./run-local.sh                        # defaults below
#   PORT=9090 ./run-local.sh              # custom port
#   OLLAMA_URL=http://... ./run-local.sh  # point to a specific Ollama
#
# Your k9-aif-framework clones and generated projects are saved to
# $HOME/k9x-projects on your machine (mounted as /k9x/projects inside).

set -euo pipefail

IMAGE="${K9X_IMAGE:-ghcr.io/k9aif/k9x-studio:latest}"
HOST_PORT="${PORT:-8080}"
OLLAMA_URL="${OLLAMA_URL:-http://host.containers.internal:11434}"
HOST_PROJECTS="${K9X_HOST_PROJECTS:-$HOME/k9x-projects}"
CONTAINER_NAME="k9x_studio"

# Prefer Podman; fall back to Docker
if command -v podman &>/dev/null; then
  RT=podman
elif command -v docker &>/dev/null; then
  RT=docker
else
  echo "Error: install Podman or Docker first." >&2
  exit 1
fi

echo "[k9x] Runtime: $RT"
echo "[k9x] Image:   $IMAGE"
echo "[k9x] Port:    $HOST_PORT"
echo "[k9x] Projects: $HOST_PROJECTS"
echo ""

# Pull latest
echo "[k9x] Pulling image…"
$RT pull "$IMAGE"

# Stop any running instance (stop gracefully, remove so we can re-create with fresh config)
$RT stop "$CONTAINER_NAME" 2>/dev/null || true
$RT rm "$CONTAINER_NAME" 2>/dev/null || true

# Ensure projects folder exists on host
mkdir -p "$HOST_PROJECTS"

echo "[k9x] Starting…"
$RT run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:8080" \
  -e OLLAMA_BASE_URL="$OLLAMA_URL" \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v "${HOST_PROJECTS}:/k9x/projects:Z" \
  "$IMAGE"

echo ""
echo "  k9x_studio is running"
echo "  Open    →  http://localhost:${HOST_PORT}"
echo "  Projects → $HOST_PROJECTS"
echo ""
echo "  Logs:  $RT logs -f $CONTAINER_NAME"
echo "  Stop:  $RT stop $CONTAINER_NAME"
echo "  Start: $RT start $CONTAINER_NAME"
