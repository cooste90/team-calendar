# WestCal

A team availability calendar showing who's in and who's off. The full plan is in [docs/plan](docs/plan/README.md).

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
