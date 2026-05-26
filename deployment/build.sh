#!/usr/bin/env bash
# Build k9x-studio container image
# Run from the k9x-ecosystem/ root directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-k9x-studio}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# ── Ensure k9-aif-framework subset is present ────────────────────────────────
# Only two directories are needed from the framework:
#   generator/templates/  — Jinja2 scaffold templates (used by scaffold_service.py)
#   k9_aif_abb/           — ABB source (included for completeness / future use)
FRAMEWORK_DIR="$ROOT_DIR/k9-aif-framework"
FRAMEWORK_REPO="${K9_FRAMEWORK_REPO:-https://github.com/k9aif/k9-aif-framework.git}"

if [ ! -d "$FRAMEWORK_DIR/generator/templates" ]; then
  echo "[build] k9-aif-framework templates not found."
  if [ -d "$FRAMEWORK_DIR/.git" ]; then
    echo "[build] Repo exists — fetching sparse paths …"
    git -C "$FRAMEWORK_DIR" sparse-checkout set generator/templates k9_aif_abb
    git -C "$FRAMEWORK_DIR" pull --depth=1
  else
    echo "[build] Sparse-cloning $FRAMEWORK_REPO (generator/templates + k9_aif_abb only) …"
    rm -rf "$FRAMEWORK_DIR"
    git clone \
      --depth=1 \
      --filter=blob:none \
      --sparse \
      "$FRAMEWORK_REPO" \
      "$FRAMEWORK_DIR"
    git -C "$FRAMEWORK_DIR" sparse-checkout set generator/templates k9_aif_abb
  fi
  echo "[build] Framework subset ready."
else
  echo "[build] k9-aif-framework found ($(ls "$FRAMEWORK_DIR/generator/templates" | wc -l | tr -d ' ') templates)."
fi

# ── Build image ───────────────────────────────────────────────────────────────
cd "$ROOT_DIR"

echo "[build] Building $IMAGE_NAME:$IMAGE_TAG …"
podman build \
  -f deployment/Dockerfile \
  -t "$IMAGE_NAME:$IMAGE_TAG" \
  .

echo ""
echo "[build] Done: $IMAGE_NAME:$IMAGE_TAG"
echo "  Deploy: ./deployment/deploy-rhel.sh"
echo "  Local:  ./deployment/k9x-ecosystem-pod.sh start"
