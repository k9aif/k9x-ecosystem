#!/usr/bin/env bash
# k9x_dashboard — build and run helper (single container, no pod needed)
# Run from any directory on the Podman host (no sudo needed to invoke --
# the script escalates internally).
#
# Build context is this project's own directory -- no sibling-repo
# dependency (unlike k9x_studio, which needs k9-aif-framework at build
# time for scaffold generation; this project only ever queries HIL's
# Postgres schema at runtime, via .env, not at build time).
#
# Requires .env to already exist (copy .env.sample there and fill in your
# HIL Postgres host/credentials -- start refuses to run without it).
#
# Commands:
#   build   — build the k9x-dashboard container image
#   start   — start the container (port 8089)
#   stop    — stop the container
#   logs    — tail logs
#   all     — build + start

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IMAGE="k9x-dashboard:latest"
CONTAINER="k9x-dashboard"

cmd="${1:-help}"

case "$cmd" in

  build)
    echo "Building $IMAGE (context: $PROJECT_DIR) ..."
    cd "$PROJECT_DIR"
    sudo podman build -t "$IMAGE" -f ubuntu/Containerfile .
    echo "Build complete: $IMAGE"
    ;;

  start)
    ENV_FILE="$PROJECT_DIR/.env"
    [[ -f "$ENV_FILE" ]] || {
      echo "Missing $ENV_FILE -- copy .env.sample there and fill in your" \
           "HIL Postgres host/credentials first."
      exit 1
    }
    echo "Starting $CONTAINER on port 8089 ..."
    sudo podman rm -f "$CONTAINER" 2>/dev/null || true
    sudo podman run -d \
      --name "$CONTAINER" \
      --restart=always \
      -p 8089:8089 \
      --env-file "$ENV_FILE" \
      "$IMAGE"
    echo ""
    HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    HOST_IP="${HOST_IP:-localhost}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  k9x_dashboard"
    echo "  UI: http://${HOST_IP}:8089"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ;;

  stop)
    echo "Stopping $CONTAINER ..."
    sudo podman stop "$CONTAINER" 2>/dev/null || true
    echo "Stopped."
    ;;

  logs)
    sudo podman logs -f "$CONTAINER"
    ;;

  all)
    "$0" build
    "$0" start
    ;;

  help|*)
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  build   — build the Podman image ($IMAGE)"
    echo "  start   — start the container (port 8089)"
    echo "  stop    — stop the container"
    echo "  logs    — tail logs"
    echo "  all     — build + start"
    ;;

esac
