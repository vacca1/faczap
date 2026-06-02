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

ARG NEXT_PUBLIC_SUPABASE_URL=https://aeejbjfhxpflbuijisup.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_BmfpLA5599BcVxNSszf3rg_mldoJ_oD
ARG NEXT_PUBLIC_SITE_URL=https://fatorzap.smarts.solutions

RUN npm run build

# --- Runner ---
# Use the full node image with all deps (no standalone trace needed)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the full app — not using standalone mode to avoid path issues
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
