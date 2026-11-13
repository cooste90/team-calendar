# Progress log

Append one entry per task, newest at the bottom. Keep entries short and factual.

```
## TXX — <title> — <YYYY-MM-DD>
**Status:** done | blocked
**Summary:** what was built (2–5 bullets)
**Key files:** paths
**Simplicity pass:** what you removed or merged after re-reading the diff (04-code-style.md)
**Deviations from plan:** what and why (or "none")
**Follow-ups:** anything a later task must know
**Questions for the product owner:** (or "none")
```

---

## T00 — Planning — 2026-11-12
**Status:** done
**Summary:**
- Product spec, architecture, design system, accessibility plan and 37 tasks written with the product owner.
- Design mockup canvas created: https://claude.ai/artifact/Aq7zARQnJRuY8t9pV5QFo6 (private to the product owner until shared).
**Key files:** `docs/plan/*`
**Deviations from plan:** n/a
**Follow-ups:** the product owner to sign off the design mockup before T04.
**Questions for the product owner:** none outstanding. The product owner accepted the decisions listed at the end of planning.

## T00b — Simplicity revision — 2026-11-12
**Status:** done
**Summary:**
- The product owner (a junior developer who will maintain the code) asked for code that is as simple, short and readable as possible, with no repetition. Added `04-code-style.md` and made it required reading for every task.
- Simplified the architecture: server components + server actions + `refresh()` instead of TanStack Query; search-param dialogs instead of intercepting/parallel routes; a `lockUsers` row lock + plain overlap check instead of a Postgres exclusion constraint; a plain `BookingChanges` object instead of an op list; CSS animations instead of Motion; plain forms instead of react-hook-form; no virtualisation; no drag and drop; a static CSP.
**Key files:** `docs/plan/04-code-style.md`, `01-architecture.md` §1–3, §6–9, and tasks T04, T05, T08, T10, T12–T19, T22–T25, T27, T29–T31, T34, T36.
**Deviations from plan:** this entry is the revision.
**Follow-ups:** none.
**Questions for the product owner:** none.

## T00c — CI on GitHub for development — 2026-11-13
**Status:** done
**Summary:**
- The product owner hosts the repo on GitHub during development and will move to GitLab for production.
- T03 now builds `.github/workflows/ci.yml` (GitHub Actions). Every CI job only calls a `pnpm` script.
- T37 writes `docs/MOVING-TO-GITLAB.md` with an equivalent `.gitlab-ci.yml` for the move. It isn't committed as a live file, so there's never a second, unused pipeline.
**Key files:** `00-product-spec.md` (non-functional), `01-architecture.md` §1, §2, §11, `README.md`, tasks T03, T37.
**Deviations from plan:** this entry is the change.
**Follow-ups:** none.
**Questions for the product owner:** none.

## T00d — Mockup sign-off and change process — 2026-11-13
**Status:** done
**Summary:**
- The product owner signed off the design mockup (https://claude.ai/artifact/Aq7zARQnJRuY8t9pV5QFo6). T04 can use it as the visual reference.
- Added "Changing the plan" to `README.md` and an empty `backlog.md` for future ideas.
**Key files:** `docs/plan/README.md`, `docs/plan/backlog.md`
**Deviations from plan:** none.
**Follow-ups:** none. T01 can start.
**Questions for the product owner:** none.

## T01 — Tooling baseline — 2026-11-13
**Status:** done
**Summary:**
- Pinned Node 24 (`.nvmrc`, `engines`) and pinned every dependency exactly. Added zod 4.6.7 and lefthook 2.2.2.
- `next.config.ts`: `reactCompiler`, `typedRoutes`, `poweredByHeader: false`. Biome: a11y as errors, `noExplicitAny`, `noConsole` (allows error and warn), `useSortedClasses` (auto-fixed on save and commit), line width 100.
- lefthook: pre-commit formats staged files and type-checks; pre-push runs `pnpm test`. Checked with a deliberately messy file, which the hook fixed.
- `src/lib/env.ts` validates server env with zod and throws a readable list of problems. `.env.example` documents every variable.
- Cleaned the starter (placeholder "WestCal" page, `lang="en-GB"`, removed the unused `public/` SVGs). Added the code-style summary and plan pointer to `AGENTS.md`, and a quick start to `README.md`.
**Key files:** `package.json`, `biome.json`, `lefthook.yml`, `next.config.ts`, `src/lib/env.ts`, `.env.example`, `.gitattributes`, `AGENTS.md`, `README.md`
**Simplicity pass:** removed the starter's unused SVGs and the template comment in `next.config.ts`. Made `format` run `biome check --write`, so one command fixes formatting, imports and safe lint issues. The CI lint job now uses the same `pnpm lint` (`biome check`); architecture §11 was updated to match.
**Deviations from plan:**
- `typecheck` is `next typegen && tsc --noEmit`, because Next's global route types (e.g. `LayoutProps`) only exist after typegen.
- Added `.gitattributes` (`eol=lf`). Git on Windows converts files to CRLF, which Biome's formatter would flag everywhere.
- Kept TypeScript 5.9.3. TypeScript 7 (the native Go rewrite) is the current npm release, but it's a big change, so leave it until Next.js officially recommends it.
- `lefthook` was added to `ignoredBuiltDependencies` in `pnpm-workspace.yaml`. Its postinstall script isn't needed because `prepare` runs `lefthook install`.
**Follow-ups:** `globals.css` still has the starter's `font-family: Arial` on `body`; T04 replaces the styles. Nothing imports `env` yet. T02 and T11 will.
**Questions for the product owner:** none.

## T02 — Local Postgres and Prisma 7 bootstrap — 2026-11-13
**Status:** done
**Summary:**
- `docker-compose.yml`: `db` (postgres:17, :5432, named volume) and `db-test` (:5433, tmpfs), both with healthchecks. `pnpm db:up` waits until they're healthy.
- Prisma 7.10.1 with `prisma.config.ts`, the `prisma-client` generator to `src/generated/prisma`, and a placeholder `HealthCheck` model plus an `init` migration.
- `src/server/db.ts`: a single `PrismaClient` using `PrismaPg`, kept on `globalThis` in dev, with query logging when `PRISMA_LOG=query` (added to `env.ts` and `.env.example`).
- `GET /api/health` returns `{status:"ok",db:"ok"}`, or a 503 when the DB is down (both checked by hand).
- `db:*` scripts, `postinstall: prisma generate`, and README prerequisites and first-run steps.
**Key files:** `docker-compose.yml`, `prisma.config.ts`, `prisma/schema.prisma`, `src/server/db.ts`, `src/app/api/health/route.ts`
**Simplicity pass:** used `process.env.DATABASE_URL` in `prisma.config.ts` instead of Prisma's `env()` helper (which throws), so `pnpm install` works on a fresh clone or in CI without a `.env`. No seed placeholder config, just a comment, because T13 adds it.
**Deviations from plan:**
- npm's `latest` tag for `prisma` is `8.0.0-rc.33` (a release candidate). Used the stable **7.10.1** as the plan says. Prisma prints an "update available" banner; ignore it.
- Added `prisma` and `@prisma/engines` to `ignoredBuiltDependencies`. Their install scripts aren't needed: generate and migrate both work without them.
- `pnpm build` needs the env vars (from `.env` or CI variables) but no running database. `/api/health` is dynamic, so nothing queries the DB at build time.
**Follow-ups:** T03's integration setup uses `DATABASE_URL_TEST` against `db-test`. T10 replaces the `HealthCheck` model and the `init` migration (it's fine to delete `prisma/migrations` and start again, because nothing is deployed).
**Questions for the product owner:** none.

## T03 — Test harness and GitHub Actions CI — 2026-11-13
**Status:** done
**Summary:**
- Vitest 5 (`vitest.config.mts`) with `unit`, `component` (happy-dom + jest-dom) and `integration` projects, v8 coverage, and a 100% threshold on `src/domain/**`. The `@/` alias uses Vite 8's built-in `resolve.tsconfigPaths`, and `server-only` is aliased to its empty file in tests.
- Integration: global setup runs `prisma migrate deploy` on the test DB (it refuses unless the DB name ends in `_test`), and `reset-db.ts` truncates every table before each test.
- Playwright on port 3100 against the test DB (dev server locally, production build in CI), with `chromium` and `firefox` projects. `expectNoA11yViolations(page, { theme })` in `tests/e2e/a11y.ts` runs the WCAG 2.2 AA tags. The smoke test passes in light and dark, and a deliberate violation (an empty button) made it fail, as it should.
- Real first tests instead of throwaway ones: `src/lib/env.test.ts` (4 tests), `src/app/page.test.tsx` (heading + axe), `tests/integration/health.test.ts`.
- `.github/workflows/ci.yml` passes actionlint: jobs `checks`, `integration` and `e2e`, plus a nightly Firefox run, and it uploads the Playwright report on failure.
**Key files:** `vitest.config.mts`, `playwright.config.ts`, `tests/integration/helpers/*`, `tests/e2e/*`, `.github/workflows/ci.yml`
**Simplicity pass:** dropped `vitest-axe` (last released 2022) for a one-line `axe.run(container)` check. Dropped `@vitejs/plugin-react` and `vite-tsconfig-paths` (Vite 8 does both itself). No separate `testDb` client: integration tests use the normal `db`, which the integration project points at the test DB. Three CI jobs instead of six, so the setup steps aren't repeated.
**Deviations from plan:**
- `prisma migrate deploy` instead of `migrate reset --force --skip-seed`. Prisma 7 has no `--skip-seed`, and it blocks `migrate reset` when run by an AI agent. `deploy` + truncation does the same job without a destructive command. If migrations are rewritten (T10), restart the in-memory test DB with `docker compose restart db-test`.
- The CI jobs are grouped as above; architecture §1, §10 and §11 were updated.
- The CI env block has test-only values (clearly labelled, not real secrets).
**CI fix:** the first run failed in the e2e container: git rejected the checkout ("dubious ownership"), so `lefthook install` failed during `pnpm install`. Fixed with a `safe.directory` step, and confirmed by running the job locally in the same image (Chromium and Firefox pass).
**Follow-ups:** T04 should keep `expectNoA11yViolations` working with next-themes (it emulates `prefers-color-scheme`, which the "system" theme follows). The e2e job will need `prisma migrate deploy` and a seed step once T13 exists. Keep the Playwright container tag in step with `@playwright/test`.
**Questions for the product owner:** none.

## T04 — Design foundation — 2026-11-13
**Status:** done
**Summary:**
- shadcn 4.23 (Radix base, "nova" preset) with all 23 listed components. `globals.css` holds every light/dark token and the leave colours, mapped to shadcn names and Tailwind utilities (`bg-surface`, `bg-leave-al`, `text-leave-al-fg`, `rounded-dialog`, `shadow-popover`, `bg-hatch(-left/-right)`, `animate-grow`, `ease-out`).
- Geist and Geist Mono via `next/font`; next-themes (`class`, system default) in the root layout with `TooltipProvider`; the theme persists across reloads (e2e test).
- `Logo`, `Wordmark`, `LeaveChip` (code visible, full name for screen readers and in a tooltip), and `SegmentedControl` (one option always selected). `src/domain/leave-types.ts` is the single map of type → code, label, tally window and classes.
- Contrast test: 19 colour pairs × 2 themes, read straight from `globals.css`, all ≥ 4.5:1.
- `/dev/design-system` gallery (404 in production, checked with `next start`); axe passes in light and dark; forced-colours screenshot test attaches an image to the report.
- One global reduced-motion rule; forced-colours rules for focus, hatching, chips and the segmented control.
**Key files:** `src/app/globals.css`, `src/app/layout.tsx`, `src/domain/leave-types.ts`, `src/domain/__tests__/contrast.test.ts`, `src/components/{brand,leave-chip.tsx,segmented-control.tsx}`, `src/app/dev/design-system/*`
**Simplicity pass:**
- **One focus style:** a single global `:focus-visible` rule (2px ring, 2px gap, per design §2) replaces shadcn's per-component focus rings. I removed 42 `focus-visible:ring…` classes from `src/components/ui`.
- **Removed:**
  - shadcn's sidebar and chart tokens (unused);
  - `src/lib/utils.ts` (shadcn now imports `cn` from the `cn` package directly, and `shadcn add` still works without it);
  - `toggle-group`'s spacing override in `SegmentedControl`.
- **`tallyWindow` only:** no separate `tallied` flag, because `tallyWindow: null` means "not counted".
**Deviations from plan:**
- **E2E always runs on `next dev`** (CI included). Dev sign-in (T11) and the gallery are off when `NODE_ENV=production`, so e2e can't run against a production build. The `checks` job still builds production. T36 should add a small separate run against `next start` for the "dev routes return 404" check.
- **Primary buttons use `bg-primary-solid text-on-primary`.** shadcn's `--primary` is the design's text/link colour (lighter in dark mode), so `bg-primary` fills elsewhere (e.g. selected calendar days) get dark text in dark mode via `--primary-foreground`.
- **Dependency placement:** `shadcn` moved to devDependencies (it's the CLI; its CSS is only needed at build time). All new dependencies are pinned exactly. `cn` is shadcn's official class-merging package (repo `shadcn-ui/cn`).
- **Lint fixes in generated code:** in `field.tsx` and `input-group.tsx` I removed role="group" from plain wrappers and replaced `==` and an index key. A commented `biome-ignore` covers the input-group click-to-focus convenience.
- **Gallery size:** `gallery.tsx` is ~230 lines (over the ~200 guide). It's a dev-only page of examples, so I didn't split it.
**Follow-ups:**
- **Forced colours:** Chromium's forced-colours emulation only switches the media query, not the real system colours. Check once on Windows with High Contrast on (T35).
- **Bars:** the forced-colours "1px CanvasText border" rule should be added to grid bars as `forced-colors:` classes when T16 builds them, as LeaveChip does.
**Questions for the product owner:** none.

## T05 — Calendar dates, periods, half-day slots and formatting — 2026-11-13
**Status:** done
**Summary:**
- `src/domain/dates.ts`: `CalendarDate` strings, `calendarDateSchema`, day numbers, week (Sun–Sat), month, year and period helpers, `nextSunday`, `todayIn` (tested across both 2026 clock changes and at 23:30 UTC in BST), `yearOptions`, `weekForMonthSelection`, and `toDbDate`/`fromDbDate`.
- `src/domain/slots.ts`: the half-day slot model, plus `overlaps`, `intersect`, `subtract` (every relative position tested), `slotsOf`, `datesOf`, `isSingleDay` and `portionOf`.
- `src/domain/format.ts`: every format example from the task, including range summaries and period titles.
- 102 new table-driven tests; `src/domain` is at 100% lines, branches and functions.
**Key files:** `src/domain/{dates,slots,format}.ts`, `src/domain/__tests__/{dates,slots,format}.test.ts`
**Simplicity pass:** `format.ts` uses plain lists of day and month names instead of `Intl`. Intl's en-GB output changes between Node/ICU versions ("Sept" vs "Sep", optional commas), and the lists are easier to read. Replaced a nested ternary with a small lookup object. `todayIn` builds its result with `Object.fromEntries` (no optional chaining, so no untested branch).
**Deviations from plan:**
- `fromDayNumber` also uses `new Date(ms).toISOString()`. It's UTC-only, so time zones can't affect it. The alternative is a 10-line arithmetic algorithm a junior couldn't follow. So the full list of `new Date` uses in `src/domain` is `todayIn`, `toDbDate`, `fromDbDate` and `fromDayNumber`.
- Tests use real 2026 dates, so the spec's illustrative "Thu 10 – Tue 15" is tested as "Tue 10 – Sun 15". The format is the same.
- `portionOf` throws a plain `Error` for a multi-day range. It's a programming mistake, not a user error, so it doesn't need a domain error class.
- Vitest 5's coverage table hides fully covered files. Use `--coverage.reporter=json-summary` to see them listed. The 100% threshold on `src/domain/**` is still enforced.
**Follow-ups:** `type View = "week" | "month"` lives in `dates.ts`; T14's nuqs parsers should reuse it.
**Questions for the product owner:** none.

## T06 — Working patterns, overrides, availability and day counting — 2026-11-13
**Status:** done
**Summary:**
- `src/domain/availability.ts` defines:
  - the types `WorkDay`, `WeeklyPattern`, `PatternVersion` and `Override`;
  - `DEFAULT_PATTERN` and `DEFAULT_PATTERN_EFFECTIVE_FROM`;
  - `availabilityLookup(versions, overrides)`, where an override wins and otherwise the newest pattern on or before the date applies;
  - `worksSlot`;
  - `planPatternChange`, which starts a change from the next Sunday, replaces a pending one, and returns null when nothing would change.
- `src/domain/counting.ts`: `countWorkingDays`, `workingSlots`, `nonWorkingSlots` and `describeExcludedDays`, which writes the hint, e.g. "Sat 14 and Sun 15 are not working days, so they are not counted." or "Wed 11 is a morning-only day."
- Every spec example is a named test; 36 new tests; `src/domain` is still at 100%.
**Key files:** `src/domain/{availability,counting}.ts`, `src/domain/__tests__/{availability,counting}.test.ts`
**Simplicity pass:** merged the repeated "X is … / X and Y are …" sentence logic into one `sentence()` helper; one private `isWorkingSlot` is shared by all the slot functions.
**Deviations from plan:**
- **One lookup instead of two functions.** `resolveAvailability` and `availabilityForRange` are replaced by `availabilityLookup(versions, overrides)`. It sorts the history and indexes overrides once, then returns a `(date) => WorkDay` function. That's what `countWorkingDays`, tallies (T09) and the form hint (T24) all take, so there's one way to ask "does this person work on date X?" and it's cheap to call for every cell.
- **A pattern is a plain list.** `WeeklyPattern` is a 7-item `WorkDay[]` (Sunday first) instead of `Record<0..6, WorkDay>`: it's simpler to read and write.
- **No-change check includes pending versions.** `planPatternChange` compares against the pattern in force from next Sunday *including* any pending version. So changing back to the current pattern after saving a pending one still saves (it overwrites the pending version).
**Follow-ups:** the Prisma `WorkingPattern` model stores `sun … sat` columns. T10 or T27 needs a tiny pair of converters (`[row.sun, row.mon, …]` and back) in the query or service layer, not in the domain.
**Questions for the product owner:** none.

## T07 — Booking validation, conflicts, carving, time rules and permissions — 2026-11-13
**Status:** done
**Summary:**
- `src/domain/events.ts` covers:
  - the types `BookingInput`, `Booking`, `NewBooking` and `BookingChanges`, plus `emptyChanges` and `mergeChanges`;
  - `bookingInputSchema`, which rejects an end before the start (at half-day level) and a span over 366 days, and trims notes (≤ 500 characters, blank becomes undefined);
  - the form helpers `formPortionToHalves` and `halvesToFormPortion`;
  - `carveBooking`.
- `src/domain/conflicts.ts`:
  - `findConflicts`, which returns each clashing booking and the exact overlap;
  - `describeConflict`, e.g. "You already have Working from home on Fri 13 Nov (full day)." or "Tom Okafor already has Annual leave from Thu 12 Nov (afternoon) to Tue 17 Nov.";
  - `planReplace`, which throws `PastLockedError` for a past overlap and keeps zero-working-day remainders.
- `src/domain/time-rules.ts`:
  - `earliestCreatableDate`, `classifyBooking`, `canModify` and `allowedEdits`;
  - `validateCreate` and `validateUpdate`;
  - `planTrimRemaining` and `planRemoveDay`;
  - `validateOverrideChange`.
- `src/domain/permissions.ts`: every function in architecture §4, with plain `Actor` / `Subject` types.
- `src/domain/errors.ts` (created early because these rules throw): `AppError` with a `code`, plus `ValidationError` and `PastLockedError`. T14 adds `ForbiddenError`, `NotFoundError` and `ConflictError`.
- 95 new tests, including the full actor × subject matrix; `src/domain` is still at 100%.
**Key files:** `src/domain/{errors,events,conflicts,time-rules,permissions}.ts` and their tests
**Simplicity pass:**
- **One carving helper.** `carveBooking(booking, cut)` is shared by Replace, "Remove this day" and (next) the public holiday planners, instead of each doing its own split logic.
- **Fewer, simpler types.** `Booking` in the domain holds only what the rules need: no audit timestamps (the query layer adds those for the UI).
- **No separate permission error.** `PermissionError` was dropped: services throw `ForbiddenError` (T14) when a `can…` function says no.
**Deviations from plan:**
- **Validate functions throw.** `validateCreate` / `validateUpdate` throw `PastLockedError` / `ValidationError` instead of returning error values (rule 11, "errors are boring"). The plan's codes map onto them:
  - PAST_LOCKED and TOO_FAR_IN_PAST are both `PastLockedError` with different messages;
  - FIELD_LOCKED is `ValidationError`.
- **`validateCreate` takes a date.** Its signature is `validateCreate(startDate, role, today)` (a date, not a whole input), so day swaps can reuse it. `validateOverrideChange(date, today)` covers changing or removing an existing day swap.
- **No moving into the past.** A future booking can't be moved to start before today, even by an admin (`validateUpdate` has no role). Admins' 7-day window applies to creating only. Flag if admins should also be able to move bookings up to 7 days back.
- **Assumption:** a maximum booking span of 366 days. This is a sanity limit and isn't in the spec.
**Follow-ups:** T08 should reuse `carveBooking` and `mergeChanges` from `events.ts`, and drop zero-working-day remainders for PH carving only (spec §6.2).
**Questions for the product owner:** answered 2026-11-13: admins can only *create* in the 7-day past window; they can't edit, delete or move bookings into the past. That matches the code; spec §5.4 updated.

## T08 — Public holiday planning engine — 2026-11-13
**Status:** done
**Summary:**
- `src/domain/public-holidays.ts` has:
  - the types `PublicHoliday` and `PersonSnapshot` (an availability lookup, bookings and exclusion ids);
  - `phSlotsFor`;
  - `planPublicHolidayCreate`, `planPublicHolidayMove`, `planPublicHolidayDelete` and `planReconcileForPerson`;
  - `planUserEditsPhCopy` and `planUserDeletesPhCopy`.
- Rules covered:
  - a PH goes on the halves the person works;
  - parental leave is kept and gets no PH on its halves;
  - other bookings are carved, and pieces left with no working days are dropped;
  - untouched copies follow moves and deletes, and detached copies (exclusions) are left alone;
  - people with no copy only because the old date was their day off count as untouched;
  - reconcile replaces mismatched copies and creates newly working ones.
- Every spec case is a named test (27 new tests); `src/domain` is still at 100%.
**Key files:** `src/domain/public-holidays.ts`, `src/domain/__tests__/public-holidays.test.ts`, `src/domain/events.ts`
**Simplicity pass:**
- **One carving routine.** All four planners share one private `planHolidaysForPerson` (holiday ranges → carve → create PH bookings) and `holidayRange` (working halves minus parental leave).
- **One pieces helper.** `events.ts` gained `changesForPieces(booking, pieces)`, which handles any number of leftover pieces. `carveBooking` now uses it too, so there's one copy of the "first piece updates, others are created" logic.
- **No untested branches in sorting.** The sort comparators use `localeCompare`.
- **No duplicate helpers.** `BookingChanges`, `emptyChanges` and `mergeChanges` already existed from T07 and are reused.
**Deviations from plan:**
- **All of a person's holidays are carved together.** The plan's per-holiday carving would produce clashing updates when two holidays fall inside one booking (e.g. Christmas and Boxing Day in a 2-week AL block). Tested.
- **`PersonSnapshot` shape.** It takes `availability: AvailabilityLookup` (from T06) instead of an `availabilityOn` method, and `exclusions: string[]` instead of a `Set`.
- **Split pieces keep their creator.** `Booking` and `NewBooking` gained an optional `createdById`, so pieces created by a split keep the original creator. `saveBookingChanges` (T12) should use `piece.createdById ?? actor.id`.
- **Planner output order.** Output is ordered by userId, then booking start, then holiday date (people and holidays are sorted on the way in).
- **"Delete a PH copy" for unlinked bookings.** On a booking that isn't linked to a holiday, `planUserDeletesPhCopy` just removes it (no exclusion), and `planUserEditsPhCopy` does nothing.
**Follow-ups:** T12's `saveBookingChanges` writes `update` ranges (convert with `fromSlot`) and must apply `remove` before `create` within the same transaction.
**Questions for the product owner:** none.
