# WestCal

A team availability calendar showing who's in and who's off. The full plan is in [docs/plan](docs/plan/README.md), and [progress.md](docs/plan/progress.md) logs what each task built and why.

## Where things are up to

| Phase | Tasks | Status |
|---|---|---|
| 0 · Foundation | T01–T04: tooling, database, tests and CI, design system | Done |
| 1 · Domain logic | T05–T09: dates, half days, working patterns, booking rules, permissions, public holidays, tallies, grid model | Done |
| 2 · Data and auth | T10–T14: database schema and migrations, sign-in, first-time sign-in, seed data, server actions and data loading | Done |
| 3 · Calendar UI | T15–T21: app shell, grid, team groups, keyboard, filters (T15–T20 done) | Next: T21, filters |
| 4–8 | Bookings, profile, admin, export, hardening | Not started |

What you can open today:
- http://localhost:3000/sign-in: the sign-in page. With more than one business unit it asks first-time users which one they belong to. "Developer sign-in" takes you to the fake sign-in (dev only).
- http://localhost:3000/dev-sign-in: sign in as one of the seeded people (see "Seeded accounts" below) or type in your own (dev only). A new person with no business unit picks one on the welcome page.
- http://localhost:3000/: the calendar page: the header (business unit switcher, Week/Month, Previous/Next, month and year, Today; Alt+T, Alt+W, Alt+M, Alt+[ and Alt+]), the period title and the read-only grid (week and month, light and dark). Teams collapse and expand, and stay that way next time. Admins also see the Unassigned group, and names they can click (the profile itself comes in T27). Owen Hughes (Unassigned) sees a banner. The grid works from the keyboard: Tab in, arrow keys, Home/End, Page Up/Down, and `?` for the list of shortcuts. It sends you to `/sign-in` if you're not signed in.
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
| `prisma/` | The database schema, migrations and the demo data seed (`prisma/seed/`) |
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
pnpm db:seed          # fill them with demo data (about 200 people)
pnpm dev              # http://localhost:3000
```

Check it works: http://localhost:3000/api/health should say `{"status":"ok","db":"ok"}`.

## Seed data

`pnpm db:seed` deletes everything and fills the dev database with repeatable demo data: 3 business units (Corporate Services is hidden), about 200 people with working patterns and day swaps, bookings from 6 months ago to 6 months ahead, and the England and Wales bank holidays for 2025–2027. `pnpm db:seed:large` makes about 1,000 people in 6 business units, for performance checks. The same day always gives the same data; set `SEED_TODAY=2026-11-14` to pin the day.

### Seeded accounts

Sign in as these on http://localhost:3000/dev-sign-in (the list lives in `prisma/seed/dev-sso-profiles.ts`):

| Name | Role | Business unit | Team |
|---|---|---|---|
| Grace Adeyemi | Super admin (employee number 100001) | West Operations | Service Design |
| Tom Okafor | Admin | West Operations | Finance Operations |
| Priya Shah | User | West Operations | Service Design |
| Owen Hughes | User | West Operations | Unassigned |
| Fatima Rahman | Admin | North Finance | Payroll |
| Callum Reid | Admin | Corporate Services (hidden) | Legal |
| Ana Kowalska | User | Corporate Services (hidden) | Communications |
| Siobhán Ní Bhriain | User | Not seeded: signs in as a brand-new person | |

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
| `pnpm test:perf` | Grid performance check with the large seed (replaces the test database's data; see the test file for measuring a production build) |
| `pnpm check` | Lint, type-check and test: run before pushing |
| `pnpm db:up` / `pnpm db:down` | Start or stop the local databases |
| `pnpm db:migrate` | Apply schema changes (creates a migration if `schema.prisma` changed) |
| `pnpm db:reset` | Wipe the dev database and re-run all migrations |
| `pnpm db:seed` / `pnpm db:seed:large` | Replace all data with demo data (about 200 / 1,000 people) |
| `pnpm db:studio` | Browse the database in Prisma Studio |
| `pnpm db:generate` | Regenerate the Prisma client after a schema change |

Git hooks: on commit, staged files are formatted and type-checked; on push, the tests run.
