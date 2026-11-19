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
- **No-change check includes pending versions.** `planPatternChange` compares against the pattern in force from next Sunday *including* any pending version. So changing back to the current pattern after saving a pending one still saves (it overwrites the pending version). *(Reversed in T27: it now compares against the pattern in force today, so saving today's pattern again cancels the pending change.)*
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

## T17 — Team groups: ordering, collapse persistence, Unassigned, admin links — 2026-11-15
**Status:** done
**Summary:**
- **Collapsible teams:**
  - each team row is a disclosure button (`aria-expanded`, `aria-controls` → its rowgroup), labelled e.g. "Service Design, 6 people, your team";
  - only the chevron turns (150ms);
  - the live region says "Service Design collapsed, 6 people hidden.";
  - the `setTeamCollapsed({ groupId, collapsed })` action calls the `saveTeamCollapsed` service, which updates `User.collapsedTeamIds` ("unassigned" for the Unassigned group);
  - the grid shows the click at once with React's `useOptimistic`, and the first paint comes from the server, so there's no flicker.
- **Ordering** comes from the T09 model (own team first, then admin order, then Unassigned for admins). The e2e test checks it with the seed: Tom sees Finance Operations first and Unassigned last.
- **Admin name links:** for admins of the BU shown, names are links that add `?person=<id>` and keep the rest of the URL (`serializeCalendarParams`, a nuqs serializer next to the other URL params). Regular users get plain text.
- **Unassigned banner:** "An admin needs to add you to a team before you can book." Dismissing it sets a session cookie (`dismissUnassignedBanner`), so it stays hidden until the browser closes.
- **Empty states:**
  - a BU with no teams says so; admins get an "Admin › Teams" link (`?admin=teams`) and still see their Unassigned people;
  - an expanded empty team says "No one in this team yet".
- **Small additions:** `formatPeople` ("1 person" / "6 people") and `withGroupCollapsed` in the domain; `--team-row-height` / `--person-row-height` in `globals.css`.
- **Tests:**
  - **Unit:** 7 new (396 unit and component tests in total).
  - **Component:** 10 new in `team-groups.test.tsx`:
    - a collapse shows at once and calls the action;
    - after the refresh the team stays collapsed;
    - a failed save springs back with a toast;
    - `aria-controls` points at the right rowgroup;
    - no Unassigned group and no links for a user;
    - admin order and link hrefs;
    - both empty states;
    - axe.
  - **Integration:** 4 new (60 in total): saving, expanding again, the same choice twice, and only the actor's own row changes.
  - **E2E:** 4 new (26 in total):
    - collapse, reload, still collapsed;
    - an admin sees Unassigned last and clickable names;
    - a user sees neither;
    - the unassigned user sees the banner without their own row, dismisses it, and it stays gone after a reload (with axe).
**Key files:** `src/features/calendar/grid/{calendar-grid,team-group,team-group-row,person-row,no-teams-message}.tsx`, `src/features/calendar/unassigned-banner.tsx`, `src/server/actions/{set-team-collapsed,dismiss-unassigned-banner}.ts`, `src/server/services/save-team-collapsed.ts`, `src/lib/search-params.ts`, `src/domain/{grid-model,format}.ts`, `src/app/(app)/page.tsx`, `src/app/globals.css`, `tests/e2e/team-groups.spec.ts`, `tests/integration/save-team-collapsed.test.ts`
**Simplicity pass** (my own re-read, then `/simplify`):
- **One collapse rule:** `withGroupCollapsed` is shared by the grid and the service, instead of two copies of the add/remove logic.
- **`useOptimistic` instead of `useState`:** it follows the server after each refresh and springs back if a save fails, so it isn't copied client state (rule 6). The banner uses the same pattern.
- **Typed links:** links are built with nuqs's `createSerializer(calendarSearchParams)`, not a hand-written URL helper, so `{ admin: "team" }` is a type error.
- **Plain flags, no callbacks:** `canOpenProfile` / `canManage` booleans instead of passing an href callback through two components.
- **Row heights in one place:** CSS variables used by the row classes and by the group's placeholder height.
- **A plain label:** the team label is built with plain `if`s instead of filter/join.
- **Comments:** removed a stale comment and two that repeated each other.
**Deviations from plan:**
- **`setTeamCollapsed({ groupId, collapsed })` instead of `toggleTeamCollapsed(id)`.** It states the new value, so a repeat (two tabs, a retry) can't flip it back. The task file has an "as built" note.
- **`useOptimistic` instead of "one `useState`".** A React built-in that does the same job better (see above).
- **Who sees the banner:** the rule is "can't book for themselves" (`!canEditBookingsFor(actor, actor)`), which is exactly the unassigned USER. An unassigned *admin* can still book anyone in their BU (spec §5.3), so the banner would be wrong for them. They see the Unassigned group, including themselves, like any admin.
- **"Dismissible for the session"** means the browser session: a cookie with no expiry, set by a server action, read by the page (no flicker).
- **No empty note under Unassigned.** An empty Unassigned group only shows its header ("Unassigned, 0 people"), because "No one in this team yet" doesn't fit a group that isn't a team.
- **Per-group placeholder height (fixes a T16 issue).** T16 gave every group a fixed `contain-intrinsic-size: 20rem`. Off-screen groups taller than that overlapped the next group, which axe reported as tiny touch targets once names became links. Each group now reserves its real height (team row + 42px per person), which also stops the scrollbar jumping. Name links have `py-1` (24px targets, WCAG 2.5.8), and the team buttons have real spaces between their parts so the visible text matches the label (WCAG 2.5.3).
- **`grid-model.ts` is 206 lines,** just over the ~200 guide, after adding `withGroupCollapsed` (7 lines). Left as is; split it if it grows.
- **`/simplify` finding skipped:** every collapse click runs `refresh()` (through `authedAction`), so the page reloads its data on the server. `useOptimistic` now relies on that refresh. For a 300-person BU it's a full data payload per click. **T19** should measure it with the large seed, and only then decide whether actions need a way to skip the refresh.
**Follow-ups:**
- **T18:** team buttons and admin name links are in the Tab order (notes added to its task file).
- **T27:** `?person=<id>` is already set by the name links.
- **T29:** "Admin › Teams" links to `?admin=teams`.
- **T35:** after Dismiss, focus falls back to the page; consider moving it to the grid.
**Questions for the product owner:** none blocking. Please check one call: an **unassigned admin** doesn't get the banner (they can book), and appears in the Unassigned group like everyone else there.

## T18 — Grid keyboard navigation and screen-reader model — 2026-11-15
**Status:** done (the manual NVDA check is still to do; see Questions)
**Summary:**
- **Navigation rules** (`src/domain/grid-navigation.ts`, pure and table-tested):
  - `nextCell(layout, current, key)`: arrows stop at the edges; Home/End and Ctrl+Home/End go to the first or last day;
  - `tabStopCell(layout, wanted, start)` picks the one cell in the Tab order:
    - the last focused cell while it's still shown;
    - if its person is hidden, the viewer (or the first person);
    - if its date is gone (a new period), the same weekday;
    - at first, the viewer's row today.
- **The grid:** gridcells and admin name links carry `data-person` / `data-column`, and one `onKeyDown` and one `onFocus` on the grid handle them all (`use-grid-keyboard.ts`, a plain `switch`). The store's `focusedCell` follows clicks and keys.
  - **PageUp/PageDown** change the period through the URL.
  - **`?`** opens the new keyboard shortcuts dialog (`shortcuts-help-dialog.tsx`; `shortcutsHelpOpen` in the store, so T20's Key popover can open it).
- **Focus is never lost:** if a re-render removes the focused element (a new period, a view switch, a filter, fresh data) and focus dropped to `<body>`, it goes to the tab stop. After PageDown on Ben's Tuesday, it lands on Ben's next Tuesday. Focus that has moved elsewhere is left alone.
- **Admin name links** are part of the arrow-key navigation (← from the first day reaches the name). Only one element in the grid is in the Tab order, so Tab doesn't stop on every name. Team collapse buttons stay in the Tab order, as the task says.
- **Visible focus:**
  - an inset 2px ring for everything inside the grid (`[role="grid"] :focus-visible`);
  - `scrollIntoView({ block: "nearest", inline: "nearest" })`, with the existing scroll-padding, so the sticky header and name column never cover the focused cell (2.4.11);
  - the scroll box no longer has `tabIndex`, now that a cell is tabbable (T16 follow-up).
- **Skip link** now jumps to the tab-stop cell (`#calendar-focus`).
- **Announcements:** a period change says "Week of 8 to 14 November 2026" or "November 2026" (`formatPeriodAnnouncement`), however it was changed. Collapse announcements came in T17.
- **Shared Dialog:** `DialogContent` now returns focus to whatever had it when the dialog opened, because Radix only returns it to a `DialogTrigger`. The upcoming dialogs that open from the store or the URL (event form, profile, admin) get this for free.
- **`useCalendarParams()`:** one hook for the URL params (`shallow: false` plus the shared navigation transition), used by the header and the grid.
- **Tests:**
  - **Unit:** 30 new (navigation, tab stop, announcement wording).
  - **Component:** 21 new in `grid-keyboard.test.tsx`, covering:
    - every key;
    - crossing team boundaries, collapsed teams and filtered rows;
    - a click moves the tab stop;
    - Tab goes to the next team button;
    - `?` opens the dialog;
    - PageDown asks for the next week, then focuses the same person and weekday, and announces it;
    - focus recovery when a filter hides the focused person;
    - admin name navigation;
    - axe.
  - **Totals:** 446 unit and component tests.
  - **E2E:** 2 new (28 in total):
    - keyboard only: skip link → today's cell → Home and → to Friday → ↑ to a teammate → PageDown keeps that person and Friday → Tab out to the next team button;
    - `?` opens the shortcuts, which pass axe, and Esc puts focus back on the cell.
**Key files:** `src/domain/grid-navigation.ts`, `src/features/calendar/grid/{use-grid-keyboard.ts,calendar-grid,grid-cell,person-row,team-group,day-header}.tsx`, `src/features/calendar/{calendar-store,use-calendar-params}.ts`, `src/features/calendar/shortcuts-help-dialog.tsx`, `src/components/ui/dialog.tsx`, `src/app/globals.css`, `src/app/(app)/layout.tsx`, `tests/e2e/grid-keyboard.spec.ts`
**Simplicity pass** (my own re-read, then `/simplify`):
- **One focus-recovery rule** ("the focused element is gone and focus is on `<body>`") instead of a special case for period changes. It also covers filters (T21) and refetches.
- **Focus return in the shared `DialogContent`,** not repeated in each dialog.
- **One `useCalendarParams` hook** instead of two copies of the nuqs setup.
- **No extra file for one constant:** `CALENDAR_FOCUS_ID` lives in `grid-cell.tsx` (not a client module, so the server layout can import it).
- **Removed** repeated comments, a comment pointing at the wrong file, and a redundant type.
- **`DayHeaderRow`** moved into `day-header.tsx`, so `CalendarGrid` stays at about 150 lines.
- **Test providers:** three grid test files share `GridTestProviders` (nuqs testing adapter, navigation transition, tooltips).
**Deviations from plan:**
- **`focusedCell` is `{ personId, column }`,** not `{ personId, date }`, because admins' names are a column too. The task file has an "as built" note.
- **Name links are in the arrow navigation, not the Tab order.** Otherwise an admin would Tab through 300 names to leave the grid. Arrow-key navigation follows the APG grid pattern; Home/End still go to days, as the accessibility table says.
- **Enter, Space and Delete aren't handled yet.** The task allowed "does nothing", and a placeholder event would be code T25 throws away (rule 10: no feature flags). T25's task file has the hand-off. The e2e test asserts the keyboard path up to that point instead of "Enter fires an event".
- **No `aria-describedby` on cells:** each cell's `aria-label` already starts with the full date, so the column header would be read twice.
- **"Nearest valid cell" when a person disappears** is the viewer's row (or the first row) on the same column, not the row next to the old one. The old position isn't known once the person has gone from the model, and it keeps the rule simple.
- **Skip link in dev:** in `next dev`, Next's dev tools button is the first Tab stop, so the e2e test starts on the skip link. In production the skip link is first.
- **`/simplify` findings noted for T19, not fixed:** each arrow key re-renders every `PersonRow` function (the compiler should skip their cells; estimated 1–3 ms), and the cell data attributes add HTML size. Both are in T19's task file with what to measure.
**Follow-ups:**
- **T19:** see the notes added to its task file.
- **T20:** open the shortcuts dialog from the Key popover with `setShortcutsHelpOpen(true)`.
- **T21:** focus recovery already handles a filter hiding the focused row (component test included).
- **T25:**
  - add Enter/Space/Delete to the hook's `switch` and to the shortcuts list;
  - give `alert-dialog.tsx` the same focus return as `dialog.tsx` when it's needed.
**Questions for the product owner:**
- **Please do the quick NVDA check** (I can't run a screen reader here):
  1. Tab into the grid and arrow around.
  2. Check that cells read like "Tuesday 17 November, Ben Carter. Annual leave, …" without doubled dates.
  3. Check that Page Down announces "Week of …".

  Then note what you hear here or in `docs/a11y-report.md`.

## T19 — Grid performance check with the large seed — 2026-11-15
**Status:** done. All budgets are met on a production build; no new dependencies.
**Machine:** Intel Core Ultra 7 258V, 32 GB RAM, Windows 11, Node 24.11.1, Chromium (Playwright 1.65).
**Results** (South Health, 300 people, month view, production build, 3 runs):

| Budget | Before T19 | After T19 |
|---|---|---|
| Next month on screen, under 1s | 565 ms | 266–364 ms |
| No long tasks over 50ms while scrolling | none | none (scrolled ~12,900px) |
| Arrow key under 16ms | every press 16–48 ms | no press at 16 ms or more (0 of 40) |

On the dev server (React's slower development build) it's now 702–741 ms to the next month, no long tasks, and at most one 16 ms key press. Before the fix, key presses there took up to 240 ms.

**What was slow, and the fix:**
- **`buildGridModel` ran on every arrow key.**
  - **What I found:** the compiled `CalendarGrid` called it with no cache check.
  - **Why** (the `/simplify` altitude review ran the compiler to confirm): the compiler can't tell the model isn't changed later, so it won't cache it across the hook calls that follow.
  - **Result:** every key press rebuilt the model for 300 people, and all 9,300 cells re-rendered, because every row was a new object.
  - **Fix:** a `useMemo` around the call, with a comment saying why.
- **Every team re-rendered its rows on each key press,** because every team received the new tab stop. Now only the team holding it gets it; the others get `null`, so their rows come back from the compiler's cache.

**Other checks:**
- **Payload:**
  - **HTML:** the first page load is 3.8 MB raw but 142 KB gzipped.
  - **Next-month data (RSC):** 366 KB raw, 43 KB gzipped.
  - **What fills it:** of the raw data, bookings are 275 KB (891 bookings, with notes) and availability patterns only 29 KB.
  - **No change made:** the plan's fix (availability as a short string) would save under 29 KB, and the gzipped size is small. If size ever matters, the booking fields the grid doesn't show (notes, `createdById`) are where the savings are. T25's details popover needs notes, though.
- **Collapse clicks (T17 note):** the click shows at once (`useOptimistic`). The background refresh is the same round trip as a navigation (about 0.3s, 43 KB gzipped), and nothing visible waits for it. Kept as it is: no need for actions to skip `refresh()`.
- **CSS containment:** groups already use `content-visibility: auto` with their real height (T17). The sticky header, name column and keyboard focus still work, and the T18 keyboard tests pass.
- **Hover:** CSS only (`hover:bg-cell-hover`). No state changes on hover.

**Tests:** `tests/e2e/grid-performance.perf.spec.ts`, run with `pnpm test:perf` (its own Playwright project, not part of `pnpm test:e2e`).
- **Setup:** it loads the large seed into the test database.
- **Asserts:** the three budgets, with 1.5× tolerance locally and 3× in CI; and that it really measured 300 rows and scrolled down them.
- **Production:** set `PERF_BASE_URL` to measure a production build; the header comment gives the commands.
- **Nightly CI** builds the app, starts it on :3200 and measures that.
**Key files:** `src/features/calendar/grid/calendar-grid.tsx`, `tests/e2e/grid-performance.perf.spec.ts`, `playwright.config.ts`, `package.json` (`test:perf`), `.github/workflows/ci.yml`, `docs/plan/01-architecture.md` §9
**Simplicity pass** (my own re-read, then `/simplify`):
- **The perf test measures only what it asserts.** The one-off payload numbers are recorded here instead of every night.
- **No clean-up seed:** the next `pnpm test:e2e` re-seeds the default data anyway.
- **One type for the browser-side records.**
- **Reverted my `onToggle` change.** The compiler caches each team's rows separately from its toggle function, so it bought nothing. Re-measured on production afterwards: no slow key presses.
**Deviations from plan:**
- **No per-cell store selector.** The plan's suggested fix can't apply the tab-stop fallbacks (hidden person, new period) without the layout. Two smaller changes in `CalendarGrid` did the job.
- **The perf test signs in on the dev server.** Production turns dev sign-in off, so a production measurement reuses the session cookie on a second server (`PERF_BASE_URL`).
- **Tracing off and key presses 50 ms apart in the perf test.** Playwright's trace copies the whole page around every action, which took longer than the key presses being measured. Presses sent back to back queue behind each other's frames; a held-down key repeats every 33–50 ms.
**Follow-ups:**
- **Running it:** `pnpm test:perf` replaces the test database's data with the large seed. Run it on its own; the next `pnpm test:e2e` puts the default seed back.
- **CI:** the first nightly run will be the first CI run of the production perf check. If it fails only on timing, look at the numbers in its log before raising the tolerance.
**Questions for the product owner:** none.

## T20 — Key popover and keyboard shortcuts help — 2026-11-15
**Status:** done. No new dependencies.
**What I built:**
- **`KeyPopover`** (`src/features/calendar/key/key-popover.tsx`): the header's Key button.
  - **Opening:** on hover (after 150ms), on keyboard focus, and on click or tap. A click pins it open until Esc, a click outside or another click.
  - **Closing:** when the pointer leaves (after 300ms, so the pointer can cross the gap onto the key), or when focus moves on past it.
  - **Content** (`key-content.tsx`): the "Leave types" heading, the 9 leave chips with their names in two columns, the "Not a working day" hatch swatch, the half-day note, and a "Keyboard shortcuts" link that opens the T18 help dialog.
- **`MoreMenu`** (`src/features/calendar/header/more-menu.tsx`): below 720px of header width the Key moves into a "More" dropdown, where it opens as a dialog.
  - **How it switches:** the header is a CSS container (`@container`). Both menus are rendered, and CSS shows one of them (no JavaScript measuring).
  - **Focus:** closing the Key dialog puts focus back on More.
  - **Shortcuts:** the "Keyboard shortcuts" link opens the help dialog on top of the Key dialog, and Esc there comes back to the Key.
- **`LabelledLeaveChip`** (`src/components/leave-chip.tsx`): a chip with its name beside it, with no tooltip. Screen readers hear "AL Annual leave" once, instead of the name twice.

**Manual check: WCAG 1.4.13 and 2.1.1.** I walked through these in Chromium, driving the real page with the pointer and keyboard through a throwaway Playwright script:

| Check | Result |
|---|---|
| Pointer rests on Key | opens |
| Pointer moves slowly across the gap onto the key and stays 600ms | stays open (hoverable) |
| Pointer moves away | closes after the delay |
| Esc while hovering, without moving the pointer | closes (dismissible) |
| Tab onto Key | opens; focus stays on the button |
| Tab again | focus goes to "Keyboard shortcuts" inside the key |
| Esc from there | closes, and focus goes back to Key |
| Enter on Key | pins it; it stays open with the pointer away (persistent) |
| "Keyboard shortcuts" | opens the help dialog; closing it puts focus back on Key |
| Tab past the key | focus moves on to Sign out, and the key closes |
| Click outside a pinned key | closes |
| 320px wide: More › Key | the dialog opens; Esc puts focus back on More |

Everything in the key is reachable and usable by keyboard alone (2.1.1).

**Tests:**
- **Component** (`key-popover.test.tsx`, `more-menu.test.tsx`):
  - it opens on hover, focus and click, stays open while hovered, and closes when the pointer leaves;
  - Esc closes it and keeps focus on the button, or brings focus back from inside the key;
  - Tab moves through the key and on out;
  - a click outside closes it, and a click pins it;
  - the 9 codes and names are listed;
  - the shortcuts link works;
  - axe finds nothing with it open;
  - the More dialog opens and gives focus back.
- **E2E** (`header.spec.ts`):
  - real hover, then Esc;
  - axe with the key open, in both themes;
  - the 320px test now also opens More › Key.

**Key files:** `src/features/calendar/key/key-popover.tsx`, `src/features/calendar/key/key-content.tsx`, `src/features/calendar/header/more-menu.tsx`, `src/features/calendar/header/app-header.tsx`, `src/components/leave-chip.tsx`.
**Simplicity pass** (my own re-read, then `/simplify`):
- **Every way of closing goes through one `close()`.** This also fixed a pending hover timer reopening the key after Esc.
- **One shared chip style** in `leave-chip.tsx`, instead of a second copy.
- **The More test doesn't repeat the leave-type list check.**
- **Kept two things the reviewers questioned:**
  - **The document click-outside listener.** Relying on blur and `:hover` alone fails on touch screens, where `:hover` sticks after a tap.
  - **The check that ignores focus coming back from inside the key.** Without it, Esc would only work because of the order React applies state updates in.

**Deviations from plan:**
- **No Radix Popover or HoverCard.** I tried a controlled Radix Popover first.
  - **Portalled content:** the content goes to the end of the page, so Tab from the button can't reach it.
  - **Content kept inline:** Radix's focus scope always loops Tab inside the content, so with one link in it, Tab could never leave.
  - **HoverCard:** it makes its content unreachable by keyboard on purpose.
  - **What I built instead:** a button plus a positioned `<div>` straight after it (as in the mockup), with two document listeners (Esc and click outside) while it's open. This is about as much code as the Radix version and has no workarounds.
- **No `role="dialog"` on the key.** It's a disclosure: a button with `aria-expanded` and `aria-controls`, and the content right after it. That's simpler and reads in order with a screen reader.
- **Design system §7 lists "HoverCard (Key)".** It isn't used for the Key.

**Follow-ups:**
- **T33:** add Export to the More menu (hand-off note added to the T33 task file).
- **Firefox:** the local Firefox browser isn't installed (`browserType.launch: Executable doesn't exist`), so I only ran the header e2e tests in Chromium. The nightly CI run covers Firefox.
- **After the shortcuts help closes, the key reopens.** Focus goes back to the Key button, which counts as keyboard focus. I think that's right: it's where you were, and Tab or Esc closes it.

**Questions for the product owner:**
- **Please try the Key by hand once:** hover, Tab, Enter and Esc, and the More menu on a narrow window. I checked it with a script driving a real browser, not by hand.

## T21 — Team and person filter builders — 2026-11-15
**Status:** done. No new dependencies. Two decisions made with the product owner, below.
**What I built:**
- **Filters in the header** (`src/features/calendar/filters/`):
  - **`FilterBuilder`:** a button ("Teams", plus a count badge) that opens a popover. Screen readers hear "Teams, 2 selected".
  - **`FilterPanel` (inside the popover):**
    - the chosen ones as chips, each with a "Remove {name}" button;
    - a search box;
    - the list of options (people grouped under their team);
    - Clear and Done buttons.
  - **`CalendarFilters`:** wires up the Teams and People filters.
- **Keyboard:**
  - the search box is a combobox: typing narrows the list, ↑↓ move through it, and Enter ticks or unticks;
  - Esc closes and puts focus back on the button.
- **Filter state:** `useCalendarFilters` (in `use-calendar-params.ts`) updates `?teams=` and `?people=` shallowly. The page already has everyone in the BU, so the grid redraws in the browser with no server round trip.
- **Summary line** (`FilterSummary`): with filters on, the line under the title reads "Filtered: Service Design, Finance Operations · 2 people", with a "Clear filters" button.
- **Empty state:** when the filters match nobody, the grid is replaced by "No one matches these filters." and a Clear filters button.
- **Narrow header:** below 720px, Teams and People move into the More menu next to the Key, and each opens as a dialog. Focus goes back to More when it closes.
- **Domain:**
  - `src/domain/filter-options.ts`: `teamFilterOptions`, `personFilterOptions` and `hasFilters`;
  - `src/domain/teams.ts`: `byAdminOrder` and `UNASSIGNED_GROUP_NAME`, now shared with the grid model;
  - `compareBySurname` in `display-name.ts`, also shared;
  - `formatFilterName` and `formatFilterSummary` in `format.ts`.
- **The header now lives in the page**, not the layout: a layout can't see the URL, so it couldn't know the BU's teams and people (product owner's choice).
  - **The layout** keeps the skip link, toasts and live region.
  - **The page** renders the header, the progress bar and `<main>`.
  - **`loading.tsx`** gained a header-height bar.
  - **`getBusinessUnitBySlug`** is now wrapped in React `cache()`, so moving the header didn't add a query to every period change.

**Filter speed** (production build, South Health, 300 people):

| | Tick a team | Untick (everyone back) |
|---|---|---|
| Week view | 19–27 ms | 25–49 ms |
| Month view | 15–31 ms | 51–77 ms |
| Month view, in the perf test (straight after scrolling the whole grid) | 20–32 ms | 69–127 ms |

- **What the budget covers:** the acceptance criterion is under 50ms. Everything meets it except bringing all 300 people back in month view, which has to draw about 9,300 cells from scratch.
- **The decision:** the product owner chose to accept that rather than keep hidden rows in the page. The perf test checks 50ms for ticking and 100ms for "everyone back".
- **To be clear:** in the perf test (after scrolling) "everyone back" went over 100ms in 2 of 3 runs. It only passes because of the 1.5× local allowance.
- **Arrow keys:** still no press at 16ms or more. The filter arrays from nuqs keep the same identity, so the T19 memo still works.

**Tests:**
- **Unit:** filter options (admin order, grouping, unassigned last, preferred names), `formatFilterName`, `formatFilterSummary`.
- **Component** (`calendar-filters.test.tsx`):
  - the button names;
  - ticking updates the URL;
  - search narrows the list, and the search box has focus on open;
  - ↓ then Enter;
  - chips remove;
  - Clear, Done and Esc return focus;
  - people are grouped by team;
  - axe with it open.
- **Grid** (`calendar-grid.test.tsx`): only the chosen people show; the no-matches message; Clear filters.
- **Focus recovery** (`grid-keyboard.test.tsx`): when a filter hides the focused person, focus moves to the viewer on the same day; focus elsewhere stays put.
- **More menu** (`more-menu.test.tsx`): Teams opens a dialog with focus in the search box.
- **E2E** (`filters.spec.ts`):
  - two teams, then one person from another team (union);
  - the summary line;
  - reload keeps the filters (URL);
  - Clear filters;
  - axe with a filter open, in both themes.
- **Perf** (`grid-performance.perf.spec.ts`):
  - times tick and untick from the click to the frame showing the new rows; Event Timing misses it, because the grid redraws just after the click event ends;
  - a run on the dev build now gets a 2.5× wider allowance, so a plain `pnpm test:perf` doesn't fail just because React's development build is slower;
  - production runs (`PERF_BASE_URL`, nightly CI) keep the real budgets.

**Key files:** `src/features/calendar/filters/*`, `src/features/calendar/use-calendar-params.ts`, `src/app/(app)/page.tsx`, `src/app/(app)/layout.tsx`, `src/features/calendar/header/more-menu.tsx`, `src/domain/filter-options.ts`, `src/domain/teams.ts`.
**Simplicity pass** (my own re-read, then `/simplify`):
- **Rules written once:**
  - one `hasFilters` rule, used by the grid model, the grid and the summary line;
  - one admin-order sort and one "Unassigned" name, in `teams.ts`.
- **One shape for the filters:** the grid model's `filters` now has the URL's shape (`teams`, `people`), so the grid passes it straight through.
- **One condition:** `showGrid` is just "there are groups".
- **Smaller files:** `FilterPanel` is split into `ChosenChips` and `OptionList`, so no function is over about 40 lines.
- **The More dialogs** share one small `MoreDialog`.
- **Kept, with reasons:**
  - **Focusing the search box through a ref.** `autoFocus` worked in the popover but not in the More dialogs: the closing menu took focus back to More, and Radix's focus trap only pulls focus back if it saw focus land inside first.
  - **`aria-label` names** ("Teams, 2 selected") rather than hidden text inside the badge. The hidden-text version came out as "Teams , 1 selected", and browsers differ on that spacing.
  - **The `{" "}` before the badge.** It keeps the visible text "Teams 2", so the name matches it (WCAG 2.5.3, flagged by axe).

**Deviations from plan:**
- **No cmdk / shadcn Command.** cmdk sets `aria-selected` on the highlighted row, which in a multi-select listbox means "selected". So the panel is a plain combobox (search box with `aria-activedescendant`) plus a listbox with `aria-multiselectable`, where `aria-selected` means ticked.
- **Enter ticks; Space types a space.** The task says "Space/Enter to toggle", but focus stays in the search box and team names have spaces in them.
- **Filters don't go to the server.** Architecture §6 said `shallow: false` for filters too, which would mean a server round trip per click (~300ms), against the "under 50ms, no refetch" criterion. §6 is updated.
- **Header moved into the page** (product owner's decision; the folder note in architecture §2 is updated).

**Follow-ups:**
- **T33:** the Export button goes in the wide header group next to the Key, and an Export item in the More menu (hand-off note already in the T33 task file).
- **`src/components/ui/command.tsx`** is now unused by app code.
- **If the "everyone back" time ever matters:** keep filtered-out rows mounted but hidden, rather than removed (the other option in the decision).

**Questions for the product owner:** none.

## T22 — Booking create service: conflicts, Replace and transactions — 2026-11-16
**Status:** done. No new dependencies. No UI yet (that's T24).
**What I built:**
- **`createBooking(actor, input, { replace }, today)`** (`src/server/services/bookings.ts`). It reads top to bottom like the task's list, all in one transaction:
  1. load the person;
  2. `canEditBookingsFor` (FORBIDDEN otherwise; an unassigned USER can't book for anyone);
  3. `validateCreate`, the time window;
  4. `lockUsers`;
  5. load their bookings on those dates, then `findConflicts`;
  6. a clash without Replace throws `conflictError(...)`;
  7. with Replace, `planReplace` goes through `saveBookingChanges`;
  8. insert, with `createdById = updatedById` = the actor and `publicHolidayId = null`;
  9. return `{ id, count }`.
  - **The day count** is worked out after the commit, so the lock isn't held for it.
  - **Someone with no BU yet** gets NOT_FOUND.
- **`createBookingAction`** (`src/server/actions/create-booking.ts`): takes `{ booking, replace }` and returns `{ id, count }`. "Today" is the server's Europe/London date.
- **Clash details:**
  - `ConflictError` now carries `conflicts`: each clash's booking id, type, the clashing dates and halves, and a sentence such as "Tom Okafor already has Annual leave from Thu 20 Jun (afternoon) to Fri 21 Jun.";
  - `conflictError()` in `src/domain/conflicts.ts` builds it;
  - `authedAction` passes it on as `error.conflicts`; `details` still means validation messages (architecture §6.2 updated).
- **Replace and public holidays:** `planReplace` now detaches any public holiday copy it cuts, with an exclusion and an unlink. That way T23's edit flow gets the same rule.
  - The task said "through `planUserDeletesPhCopy`". I used `planUserEditsPhCopy` for every cut copy. A copy that's only partly cut keeps its other half as an ordinary booking. A copy that's fully cut is removed, and its unlink then does nothing. Either way the person gets the exclusion.
- **Audit line:** each create logs one `console.info` JSON line: event, actor, subject, type, start, end and how many bookings were replaced. No notes.
- **`datesOfRange(range)`** (`src/domain/slots.ts`): the reverse of `rangeOf`. It replaces the same six lines in `changesForPieces`, `saveBookingChanges` and `conflictError`.

**Tests** (integration, `tests/integration/create-booking.test.ts`, 19):
- **Who and when:** a table covering USER self/teammate/other team/yesterday; ADMIN unassigned/other team/other BU/today − 7/today − 8; SUPER_ADMIN; and an unassigned USER.
- **The save itself:** the day count and creator fields; AM and PM bookings of different types on the same day; the audit line has no notes.
- **Clashes:**
  - without Replace, nothing is saved and each clash is listed;
  - with Replace, a long booking is split in two;
  - Replace into the past fails with PAST_LOCKED and nothing changes;
  - a partly replaced public holiday copy is detached.
- **Race:** 10 saves for the same day at once. Exactly 1 wins and 9 get CONFLICT.
  - **Checked by hand:** with `lockUsers` commented out, this test fails every time.
  - **The warm-up:** the test first opens a connection per save. Without that, the first save finishes while the others are still connecting, and the test passed even without the lock.
- **Unit:** `conflictError`, and `planReplace` detaching a public holiday copy.

**Key files:** `src/server/services/bookings.ts`, `src/server/actions/create-booking.ts`, `src/domain/conflicts.ts`, `src/domain/errors.ts`, `src/domain/slots.ts`, `tests/integration/create-booking.test.ts`.
**Simplicity pass** (my own re-read, then `/simplify`):
- **The public holiday rule:** moved from the service into `planReplace`.
- **Fewer queries:**
  - the person is loaded with a narrow `select`;
  - the working pattern and day swaps (only those inside the booking) are loaded after the commit;
  - so a rejected save costs 2 fewer queries.
- **The audit line** uses a one-line `biome-ignore`, the same way the seed script does, instead of allowing `console.info` everywhere.
- **The test file:**
  - the permission table is one line per rule;
  - the inputs a test is about are written out in full;
  - test rows go through the existing mappers.

**Deviations from plan:** `planUserEditsPhCopy` instead of `planUserDeletesPhCopy`, as above. Same result, one rule for both cases.
**Follow-ups:**
- **T23:** follow the same shape (hand-off note in the T23 task file).
- **T24:** the form uses `error.conflicts` and Replace (hand-off note in the T24 task file).
- **T36:** puts this action in the permission matrix.

**Questions for the product owner:** none.

## T23 — Booking edit, delete, remove day, trim, Undo, PH detach and day swaps — 2026-11-16
**Status:** done. No new dependencies. Server only; the form (T24) and grid actions (T25) come next.
**What I built:**
- **`src/server/services/booking-edits.ts`:** each one starts with the same private `startChange` helper. It finds the booking's owner, checks `canEditBookingsFor`, locks the person, reads the booking again under the lock, then checks `canModify`.
  - **`updateBooking`:**
    - `validateUpdate` (once it has started, only the end and notes);
    - clash check ignoring itself, with Replace as in T22;
    - `planUserUpdatesPhCopy` (detaches a public holiday copy when its type or dates change; editing only the notes keeps it linked);
    - sets `updatedById`.
  - **`deleteBooking`:** `validateDelete`, so only before it starts. A public holiday copy gets an exclusion. It returns `{ booking, publicHolidayId }` for Undo.
  - **`removeBookingDay`:** `planRemoveDay`. A day in the middle splits the booking, and both pieces keep the original creator. A public holiday copy's day removed means it's gone, with an exclusion.
  - **`trimRemainingDays`:** `planTrimRemaining`, so a booking that has started ends yesterday.
- **`restoreBooking`** (Undo, `bookings.ts`):
  - it re-runs the create steps (shared with `createBooking` as `insertBooking`) without Replace;
  - a clash returns CONFLICT with "Couldn't undo — something else is booked there now.";
  - a public holiday copy is linked again and its exclusion removed, if the holiday still exists and the date hasn't passed.
- **`setAvailabilityOverride`** (`src/server/services/availability.ts`):
  - **Permission:** `canEditProfileOf`.
  - **Time rules:** a new day swap follows `validateCreate` (admins can go 7 days back); changing or removing one needs today or later (`validateOverrideChange`).
  - **`null`** removes it.
  - **Public holiday on that date:** `planReconcileForPerson` brings their copy in line, in the same transaction.
- **Six actions,** all through `authedAction`: `updateBookingAction`, `deleteBookingAction`, `restoreBookingAction`, `removeBookingDayAction`, `trimBookingAction` and `setAvailabilityOverrideAction`.
- **Shared pieces:**
  - **`booking-queries.ts`:** `loadPerson` and `loadOverlapping`.
  - **`src/server/audit.ts`:** `logBookingChange`, one JSON line per create, update, delete, restore, remove-day or trim (T22 said to extract it at four).
  - **`src/server/today.ts`:** `serverToday()`. It replaces `todayIn(env.APP_TIME_ZONE)` in four existing files too.
- **New domain rules:**
  - `validateDelete` in `time-rules.ts`;
  - `planUserUpdatesPhCopy` in `public-holidays.ts`.
- **`saveBookingChanges` skips steps with nothing to do.** It runs while the person is locked, so empty statements only made other saves wait.

**Tests:**
- **Integration, `edit-booking.test.ts`:**
  - **A booking that has started:** changing its type → VALIDATION; moving its end later works; trim ends it yesterday; deleting it → PAST_LOCKED.
  - **A past booking** added by an admin within the 7 days: editing or deleting it → PAST_LOCKED.
  - **Who can edit:** a teammate can edit; another team can't.
  - **Clashes and audit:** no clash with itself, but a clash with others, and Replace works; it records who changed it and keeps who created it.
  - **Remove this day:** a middle day leaves 2 bookings with the creator kept; the first day moves the start.
  - **A public holiday copy:**
    - moved, it's detached, and a later admin move of the holiday (the T08 planner, called directly) leaves it alone;
    - editing only its notes keeps it linked;
    - removing its day deletes it with an exclusion;
    - deleting it adds an exclusion, and Undo links it again with no exclusion.
  - **Undo:** it brings a booking back, notes included; after something else was booked there, it returns CONFLICT.
- **Integration, `availability-override.test.ts`:**
  - **Who:** self and an admin can set one; a teammate can't (FORBIDDEN).
  - **Past lock:** a user can't add one for yesterday; an admin can for 7 days back but not 8; nobody can change one whose day has passed; `null` removes it.
  - **Public holidays:** working on a holiday you'd normally have off creates your copy; "not working" removes it; working the morning gives a morning copy.
- **Unit:** `validateDelete` and `planUserUpdatesPhCopy`.
- **Shared test setup** now lives in `tests/integration/helpers/people.ts` (people and teams, `annualLeave`, `insertRow`, `bookingsInDb`, `exclusionsInDb`). `create-booking.test.ts` uses it too.

**Key files:** `src/server/services/booking-edits.ts`, `bookings.ts`, `availability.ts`, `booking-queries.ts`, `src/server/audit.ts`, `src/server/today.ts`, `src/server/actions/*`.
**Simplicity pass** (my own re-read, then `/simplify`):
- **Rules moved into the domain:** "delete only before it starts" became `validateDelete`, and "notes-only keeps a copy linked" became `planUserUpdatesPhCopy`.
- **Less code in `saveBookingChanges`'s callers:** with empty steps skipped, `createBooking` no longer needs its own "only if there are clashes" check.
- **Undo** uses a plain `try/catch`, with the relinking in one small function.
- **The day-swap snapshot** loads only that day's swap.
- **No hand-copied field list:** the delete snapshot is the booking itself.
- **Tests:** an `update()` wrapper; the test-only insert is renamed `insertRow`, so it isn't confused with the service's `insertBooking`.

**Deviations from plan:**
- **`FIELD_LOCKED` is `VALIDATION`.** That's the error the T07 domain already throws for a locked field; there's no separate code.
- **A public holiday copy detaches when its type changes too,** not only its dates. A copy turned into annual leave but still linked would be deleted if an admin later deleted the holiday.
- **Removing a copy's day uses `planUserEditsPhCopy`** alongside `planRemoveDay`. The result is the same as a delete (gone, plus an exclusion).
- **The services are split over 3 files** (`bookings.ts`, `booking-edits.ts`, `availability.ts`) rather than all in `bookings.ts`, to keep each under ~200 lines.

**Follow-ups:** hand-off notes added to T24 (edit mode, locked fields, Delete vs trim, day swaps) and T25 (delete, Undo, remove day, trim).
**Questions for the product owner:** none.

## T24 — Add / edit event dialog — 2026-11-16
**Status:** done. No new dependencies. Nothing opens it from the grid yet (T25). Until then it's in the dev gallery (`/dev/design-system`, "Booking form") with sample data.
**What I built** (`src/features/calendar/event-form/`):
- **`EventFormDialog`:** opened through `eventDialog` in the calendar store (`{ mode: "create", subjectId, date }` or `{ mode: "edit", bookingId }`).
  - **Title and description:** "Add event" / "Edit event", and "For Priya Shah · Service Design".
  - **Narrow screens:** a full-height sheet whose content scrolls, with the buttons kept in view.
- **`EventForm`:** one `useState` object for the values.
  - **Before sending:** `validateForm` uses the shared `bookingInputSchema`, plus "is it a real date" and the earliest start.
  - **Sending:** `saveForm` sends the day swap first, then `createBookingAction` / `updateBookingAction` inside `startTransition`.
  - **Errors:** shown next to each field (with `aria-describedby`), plus a summary.
- **The parts, each in its own file:**
  - **`TypePicker`:** a radio group of 9 cards; arrows move between them.
  - **`DateRangeFields`:** start and end dates. The end follows the start, and the earliest date is `earliestCreatableDate` (`today` when editing). Duration shows for one day, First day / Last day for several. The live day count uses `formatRangeSummary` and `describeExcludedDays` with the person's own availability, in an `<output>` (a polite live region).
  - **`DatePickerField`:** you can type `12/11/2026`, `12 Nov 2026`, `Thu 12 Nov 2026` or `2026-11-12`, or pick from a calendar (en-GB, weeks from Sunday) that hatches the person's days off.
  - **`OverrideFields`:** "I'm working this day" (Full / AM / PM) on a day off, or "I'm not working this day". An admin sees "Tom Okafor is …". Only for people who can change the person's working days (`canEditProfileOf`), only when adding, and the count includes it before saving. "Save availability only" saves it on its own.
  - **`ConflictAlert`:** `role="alert"`, focused, one line per clash, with "Replace it" (sends it again with `replace: true`) and "Change dates" (focuses the start date). The form keeps its values.
  - **`NotesField`:** a 500-character limit (`NOTES_MAX_LENGTH`, shared with the schema). The counter is only read out from 80%.
  - **`EditActions`:** Delete, with an Undo toast for 8 seconds, before the booking starts; "Delete remaining days" once it has.
  - **`BookingHistory`:** "Created by … · when" and "Last changed by … · when" (or "a deleted user").
  - **Small pieces:** `FormFooter` and `ErrorSummary`.
  - **Edit mode:** the fields `allowedEdits` doesn't allow are disabled, with the reason shown.
- **Supporting changes elsewhere:**
  - **Domain:** `formatDateInput`, `parseDateText` and `formatTimestamp` in `format.ts` (one cached `Intl` formatter per time zone); `makeDate`, `toLocalDate` and `fromLocalDate` in `dates.ts`; `NOTES_MAX_LENGTH` in `events.ts`.
  - **Calendar query:** each booking now has `audit` (who created and last changed it, and when, formatted in the app's time zone).
  - **`Button`** now defaults to `type="button"` unless it's `asChild`. The browser default, "submit", made every button inside a form send it (that's how "Replace it" first sent the form without `replace`). Every existing form already marks its submit button.
  - **`SegmentedControl`** gained `disabled`.

**Tests:**
- **Component** (`event-form.test.tsx`, 20):
  - a new booking defaults to the clicked day as annual leave; the end follows the start; Duration vs First/Last day;
  - the live count uses the spec's own examples (Thu–Tue for a Thu/Fri worker is 2 days; Mon–Fri with a Wednesday morning only is 4.5), and an afternoon first day shows in it;
  - the earliest start: a USER can't go before today, an ADMIN can go 7 days back but not 8;
  - a booking that has started: its type and start are locked with the reason shown, it offers "Delete remaining days", it shows its history, and a later end saves;
  - the clash flow: what's there, focus, values kept, Replace, Change dates;
  - day swaps: your own day off, an admin's wording, hidden for a teammate, hidden when editing, and saving the swap on its own;
  - arrows and Space in the type picker; axe when adding and when editing.
- **E2E** (`event-form.spec.ts`, on the gallery):
  - axe in both themes, adding and editing;
  - the arrow keys choose a type;
  - at 320px it fills the screen, the buttons are in view, and axe passes.
- **Unit:** typed date parsing, input formatting, timestamps (summer and winter), and local-date round trips.
- **Screenshots** in light, dark, edit mode, the calendar popup and at 320px, compared with the mockup's EventDialog. It matches.

**Key files:** `src/features/calendar/event-form/*`, `src/domain/format.ts`, `src/domain/dates.ts`, `src/server/queries/calendar.ts`, `src/components/ui/button.tsx`.
**Simplicity pass** (my own re-read, then `/simplify`):
- **`EventForm` is ~100 lines.** The footer, error summary and history are their own components, with no nested ternary.
- **One availability rule:** the day count builds the planned day swaps and uses `availabilityLookup`, rather than restating "a swap wins".
- **The date field** keeps just a draft of what's typed.
- **Shared code instead of copies:** the date helpers (`makeDate`, local dates), the notes limit and the "Unassigned" name; `formatTimestamp` formats with one shared formatter.
- **Edit actions** are one button.
- **Explicit branches** in `findWhatToShow`.
- **The e2e arrow test** waits for the type to be picked rather than a fixed delay.

**Deviations from plan:**
- **Saving just a day swap** uses its own "Save availability only" button, because the form always has a type chosen.
- **Day swaps aren't offered in edit mode,** because there's no "clicked date".
- **Arrows in the type picker:** Radix picks the type the arrow lands on only while the key is still held. Real key presses are; Playwright's `press()` isn't, so the e2e test holds the key until it's picked. The component test (in a fake browser) checks that the arrow moves focus and Space picks.
- **Delete with Undo is in the form already.** T25's confirmation, announcement and focus handling should go into one shared helper (hand-off note in T25).

**Follow-ups:**
- **T25:** open the form from the grid, retire the gallery demo, and share delete/Undo (notes in the T25 task file).
- **Optional tidy-ups the reviewers raised:**
  - use the `ui/field` components for the form's labels and errors (the 13px label style is written 5 times);
  - one shared test-data file for the calendar tests (the same `CalendarData` setup is now in 5 places).

**Questions for the product owner:**
- **Please try the form in the gallery** (`/dev/design-system` → "Booking form"): adding, editing, the calendar popup, typing dates, and a narrow window.

## T25 — Grid interactions, grow animation and Undo — 2026-11-17
**Status:** done. No new dependencies. Phase 4 (bookings) is complete.
**What I built:**
- **Clicking or pressing Enter / Space on a day** (`grid/use-cell-actions.ts`, one `onClick` on the grid like the T18 keyboard handler):
  - an empty day you can book on opens Add event;
  - anything else opens the **cell menu**: each booking that day (chip, type, "Mon 16 – Wed 18 · 3 days") with View, and Edit when allowed; "Add to morning" / "Add to afternoon" for a free half; "Set availability for this day" (opens the form, which has the day swap options);
  - a day you can't book on (another team, the past, an unassigned viewer) only offers View, or says "Nothing booked."
- **Clicking a bar** opens the **booking details**: type, dates and count, notes, "Created by / Last changed by", then Edit, Delete, "Remove this day (Tue 17 Nov)" and "Delete remaining days" as permitted. Both live in one popover (`grid-popover/`), anchored to the day's cell. Esc or a click outside closes it, and focus goes back to the cell.
- **Delete** (`booking-actions.ts`, shared by the form and the popover, as T24 asked):
  - a single day goes at once; several days ask first: "Delete Annual leave, Mon 16 – Wed 18 Nov (3 days)?" (`delete-confirm-dialog.tsx`);
  - then a "Booking deleted" toast with **Undo** for 8 seconds. Undo brings it back, grows it in, and puts focus on its first day; a clash shows the server's "Couldn't undo — something else is booked there now.";
  - the **Delete key** on a day with exactly one deletable booking does the same.
- **Grow animation:** a successful create (or Undo) stores `lastCreatedId`; that bar gets `animate-grow` and clears it on `animationend`.
- **Screen reader messages** for every success, e.g. "Annual leave added for Priya Shah, Tuesday 17 to Thursday 19 November, 3 days.", "Booking deleted. Undo available.", "Tue 17 Nov removed from the booking."
- **Focus:** after the form saves, focus is back on the day it opened from; after delete, on the day; after Undo, on the restored booking's first day.
- **Small pieces:**
  - **Domain:** `src/domain/grid-actions.ts` (`findCell`, `canAddOn`, `freeHalves`, `bookingActions`) and `formatShortRange`.
  - **Client:** `grid/describe-cell.ts` (what a day holds and offers, used by clicks, keys and the popover); `grid/cell-elements.ts` (`positionOf`, `findGridCell`, `focusGridCell`, `focusLastCell`, shared with the keyboard hook, whose unused `gridRef` is gone); `CalendarBooking` type in `queries/calendar.ts`.
  - **Store:** `gridPopover`, `deleteConfirmId`, `lastCreatedId`; the form target takes an optional `portion` for "Add to morning / afternoon".
  - **Shortcuts dialog** lists Enter / Space, Delete and Esc.
- **Retired the gallery demo** (`event-form-demo.tsx` and its section); `event-form.spec.ts` now opens the form from the seeded grid.

**Tests:**
- **Unit:** `grid-actions` (each rule as a table row) and `formatShortRange`. `src/domain` is still at 100%.
- **Component** (`grid-interactions.test.tsx`, 17): Add event on a free day but not a past one; the cell menu's contents (free half, View/Edit, View only for another team, nothing for an unassigned viewer); Add to afternoon picks the afternoon; Esc returns focus; details per permission (own future booking, a teammate's started one, another team's); a single-day delete with its toast and Undo; a failed delete's message; the multi-day confirmation from the Delete key, with focus back on the cell; Delete ignored on a booking that has started; the grow class; axe with each popup open. 570 unit and component tests in total.
- **E2E** (`grid-interactions.spec.ts`, 11, plus 4 in `event-form.spec.ts`): book Tue–Thu by clicking (grows once, "AL · N days", focus back, still there after a reload); AM AL + PM FL on one day; a clash then Replace; an admin moves the end of a booking that has started; Remove this day leaves two bars; Delete then Undo; the keyboard-only version (book, menu, details, Esc, Delete, confirm); a teammate's day can be booked, another team's only viewed; a second browser sees a new booking after a focus event; axe with the menu, details and confirmation open in both themes. The whole Chromium suite passes (49).
  - Each booking test uses its **own empty week 30–43 weeks ahead** (`tests/e2e/grid-helpers.ts`), so tests can't clash with each other or the seed. The admin test books for Owen (Unassigned, so the seed gives him nothing). The helpers import `@/domain/dates`, which Playwright resolves.

**Key files:** `src/features/calendar/{booking-actions.ts,delete-confirm-dialog.tsx,calendar-store.ts}`, `src/features/calendar/grid-popover/*`, `src/features/calendar/grid/{use-cell-actions,describe-cell,cell-elements,use-grid-keyboard}.ts`, `src/features/calendar/grid/{calendar-grid,grid-bar}.tsx`, `src/features/calendar/event-form/{edit-actions,save-form,event-form}.tsx`, `src/domain/grid-actions.ts`, `tests/e2e/{grid-interactions.spec,event-form.spec,grid-helpers}.ts`.
**Simplicity pass** (my own re-read, then `/simplify` with four reviewers):
- **One description of a day** (`describeCell`) instead of the same booking lookup and rules written in both the click handler and the popover; it reuses the model's display name.
- **One popover, one confirmation dialog** rendered once by the grid, not one per cell.
- **Delete, Undo and trim written once** for the form and the grid; the form's `EditActions` and `FormFooter` lost their `onDone` plumbing.
- **Plain code:** no half-filled `notSaved` object in `save-form.ts`; `savedMessage` counts the days itself; plain `if`s for the form's portion and the confirmation's open state; one store subscription per bar (about 900 of them); the e2e date helpers use the app's own `addDays` / `startOfWeek` / `todayIn`.
- **Skipped, with reasons:**
  - **Focus return through "whatever had focus" in the popup primitives** (an altitude reviewer's idea): a bar click has no focused opener, and the popover's Delete button is gone before the confirmation closes, so both would still need the cell. The two grid popups use `focusLastCell` instead (task file "As built").
  - **Exposing the day count on the grid model** to save recounting in the popup: it runs once per open, and `grid-model.ts` is already at the ~200 line guide.
  - **Moving the form's save message into `booking-actions.ts`:** the form closes through its own dialog (`onDone`), so it stays in `EventForm`.
  - **`formatShortRange`**, though similar to the other range formatters: it's the task's exact confirmation wording.

**Deviations from plan:**
- **The popover points at the day's cell, not the bar,** and "Remove this day" uses that day, with no date select (task file "As built").
- **Keyboard Delete only acts on a booking that hasn't started.** One that has started needs "Delete remaining days", which is in its details.
- **From the form, the multi-day confirmation opens on top of the form,** and Cancel returns to it.
- **Undo also animates** the restored bar ("back in place"); the spec only says new bookings grow.
- **Component axe checks of a modal look at the dialog only:** happy-dom misreads the page that a Radix modal hides. The e2e tests check the whole page in a real browser.

**Follow-ups:**
- **T26:** `signInAs` (tests/e2e/sign-in.ts) waits for the Sign out button; update it when the user menu replaces it.
- **T34/T35:** a booking deleted in another tab and then restored can reopen a stale form target (the form dialog closes itself when its booking disappears, but doesn't clear the store). Rare; worth a look in the polish pass.
- **Tidy-up still open from T24:** one shared `CalendarData` test file (now 6 copies).

**Questions for the product owner:**
- **Please try it by hand:** click a free day, a day with bookings, and a bar; delete and Undo; and the keyboard path (Tab into the grid, Enter, Delete, Esc).
- **Check two calls:** keyboard Delete ignores a booking that has already started, and Undo makes the restored bar grow.

## T26 — User menu and theme selector — 2026-11-18
**Status:** done. No new dependencies. Phase 5 has started.
**What I built:**
- **`UserMenu`** (`src/features/calendar/header/user-menu.tsx`), at the end of the header in place of the Sign out button. It's never moved into More.
  - **The trigger** is the mockup's gradient avatar with initials, labelled "User menu for Tom Okafor, TO".
  - **The header block** shows the name, email and "West Operations · Finance Operations · Admin". Regular users get no role label.
  - **Theme:** a Light / Dark / System row (`menuitemradio` items in a group labelled "Theme"). next-themes remembers the choice in this browser. Choosing a theme keeps the menu open, so people can flick between them (product owner's request). The buttons have a 4px gap so the focus ring doesn't spill onto the next one.
  - **My profile** links to `?profile=me`; **Admin** (admins and super admins only) links to `?admin=teams`. Nothing reads either param yet (T27, T29).
  - **Sign out** calls the T11 action.
- **`getUserMenuDetails(actor, businessUnitName)`** (`src/server/queries/user-menu.ts`): one small user lookup. It returns the name, initials, email, details line and `canOpenAdmin` (`canManageBusinessUnit` for the person's own BU).
- **Domain:** `initialsOf` (`display-name.ts`) and `roleLabel` (`roles.ts`: "Admin", "Super admin", or nothing).
- **Dropdown menus aren't modal any more** (`src/components/ui/dropdown-menu.tsx` defaults to `modal={false}`). This covers the user menu and More.

**Tests:**
- **Unit:** `initialsOf` and `roleLabel` tables. `src/domain` is still at 100%.
- **Component** (`user-menu.test.tsx`, 11): what it shows; Admin only for admins; the theme group and its current value; choosing Dark sets the class and saves it; the menu stays open after choosing a theme; the link targets keep the calendar's URL; Sign out calls the action; Enter, arrows and Esc; axe.
- **E2E** (`user-menu.spec.ts`, 4): Dark is still on after a reload; an admin sees "· Admin" and the Admin link opens `?admin=teams`; axe with the menu open in both themes. Also new: axe with the More menu open in both themes (`header.spec.ts`).
  - `signInAs` now waits for the user menu, and a new `signOut(page)` helper replaces the old Sign out clicks.
  - The whole Chromium suite passes (55).
- **Screenshots** of the open menu in light and dark match the mockup.

**Key files:** `src/features/calendar/header/{user-menu,app-header}.tsx`, `src/server/queries/user-menu.ts`, `src/domain/{display-name,roles}.ts`, `src/components/ui/dropdown-menu.tsx`, `src/app/(app)/page.tsx`, `tests/e2e/{user-menu.spec,sign-in,header.spec,auth.spec}.ts`.
**Simplicity pass** (my own re-read, then `/simplify` with four reviewers):
- **The theme option is written inline** in the `map`, not as a separate component and props type.
- **The query takes the BU name from the page** rather than looking the BU up again.
- **My profile and Admin are plain links,** built the same way as the grid's profile links, instead of a second way of changing the URL. They also open in a new tab.
- **The non-modal fix is in the shared wrapper,** not on one menu, so More and any later menu get it too.
- **Skipped:**
  - **Running the page's queries in parallel** (`Promise.all`): one small extra lookup, and the page reads top to bottom.
  - **Dropping the admin e2e test** as a repeat of the component tests: it's the only test of the real query's role label and `canOpenAdmin`.
  - **Using shadcn's `Avatar`:** the gradient replaces most of its styles. T27 makes a shared avatar on the third use (note in its task file).

**Deviations from plan:**
- **The label includes the initials** ("User menu for Tom Okafor, TO", not "User menu for Tom Okafor"). Axe's label-in-name rule (WCAG 2.5.3) fails when the visible "TO" isn't in the name, and hiding the initials doesn't help. It's also better for speech users, who can say "click TO". Axe ignores text in brackets, so it's after a comma.
- **The avatar gradient is #4f46e5 → #c2410c** (the light theme's primary and sunset) in both themes. The mockup's #6d64f5 start gives white text only 4.4:1.

**Follow-ups:**
- **T27:** reads `?profile=me`, and moves the avatar into a shared component (note in its task file).
- **T29:** reads `?admin=teams` (note in its task file).
- **T35:** the accessibility statement link goes in this menu (its task file says "user menu footer").

**Questions for the product owner:**
- **Please try the menu by hand:** click the avatar, switch theme and reload, and use the keyboard (Tab to the avatar, Enter, arrows, Esc).
  - Tried: the theme buttons were spaced apart, and the menu now stays open after choosing a theme.
- **Check one call:** the avatar's screen-reader label now ends with the initials ("…, TO").
  - Agreed: keep "User menu for Tom Okafor, TO".

## T27 — Profile dialog: details and working pattern — 2026-11-18
**Status:** done. The product owner approved the screenshots. No new dependencies.
**Decided with the product owner first** (also in the task file): match the Add event dialog's look; the editor shows a *waiting* pattern change; one small preview cell per day; Leave history and Upcoming leave are hidden until T28.
**What I built:**
- **`ProfileDialog`** (`src/features/profile/profile-dialog.tsx`): a modal over the grid, opened by `?profile=me` or `?person=<id>` (the user menu's My profile and the grid's admin name links), with `?tab=details|pattern`.
  - The title is "My profile" or "Priya Shah's profile", and the browser tab title matches ("My profile · WestCal").
  - The header shows the avatar, name, and "BU · team".
  - Closing and switching tabs replace the history entry, so Back closes it. A hard refresh keeps it open.
- **Details tab:** the preferred first name (optional; letters in any alphabet, spaces, hyphens and apostrophes; up to 40; empty clears it). The SSO name, email and employee number are read-only under "Managed by your organisation's directory".
- **Working pattern tab:** a row per day (Sun → Sat), each a `SegmentedControl` radiogroup (Full day / Morning / Afternoon / Not working) with a grid-style preview cell. A waiting change shows as "Your new pattern starts on Sunday 22 November." with "Cancel pending change". Save says "Save — applies from Sunday 22 November".
- **Not allowed:** someone who isn't the person, their BU's admin or a super admin gets no dialog. The toast "You can't view that profile" shows instead, and the param is removed. Nothing about the person is sent.
- **Server:** `getProfile` (query), `updatePreferredName`, `updateWorkingPattern` and `cancelPendingPattern` (services), and three thin actions. Pattern saves lock the person, replace the waiting version, and reconcile public holidays from next Sunday, all in one transaction. The day-swap service now shares the permission check, lock and reconcile with them.
- **Shared:** `InitialsAvatar` (`src/components/initials-avatar.tsx`), now used by the user menu too. `workDaySchema` and `weeklyPatternSchema` are in `src/lib/schemas/availability.ts`. `LONG_DAYS` is exported from `format.ts`, and `HATCH` from `grid-cell.tsx`.

**Tests:**
- **Unit:** `currentAndPendingPattern`, `planPatternChange` (updated, see below) and the preferred name schema.
- **Integration** (`tests/integration/profile.test.ts`, 15):
  - who can change a profile (self, admin of the BU, super admin; not a teammate or another BU's admin) and who gets the data;
  - preferred name save and clear;
  - a change starts next Sunday; saving twice replaces it; saving today's pattern cancels it; Cancel pending change;
  - public holiday copies are removed and added, a deleted one isn't added back, and holidays before Sunday aren't touched.
- **Component** (`profile-dialog.test.tsx`, 17): header; tab fallback until T28; tab in the URL; closing clears the URL; name save, clear and validation; one radiogroup per day; save; waiting notice (own and admin wording); cancel; server error; axe on both tabs.
- **E2E** (`tests/e2e/profile.spec.ts`, 7):
  - My profile from the user menu → name change → the grid shows it → clear it;
  - an admin opens a colleague from a name link → changes their pattern → reload keeps it → Back closes it → Forward and cancel;
  - a USER visiting `?person=` gets no dialog;
  - axe on both tabs in both themes.
  - These use Fatima Rahman and Callum Reid, whom no other test signs in as, so parallel tests don't see the changes.
- **All passing:** `pnpm check` (621), integration (118) and the whole Chromium suite (62).

**Key files:** `src/features/profile/*`, `src/server/queries/profile.ts`, `src/server/services/{availability,profile}.ts`, `src/server/actions/{update-preferred-name,update-working-pattern,cancel-pending-pattern}.ts`, `src/lib/schemas/{profile,availability}.ts`, `src/app/(app)/page.tsx`, `src/server/session.ts`.
**Simplicity pass** (my own re-read, then `/simplify` with four reviewers):
- **The "compare with today's pattern" rule lives in the domain**, not in a database filter in the service.
- **`requireUser` and `getProfile` use `cache()`,** so the profile is loaded once per request, not once for the title and again for the page. Caching `requireUser` also makes the existing `getBusinessUnitBySlug` cache work across the title and page, which it didn't before.
- **Reused what exists:** `LONG_DAYS`, `toPatternColumns` in tests, one `workDaySchema` (also used by the day-swap action), and `user.name` for the SSO name.
- **Smaller fixes:** `pendingPattern` is just the pattern, because a waiting change always starts on `nextChangeDate`. One component test that couldn't fail was dropped, and the `aria-describedby` one-liner was simplified.
- **Skipped:**
  - **Moving `HATCH` into `components/`:** it has two users.
  - **Sharing the dialog's full-screen-on-phones classes with the event form:** this is the second copy, and T29–T31 may make it the fourth.
  - **Bounding the holiday query in the reconcile:** a few rows a year.

**Deviations from plan:**
- **`planPatternChange` now compares with the pattern in force today** (T06 compared with the one from next Sunday, waiting change included). So saving today's pattern again cancels a waiting change instead of saving a copy of today's pattern. Notes added to T06's task file and entry.
- **BU and team are only in the header,** not repeated in the Details list. They come from WestCal, not the directory, so they don't belong under "Managed by your organisation's directory".
- **Saved messages are also read out inside the dialog.** While a modal is open, screen readers can't reach the toast, so the dialog has its own `<output>`.
- **`SegmentedControl` wraps** (`flex-wrap`), so four options fit at 320px. The header and booking form controls get the same reflow.

**Follow-ups:**
- **T28:** add the two tabs (note in its task file).
- **T29/T30:** a third dialog with the same full-screen-on-phones classes; share them when they reach the fourth copy. T30's user rows can use `InitialsAvatar`.
- **Seen but not from this task:** a `pg` warning, "Calling client.query() when the client is already executing a query", appears in the dev server and integration logs. It probably comes from the `Promise.all` in `getCalendarData`. Worth a look in T34.

**Questions for the product owner:**
- **Please approve the look** (screenshots sent in chat) before merging.
  - Approved.

## T28 — Leave history tallies and upcoming leave — 2026-11-19
**Status:** done, waiting for the product owner's approval. No new dependencies.
**Decided with the product owner first** (also in the task file): no seed fixture; the exact numbers are proven in component tests instead. Past bookings go in closed `<details>` sections, one per type. Upcoming leave includes every type.
**What I built:**
- **Leave history tab:**
  - five tally cards (a `<dl>`): "Annual leave · 2026" with "12.5 days taken · 6 days booked", and "Special leave · last 12 months" with "2 days", each with its window's dates;
  - the note "Flexi, sickness, other and working-from-home aren't tallied.";
  - "Past bookings": one `<details>` per type (chip, label, "N bookings"), listing that window's past bookings newest first, each with its dates, working days and the first line of its notes. An empty type says "Nothing taken in this period."
- **Upcoming leave tab:**
  - the hint "To change a booking, use the calendar.";
  - month headings, each with a list of bookings (chip and type, dates and days, notes, and an "Ongoing" badge for leave that has started);
  - no buttons; "No upcoming leave." when empty.
- **`leaveSummary`** (domain) builds both tabs' data from `computeTallies`, `historyGroups` and `upcomingBookings`, so the UI does no counting. `Tally` now carries its `window`.
- **`getProfileLeave`** (query): the same permission as `getProfile`. It loads bookings from the start of the rolling 12 months to two years ahead.
- **Formatters:** `formatRangeWithMonth`, `formatDateWindow`, `formatMonthYear` and `formatBookings`.
- **The dialog's tabs** go through `?tab=history|upcoming`, and the line tabs wrap onto two rows on phones.

**Tests:**
- **Unit:** `leaveSummary` (every type present, days per booking, month grouping with ongoing under this month) and the new formatters. The `computeTallies` tests now include the window. `src/domain` is still at 100%.
- **Component** (`leave-tabs.test.tsx`, 14): each card's numbers and window for fixture data covering an annual leave booking across 31 December, half days and the rolling window's first day; the not-tallied note; past bookings newest first with days and notes; empty types; all-empty; upcoming month headings and Ongoing; read-only (no buttons) with the hint; nothing coming up; axe on both tabs. `profile-dialog.test.tsx` now checks `?tab=history` and `?tab=upcoming` open those tabs.
- **Integration** (`profile-leave.test.ts`, 3): only for people who may see the profile; a booking crossing the rolling window's start is loaded and only the part inside counts; upcoming stops at two years.
- **E2E** (`profile.spec.ts`, +5): Callum's history shows all five cards with numbers in the right format and a section opens; Upcoming is in the URL, with the hint and no buttons; axe on both new tabs in both themes.
- **All passing:** `pnpm check` (648), integration (121) and the whole Chromium suite (67).
- **Screenshots** at 1280, 375 and 320px, checked before asking for approval.

**Key files:** `src/domain/{tallies,format}.ts`, `src/server/queries/profile.ts`, `src/features/profile/{history-tab,upcoming-tab,profile-dialog}.tsx`, `src/components/ui/tabs.tsx`, `src/app/(app)/page.tsx`, `tests/integration/profile-leave.test.ts`, `tests/e2e/profile.spec.ts`.
**Simplicity pass** (my own re-read, then `/simplify` with four reviewers):
- **The wrapping lives in the tabs component's `line` variant,** not as overrides in the dialog that fought the component's own height classes.
- **The bookings load from the rolling window's start.** That start is never later than 1 January, so the query doesn't need to compare the two windows.
- **"N bookings" is in `format.ts`** with its siblings `formatCount` and `formatPeople`, with tests. `DateWindow` stays private to `tallies.ts`.
- **Skipped:**
  - **Dropping the permission check from `getProfileLeave`** because the page already has the profile: the task asks for the check in the query, and it's free (`getProfile` is cached).
  - **A named option instead of `formatRangeDates`' true/false:** it's a private helper behind two named functions.
  - **Reusing `loadOverlapping`** (services, transaction-scoped) for the bookings filter, and **bounding the day swaps query** (a booking can start before the window; the grid loads them all too).
  - **Keeping empty groups in `historyGroups`** so `leaveSummary` could pair the lists by position: matching by type is plainer.

**Deviations from plan:**
- **No seed fixture with expected numbers** (see above).
- **List lines always show the month** ("Wed 19 – Thu 20 Nov · 2 days"), unlike the booking form's summary, because the list has no dates on screen to say which month.
- **The day count on each line is the whole booking.** The tally counts only the part inside its window, so a booking that crosses the window's start shows more days than it adds to the tally.

**Follow-ups:**
- **Flaky test:** `event-form.test.tsx` "Replace it" (a `waitFor` on `createBookingAction`, 1 second by default) fails under the full suite's load, more often with a dev server running, and passes alone. Worth a look in T34.

**Questions for the product owner:**
- **Please approve the look** (screenshots sent in chat) before merging.