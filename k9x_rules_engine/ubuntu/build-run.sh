#!/usr/bin/env bash
# K9X rules engine: the GoRules agent in one container (podman), serving decision models from a folder.
# Same structure as the other ubuntu/build-run.sh helpers (start/stop/logs/status/all).
#
# The agent reads decision models (GoRules JDM files) read-only from RULES_DIR. Edit a rule there and restart.
# Internal service with no login: keep it on the LAN. Never publish it through a tunnel.
#
# Port: 8080 inside the container, HOST_PORT (default 8130) on this host. Not 8080: PlantUML uses it here.
#
# Commands:
#   pull     pull the image
#   start    start the container
#   stop     stop the container
#   logs     tail logs
#   status   show whether it is running
#   all      pull + start

set -euo pipefail

IMAGE="gorules/agent:latest"
CONTAINER="gorules-agent"
HOST_PORT="${HOST_PORT:-8130}"
RULES_DIR="${RULES_DIR:-$HOME/containers/volumes/rules}"

cmd="${1:-help}"
case "$cmd" in

  pull)
    echo "Pulling $IMAGE ..."
    sudo podman pull "$IMAGE"
    ;;

  start)
    mkdir -p "$RULES_DIR"
    echo "Starting $CONTAINER on port $HOST_PORT (rules from $RULES_DIR) ..."
    sudo podman rm -f "$CONTAINER" 2>/dev/null || true
    sudo podman run -d \
      --name "$CONTAINER" \
      -p "${HOST_PORT}:8080" \
      -e PROVIDER__TYPE=Filesystem \
      -e PROVIDER__ROOT_DIR=/data \
      -v "${RULES_DIR}:/data:ro" \
      --restart=unless-stopped \
      "$IMAGE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  K9X rules engine (GoRules agent)"
    echo "  Local:  http://127.0.0.1:${HOST_PORT}"
    echo "  Rules:  ${RULES_DIR}"
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

  status)
    sudo podman ps --filter "name=$CONTAINER" --format "{{.Names}}  {{.Status}}  {{.Ports}}"
    ;;

  all)
    "$0" pull
    "$0" start
    ;;

  *)
    echo "Usage: $0 {pull|start|stop|logs|status|all}"
    echo "  HOST_PORT (default 8130), RULES_DIR (default \$HOME/containers/volumes/rules)"
    exit 1
    ;;
esac
