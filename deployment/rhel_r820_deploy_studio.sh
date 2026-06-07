#!/bin/bash
set -e

cd /home/ravinata/ai/k9x-ecosystem/studio
tar -xzf k9x_studio.tar.gz

# Build first — if this fails, `set -e` halts here and the running
# container/pod is left untouched (no downtime from a bad build).
sudo podman build -f deployment/Dockerfile -t k9x-studio:latest .

# Build succeeded — now swap the running container for the new image.
# `set -e` aborts on any non-zero exit, and `2>/dev/null` only silences the
# error message — not the exit code. So these must use `|| true`: if the
# container doesn't exist (e.g. first deploy, or already removed), stop/rm
# fail with "no such container" and would otherwise kill the script before
# `podman run` ever executes — leaving nothing serving studio.k9x.ai.
sudo podman stop k9x_studio 2>/dev/null || true
sudo podman rm   k9x_studio 2>/dev/null || true
sudo podman run -d --name k9x_studio \
  -p 127.0.0.1:8081:8080 \
  --add-host=ollama:192.168.1.98 \
  -e K9X_PROJECTS_ROOT=/k9x/projects \
  -e GOVERNANCE_LLM_ENDPOINT=http://ollama:11434 \
  -e GOVERNANCE_LLM_MODEL=granite3-guardian:latest \
  -e GOVERNANCE_MAX_CHARS=50000 \
  -v /home/ravinata/k9x-studio-working:/k9x/projects:Z \
  k9x-studio:latest
echo "Done. studio.k9x.ai"