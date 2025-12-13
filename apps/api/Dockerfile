# Dockerfile for Railway deployment with Bun
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps

# Copy workspace package files
COPY package.json bun.lock pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/

# Install with Bun (handles workspace dependencies)
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared packages first
WORKDIR /app/packages/shared
RUN bun run build

WORKDIR /app/packages/db
RUN bun run build

WORKDIR /app/packages/ai
RUN bun run build

# Build the API
WORKDIR /app/apps/api
RUN bun run build

# Production image
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]
