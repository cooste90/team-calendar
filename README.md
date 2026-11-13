# WestCal

A team availability calendar showing who's in and who's off. The full plan is in [docs/plan](docs/plan/README.md).

## Local development

You need **Node 24** (see `.nvmrc`) and **pnpm 10** (`corepack enable` installs the right version).

```bash
pnpm install          # also installs the git hooks (lefthook)
cp .env.example .env  # the defaults work locally
pnpm dev              # http://localhost:3000
```

The database setup and seed data are added in later tasks.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and run it |
| `pnpm lint` | Check formatting and lint rules (Biome) |
| `pnpm format` | Fix formatting, imports and safe lint issues |
| `pnpm typecheck` | Type-check the whole project |
| `pnpm test` | Unit and component tests |
| `pnpm check` | Lint, type-check and test: run before pushing |

Git hooks: on commit, staged files are formatted and type-checked; on push, the tests run.
