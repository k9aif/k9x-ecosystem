#!/usr/bin/env bash
# Stop, remove, pull latest, and restart k9x_studio container.
# Run this any time you want to update to the latest image.
#
# Usage:
#   ./deployment/podman-refresh.sh
#   K9X_HOST_PROJECTS=~/my-projects ./deployment/podman-refresh.sh

set -euo pipefail

HOST_PROJECTS="${K9X_HOST_PROJECTS:-$HOME/k9x-studio-working}"
HOST_PORT="${PORT:-8080}"
IMAGE="ghcr.io/k9aif/k9x-studio:latest"
CONTAINER_NAME="k9x_studio"

echo ""
echo "  K9X Studio — stop, pull latest, restart"
echo "  Projects folder: $HOST_PROJECTS"
echo ""

podman stop "$CONTAINER_NAME" 2>/dev/null && echo "  Stopped." || echo "  (not running)"
podman rm   "$CONTAINER_NAME" 2>/dev/null && echo "  Removed." || echo "  (already gone)"

echo "  Pulling latest image..."
podman pull "$IMAGE"

mkdir -p "$HOST_PROJECTS"

echo "  Starting..."
podman run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:8080" \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v "${HOST_PROJECTS}:/k9x/projects:Z" \
  "$IMAGE"

echo ""
echo "  Done. Open http://localhost:${HOST_PORT}"
echo "  Scaffolds → $HOST_PROJECTS/k9_projects/"
echo ""
