#!/bin/bash
set -e

POD_NAME="redis-pod"
DATA_DIR="/home/container_storage/volumes/redis-data"

# Set this before running — Redis has NO auth by default, and this binds
# 6379 on all interfaces so K9-AIF SBBs (possibly running elsewhere) can
# reach it. An open, unauthenticated Redis port is a well-known attack
# target — requirepass is not optional once it's off localhost.
REDIS_PASSWORD="${REDIS_PASSWORD:?Set REDIS_PASSWORD before running, e.g. REDIS_PASSWORD=yourpass ./redis.sh}"

mkdir -p "$DATA_DIR"

# Pod owns the port mappings — containers inside share one network
# namespace and reach each other via localhost (no container-name DNS needed).
# Redis (6379) is open to all interfaces for SBB access; the admin UI (5540)
# stays localhost-only — no reason to expose a management console externally.
sudo podman pod exists "$POD_NAME" || sudo podman pod create --name "$POD_NAME" \
  -p 6379:6379 \
  -p 127.0.0.1:5540:5540

sudo podman run -d --pod "$POD_NAME" --name redis \
  -v "$DATA_DIR:/data:Z" \
  redis:latest redis-server --save 60 1 --appendonly yes --requirepass "$REDIS_PASSWORD"

# RedisInsight connects to Redis at localhost:6379 — same pod, shared network namespace.
sudo podman run -d --pod "$POD_NAME" --name redisinsight \
  -v redisinsight-data:/data \
  redis/redisinsight:latest

echo "Done. redis-pod up — Redis on 6379, RedisInsight UI on 5540 (http://127.0.0.1:5540)"
