# BookLeaf Author Support Portal

The active application is the Next.js App Router project in `apps/web`. Its author overview, book catalog, support conversations, admin queue, admin catalog, and API workflows have been ported from the original prototype, which remains preserved under `apps/web/reference/prototype`.

## Development

```sh
npm install
npm run dev
```

Open <http://localhost:3000>. The Next app reads environment variables from `apps/web/.env`; that file is ignored by Git. Never commit or paste its database URL or Gemini key.

## Database

The app uses Prisma ORM 7 with Neon Postgres. The schema in `apps/web/prisma/schema.prisma` has been migrated to the Neon `production` branch. Runtime queries use Neon's pooled URL; Prisma CLI migrations use the direct URL. The generated Prisma Client is ignored and regenerated after dependency installation.

```sh
npm run db:generate
npm run db:check
npm run db:seed
```

`db:check` runs a real Prisma query (`SELECT 1`) and reports seed counts. The supplied sample data is seeded in Neon production: 10 authors, 18 books, and 4 starter tickets. Demo authors use `bookleaf123`; the admin demo account is `admin@bookleaf.com` / `admin123`.

## Project layout

```text
apps/web/
  src/app/                 Next.js routes and layouts
  src/components/          Shared UI components
  src/features/            Auth, books, and ticket feature modules
  src/lib/                 Prisma client and shared libraries
  src/server/              Server-only business logic and validation
  prisma/                  PostgreSQL schema and migrations
  scripts/                 Local maintenance and connection checks
```

The data model keeps author profiles and login accounts separate, normalizes book distribution listings, uses constrained ticket enums, records Gemini suggestions separately from staff overrides, and stores author-visible replies separately from private staff notes. Gemini drafts and ticket classification use the server-side `GEMINI_API_KEY`; classification falls back to rules when Gemini is unavailable.

## Sample data and assignment brief

The supplied dataset is `apps/web/prisma/seed-data/bookleaf_sample_data.json`; the confidential assignment brief is `docs/BookLeaf_Technical_Assignment_1.pdf`. Keep the repository private as required by the assignment.
