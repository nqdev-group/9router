# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-alpine
ARG INCLUDE_HEADROOM=false

FROM ${NODE_IMAGE} AS base
WORKDIR /app

FROM base AS builder

RUN apk --no-cache upgrade && \
    apk --no-cache add python3 make g++ linux-headers

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app

ARG INCLUDE_HEADROOM

LABEL org.opencontainers.image.title="9router"

ENV NODE_ENV=production \
    PORT=20128 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    DATA_DIR=/app/data \
    ENABLE_HEADROOM=false \
    HEADROOM_PORT=8787

COPY --link --from=builder /app/public ./public
COPY --link --from=builder /app/.next/static ./.next/static
COPY --link --from=builder /app/.next/standalone ./
COPY --link --from=builder /app/custom-server.js ./
COPY --link --from=builder /app/open-sse ./open-sse
COPY --link --from=builder /app/src/mitm ./src/mitm
# MITM (separate child process) loads node-forge at runtime; Next tracing misses it
COPY --link --from=builder /app/node_modules/node-forge ./node_modules/node-forge

RUN mkdir -p /app/data /app/data-home && \
    chown -R node:node /app && \
    ln -sf /app/data-home /root/.9router 2>/dev/null; :

RUN apk --no-cache upgrade && \
    apk --no-cache add su-exec && \
    if [ "$INCLUDE_HEADROOM" = "true" ]; then \
      apk --no-cache add python3 py3-pip && \
      pip3 install --break-system-packages "headroom-ai[proxy]" && \
      rm -rf /root/.cache; \
    fi && \
    printf '#!/bin/sh\n\
chown -R node:node /app/data 2>/dev/null\n\
if [ "${ENABLE_HEADROOM:-false}" = "true" ] && command -v headroom >/dev/null 2>&1; then\n\
  HEADROOM_PORT="${HEADROOM_PORT:-8787}"\n\
  echo "[entrypoint] Starting Headroom proxy on port $HEADROOM_PORT"\n\
  su-exec node headroom proxy --port "$HEADROOM_PORT" &\n\
fi\n\
exec su-exec node "$@"\n' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 20128

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "custom-server.js"]
