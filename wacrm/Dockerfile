FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Dummy public vars so `next build` can inline them.
# Real values come from docker-compose env at runtime.
ARG NEXT_PUBLIC_SUPABASE_URL=https://aeejbjfhxpflbuijisup.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_BmfpLA5599BcVxNSszf3rg_mldoJ_oD
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
