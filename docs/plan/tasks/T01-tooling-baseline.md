# T01 — Tooling baseline

**Phase:** 0 · **Depends on:** none · **Size:** S

## Goal
Turn the fresh `create-next-app` output into a strict, well-tooled base that every later task builds on.

## Read first
- `01-architecture.md` §1, §2, §11, §12
- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md`
- `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`

## Deliverables
1. **Node pin:** `.nvmrc` (Node 24 LTS) and `"engines": { "node": ">=24" }`. Keep `packageManager` as pnpm 10.
2. **TypeScript:** `strict: true` and the path alias `@/*` → `src/*`. Don't add extra strictness flags (such as `exactOptionalPropertyTypes`); they produce confusing errors for little gain here.
2a. **Code style doc:** copy the key rules from `docs/plan/04-code-style.md` into a short "Code style" section of `AGENTS.md`, so every future agent (and Claude Code session) sees them.
3. **next.config.ts:** `reactCompiler: true` (confirm the option name in the docs for 16.4; `babel-plugin-react-compiler` is already installed), `typedRoutes: true` if supported, `poweredByHeader: false`.
4. **Biome 2.4 `biome.json`:** follow `01-architecture.md` §11. Enable the a11y group as errors, `useSortedClasses` (functions: `cn`, `cva`, `clsx`), and ignore `src/generated`, `.next` and `node_modules`. Fix any violations in the starter files.
5. **lefthook:**
   - Install it as a devDependency with `"prepare": "lefthook install"`.
   - `lefthook.yml`: pre-commit runs `biome check --write --staged --no-errors-on-unmatched` with `stage_fixed: true`, plus a typecheck when TS files are staged. pre-push runs `pnpm test` (create a placeholder script that passes until T03).
6. **Env validation:** `src/lib/env.ts` uses zod to validate server env (see the architecture §12 list; make the SSO vars optional) and exports a typed `env`. Add `.env.example` with documented defaults and make sure `.gitignore` covers `.env*` except `.env.example`.
7. **Scripts in package.json:** `dev`, `build`, `start`, `lint` (`biome check`), `format`, `typecheck` (`tsc --noEmit`), `check` (lint + typecheck + test), and placeholders for `test`, `test:int` and `test:e2e`.
8. **Clean the starter:** remove the demo page content, leaving a minimal placeholder page "WestCal" in `src/app/page.tsx`. Set `<html lang="en-GB">`.
9. **AGENTS.md:** append (outside the Next-managed block) a short section: "Project plan lives in `docs/plan/` — follow the agent protocol in `docs/plan/README.md`."
10. **README.md:** a short local-dev quick start (filled in more by T02 and T13).

## Acceptance criteria
- `pnpm install && pnpm check && pnpm build` succeed on a clean clone.
- Commits trigger lefthook, and a deliberately mis-formatted file is auto-fixed on commit.
- Importing `env` with a missing required var throws a readable error at startup.

## Out of scope
Database, testing frameworks, UI libraries.
