# Brick ERP

Production-grade ERP for a brick redistribution business — purchases from
factories (bhattas), sells/distributes to customers via trucks. Mobile-first,
offline-capable, multilingual (English / Hindi / Hinglish).

## Monorepo layout

```
brick-erp/
├── apps/
│   ├── web/      Next.js 14 (App Router) — deploys to Vercel
│   └── api/      NestJS REST API        — deploys to Railway (Dockerfile)
├── packages/
│   ├── db/       Prisma schema + client + seed (PostgreSQL)
│   ├── types/    Shared enums / DTOs (no @prisma/client in the web bundle)
│   └── utils/    Money + GST + order financial math (runs client AND server)
├── docker-compose.yml   Local Postgres + Redis
└── .github/workflows/   CI (typecheck, test, build)
```

## Core design decisions

- **Money = integer paise.** ₹8,500 → `850000`. No floats anywhere. Rates are
  paise-per-brick; quantities are actual brick counts (shown as `×1000`).
- **Double-entry accounting.** Every financial event writes balanced
  `JournalEntry` rows; ledgers, dues and P&L are views over them. (Engine: Phase 3.)
- **Multi-tenant from day 1.** Every table carries `orgId` (branch-ready).
- **Soft delete + audit log** on mutations; financial rows are never hard-deleted.
- **Offline scope:** order entry + payment recording (PWA + sync queue, Phase 6).

## Prerequisites

- Node 22 (`.nvmrc`), pnpm 9 (`corepack enable`)
- Docker (for local Postgres + Redis)

## Local setup

```bash
corepack enable                 # provides pnpm
pnpm install
cp .env.example .env            # then edit secrets
docker compose up -d            # Postgres + Redis
pnpm --filter @brick/db generate
pnpm --filter @brick/db migrate # create schema
pnpm --filter @brick/db seed    # demo data
pnpm dev                        # api :4000  +  web :3000
```

Demo login (after seed): `owner@balajibricks.example` / `Password@123`

## Useful scripts

| Command | What |
| --- | --- |
| `pnpm dev` | Run API + web in watch mode |
| `pnpm build` | Build all packages + apps |
| `pnpm typecheck` | Type-check the whole workspace |
| `pnpm test` | Run unit tests (financial math, etc.) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:migrate` | Create/apply a dev migration |
| `pnpm db:seed` | Seed demo data |

## Deployment

- **API → Railway:** build from `apps/api/Dockerfile` (context = repo root).
  Provision Railway PostgreSQL + Redis; set env vars from `.env.example`.
  The container runs `prisma migrate deploy` on boot.
- **Web → Vercel:** root directory `apps/web`, build `pnpm build`. Set
  `NEXT_PUBLIC_API_URL` to the Railway API URL.

## Roadmap (phased)

0. **Foundation** — monorepo, schema, auth, CI ← _current_
1. Master data (customers, factories, trucks, drivers, pricing)
2. Orders (direct + stock workflows)
3. Finance engine (journal, payments, dues, cashbook)
4. Dashboard + reports + PDF/Excel (async via BullMQ)
5. GST, notifications, audit viewer
6. PWA + offline sync
7. i18n + polish
