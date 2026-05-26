#!/usr/bin/env bash
# K9X Studio — stop, pull latest image, and restart.
# Works with Podman or Docker (auto-detected).
#
# Usage:
#   ./deployment/refresh.sh
#   K9X_HOST_PROJECTS=~/my-projects PORT=9090 ./deployment/refresh.sh

set -euo pipefail

HOST_PROJECTS="${K9X_HOST_PROJECTS:-$HOME/k9x-studio-working}"
HOST_PORT="${PORT:-8080}"
IMAGE="ghcr.io/k9aif/k9x-studio:latest"
CONTAINER="k9x_studio"

# Auto-detect container runtime
if command -v podman &>/dev/null; then
  RUNTIME="podman"
  VOLUME_FLAG=":Z"   # SELinux relabelling — required on RHEL/Fedora, harmless on Mac
elif command -v docker &>/dev/null; then
  RUNTIME="docker"
  VOLUME_FLAG=""
else
  echo "ERROR: neither podman nor docker found on PATH." >&2
  exit 1
fi

echo ""
echo "  K9X Studio — refresh"
echo "  Runtime:  $RUNTIME"
echo "  Projects: $HOST_PROJECTS"
echo "  Port:     $HOST_PORT"
echo ""

$RUNTIME stop "$CONTAINER" 2>/dev/null && echo "  Stopped $CONTAINER." || echo "  ($CONTAINER was not running)"
$RUNTIME rm   "$CONTAINER" 2>/dev/null && echo "  Removed $CONTAINER." || true

echo "  Pulling latest image..."
$RUNTIME pull "$IMAGE"

mkdir -p "$HOST_PROJECTS"

echo "  Starting..."
$RUNTIME run -d \
  --name "$CONTAINER" \
  -p "${HOST_PORT}:8080" \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v "${HOST_PROJECTS}:/k9x/projects${VOLUME_FLAG}" \
  "$IMAGE"

echo ""
echo "  Done. Open http://localhost:${HOST_PORT}"
echo "  Scaffolds → $HOST_PROJECTS/k9_projects/"
echo ""
