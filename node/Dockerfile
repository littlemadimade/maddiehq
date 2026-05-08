FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Rebuild native modules for the builder's platform
RUN npm rebuild better-sqlite3
ENV NEXT_TELEMETRY_DISABLED=1
# Use an in-memory SQLite during build so the parallel page-data-collection
# workers don't race each other on a real DB file. Runtime DATABASE_PATH
# (set by the deploy env or compose) is unaffected.
RUN DATABASE_PATH=:memory: npm run build

FROM base AS runner
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/migrations ./migrations

USER nextjs
EXPOSE 3006
ENV PORT=3006
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_PATH=/data/maddiehq.db

CMD ["node_modules/.bin/next", "start", "-p", "3006"]
