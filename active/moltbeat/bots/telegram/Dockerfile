FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy root package files
COPY ../../package.json ../../pnpm-workspace.yaml ./
COPY ../../pnpm-lock.yaml ./

# Copy required packages
COPY ../../packages/database ../../packages/database
COPY ../../packages/cache ../../packages/cache
COPY . ./bots/telegram

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile --filter @moltbeat/telegram-bot...

# Build
FROM deps AS builder
RUN pnpm --filter @moltbeat/telegram-bot... build

# Production image
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/bots/telegram/dist ./bots/telegram/dist
COPY --from=builder /app/bots/telegram/package.json ./bots/telegram/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/cache/dist ./packages/cache/dist

# Set environment
ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH

WORKDIR /app/bots/telegram

CMD ["node", "dist/index.js"]
