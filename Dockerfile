# Stage 0: Base
FROM node:26.12.1 AS base
WORKDIR /app

# pnpm 11+ aborts non-interactive flows that would purge node_modules
# unless it knows it's running in CI. Setting CI=true also disables the
# `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` interactive prompt that
# fires from the implicit deps-status check before `pnpm run build`.
ENV CI=true
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Install pnpm (Node 25+ images no longer bundle Corepack).
RUN npm install -g pnpm@11.3.0

# Copy package manifests first for layer caching.
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .



# Install deps. `--ignore-scripts` skips package postinstall scripts
# (canvas/sharp native compile) which pnpm 11+ otherwise treats as a
# fatal `ERR_PNPM_IGNORED_BUILDS`. The Next build doesn't need either
# native binary at runtime -- images are unoptimized and PDF/canvas
# work runs server-side via API proxies, not on the host node.
RUN pnpm i --frozen-lockfile --ignore-scripts

# Stage 1: Builder
FROM base AS builder

# Build-time args. `NEXT_PUBLIC_BASE_PATH` is baked into the bundle —
# changing the mount path requires a rebuild. Defaults to root (`/`);
# pass `--build-arg NEXT_PUBLIC_BASE_PATH=/videoai` for a sub-path mount.
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH

ENV NODE_OPTIONS="--max-old-space-size=8192"

# Copy source.
COPY . .

# Bake basePath into the production env so it lands in the compiled
# client bundles. basePath is build-time only.
RUN echo "NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}" > .env.production

# Build the standalone output.
RUN pnpm run build

# Stage 2: Runner (Next.js standalone)
FROM node:26.12.1-alpine AS runner
WORKDIR /app

# Carry build-time args into runtime env so `entrypoint.sh` (which
# substitutes shell vars into `/app/public/env.js`) sees them. Without
# this, `${NEXT_PUBLIC_BASE_PATH}` renders empty in the runtime env.js
# even though it was baked into the compiled client bundles.
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH

# Next sets `NODE_ENV=production` internally after server boot, but the
# entrypoint runs before that and would otherwise emit `NODE_ENV: ""`.
ENV NODE_ENV=production

# Standalone output bundles a minimal node_modules.
COPY --from=builder /app/.next/standalone ./
# Static assets aren't included in the standalone output — copy explicitly.
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Runtime env entrypoint (writes /app/public/env.js).
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 5000
ENV PORT=5000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
