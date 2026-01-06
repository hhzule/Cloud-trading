

# Multi-stage build
FROM node:18-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_TRADING_API
ARG NEXT_PUBLIC_MARKET_DATA_API
ARG NEXT_PUBLIC_MARKET_DATA_WS

ENV NEXT_PUBLIC_TRADING_API=$NEXT_PUBLIC_TRADING_API
ENV NEXT_PUBLIC_MARKET_DATA_API=$NEXT_PUBLIC_MARKET_DATA_API
ENV NEXT_PUBLIC_MARKET_DATA_WS=$NEXT_PUBLIC_MARKET_DATA_WS
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]