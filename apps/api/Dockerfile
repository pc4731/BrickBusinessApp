# API container for Railway. Builds the whole pnpm workspace, runs the NestJS
# app. Single stage for reliability (pnpm symlinks survive); image-size
# optimisation via `pnpm deploy` is a later refinement.
# Build context must be the repo ROOT:  docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ── Install dependencies (cached on lockfile) ──
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ── Build ──
COPY . .
RUN pnpm --filter @brick/db generate
RUN pnpm turbo build --filter @brick/api

ENV NODE_ENV=production
EXPOSE 4000
# Apply pending migrations on boot, then start the API.
CMD ["sh", "-c", "pnpm --filter @brick/db migrate:deploy && node apps/api/dist/main.js"]
