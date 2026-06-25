# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend
COPY k9x_studio/frontend/package*.json ./
RUN npm ci --silent
COPY k9x_studio/frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ───────────────────────────────────────────────────
FROM python:3.11-slim

LABEL org.opencontainers.image.title="k9x_studio" \
      org.opencontainers.image.description="K9-AIF Visual Architecture Builder" \
      org.opencontainers.image.vendor="k9x.ai" \
      org.opencontainers.image.source="https://github.com/k9aif/k9x-studio" \
      org.opencontainers.image.url="https://k9x.ai"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Studio backend dependencies — requirements.txt declares k9-aif[s3]>=1.4.0
# (pulls boto3 for S3/MinIO object storage support)
COPY k9x_studio/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY k9x_studio/backend/ ./backend/

# Studio Jinja2 templates
COPY k9x_studio/backend/templates/ ./backend/templates/

# studiox's own SBB/ABB layers + agentized spec-import flow
# (router/agent extensions, orchestrators, agents, YAML-defined squads —
# all imported at runtime, e.g. orchestrators -> agents -> studio_core/studio_agents)
COPY k9x_studio/studio_core/   ./studio_core/
COPY k9x_studio/studio_agents/ ./studio_agents/
COPY k9x_studio/orchestrators/ ./orchestrators/
COPY k9x_studio/agents/        ./agents/
COPY k9x_studio/squads/        ./squads/

# Generator templates from k9-aif package (installed above via pip)
# Fall back: copy from framework source if present
COPY k9-aif-framework/generator/templates/ ./generator/templates/

# Pre-built React frontend
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

ENV K9X_GENERATOR_TEMPLATES_DIR=/app/generator/templates
ENV K9X_PROJECTS_ROOT=/k9x/projects
VOLUME ["/k9x/projects"]

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
