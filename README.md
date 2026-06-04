# PackFlow

Invoicing and margin tracking for packaging box brokers.

## Stack

- **Next.js 16** (App Router)
- **PostgreSQL** + **Prisma 6**
- **NextAuth.js v5** (Auth.js) — credentials + optional Google OAuth
- **Tailwind CSS 4**

## Getting started

### 1. Environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` and `AUTH_SECRET` (generate with `openssl rand -base64 32`).

### 2. Database

```bash
npm run db:push
```

Or with migrations:

```bash
npm run db:migrate
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Start free trial** to create a workspace.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:studio` | Prisma Studio |

## Project structure

```
app/
  (marketing)/     Landing page
  (auth)/          Login & signup
  [orgSlug]/       Tenant app (sidebar, dashboard)
  organizations/   Workspace picker
auth.ts            NextAuth configuration
prisma/schema.prisma
lib/               Prisma client, org context, utilities
components/        UI kit + layouts
```

## Documentation

- [`docs/SCREEN_ARCHITECTURE.md`](docs/SCREEN_ARCHITECTURE.md)
- [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md)
- [`database/schema.sql`](database/schema.sql) — full SQL reference (Phase 1+ tables)

## Phase 0 (current)

- [x] Prisma + PostgreSQL
- [x] NextAuth (email/password signup)
- [x] Multi-tenant org routing `/{orgSlug}`
- [x] App shell + sidebar + mobile nav
- [x] Shared UI components

Phase 1 adds invoice builder, clients, products, and payments.
