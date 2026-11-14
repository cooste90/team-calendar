# WestCal

A team availability calendar showing who's in and who's off. The full plan is in [docs/plan](docs/plan/README.md), and [progress.md](docs/plan/progress.md) logs what each task built and why.

## Where things are up to

| Phase | Tasks | Status |
|---|---|---|
| 0 · Foundation | T01–T04: tooling, database, tests and CI, design system | Done |
| 1 · Domain logic | T05–T09: dates, half days, working patterns, booking rules, permissions, public holidays, tallies, grid model | Done |
| 2 · Data and auth | T10–T14: database schema and migrations, sign-in (T10–T11 done) | Next: T12, first-time sign-in |
| 3–8 | Calendar UI, bookings, profile, admin, export, hardening | Not started |

There's no calendar screen yet. What you can open today:
- http://localhost:3000/dev-sign-in: sign in as a fake person (dev only). Create a business unit called "Finance" first (e.g. in `pnpm db:studio`), or new people land on the welcome page. The seed (T13) will do this for you.
- http://localhost:3000/: a placeholder home page with a Sign out button. It sends you to `/sign-in` if you're not signed in.
- http://localhost:3000/dev/design-system: every colour, leave chip and component, in light and dark (dev only)
- http://localhost:3000/api/health: checks the app can reach the database

## Where the code lives

| Folder | What's in it |
|---|---|
| `src/domain/` | All the business rules as plain, fully tested TypeScript (no React or database). Start here to understand how the app thinks. |
| `src/components/` | Shared React components; `ui/` holds the shadcn components |
| `src/app/` | Next.js pages and API routes |
| `src/server/` | Server-only code: the database client, sign-in (`auth.ts`, `auth-sync.ts`, `session.ts`), and server actions |
| `src/lib/` | Small shared helpers, e.g. `env.ts`, which checks the settings in `.env` |
| `prisma/` | The database schema and migrations |
| `tests/` | Integration tests (real database) and end-to-end browser tests |
| `docs/plan/` | The plan, the code style rules, and the progress log |

## Local development

You need:
- **Docker Desktop** (runs the local Postgres databases)
- **Node 24** (see `.nvmrc`)
- **pnpm 10** (`corepack enable` installs the right version)

First run:

```bash
pnpm install          # also installs the git hooks and generates the Prisma client
cp .env.example .env  # the defaults work locally
pnpm db:up            # start Postgres (dev on :5432, test on :5433)
pnpm db:migrate       # create the tables
pnpm dev              # http://localhost:3000
```

Check it works: http://localhost:3000/api/health should say `{"status":"ok","db":"ok"}`.

Seed data is added in a later task.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and run it |
| `pnpm lint` | Check formatting and lint rules (Biome) |
| `pnpm format` | Fix formatting, imports and safe lint issues |
| `pnpm typecheck` | Type-check the whole project |
| `pnpm test` | Unit and component tests |
| `pnpm test:watch` | Re-run unit and component tests as you edit |
| `pnpm test:coverage` | Unit and component tests with a coverage report (`src/domain` must be 100%) |
| `pnpm test:int` | Integration tests against the test database (run `pnpm db:up` first) |
| `pnpm test:e2e` | Browser tests with accessibility checks (first time: `pnpm exec playwright install chromium`) |
| `pnpm check` | Lint, type-check and test: run before pushing |
| `pnpm db:up` / `pnpm db:down` | Start or stop the local databases |
| `pnpm db:migrate` | Apply schema changes (creates a migration if `schema.prisma` changed) |
| `pnpm db:reset` | Wipe the dev database and re-run all migrations |
| `pnpm db:studio` | Browse the database in Prisma Studio |
| `pnpm db:generate` | Regenerate the Prisma client after a schema change |

Git hooks: on commit, staged files are formatted and type-checked; on push, the tests run.
