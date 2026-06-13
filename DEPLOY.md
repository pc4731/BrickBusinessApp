# Deploying Brick ERP to Vercel

This monorepo deploys as **two Vercel projects** from the same repo:

| Vercel project | Root directory | What it is |
| -------------- | -------------- | ---------- |
| `brick-web`    | `apps/web`     | Next.js PWA (frontend) |
| `brick-api`    | `apps/api`     | NestJS API as a serverless function |

External services (free tiers): **Neon** (Postgres) and **Cloudflare R2** (object storage for generated PDFs).

> **Why no Redis/queues?** Vercel has no long-running worker process, so the original
> BullMQ queues were removed. PDF generation now runs **synchronously** in the request,
> and the hourly alert refresh became a **Vercel Cron** job (see below).

---

## 1. Provision Postgres (Neon — free)

1. Create a project at <https://neon.tech>.
2. Copy two connection strings from the dashboard:
   - **Pooled** (host contains `-pooler`) → used at runtime as `DATABASE_URL`.
   - **Direct** (no `-pooler`) → used for migrations as `DIRECT_URL`.
3. Both should end with `?sslmode=require`.

## 2. Provision object storage (Cloudflare R2 — free)

1. In the Cloudflare dashboard → **R2** → create a bucket, e.g. `brick-erp`.
2. Create an **R2 API token** (Account → R2 → Manage API Tokens) with read/write.
3. Note the values:
   - `S3_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com`
   - `S3_REGION` = `auto`
   - `S3_BUCKET` = `brick-erp`
   - `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` = the token's keys

## 3. Run the database migrations

From your machine, point Prisma at the Neon **direct** URL and deploy migrations once:

```bash
DATABASE_URL="<neon-direct-url>" DIRECT_URL="<neon-direct-url>" \
  pnpm --filter @brick/db migrate:deploy

# optional: seed an initial org/admin
DATABASE_URL="<neon-direct-url>" DIRECT_URL="<neon-direct-url>" \
  pnpm --filter @brick/db seed
```

## 4. Create the API project (`brick-api`)

1. Vercel → **Add New Project** → import this repo.
2. Set **Root Directory** = `apps/api`. (Install/build commands come from `apps/api/vercel.json`.)
3. Add environment variables (Production + Preview):

   | Variable | Value |
   | -------- | ----- |
   | `DATABASE_URL` | Neon **pooled** URL |
   | `DIRECT_URL` | Neon **direct** URL |
   | `JWT_ACCESS_SECRET` | 32+ random chars |
   | `JWT_REFRESH_SECRET` | 32+ random chars |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL` | `7d` |
   | `API_PREFIX` | `api/v1` |
   | `CORS_ORIGIN` | the web URL, e.g. `https://brick-web.vercel.app` |
   | `NODE_ENV` | `production` |
   | `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from R2 |
   | `CRON_SECRET` | random string (also enables cron auth) |

4. Deploy. The API will be at `https://brick-api.vercel.app/api/v1`.
5. Sanity check: open `https://brick-api.vercel.app/api/v1/health`.

> **Cron:** `apps/api/vercel.json` registers a daily job hitting
> `/api/v1/cron/refresh-alerts`. Vercel automatically attaches
> `Authorization: Bearer $CRON_SECRET`, which the endpoint verifies.
> Hobby plans allow **once-per-day** cron only — this is set to `0 2 * * *` (02:00 UTC).
> On Pro you can raise it to hourly (`0 * * * *`).

## 5. Create the web project (`brick-web`)

1. Vercel → **Add New Project** → import the same repo again.
2. Set **Root Directory** = `apps/web`.
3. Add environment variable:

   | Variable | Value |
   | -------- | ----- |
   | `NEXT_PUBLIC_API_URL` | `https://brick-api.vercel.app/api/v1` |

4. Deploy. Then go back to the **API** project and set `CORS_ORIGIN` to this web URL,
   and redeploy the API.

---

## Plan limits to know (Vercel Hobby)

- **Commercial use:** the free Hobby plan is for non-commercial projects per Vercel's
  terms. A real business deployment should use **Pro**.
- **Cron frequency:** Hobby = once/day only (configured here); hourly needs Pro.
- **Function duration:** `maxDuration` is set to 30s for the API function.

## Troubleshooting: Prisma engine on the serverless function

If the API function errors at runtime with something like
`Query engine library for current platform ... could not be located`:

1. Confirm `packages/db/prisma/schema.prisma` has
   `binaryTargets = ["native", "rhel-openssl-3.0.x"]` (already set).
2. Confirm `apps/api/vercel.json` → `functions["api/index.ts"].includeFiles`
   matches where pnpm generated the client. Locally it is under
   `node_modules/.pnpm/@prisma+client@<ver>/node_modules/@prisma/client`. If the
   pinned version path drifts, the glob `@prisma+client@*` should still match.
3. As a fallback, set a stable Prisma output path in the generator
   (`output = "../generated/client"`), point `packages/db/src/index.ts` at it, and
   update `includeFiles` to that folder — this removes the pnpm-store dependency.

## Local development (unchanged)

```bash
docker compose up -d           # Postgres only is needed now (Redis is gone)
pnpm install
pnpm --filter @brick/db migrate
pnpm dev                       # web on :3000, api on :4000
```
