# Stage 0: Base
FROM node:20 AS base
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=8192"

# Pin Node 25.3.0 via `n` (matches workspace-hq).
RUN npm install -g n && n 25.3.0 && hash -r

# Enable Corepack and activate pnpm.
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests first for layer caching.
COPY package.json .
COPY pnpm-lock.yaml .

# Install deps.
RUN pnpm install --frozen-lockfile

# Stage 1: Builder
FROM base AS builder

# Build-time args. `NEXT_PUBLIC_BASE_PATH` is baked into the bundle —
# changing the mount path requires a rebuild.
ARG NEXT_PUBLIC_BASE_PATH=/videoai
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
FROM node:20-alpine AS runner
WORKDIR /app

# Install Node 25.3.0 from the official musl build (Alpine).
RUN apk add --no-cache libstdc++ \
    && wget -qO- https://unofficial-builds.nodejs.org/download/release/v25.3.0/node-v25.3.0-linux-x64-musl.tar.gz | tar xz -C /usr/local --strip-components=1 \
    && node --version

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
