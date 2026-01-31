FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./

# Copy shared packages
COPY packages/moltbook-client ./packages/moltbook-client
COPY packages/database ./packages/database
COPY packages/cache ./packages/cache
COPY packages/sentiment ./packages/sentiment
COPY packages/collector ./packages/collector

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile --filter @moltbeat/collector...

# Build packages
FROM deps AS builder
RUN pnpm --filter @moltbeat/collector... build

# Production image
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/collector/dist ./packages/collector/dist
COPY --from=builder /app/packages/collector/package.json ./packages/collector/
COPY --from=builder /app/packages/moltbook-client/dist ./packages/moltbook-client/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/cache/dist ./packages/cache/dist
COPY --from=builder /app/packages/sentiment/dist ./packages/sentiment/dist

# Set environment
ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH

WORKDIR /app/packages/collector

CMD ["node", "dist/cli.js"]
