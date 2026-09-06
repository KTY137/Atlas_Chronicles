# syntax=docker/dockerfile:1.7
# Atlas Chronicles — one image for hosted rooms and self-host (design/08-backend-architektur.md).
# Build context is the repository root:  docker build -f deploy/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages ./packages
COPY tools ./tools
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
RUN npm run build --workspace @chronicle/client
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
RUN apk add --no-cache tini wget && adduser -D -u 10001 chronicle
WORKDIR /app
COPY --from=build --chown=chronicle:chronicle /app /app
USER chronicle
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  # Liveness, not readiness: this decides whether to RESTART the container, and a restart
  # neither repairs an unreachable database nor helps a merely busy one. Readiness lives at
  # /api/ready and is what a load balancer or an operator asks. See packages/server/src/http/health.ts
  CMD wget -qO- http://127.0.0.1:3000/api/live >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "node_modules/tsx/dist/cli.mjs", "packages/server/src/main.ts"]
