#!/usr/bin/env bash
# k9x-ecosystem pod — runs k9x_studio as a Podman pod
# Usage: ./k9x-ecosystem-pod.sh [start|stop|restart|status|logs]

set -e

POD_NAME="k9x_ecosystem"
CONTAINER_NAME="k9x_studio"
IMAGE="${IMAGE:-k9x-studio:latest}"
HOST_PORT="${PORT:-8080}"
OLLAMA_URL="${OLLAMA_URL:-http://host.containers.internal:11434}"

# Volume: host path → /k9x/projects inside the container
# Override K9X_HOST_PROJECTS to mount a different host directory.
K9X_HOST_PROJECTS="${K9X_HOST_PROJECTS:-/home/container_storage/volumes/k9x/projects}"
K9X_PROJECTS_ROOT="/k9x/projects"

cmd="${1:-start}"

pod_exists()       { podman pod exists "$POD_NAME" 2>/dev/null; }
container_exists() { podman container exists "$CONTAINER_NAME" 2>/dev/null; }

stop_pod() {
  if pod_exists; then
    echo "[k9x-pod] Stopping pod $POD_NAME…"
    podman pod stop "$POD_NAME" 2>/dev/null || true
    podman pod rm -f "$POD_NAME" 2>/dev/null || true
    echo "[k9x-pod] Stopped."
  else
    echo "[k9x-pod] Pod not running."
  fi
}

start_pod() {
  stop_pod

  echo "[k9x-pod] Creating pod $POD_NAME on port $HOST_PORT…"
  podman pod create \
    --name "$POD_NAME" \
    -p "${HOST_PORT}:8080"

  # Ensure host projects directory exists
  mkdir -p "$K9X_HOST_PROJECTS"

  echo "[k9x-pod] Starting $CONTAINER_NAME (image: $IMAGE)…"
  podman run -d \
    --pod "$POD_NAME" \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -e OLLAMA_BASE_URL="$OLLAMA_URL" \
    -e K9X_GENERATOR_TEMPLATES_DIR=/app/generator/templates \
    -e K9X_PROJECTS_ROOT="$K9X_PROJECTS_ROOT" \
    -v "${K9X_HOST_PROJECTS}:${K9X_PROJECTS_ROOT}:Z" \
    "$IMAGE"

  echo ""
  echo "  k9x_studio is running"
  echo "  Studio  →  http://localhost:${HOST_PORT}"
  echo "  Ollama  →  $OLLAMA_URL"
  echo ""
  echo "  Logs:   podman logs -f $CONTAINER_NAME"
  echo "  Stop:   $0 stop"
}

case "$cmd" in
  start)
    start_pod
    ;;
  stop)
    stop_pod
    ;;
  restart)
    start_pod
    ;;
  status)
    if pod_exists; then
      podman pod ps --filter "name=$POD_NAME"
    else
      echo "[k9x-pod] Not running."
    fi
    ;;
  logs)
    podman logs -f "$CONTAINER_NAME"
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status|logs]"
    exit 1
    ;;
esac
