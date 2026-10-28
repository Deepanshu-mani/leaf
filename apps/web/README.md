# BookLeaf Web App

This is the active Next.js App Router application. Use Node.js 22+ and npm.

```sh
npm install
npm run dev
```

## Commands

- `npm run build` - production build using Webpack; `npm run dev` uses Next.js Turbopack
- `npm run db:generate` - generate Prisma Client from the current schema
- `npm run db:check` - connect through Prisma and execute `SELECT 1`
- `npm run db:seed` - idempotently seed supplied authors, books, distribution listings, and starter tickets
- `npm run db:migrate -- --name init` - create and apply a migration in development
- `npm run db:migrate:deploy` - apply committed migrations to a deployment database

## Structure

- `src/app/` - route entry points and root layout
- `src/components/` - shared presentation components
- `src/features/auth/`, `books/`, `tickets/` - feature-level UI and workflows
- `src/server/services/` - server-only business rules and integrations
- `src/server/validation/` - request validation
- `src/lib/prisma.ts` - singleton Prisma client using the Neon serverless adapter
- `prisma/schema.prisma` - normalized data model
- `prisma/seed-data/` - supplied author and book sample data
- `scripts/check-db.ts` - end-to-end database connection check
- `scripts/seed.ts` - demo dataset seed

## Routes

- `/login` - author and support-team sign in
- `/dashboard`, `/books`, `/tickets` - author workspace
- `/admin/queue`, `/admin/books` - support-team workspace

The demo dataset is present on the linked Neon production branch. Sample author password: `bookleaf123`; support admin: `admin@bookleaf.com` / `admin123`.

Keep database and Gemini credentials in `.env` and server-side modules only. Never prefix them with `NEXT_PUBLIC_`.
