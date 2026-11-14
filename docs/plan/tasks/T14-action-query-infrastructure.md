# T14 — Server action helper, data loading and URL state

**Phase:** 2 · **Depends on:** T13 · **Size:** M

## Goal
The small amount of plumbing every UI task uses: one helper for safe server actions, scoped read functions, and URL state. It follows the single data pattern in architecture §6: **server component loads → client shows → action changes and calls `refresh()`**.

## Read first
- `01-architecture.md` §4, §6 (all of it)
- `04-code-style.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, `02-guides/server-actions.md`, `02-guides/data-security.md`, `03-api-reference/04-functions/refresh.md`
- The nuqs v2 docs (Next app adapter, `createSearchParamsCache`, `parseAsArrayOf`, `parseAsStringLiteral`, the `shallow` and `history` options)

## Deliverables
1. **`src/domain/errors.ts`:** already exists (T07) with `AppError` (every error has a `code`), `ValidationError` and `PastLockedError`. Add `ForbiddenError`, `NotFoundError` and `ConflictError` (with details) in the same style. They're shared by every service.
2. **`src/server/authed-action.ts`:** `authedAction(schema, handler)` (architecture §6.2). It's one function, about 40 lines:
   - `requireUser()` → zod parse → handler → `refresh()` → `{ ok: true, data }`;
   - maps the error classes above (and zod errors) to codes;
   - logs unexpected errors with `console.error` and returns `INTERNAL` without leaking details.
   - Role checks happen inside each service through the domain permission functions. Don't make separate `adminAction` / `superAdminAction` variants.
3. **Read functions** in `src/server/queries/` (`server-only`), one file per area:
   - `business-units.ts`: `getVisibleBusinessUnits(actor)`, `getBusinessUnitBySlug(actor, slug)` (throws `NotFoundError` for hidden BUs the actor can't view);
   - `calendar.ts`: `getCalendarData(actor, buId, from, to)`, returning the architecture §6.1 object. Use **at most 5 queries**, selecting only the columns needed. Give each person an `availabilityLookup(versions, overrides)` (T06), which is what `buildGridModel` expects.
4. **nuqs:**
   - `NuqsAdapter` in the root layout.
   - `src/lib/search-params.ts`: the parsers from architecture §6.3, used by both `createSearchParamsCache` (server) and `useQueryStates` (client). Define them once.
   - `setViewPreference` server action that writes the `westcal-view` cookie. The page reads it as the `view` default.
5. **`useRefreshOnFocus()`** in `src/lib/use-refresh-on-focus.ts`: calls `router.refresh()` on the window `focus` event. It's about 10 lines.
6. **Shared UI:**
   - `<Toaster />` (sonner) in the app layout.
   - `<LiveRegion />`: a visually hidden `aria-live="polite"` element with an `announce(message)` function, stored in the calendar zustand store (`src/features/calendar/calendar-store.ts`, created here with just this field; later tasks add to it).
7. **Placeholder calendar page:** `(app)/page.tsx` calls `getCalendarData` and renders raw counts ("47 people, 112 bookings"), so the wiring can be checked before T16.

## Tests
- Unit: `authedAction` maps each error class to its code; unexpected errors become `INTERNAL`.
- Integration:
  - `getCalendarData` scoping: a USER doesn't receive Unassigned people, but an ADMIN does;
  - a hidden BU gives a non-member `NotFoundError`;
  - the availability array length equals the number of days;
  - performance: 300 people × 42 days returns in under 150ms locally against the large seed (skipped in CI if the large seed isn't loaded).
- E2E: the page shows the counts and they change when the `?date=` param changes.

## Acceptance criteria
- Prisma is only used inside `src/server/queries`, `src/server/services` and `src/server/db.ts`, and every one of those functions takes the `actor` from `requireUser()` (a reviewer greps `prisma.` and finds nothing elsewhere).
- No API route exists for calendar data.
