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

## T09 — Tallies and the grid view-model — 2026-11-13
**Status:** done
**Summary:**
- `src/domain/tallies.ts`:
  - `tallyWindows`;
  - `computeTallies`, which returns one entry per counted type in display order, AL with taken + booked, and counts only the part of a booking inside the window;
  - `historyGroups` and `upcomingBookings` (ongoing bookings are flagged).
- `src/domain/grid-model.ts`: `buildGridModel(input)` returns:
  - columns, with today, the PH name and the accessible header label;
  - groups (viewer's team pinned, then admin order, then Unassigned for admins; collapsed groups have no rows; union filters drop empty groups);
  - rows (en-GB collator sort by surname then first name);
  - cells (availability, booking summaries, and labels such as "Tuesday 10 November, Tom Okafor. Annual leave, Monday 9 to Wednesday 11 November, 3 days.", with "View only." when the viewer can't edit);
  - bars (clipping, half tracks AM = even / PM = odd column, "AL · 4 days" labels, `isNarrow` for month-view halves);
  - off-day hatching overlays inside multi-day bars.
- Small helpers:
  - `src/domain/display-name.ts`;
  - `formatWeekdayShort`, `formatWeekdayDayMonth`, `formatLongRange` and a shared `PORTION_SUFFIX` in `format.ts`.
- 30 new tests; `src/domain` is still at 100%. Performance: 300 people × 31 days with 3,000 bookings builds in about 17ms cold and 9–14ms warm (target 25ms). The test allows 100ms for slow CI runners.
**Key files:** `src/domain/{tallies,grid-model,grid-model-types,display-name}.ts`, `src/domain/format.ts`, `src/domain/dates.ts`
**Simplicity pass:**
- **Data-driven tallies.** `computeTallies` / `historyGroups` are driven by the `tallyWindow` in `leave-types.ts` (no hard-coded type list), using a `flatMap` instead of type casts.
- **No repeated work in the grid.** Each booking's range, day count and description is worked out once per row, and the day ranges and labels once per grid.
- **One copy of the morning/afternoon wording.** `formatRangeSummary` and the grid share `PORTION_SUFFIX`.
**Deviations from plan:**
- **People get an availability lookup.** `people[].availability` is an `AvailabilityLookup` (from T06), not `WorkDay[]` per visible day. A bar's "· 4 days" counts the whole booking, including days outside the visible period, so the grid needs availability beyond the period. T14's query builds the lookup per person.
- **`computeTallies` returns a list.** It returns `Tally[]` in display order (`{ type, taken, booked? }`) instead of an object keyed by type, so the profile UI just maps over it.
- **Cells have no per-date editability.** A cell's "View only." comes from `viewer.canEdit(person)`. Per-date editability (past dates) is left to T18/T25, which have the role and time rules to hand.
- **`dates.ts` caches its two conversions.** `toDayNumber` and `fromDayNumber` now remember their answers (two small Maps). The grid converts the same ~60 dates tens of thousands of times, and this took the large grid from about 45ms to about 12ms.
**Follow-ups:** none. (`grid-model.ts` was split after formatting: the input and output types live in `grid-model-types.ts`, so the builder is 200 lines.)
**Questions for the product owner:** none.

## T09b — Documentation sync — 2026-11-14
**Status:** done
**Summary:**
- **Product owner request:** check that all documentation matches what's actually built after T01–T09.
- **Completed task files (T03, T04, T06–T09):** lines that described the original plan now say what was built, marked "as built".
- **Upcoming task files:** updated wherever earlier work changed their starting point:
  - T10: the `sun…sat` ↔ list converters, and removing the T02 placeholder and migration;
  - T12: `saveBookingChanges` details (`fromSlot`, remove before create, `createdById ?? actor.id`);
  - T14: `errors.ts` already exists, and each person gets an availability lookup;
  - T15: providers are already in the root layout;
  - T18: `nextCell` goes in its own file;
  - T22: `validateCreate(startDate, …)`;
  - T27: pattern column converters;
  - T28: tallies come back as a list;
  - T36: the dev-routes-404 check needs its own run against `next start`.
- **`01-architecture.md`:**
  - folder tree (format.ts, grid-model-types.ts, no lib/utils.ts);
  - stack notes (shadcn 4.23 and `cn`, the global focus rule, Prisma 7.10.1 pinned);
  - §4 time-rule function names;
  - §7 `todayIn` and the date caches;
  - §8 where `BookingChanges` lives and how carving works;
  - §9 grid input and output shapes and measured speed.
- **`02-design-system.md`:** a "Built so far" note covering the components, the single focus rule, primary buttons, theme preview classes, and the contrast test.
- **Root `README.md`:** a project status table, the pages you can open today, and a folder guide.
**Key files:** `README.md`, `docs/plan/01-architecture.md`, `docs/plan/02-design-system.md`, `docs/plan/tasks/T03–T36`
**Deviations from plan:** none (docs only).
**Follow-ups:** none.
**Questions for the product owner:** none.

## T10 — Prisma schema and migrations — 2026-11-14
**Status:** done
**Summary:**
- `prisma/schema.prisma` has every architecture §3 model and enum, with a `///` comment on each model and non-obvious field. The `HealthCheck` placeholder and the T02 migration are gone.
- `Session`, `Account` and `Verification` were generated by the Better Auth CLI (`npx auth generate`, 1.7.23) in a scratch folder, then merged in. Nothing was written by hand.
- Two migrations: `init` (generated) and `checks` (`--create-only`, edited by hand). `checks` adds `WorkingPattern_effectiveFrom_is_sunday` and `Event_start_not_after_end`, each with a SQL comment.
- `lockUsers(tx, userIds)` in `src/server/db.ts`, and `src/server/mappers.ts` with `toBooking`, `toPatternVersion`, `toPatternColumns`, `toOverride` and `toPublicHoliday`.
- 24 new integration tests (25 in total), covering:
  - the lock: the same person waits, different people don't;
  - both CHECKs;
  - delete-user cascades and `createdById` / `updatedById` set to null;
  - delete-team makes members Unassigned;
  - mapper date round-trips on both 2026 clock changes;
  - the pattern list ↔ columns conversion;
  - the Prisma `LeaveType` enum matching `leave-types.ts`.

  Mutation-checked: without `FOR UPDATE`, the lock test fails.
**Key files:** `prisma/schema.prisma`, `prisma/migrations/*`, `src/server/{db,mappers}.ts`, `tests/integration/{lock-users,schema-rules,mappers}.test.ts`, `tests/integration/helpers/create-user.ts`, `vitest.config.mts`
**Simplicity pass:**
- Named the test-table tuples with destructuring instead of `start[0]`.
- Added a single shared `createUser` test helper instead of three copies.
- No write mapper for bookings yet: T12/T22 add one when they need it.
- `mappers.ts` imports `server-only` like the rest of `src/server`.
**Deviations from plan:**
- **The Better Auth CLI moved.** `@better-auth/cli` is deprecated, and the CLI is now the `auth` package (same version as `better-auth`). Better Auth isn't installed in the repo; that's still T11.
- **PascalCase auth tables.** The CLI adds `@@map("user")` and similar lower-case table names. I dropped them so every table is named like its model. That's also what the plan's raw SQL (`"User"`) expects. Better Auth's Prisma adapter uses model names, so nothing changes for it.
- **`lockUsers` sorts in SQL, not JavaScript.** The plan said "sort the ids, then `… WHERE id = ANY(ids) FOR UPDATE`". Postgres locks rows in the order it reads them, not the array's order, so sorting the array doesn't prevent deadlocks. `ORDER BY id FOR UPDATE` does, in one line. Architecture §3.2 is updated.
- **Integration tests run in `Europe/London`** (`TZ` in `vitest.config.mts`). CI runs in UTC, where a date shifted through local time would still look right, so the date round-trip test would prove nothing there.
- **Migrations were made against the in-memory test DB,** so no agent ran anything destructive on the dev DB. The acceptance check "`pnpm db:reset` applies cleanly" was checked the equivalent way, because Prisma blocks `migrate reset` for agents: on a freshly emptied test DB, `migrate deploy` applied both migrations, and `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` exited 0 ("No difference detected").
**Follow-ups:**
- **Product owner:** your dev DB (:5432) still has the old T02 migration. Run `pnpm db:reset` once yourself (Prisma lets a human do it), or `pnpm db:migrate` will report drift.
- **T11:** pin `better-auth` 1.7.23 to match the generated tables, and declare `user.additionalFields` with the column names in `schema.prisma`.
- **T12/T22:** writing a booking (`NewBooking` → Prisma data with `toDbDate`) belongs in `mappers.ts` too.
- **T27:** `toPatternColumns` is ready for saving patterns.
**Questions for the product owner:** none.

## T11 — Better Auth, SSO profile sync, roles, dev sign-in and session guard — 2026-11-14
**Status:** done
**Summary:**
- **Better Auth 1.7.23** (pinned to match the T10 tables) in `src/server/auth.ts`:
  - Prisma adapter; email/password off;
  - `role`, `businessUnitId` and `teamId` as `additionalFields` (`input: false`);
  - 12-hour sessions;
  - `genericOAuth` only when all three `SSO_*` variables are set (`ssoConfigured` in `env.ts`);
  - `nextCookies()` last. Mounted at `/api/auth/[...all]`.
- **Shared pieces:**
  - `computeRole` in `src/domain/roles.ts`;
  - `mapSsoClaims` in `src/server/sso-claims.ts`;
  - `ssoProfileSchema` in `src/lib/schemas/sso-profile.ts`.
- **`syncSsoProfile`** in `src/server/auth-sync.ts`:
  - refreshes the name, email, employee number and role at every sign-in;
  - a new user gets the requested BU if it exists, else the only BU, else none;
  - plus the default pattern (`provisionNewUser`, a private stub that T12 extends).
- **Dev sign-in** is a Better Auth plugin endpoint, `POST /api/auth/dev-sign-in` (404 unless `devSignInEnabled`).
  - The `/dev-sign-in` page lists `prisma/seed/dev-sso-profiles.ts` (4 samples) grouped by BU, with role badges and a custom-profile form.
- **Session guard:**
  - `src/server/session.ts`: `getCurrentUser()` (React `cache`), `requireUser()` (redirects to `/sign-in` / `/welcome`) and `requireRole()` (throws `ForbiddenError`, which is now in `errors.ts`);
  - `src/proxy.ts`: an optimistic cookie check;
  - a sign-out server action and `SignOutButton`;
  - a minimal `/sign-in` page.
- **Tests:**
  - **Unit:** 6 role rules, the dev sign-in guard (off in production even when the flag is true), and `ForbiddenError`. 342 unit tests in total.
  - **Integration:** 11 new tests (sync create/update, promote/demote, SUPER_ADMIN, default pattern, BU choice ×4, claims mapping ×3).
  - **E2E:** dev sign-in as admin → `/` → sign out → `/sign-in`; and without a cookie, `/` redirects and `/api/export/attendance` returns 401. The sign-in pages also pass axe in light and dark.
- **Checked by hand on a production build** (`next start` with `DEV_SIGN_IN_ENABLED=true`):
  - `/dev-sign-in` → 404;
  - `POST /api/auth/dev-sign-in` → 404;
  - `/` → 307 to `/sign-in`;
  - `/api/export/attendance` → 401.
**Key files:** `src/server/{auth,auth-sync,dev-sign-in-plugin,session,sso-claims}.ts`, `src/server/actions/{sign-in,sign-out}.ts`, `src/proxy.ts`, `src/domain/roles.ts`, `src/lib/{env.ts,schemas/sso-profile.ts}`, `src/app/{sign-in,dev-sign-in,welcome}/`, `prisma/seed/dev-sso-profiles.ts`, `tests/e2e/auth.spec.ts`, `tests/integration/{auth-sync,sso-claims}.test.ts`, `tests/migrate-test-db.ts`
**Simplicity pass:**
- **One guard flag.** `devSignInEnabled` and `ssoConfigured` are worked out once in `env.ts` and used by the plugin, the pages and the auth config, instead of repeating the conditions.
- **No extra query for the session.** `getCurrentUser` reads role, BU and team straight from Better Auth's session (`additionalFields`).
- **One test-DB setup.** The migrate step is shared by the integration tests and Playwright (moved to `tests/migrate-test-db.ts`).
- **Plain types.** I replaced a `Parameters<typeof …>` type with the plain `SsoProfile`, and spelled out `requireUser`'s return fields instead of spreading and overriding.
**Deviations from plan:**
- **SSO sync runs in `mapProfileToUser`, not an after-sign-in hook.** Better Auth creates the user *before* an after-hook runs, and that insert would fail: `ssoId`, `employeeNumber`, `firstName` and `surname` are required columns it doesn't know. Syncing first creates or refreshes the user with everything, and Better Auth then links the SSO account to it (`trustedProviders: ["sso"]`). The role is still recomputed at every sign-in, before the session is created. **The real SSO path is untested** until there's an identity provider to point at (T37's porting guide should include a manual check).
- **No sliding sessions.** The task said `updateAge` 1 hour. With Better Auth that keeps pushing the expiry forward, so an active session never ends and the role is never recomputed, which breaks spec §1.2's "bounded lifetime". I used `disableSessionRefresh: true`, so everyone signs in again 12 hours after their last sign-in.
- **Dev sign-in is at `/api/auth/dev-sign-in`** (a Better Auth plugin endpoint, which the task allows), so the proxy doesn't need an `/api/dev` exception.
- **`/welcome` is protected, and is a placeholder page.** `requireUser` must redirect there, and typed routes reject a redirect to a page that doesn't exist. It needs a session anyway, so the proxy doesn't exclude it. The gallery (`/dev/*`) is excluded instead, so its e2e tests keep working.
- **BU choice for new users is in T11.** Architecture §5.2 step 3 (requested BU, else the only BU) is in `syncSsoProfile` now, because the dev sign-in body takes `requestedBusinessUnitId`, and the e2e test needs the admin to land on `/`. T12 still adds the cookie, the public holidays and the welcome form (its task file is updated).
- **The proxy returns 401 for `/api/*`** without a cookie, and redirects pages. That's how the acceptance check on `/api/export/attendance` passes before T33 builds the route.
- **`/sign-in` renders per request** (`connection()`). Otherwise the build would bake in whether SSO is configured.
- **Removed `src/app/page.test.tsx`.** The home page is now an async server component that needs a session; the e2e test covers it. The smoke e2e test now checks `/sign-in` and `/dev-sign-in` for axe violations instead of `/`.
- **Integration tests fix `ADMIN_GROUP_NAME` and `SUPER_ADMIN_EMPLOYEE_NUMBERS`** in `vitest.config.mts`, so they don't depend on a developer's `.env` (CI doesn't set them).
- **The auth e2e test inserts the "Finance" BU** with plain `pg` before signing in (seeding is T13).
**Follow-ups:**
- **Product owner:** to try dev sign-in locally, run `pnpm db:reset` first (see T10), then create a "Finance" business unit (e.g. in `pnpm db:studio`) until the seed exists.
- **T12:** pass the cookie's BU into `syncSsoProfile`, extend `provisionNewUser`, and replace `/welcome`.
- **T13:** keep the `dev-sso-profiles.ts` shape; the e2e test's BU insert can go once e2e seeds.
- **T15:** the header will need the display name; add `firstName` / `preferredName` / `surname` to `additionalFields` (or load them) then.
- **T37:** check the real SSO flow by hand, including that `accountSubject` (the default `id` / `sub` claim) is stable.
**Questions for the product owner:** none blocking. Two decisions above are worth a look: 12-hour sessions with no refresh, and the SSO sync timing.

## T12 — Sign-in BU choice, welcome page and new-user provisioning — 2026-11-14
**Status:** done
**Summary:**
- **`/sign-in`** now has:
  - the brand (logo, name, tagline "See who's in, at a glance.") and a centred card;
  - with more than one BU, a labelled select "First time here? Which business unit do you belong to?" (all BUs, hidden ones included) with the hint "Only used the first time you sign in.";
  - "Sign in with SSO" and, in dev, a "Developer sign-in" button. Both save the choice first.
- **The choice cookie** (`src/server/business-unit-choice.ts`):
  - `westcal-requested-bu`: httpOnly, `sameSite=lax`, 10 minutes, `secure` when `BETTER_AUTH_URL` is https;
  - the value is the BU id plus an expiry, HMAC-signed with `BETTER_AUTH_SECRET`;
  - `takeBusinessUnitChoice()` reads it, verifies it and clears it. The SSO path (`mapProfileToUser`) and the dev sign-in actions pass it to `syncSsoProfile`, which only uses it for a new user;
  - in dev, the choice beats the listed profile's own BU.
- **`provisionNewUser`** (`src/server/services/provision-new-user.ts`): the default pattern, plus a PH copy of every public holiday dated today or later. Copies come from `planPublicHolidayCreate` for a one-person snapshot and are saved with `saveBookingChanges`, all inside the sign-up transaction.
- **`saveBookingChanges(tx, changes, actorId)`** (`src/server/services/save-booking-changes.ts`):
  - writes, in this order: remove → create (`createdById ?? actorId`) → shortened updates (`fromSlot`, `updatedById`) → exclusions → unlink;
  - new bookings go through a new `toEventData` mapper.
- **`/welcome`** (replaces the T11 placeholder):
  - radio buttons with no default (a wrong pick can only be undone by a super admin) and Continue;
  - joins the only BU automatically if there's just one;
  - shows a message when there are no BUs;
  - sends people who already have a BU to `/`;
  - `joinFirstBusinessUnit` never changes an existing BU.
- **Tests:**
  - **Integration:** 10 new, 46 in total. They cover:
    - a valid cookie gives that BU;
    - missing, unsigned, BU-swapped, tampered and expired cookies are ignored;
    - a returning user's BU is unchanged;
    - future PHs follow the pattern (none on a Saturday PH, none in the past) and aren't given twice;
    - one `saveBookingChanges` case covering every array.
  - **E2E:** 4 new, 14 in total:
    - no choice with 2 BUs → `/welcome` → pick → `/`;
    - a choice on `/sign-in` → dev sign-in → straight to `/`;
    - axe on `/welcome` and on `/sign-in` with the select (light and dark).
**Key files:** `src/server/{business-unit-choice,auth-sync,mappers}.ts`, `src/server/services/{provision-new-user,save-booking-changes}.ts`, `src/server/queries/business-units.ts`, `src/server/actions/{sign-in,join-business-unit}.ts`, `src/app/{sign-in,welcome}/page.tsx`, `tests/integration/{business-unit-choice,provision-new-user,save-booking-changes}.test.ts`, `tests/e2e/{onboarding.spec,test-db}.ts`, `next.config.ts`
**Simplicity pass:**
- **Plain HTML controls.** A native `<select>` and native radio buttons (labelled, keyboard-accessible, and they submit with the form) instead of the Radix Select and RadioGroup.
- **No new endpoints.** The pages use plain forms posting to server actions.
- **One BU list.** `listBusinessUnits()` is shared by both pages.
- **One test helper.** The e2e BU insert became `ensureBusinessUnits()` instead of two copies.
- **Testable cookie checks.** The sign/verify functions are pure, so the cookie rules are tested without a browser.
**Deviations from plan:**
- **No `actor.isUnassigned`.** `Actor.teamId === null` already means Unassigned (its type comment says so), and the permission tests already cover the unassigned USER. A second field would hold the same fact twice. T17's banner uses `actor.teamId === null` (its task file is updated).
- **`provisionNewUser(tx, userId)` doesn't take the BU.** The BU is set when the user row is created, in the same transaction, using the choice logic T11 added. The result is the same.
- **`saveBookingChanges` takes `actorId`** (for `createdById ?? actorId` and `updatedById`), and is about 30 lines rather than 15.
- **Dev-server fix: `experimental.turbopackFileSystemCacheForDev: false` in `next.config.ts`.**
  - **Symptom:** pages with server actions (`/sign-in`, `/dev-sign-in`, `/welcome`, or any page with a form action) could reload endlessly in `next dev`. The hot-reload server kept sending "HMR hash mismatch" and a Turbopack "restart".
  - **How I found it:** a clean checkout of the T11 commit does it too, so it was already there. T11's e2e tests passed by luck of timing.
  - **What it isn't:** it happens with a do-nothing action, and it isn't the proxy, the React Compiler, typed routes or the dev log file. Webpack dev doesn't do it.
  - **What fixes it:** turning off Turbopack's on-disk dev cache, which is new in Next 16. It's explained in a comment; the only cost is slower dev restarts. Seen on Windows; CI (Linux) never failed. Try removing it after a Next.js upgrade.
- **Brand look from the design system doc.** I didn't open the mockup canvas (it's private to you); the page follows `02-design-system.md` §1.
**Follow-ups:**
- **T13:** the seed creates the BUs. The e2e `ensureBusinessUnits` helper can then go (or stay for test-specific data).
- **Real SSO:** the cookie is read inside Better Auth's callback, which can only be checked by hand with a real identity provider (T37).
**Questions for the product owner:** none.

## T13 — Seed data, dev SSO profiles and the large seed — 2026-11-15
**Status:** done
**Summary:**
- **`pnpm db:seed` / `pnpm db:seed:large`** (`prisma.config.ts` → `tsx --conditions=react-server prisma/seed/index.ts`):
  - takes `--size=default|large` (or `SEED_SIZE`) and `SEED_TODAY` (defaults to today in `APP_TIME_ZONE`);
  - deletes all data first, and refuses to run when `NODE_ENV=production`;
  - uses a fixed faker seed (`fakerEN_GB`).
- **One file per job**, called in order by `seed-database.ts`:
  - `business-units.ts`: West Operations (50 people, 7 teams, 2 Unassigned), North Finance (80, 9) and Corporate Services (70, 8, **hidden**). Large adds South Health (300), East Infrastructure (250) and Central Digital (250).
  - `people.ts`:
    - a user for every dev profile that names a BU, then UK-named fake people (about 4% accented surnames, 5% preferred names);
    - patterns: 75% default, 15% part-time (off Wed / Fri mornings only / off Mon), 5% weekend workers, 5% with a part-time pattern pending from next Sunday;
    - about one day swap per 16 people, within a month of today.
  - `bookings.ts`:
    - −6 to +6 months: full days, half days, AM+PM pairs of different types, and blocks of 2–12 days (some starting PM or ending AM);
    - about 10% of people on leave today, plus a few long parental leave blocks;
    - 15% booked by a teammate or a BU admin;
    - notes from a few words up to exactly 500 characters;
    - every candidate goes through `bookingInputSchema` and `findConflicts` (clashes are skipped) and is saved with `saveBookingChanges`. Unassigned people get none, since they can't book.
  - `public-holidays.ts`:
    - the 24 England and Wales bank holidays for 2025–2027 (`uk-bank-holidays.ts`, checked against gov.uk on 2026-11-14), added in date order with `planPublicHolidayCreate`, so they carve the bookings already there;
    - then two detached copies: someone moved Boxing Day 2026 (Mon 28 Dec) to Tue 29 Dec (`planUserEditsPhCopy` plus a date change), and someone deleted their Early May bank holiday 2027 (`planUserDeletesPhCopy`).
- **Size and speed:** default is 200 people and about 7,050 bookings, PH copies included, in about 2 seconds. Large is 1,000 people and about 35,000 bookings in about 8.5 seconds (target: under 60).
- **Dev profiles** (`prisma/seed/dev-sso-profiles.ts`), all seeded except the last:
  - Grace Adeyemi (SUPER_ADMIN, 100001);
  - Tom Okafor (West Operations admin);
  - Priya Shah (user in a team);
  - Owen Hughes (Unassigned);
  - Fatima Rahman (North Finance admin);
  - Callum Reid (Corporate Services admin);
  - Ana Kowalska (hidden-BU member);
  - Siobhán Ní Bhriain (not seeded: a brand-new person for onboarding).
- **E2E:** Playwright's global setup (`tests/e2e/global-setup.ts`) now migrates and seeds the test DB. The auth and onboarding tests use the seeded people and BUs, and the `ensureBusinessUnits` helper is gone.
- **Tests:** 2 new integration tests:
  - one seed run checks no overlaps for anyone (`findConflicts`), everyone has a pattern, no future PH on a half-day the person doesn't work, every leave type is used, the hidden BU is flagged, and every BU has an admin profile with a matching ADMIN user;
  - two runs with the same `SEED_TODAY` give the same counts and the same first 10 names.
  - Totals: 48 integration and 14 e2e tests.
- **README:** a seed section, the "Seeded accounts" table, and `pnpm db:seed` in the first-run steps.
**Key files:** `prisma/seed/*`, `prisma.config.ts`, `package.json`, `tests/integration/seed.test.ts`, `tests/e2e/global-setup.ts`, `src/app/dev-sign-in/page.tsx`, `src/server/actions/sign-in.ts`, `README.md`
**Simplicity pass:**
- **No hand-written booking or PH rows.** Everything goes through `saveBookingChanges`.
- **Bookings are saved per person,** with that person as the actor, so "booked by someone else" is the only case that sets `createdById`. Simpler than tracking creators for whole batches, and still fast (8.5 seconds for the large seed).
- **One flat config per BU** (name, hidden, size, Unassigned count, teams) instead of a size-scaling formula.
- **A plain field list for profile users** instead of copying the profile and stripping its groups.
**Deviations from plan:**
- **Two new dev dependencies,** both pinned. `@faker-js/faker` 10.6.0 is the library planned in architecture §1. `tsx` 4.23.15 is needed because Node can't run the seed's TypeScript with the project's `@/` paths on its own.
- **`--conditions=react-server`:** the seed reuses app code (`saveBookingChanges`, the mappers, `db`) that imports `server-only`, which only loads under that condition, as it does inside Next.js. Explained in a comment in `prisma.config.ts`.
- **Dev profile shape:** `businessUnit` can now be `null`, for the brand-new profile. The dev sign-in page lists it under "Not in the database yet (first sign-in)" and doesn't request a BU, so it reaches `/welcome`.
- **Holidays after bookings:** holidays are added after the bookings, so the overwrite rules (carving, keeping parental leave, dropping zero-working-day pieces) are exercised exactly as when an admin adds a holiday.
- **Determinism is per day.** The same `SEED_TODAY` gives the same data. A different day shifts the booking window, so the counts change a little.
- **In CI the super admin is seeded as USER,** because CI doesn't set `SUPER_ADMIN_EMPLOYEE_NUMBERS`. The role is recomputed at sign-in anyway, and the integration tests set it.
**Follow-ups:**
- **Product owner:** `pnpm db:reset` (if you haven't since T10), then `pnpm db:seed`.
- **T16+:** the e2e tests can rely on the seeded people and data. The seed runs with the real today, so assert on structure (rows, bars) rather than exact dates, or set `SEED_TODAY` in `tests/e2e/global-setup.ts` and the app's clock together.
- **T19:** use `pnpm db:seed:large` for the performance check.
**Questions for the product owner:** none.
**CI fix (after merge):** the first CI run of T13 failed in `checks`. T09's grid performance test took 106ms under coverage on the shared runner, against a 100ms safety limit; nothing in T13 caused it. The limit is now 250ms, with a comment explaining why. The 25ms developer-machine target is unchanged, and T19 measures real performance.

## T14 — Server action helper, data loading and URL state — 2026-11-15
**Status:** done
**Summary:**
- **`src/domain/errors.ts`:** added `NotFoundError` and `ConflictError` (with `details`).
- **`authedAction(schema, handler)`** in `src/server/authed-action.ts`:
  - steps: `requireUser()` → zod `safeParse` (VALIDATION, with every issue message in `details`) → handler → `refresh()` → `{ ok: true, data }`;
  - thrown `AppError`s become their code (CONFLICT includes `details`);
  - anything else is logged and returned as `INTERNAL` with a generic message;
  - `unstable_rethrow` lets `redirect()` / `notFound()` through.
- **Read functions** (`src/server/queries/`):
  - `getVisibleBusinessUnits(actor)`;
  - `getBusinessUnitBySlug(actor, slug | null)` (null = the person's own BU; `NotFoundError` for a hidden BU they can't view or an unknown slug);
  - `getCalendarData(actor, businessUnit, from, to)`;
  - `pingDatabase()`, used by the health route.
- **nuqs 2.10.3:**
  - `NuqsAdapter` in the root layout;
  - `src/lib/search-params.ts` defines every architecture §6.3 param once (`calendarSearchParams` + `calendarSearchParamsCache`), plus `VIEW_COOKIE`;
  - the `setViewPreference` action (built with `authedAction`) stores the view for a year, and the page reads it as the default view.
- **Client pieces:**
  - `useRefreshOnFocus()`;
  - zustand 5.1.0 `useCalendarStore` (just `announcement` / `announce` for now);
  - `<LiveRegion />` and `<Toaster />` in the new `(app)` layout.
- **Placeholder calendar page** (`src/app/(app)/page.tsx`): view from the URL or cookie, the date from the URL or today, BU from the URL or the person's own. It shows "West Operations, 2026-11-15 to 2026-11-21" and "47 people, 112 bookings".
- **Tests:**
  - **Unit:** 11 new, 353 in total. Every error class maps to its code, invalid input gives VALIDATION without running the handler, and an unexpected error gives INTERNAL without leaking details. The unit project now also includes `src/server/**/*.test.ts`, with the session and `next/cache` mocked.
  - **Integration:** 8 new, 56 in total:
    - USER vs ADMIN Unassigned scoping;
    - range filtering of bookings and public holidays;
    - availability worked out from the returned patterns and overrides, inside and outside the range;
    - hidden BU → `NotFoundError` (and allowed for a super admin);
    - an unknown slug;
    - performance: 300 people × 6 weeks under 150ms on the large seed (passes locally; skipped in CI).
  - **E2E:** 15 in total. The calendar page shows counts, and `?date=2024-06-12` shows the right week with 0 bookings.
**Key files:** `src/server/authed-action.ts`, `src/server/queries/{calendar,business-units,health}.ts`, `src/lib/search-params.ts`, `src/lib/use-refresh-on-focus.ts`, `src/features/calendar/calendar-store.ts`, `src/components/live-region.tsx`, `src/app/(app)/{layout,page}.tsx`, `src/server/actions/set-view-preference.ts`, `src/domain/errors.ts`
**Simplicity pass:**
- **No database calls in actions or pages.** `auth-sync.ts` moved to `src/server/services/`. The join and dev sign-in actions call services and queries (`joinFirstBusinessUnit` now checks the BU exists itself, and there's a new `findBusinessUnitIdByName`). The health route calls `pingDatabase()`.
- **Grep check:** apart from `src/server/queries`, `src/server/services` and `db.ts`, the only file that touches the client is `auth.ts`, which hands it to Better Auth's Prisma adapter.
- **One helper, no variants.** One `authedAction`, no admin variants.
- **One set of parsers,** shared by the server cache and `useQueryStates`.
**Deviations from plan:**
- **People come back with `patterns` and `overrides`, not a lookup or a per-day array.** A lookup function can't be passed from a server page to a client component, and the grid needs availability outside the visible range (T09), so a per-day array for the range isn't enough. The client builds `availabilityLookup(patterns, overrides)`. Architecture §6.1 and T16 are updated. The plan's test "the availability array length equals the number of days" became "availability can be worked out for any day from the returned data".
- **`getCalendarData` takes the BU object** (already permission-checked by `getBusinessUnitBySlug`) instead of an id, and checks `canViewBusinessUnit` again itself, without a query.
- **7 queries, not "at most 5".** They are teams, users, patterns, overrides, bookings, holidays, and the viewer's collapsed groups. Prisma loads each relation with its own query, and single-query joins (`relationJoins`) are still a preview feature. The queries run at the same time, and the performance test shows 300 people × 6 weeks comfortably under 150ms.
- **No UNAUTHENTICATED result.** A signed-out action call is redirected to `/sign-in` by `requireUser`, as pages are, instead of returning an error result.
- **Pre-sign-in exceptions.** "Every query and service takes the actor" holds except for the sign-in path, which runs before there is an actor: `syncSsoProfile`, `joinFirstBusinessUnit`, `listBusinessUnits`, `findBusinessUnitIdByName`, `provisionNewUser`, and `saveBookingChanges` (which takes `actorId`).
- **The test helper `createUser(id, { businessUnitId, teamId })`** now takes an options object.
**Follow-ups:**
- **T15:** use `getVisibleBusinessUnits` for the BU switcher, and `setViewPreference` when the view changes.
- **T16:** see the note in its task file about building the lookup and `canEdit` on the client.
- **T34:** a `NotFoundError` from the page (e.g. `?bu=` a hidden BU) currently shows the default error page.
**Questions for the product owner:** none.

## T15 — App shell and header navigation — 2026-11-15
**Status:** done
**Summary:**
- **`(app)/layout.tsx`:**
  - `requireUser()`, a "Skip to calendar" link (to `#main`), the header, a thin progress bar, and `<main id="main">`;
  - `<RefreshOnFocus />` (calls T14's hook once), `<Toaster />` and `<LiveRegion />`.
  - The layout passes the header its defaults (visible BUs, own BU, saved view, today), because a layout can't see the URL's search params.
- **Header** (`src/features/calendar/header/`), laid out as in the mockup's App artboard: brand | BU switcher | view toggle · Previous · Month · Year · Next · Today | right-hand group.
  - `AppHeader` (server).
  - `CalendarControls` (client) reads and writes the URL with nuqs (`shallow: false`, inside the shared transition). Switching BU clears the filters. Changing view awaits `setViewPreference` and then updates the URL.
  - `PeriodNav` and `BusinessUnitSwitcher` only take props (testable on their own). The switcher is hidden when there's only one BU, and labels hidden BUs "(hidden)".
  - `useCalendarShortcuts`: Alt+T / Alt+W / Alt+M / Alt+[ / Alt+]. One listener and a `switch` on `event.code`. A comment notes WCAG 2.1.4.
  - `navigation-transition.tsx`: one `useTransition` shared through a small React context. `NavigationProgress` shows a bar under the header, and `PendingArea` dims the page to 60% with `aria-busy`.
- **Sub-header:** an `<h1>` with `formatPeriodTitle`, plus "West Operations · all teams · all people".
- **Browser tab title:** `generateMetadata` gives e.g. "Week of 15 Nov 2026 · West Operations · WestCal" (new `formatDocumentTitlePeriod`).
- **Small additions:**
  - `NativeSelect` (styled `<select>` with a chevron);
  - `anchorForMonthSelection(view, month, year)` in `dates.ts`;
  - `LONG_MONTHS` is exported;
  - `resolveCalendarView(searchParams)` is shared by the page and its title.
- **Tests:**
  - **Unit:** 4 new domain tests.
  - **Component:** 12 in total. PeriodNav's Previous/Next/Today anchors in both views, month/year choices (week view jumps to the week containing the 1st), years ±5, axe; the BU switcher is hidden for one BU and reports the chosen slug.
  - **E2E:** 21 in total:
    - the view is remembered through the cookie;
    - Previous/Next and Alt+] update the title, the tab title and the URL;
    - a USER sees only the two visible BUs, switching BU works, and the super admin also sees "Corporate Services (hidden)";
    - axe in light and dark;
    - at 320px, no sideways page scroll and the controls stay on screen.
**Key files:** `src/app/(app)/{layout,page}.tsx`, `src/features/calendar/header/*`, `src/features/calendar/calendar-view.ts`, `src/components/{native-select,refresh-on-focus}.tsx`, `src/domain/{dates,format}.ts`, `tests/e2e/{header.spec,sign-in}.ts`, `tests/component-setup.ts`
**Simplicity pass:**
- **Native `<select>`s** for BU, month and year, as in the mockup itself: keyboard and screen-reader support for free, with no custom dropdown.
- **One transition, not one per control.** One context instead of syncing `isPending` into the zustand store with an effect.
- **One period resolver.** `resolveCalendarView` is shared by the page and `generateMetadata`.
- **One sign-in helper** (`tests/e2e/sign-in.ts`) instead of copies in three specs.
**Deviations from plan:**
- **No "More" menu yet.** Key (T20) and Export (T33) don't exist, so it would have been an empty menu. The header simply wraps, and at 320px nothing scrolls sideways. T20 builds the More menu with the container query (its task file is updated).
- **`createLoader` instead of `createSearchParamsCache`.** The page and `generateMetadata` both read the params. A loader parses on demand, with no request-scoped cache to set up first.
- **Sign out sits in the user-menu slot** until T26's user menu replaces it.
- **BU switcher test:** the seed has no single-BU user (everyone can see the two visible BUs), so "hidden for a single-BU user" is tested in the component test. The e2e test checks USER vs super admin options instead.
- **The skip link targets `#main`.** T16 can point it straight at the grid.
- **Year list edge case:** if the URL date is more than 5 years away, the Year select can't show that year (it isn't in the ±5 list). Navigation still works. Rare enough to leave.
- **Component tests now clean up after each test** (`tests/component-setup.ts`). Vitest globals are off, so Testing Library's automatic cleanup wasn't running.
- **CI:** `SUPER_ADMIN_EMPLOYEE_NUMBERS: "100001"` was added to the workflow env, so the seeded super admin is a super admin in CI too.
**Follow-ups:**
- **T16:** the grid goes inside `PendingArea`. Point the skip link at the grid.
- **T20:** the More menu and container query.
- **T21:** replace "all teams · all people".
- **T26:** replace the Sign out button with the user menu.
**Questions for the product owner:** none.

## T16 — Grid rendering: week and month, bars, hatching, today, PH markers — 2026-11-15
**Status:** done
**Summary:**
- **`CalendarGrid`** (client, `src/features/calendar/grid/`):
  - builds each person's `availabilityLookup` and the viewer's `canEdit` (via `canEditBookingsFor`), then calls `buildGridModel`;
  - renders a scrolling box (sticky header row and name column, `scroll-padding` for both) holding a `role="grid"` labelled "Team calendar, 15 – 21 November 2026";
  - each row is its own CSS grid with `var(--name-col) repeat(days × 2, minmax(0, 1fr))`, as in the mockup;
  - team groups use `content-visibility: auto`;
  - a view switch re-keys the grid, so it fades in (150ms, `tw-animate-css`).
- **Pieces:**
  - `DayHeader`: weekday, date with the today pill, and a PH chip with a tooltip; its accessible name is the model's full date.
  - `TeamGroupRow`: name, count, "Your team" / "Visible to admins only" (T17 adds collapse).
  - `PersonRow`: sticky rowheader, "You" chip, viewer tint.
  - `GridCell`: hatching for OFF / AM-only / PM-only, the today tint, the crosshair tint in the viewer's row, and its accessible name from the model.
  - `GridBar`: leave colours, ellipsis, square clipped edges, compact month sizes, `pointer-events: none` when narrow, the title, `aria-hidden`, and a forced-colours border.
  - Day-off stripes over multi-day bars.
- **Page:** the T14 counts are replaced by the grid, and the period's data comes from the server, so the first paint shows it. `(app)/loading.tsx` has shape-matched skeletons for the first load.
- **Tokens:** `--name-col` (14.75rem = 236px) and a `bg-bar-hatch` utility. The viewer's name cell uses `bg-me` (the mockup's `--me-solid` has the same value).
- **Tests:**
  - **Component:** 9. They cover:
    - 7 week headers with full-date names and today marked; 30 in November month view;
    - a morning half bar in an even track and an afternoon one in an odd track;
    - a clipped bar with a square start;
    - an OFF cell hatched, including when it's also today;
    - today's cells and the viewer row marked;
    - a PH chip;
    - the roles, and axe.
  - **E2E:** 22. The new grid spec checks today highlighted, the viewer row, month view with bars, and attaches light and dark screenshots to the report. I also compared screenshots against the mockup's App artboard by eye in both views and themes: spacing, colours, radii and type match.
**Key files:** `src/features/calendar/grid/*`, `src/app/(app)/{page,loading}.tsx`, `src/app/globals.css`, `src/server/queries/calendar.ts` (`businessUnitId`, `CalendarData`), `biome.jsonc`, `tests/e2e/{grid,calendar-data}.spec.ts`, `playwright.config.ts`
**Simplicity pass:**
- **No logic in the components.** They map the model to elements.
- **One place for each size difference.** Week vs month sizes are one `compact` flag.
- **Hatching in one place.** A small lookup table maps availability to the hatch class.
- **Small helpers stay with their component** (`todayTint` in the cell file).
**Deviations from plan:**
- **The scroll box is a focusable `<section aria-label="Calendar">`.** Axe's `scrollable-region-focusable` needs keyboard users to be able to scroll it, and cells don't take focus until T18. T18 removes it (its task file is updated).
- **`biome.json` became `biome.jsonc`,** with an override, explained in a comment, that turns off `useSemanticElements` and `useFocusableInteractive` for the grid folder. Those rules want table elements and focusable rows, but the architecture's grid is ARIA roles on divs (each row its own CSS grid), and in the grid pattern only cells take focus.
  - **What went wrong first:** I put a comment into `biome.json`. It isn't valid JSON, so Biome silently fell back to its defaults and reformatted the repo with tabs. I restored every file from git before going on. Nothing reformatted was committed.
- **`cn()` drops classes it thinks clash.** It treats `bg-hatch` and `bg-today` as competing background colours (tailwind-merge), so today's column lost its hatching. `GridCell` now joins its classes plainly, with a comment, and a regression test covers it. **Watch for this** wherever a custom `bg-*` utility is combined with a background colour.
- **Day header text isn't `aria-hidden`.** Axe's `empty-table-header` wants visible text in a header; the `aria-label` still gives the full date.
- **E2E timing:** Playwright's `expect` timeout is now 15s, and `signInAs` waits up to 30s, because the dev server compiles each page the first time a test opens it (slower since T12 turned off Turbopack's disk cache). The `calendar-data` spec now checks booking bars instead of the old counts.
- **No Lighthouse CLS run.** The grid is server-rendered on first paint with fixed row heights, and the skeleton matches the layout, so there's nothing to shift. A Lighthouse pass belongs with T19 (performance) and T35.
**Follow-ups:**
- **T17:** collapse button and admin name links in `TeamGroupRow` and `PersonRow`.
- **T18:** roving tabindex on `GridCell`, remove the section's `tabIndex`, retarget the skip link.
- **T25:** bars become interactive.
**Questions for the product owner:** none.
