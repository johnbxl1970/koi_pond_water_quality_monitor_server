# syntax=docker/dockerfile:1.7

# ---- builder ----
# We build on debian-slim (not alpine) because Prisma's libquery engine ships
# musl binaries that depend on openssl 1.1 — alpine 3.19+ has only openssl 3,
# and the upstream Prisma docs explicitly recommend the debian base for any
# Node + Prisma image.
FROM node:20-slim AS builder
WORKDIR /app

# argon2 is the only native dep that needs a compiler at install time.
# Prisma also needs openssl runtime at engine load.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install all deps (incl. dev) so we can run `nest build`.
COPY package.json package-lock.json ./
RUN npm ci

# Prisma client must be generated before the Nest build because src/ imports
# from @prisma/client. The schema is part of the build context.
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

# Drop devDependencies — we copy this slimmed node_modules into the runtime
# image so only what production needs ships.
RUN npm prune --omit=dev


# ---- runtime ----
FROM node:20-slim AS runtime
WORKDIR /app

# wget is used by the Docker HEALTHCHECK below. tini gives us proper PID-1
# signal handling so SIGTERM in the orchestrator actually stops Node.
# openssl + libssl3 are required at engine load time by Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    tini \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -r koi && useradd -r -g koi koi

ENV NODE_ENV=production \
    HTTP_PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

USER koi

EXPOSE 3000

# Shell form so $HTTP_PORT expands at check time (default 3000, overridable
# via env). Bypassing /bin/sh would mean hardcoding the port.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=4 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${HTTP_PORT:-3000}/api/healthz" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/src/main.js"]
