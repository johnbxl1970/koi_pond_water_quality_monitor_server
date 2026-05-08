# syntax=docker/dockerfile:1.7

# ---- builder ----
FROM node:24-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# next build with output:'standalone' produces .next/standalone (a runnable
# server.js + minimum node_modules) and .next/static (assets to serve).
# NEXT_PUBLIC_GIT_COMMIT is inlined at build time; CI passes it as a build
# arg so the sidebar shows the commit this image was built from.
ARG GIT_COMMIT=unknown
ENV NEXT_PUBLIC_GIT_COMMIT=${GIT_COMMIT}
RUN npm run build


# ---- runtime ----
FROM node:24-slim AS runtime
WORKDIR /app

# wget for the HEALTHCHECK; tini for signal handling.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    tini \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r koi && useradd -r -g koi koi

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0

# Standalone output: server.js + only the deps it needs.
COPY --from=builder --chown=koi:koi /app/.next/standalone ./
COPY --from=builder --chown=koi:koi /app/.next/static ./.next/static
COPY --from=builder --chown=koi:koi /app/public ./public

USER koi

EXPOSE 3001

# /login is the only route that doesn't require auth — perfect liveness
# target. /api/* in the admin app proxies to the NestJS server, so a
# /login 200 means the Next process is up and rendering.
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=4 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT:-3001}/login" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
