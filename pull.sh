#!/bin/bash
# Pull and restart K9X Studio with the latest image.
# Run this after a framework update or new package build.

podman stop k9x_studio && podman rm k9x_studio
podman pull ghcr.io/k9aif/k9x-studio:latest
podman run -d \
  --name k9x_studio \
  -p 8080:8080 \
  -e K9X_PROJECTS_ROOT="/k9x/projects" \
  -v ~/k9x-studio-working:/k9x/projects:Z \
  ghcr.io/k9aif/k9x-studio:latest
