# BookLeaf Author Support Portal

The active application is the Next.js App Router project in `apps/web`. It includes the author dashboard, book catalog, support conversations, admin ticket queue, admin book catalog, people directory, profile photo uploads, invitation-based account creation, and REST endpoints.

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
npm run db:migrate
npm run db:check
npm run db:seed
```

`db:check` runs a real Prisma query (`SELECT 1`) and reports seed counts. The supplied sample data is seeded in Neon production: 10 authors, 18 books, and 4 starter tickets. Demo authors use `bookleaf123`; the admin demo account is `admin@bookleaf.com` / `admin123`.

## Main routes

- `/login` — email/password sign-in
- `/dashboard`, `/books`, `/tickets` — author overview, catalog, and conversations
- `/profile` — account details and profile photo upload/removal
- `/admin/queue` — ticket filters, triage, assignment, internal notes, Gemini drafts, and replies
- `/admin/books` — author and book royalty catalog
- `/admin/people` — searchable internal-team and author directory

## REST API

Routes require a valid session cookie except sign-in and invite acceptance. Authors can access only their own author, ticket, and avatar records. Admin-only operations are marked.

| Method | Endpoint | Purpose / access |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/auth/me` | Return the current user's basic account |
| `GET` | `/api/books` | Return the signed-in author's books; admins can view all |
| `GET` | `/api/tickets` | List the caller's tickets; admins can view the full queue |
| `GET` | `/api/tickets/updates` | Return a lightweight change version used for near-real-time ticket refresh |
| `POST` | `/api/tickets` | Create a ticket for the signed-in author |
| `GET` | `/api/tickets/{ticketId}` | Read an authorized ticket and its visible conversation |
| `PATCH` | `/api/tickets/{ticketId}` | Update ticket status/category/priority/assignment (admin) |
| `POST` | `/api/tickets/{ticketId}/draft` | Generate a Gemini reply draft (admin) |
| `POST` | `/api/tickets/{ticketId}/messages` | Send a reply to the author (admin) |
| `POST` | `/api/tickets/{ticketId}/notes` | Add a private staff note (admin) |
| `GET` | `/api/users/{userId}/avatar` | Read an avatar for the owner or an admin |
| `POST` | `/api/users/{userId}/avatar` | Upload an avatar as multipart field `image` (owner only; JPG/PNG/WebP, 2 MB max) |
| `DELETE` | `/api/users/{userId}/avatar` | Remove the caller's avatar |
| `POST` | `/api/admin/invites` | Create an author or admin invite (super admin; link is copied/shared manually) |
| `DELETE` | `/api/admin/invites/{inviteId}` | Revoke a pending invite (super admin) |
| `PATCH` | `/api/admin/users/{userId}` | Activate or deactivate an internal team account (super admin) |
| `DELETE` | `/api/admin/users/{userId}` | Permanently delete an inactive team account when its authored replies/notes can be preserved (super admin) |
| `POST` | `/api/auth/accept-invite` | Accept an invite and create the account |

Errors return JSON with an `error` message and an appropriate HTTP status. Profile images are stored in Postgres and served only through the authenticated avatar endpoint.

## Project layout

```text
apps/web/
  src/app/                 Next.js routes and layouts
  src/components/          Shared UI components
  src/lib/                 Prisma client and shared libraries
  src/server/              Server-only business logic and validation
  prisma/                  PostgreSQL schema and migrations
  scripts/                 Local maintenance and connection checks
```

The data model keeps author profiles and login accounts separate, normalizes book distribution listings, uses constrained ticket enums, records Gemini suggestions separately from staff overrides, and stores author-visible replies separately from private staff notes. Gemini drafts and ticket classification use the server-side `GEMINI_API_KEY`; classification falls back to rules when Gemini is unavailable. The database-backed profile image field is capped at 2 MB by the upload API and accepts only JPG, PNG, or WebP with matching file signatures.

## Architecture and AI

Next.js route handlers provide the REST API and server-side authorization. Prisma ORM 7 connects to Neon Postgres with a pooled runtime URL and a direct migration URL. Gemini receives only the selected ticket and relevant account/book facts plus the BookLeaf policy context; staff review and edit every draft before sending. If Gemini is unavailable, the workflow remains usable with rules-based classification and category-specific draft templates. See [docs/APPROACH.md](docs/APPROACH.md) for the approach and current trade-offs.

## Deployment and known gaps

The app is deployed on Vercel with its environment configured. The canonical production origin is `https://askleaf.vercel.app` and is shared by invitation links and Next.js metadata. Set the server-only `APP_URL` to override it; preview deployments use Vercel's deployment URL, and local development uses its request origin. Ticket pages poll a lightweight activity version every 10 seconds and refresh when a change appears; polling pauses in hidden tabs. This is a simple fit for the current demo, with the trade-off of recurring checks from active pages and up to about 10 seconds of update delay. Revisit server-sent events or managed realtime if active usage grows or faster updates become important. The queue supports date range filters and sorts unresolved tickets by priority and age. Sensitive writes use a Neon-backed fixed-window limiter shared across instances. See [the assignment evaluation](#assignment-evaluation) for delivered features and deferred scope.

## Assignment evaluation

### Implemented for this version

- **Author portal:** password login, author-scoped dashboard, book and royalty views, ticket submission, ticket history and staff replies.
- **Admin portal:** ticket queue with status/category/priority/date filters, priority-based sorting, assignment, internal notes, staff replies, and book and people catalogs.
- **AI:** Gemini ticket categorization and priority suggestions plus reply drafts grounded in the BookLeaf policy context. Staff can override classification and edit drafts. Rules-based classification and templates keep the workflow available when Gemini is unavailable.
- **Data and API:** Next.js REST route handlers, Prisma ORM, Neon Postgres, the supplied dataset, validation, and role-based authorization. Endpoint details are listed above.
- **Team access:** Maya Chen (`admin@bookleaf.com`) is the sole super admin. Only she can issue/revoke invitations or manage internal team accounts. She can deactivate/reactivate a team member, or permanently delete a deactivated account when historical replies and notes do not prevent safe removal; deleted email addresses become available for a new invite.
- **Profile photos:** JPG/PNG/WebP only, maximum 2 MB, validated by file signature and stored in Postgres.
- **Operations:** Vercel deployment, 10-second activity polling, and database-backed fixed-window rate limits keyed by hashed IP and account identifiers.
- **UI:** Radix-based ShadCN-style controls and Lucide icons, with the existing BookLeaf visual theme. The components are locally styled wrappers, not a full shadcn/ui CLI installation.

### Intentionally deferred

- **Push updates:** no WebSocket or Server-Sent Events; 10-second polling is kept for the current usage level to avoid the added service and connection complexity of push updates.
- **Bot challenge:** no Turnstile/CAPTCHA yet. Rate limits are in place; add a challenge if abuse or bot traffic becomes a real concern.
- **Ticket attachments and malware scanning:** the current ticket form does not accept attachments. Profile photos are restricted to small raster images and signature-checked; antivirus scanning and general file uploads are deferred until document attachments are introduced.
- **Email delivery:** invites are shared by copying the link; no transactional email provider is connected.
- **AI evaluation:** no curated benchmark or automated quality/accuracy scoring yet. Review and edit all AI-generated replies before sending.
- **Managed authentication:** the app uses its own email/password sessions rather than a managed identity provider.

The assignment’s core author-support loop and AI workflow are implemented. The deferred items are production improvements, not blockers to the currently deployed demo.

## Sample data and assignment brief

The supplied dataset is `apps/web/prisma/seed-data/bookleaf_sample_data.json`; the confidential assignment brief is `docs/BookLeaf_Technical_Assignment_1.pdf`. The duplicate dataset and unused pre-Next.js prototype have been removed. Keep the repository private as required by the assignment. See [the design system notes](docs/DESIGN_SYSTEM.md) and [approach write-up](docs/APPROACH.md).
