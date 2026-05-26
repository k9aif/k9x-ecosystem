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
      org.opencontainers.image.vendor="k9x.ai"

WORKDIR /app

# Python dependencies
COPY k9x_studio/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY k9x_studio/backend/ ./backend/

# Studio Jinja2 templates (validation_loop, critic_actor, etc.)
COPY k9x_studio/backend/templates/ ./backend/templates/

# Generator templates (BaseAgent, config — canonical ABB templates)
COPY k9-aif-framework/generator/templates/ ./generator/templates/

# Pre-built React frontend
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

# Tell scaffold_service where generator templates live
ENV K9X_GENERATOR_TEMPLATES_DIR=/app/generator/templates

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
