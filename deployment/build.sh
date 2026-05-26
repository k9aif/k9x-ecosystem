#!/usr/bin/env bash
# Build k9x-studio container image
# Run from the k9x-ecosystem/ root directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-k9x-studio}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

cd "$ROOT_DIR"

echo "[build] Building $IMAGE_NAME:$IMAGE_TAG from $ROOT_DIR"
echo "[build] Using Dockerfile: deployment/Dockerfile"
echo ""

podman build \
  -f deployment/Dockerfile \
  -t "$IMAGE_NAME:$IMAGE_TAG" \
  .

echo ""
echo "[build] Done: $IMAGE_NAME:$IMAGE_TAG"
echo "  Run:  ./deployment/k9x-ecosystem-pod.sh"
