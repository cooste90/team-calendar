# WestCal — Architecture

Read this together with `00-product-spec.md`. This file says **how** the app is built. The spec says **what** it does.

> **Version rule for agents:** this repo runs **Next.js 16.4 / React 19.3 / Tailwind 4.3 / Biome 2.4 / pnpm 10**. APIs differ from older training data. Before using any Next.js API, read the matching guide in `node_modules/next/dist/docs/`. Before adding a package, run `pnpm view <pkg> version` and use the current stable release, then pin it exactly in `package.json` (no `^`).
>
> **Simplicity rule:** the product owner maintains this code by hand. Everything here is chosen to be the simplest thing that works at our scale (up to about 1,000 users). Follow `04-code-style.md`, and don't add libraries or patterns from its "don't use" list.

---

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 App Router, Turbopack, **React Compiler on** (`reactCompiler: true`) | `proxy.ts`, not `middleware.ts` |
| Language | TypeScript, `strict: true` | No extra strictness flags that produce confusing errors |
| Styling | Tailwind CSS v4 (CSS-first `@theme`), `tw-animate-css` | Tokens in `02-design-system.md` |
| Components | shadcn/ui 4.23 (Radix base, "nova" preset), lucide-react | Copy-in components live in `src/components/ui`; they import `cn` from shadcn's `cn` package. Focus styling is one global rule in `globals.css`, not per component |
| Theme | next-themes (`attribute="class"`, light / dark / system) | Remembered in localStorage |
| Animation | Plain CSS transitions and keyframes | No animation library. `motion-reduce:` / `prefers-reduced-motion` turns them off |
| DB | PostgreSQL 17 (Docker locally) | No extensions |
| ORM | **Prisma 7** (7.10.1; npm's `latest` tag points at an 8.0 release candidate, so pin 7.x): `prisma.config.ts`, `prisma-client` generator with `output`, driver adapter `@prisma/adapter-pg` | No Rust engine; env loaded explicitly |
| Auth | Better Auth + Prisma adapter; `genericOAuth` plugin for corporate SSO; dev-only sign-in endpoint | §5 |
| Validation | zod v4. One schema per input in `src/lib/schemas`, shared by forms and server actions | |
| Forms | A plain `<form>` + `useState` for fields that change the UI + the shared zod schema + shadcn Field components | No form library |
| Data loading | Server components load data. Server actions change it and call `refresh()` | No client data cache (§6) |
| URL state | nuqs v2 (`nuqs/adapters/next/app`) | View, date, BU, filters, open dialog and tab |
| Client UI state | zustand: **one** small store, `src/features/calendar/calendar-store.ts` | Focused cell, open event dialog, last-created booking id (for the grow animation) |
| Dates | Own small date module on `"YYYY-MM-DD"` strings plus integer day numbers; `Intl` for "today in Europe/London"; date-fns only where it saves real code | §7 |
| Toasts | sonner (via shadcn) | Undo |
| PDF | `@react-pdf/renderer` in a Route Handler | Geist TTF bundled |
| Seed | `@faker-js/faker` (`en_GB`, fixed seed) | |
| Lint / format | Biome 2.4 (incl. a11y rules, sorted Tailwind classes) | |
| Git hooks | lefthook | pre-commit: Biome on staged files; pre-push: typecheck plus unit tests |
| Tests | Vitest (unit, component, integration), Testing Library, `axe-core` (called directly); Playwright + `@axe-core/playwright` for e2e and a11y | |
| CI | GitHub Actions now; GitLab CI after the production move | §11 |

---

## 2. Folder structure

```
.
├─ docker-compose.yml           # postgres (dev :5432, test :5433)
├─ prisma.config.ts
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/                     # seed entry, generators, uk-bank-holidays.ts, dev-sso-profiles.ts
├─ public/fonts/                # Geist TTF for PDF
├─ src/
│  ├─ app/
│  │  ├─ (auth)/sign-in/page.tsx
│  │  ├─ (auth)/dev-sign-in/page.tsx          # 404 unless DEV_SIGN_IN_ENABLED
│  │  ├─ (auth)/welcome/page.tsx              # first-time BU choice fallback
│  │  ├─ (app)/layout.tsx                     # requires session; skip link; providers (the page renders the header, T21)
│  │  ├─ (app)/page.tsx                       # calendar; also renders the profile/admin dialogs from ?profile= / ?person= / ?admin=
│  │  ├─ api/auth/[...all]/route.ts
│  │  ├─ api/export/attendance/route.ts       # GET PDF
│  │  ├─ api/health/route.ts
│  │  ├─ dev/design-system/page.tsx           # dev-only component gallery (and the booking form demo until T25)
│  │  ├─ layout.tsx, globals.css, error.tsx, not-found.tsx, forbidden.tsx
│  ├─ components/ui/                          # shadcn
│  ├─ components/                             # shared app components (brand/, leave-chip, segmented-control, live-region…)
│  ├─ features/
│  │  ├─ calendar/   (header/, grid/, filters/, key/, event-form/, event-details/, calendar-store.ts)
│  │  ├─ profile/
│  │  ├─ admin/
│  │  └─ export/     (pdf documents)
│  ├─ domain/                                 # PURE TypeScript. No React, Prisma or Next imports.
│  │  ├─ dates.ts, slots.ts, format.ts, availability.ts, counting.ts, events.ts,
│  │  ├─ conflicts.ts, permissions.ts, time-rules.ts, public-holidays.ts,
│  │  ├─ tallies.ts, grid-model.ts, grid-model-types.ts, grid-navigation.ts, leave-types.ts,
│  │  ├─ display-name.ts, filter-options.ts, teams.ts, errors.ts
│  │  └─ __tests__/
│  ├─ server/                                 # `import "server-only"` in every file
│  │  ├─ db.ts                                # Prisma client singleton (adapter-pg) + lockUsers()
│  │  ├─ mappers.ts                           # Prisma rows → domain types (the only place they meet)
│  │  ├─ auth.ts, auth-sync.ts, session.ts    # Better Auth instance, syncSsoProfile, requireUser()
│  │  ├─ queries/                             # read functions, scoped by visibility
│  │  ├─ services/                            # write logic, transactions, calls into domain/
│  │  │                                       #   (bookings.ts, booking-edits.ts, availability.ts, …)
│  │  ├─ actions/                             # "use server" thin wrappers → services
│  │  ├─ audit.ts                             # one JSON log line per booking change
│  │  ├─ today.ts                             # serverToday(): the app's date (APP_TIME_ZONE)
│  │  └─ authed-action.ts                     # authedAction() helper
│  ├─ lib/        (env.ts, search-params.ts, schemas/)   # no utils.ts: shadcn imports `cn` from the `cn` package
│  └─ generated/prisma/                       # Prisma output (gitignored)
├─ tests/
│  ├─ integration/                            # Vitest + real Postgres (test DB)
│  └─ e2e/                                    # Playwright
├─ .github/workflows/ci.yml
├─ biome.jsonc, lefthook.yml, vitest.config.mts, playwright.config.ts
└─ docs/plan/
```

**Layering rule:** `app` → `features` → (`server/actions` | `lib`) → `server/services` → `domain` + `server/db`. `domain/` imports nothing outside itself except `zod`. Client components never import from `server/` except through `server/actions` (server functions).

---

## 3. Data model (Prisma 7)

**As built (T10):** `prisma/schema.prisma` is now the source of truth, with a `///` comment on every model. It matches the sketch below. `Session`, `Account` and `Verification` were generated with the Better Auth CLI (`npx auth generate`, 1.7.23). Their lower-case `@@map` table names were dropped so every table is PascalCase like the rest. Two `CHECK`s are added by hand in the `checks` migration: a `WorkingPattern` starts on a Sunday, and an `Event` doesn't end before it starts. `src/server/mappers.ts` is the only place Prisma rows become domain types. The `User` model **is** the Better Auth user (additional fields).

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
datasource db { provider = "postgresql" }   // url comes from prisma.config.ts

enum Role      { USER ADMIN SUPER_ADMIN }
enum WorkDay   { FULL AM PM OFF }
enum HalfDay   { AM PM }
enum LeaveType { ANNUAL FLEXI SICKNESS SPECIAL PARENTAL WELLBEING OTHER WFH PUBLIC_HOLIDAY }

model BusinessUnit {
  id        String   @id @default(uuid(7))
  name      String   @unique
  slug      String   @unique
  hidden    Boolean  @default(false)
  teams     Team[]
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Team {
  id             String       @id @default(uuid(7))
  businessUnitId String
  businessUnit   BusinessUnit @relation(fields: [businessUnitId], references: [id], onDelete: Restrict)
  name           String
  sortOrder      Int
  members        User[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@unique([businessUnitId, name])
  @@index([businessUnitId, sortOrder])
}

model User {
  id               String        @id                     // Better Auth id
  ssoId            String        @unique
  employeeNumber   String        @unique
  email            String        @unique
  emailVerified    Boolean       @default(true)
  name             String                                // Better Auth required; = "first surname"
  image            String?
  firstName        String
  surname          String
  preferredName    String?
  role             Role          @default(USER)
  businessUnitId   String?                                // null until first-time BU choice
  businessUnit     BusinessUnit? @relation(fields: [businessUnitId], references: [id], onDelete: Restrict)
  teamId           String?                                // null = Unassigned
  team             Team?         @relation(fields: [teamId], references: [id], onDelete: SetNull)
  collapsedTeamIds String[]      @default([])             // includes "unassigned" sentinel
  lastSignInAt     DateTime?
  patterns         WorkingPattern[]
  overrides        AvailabilityOverride[]
  events           Event[]       @relation("EventSubject")
  createdEvents    Event[]       @relation("EventCreatedBy")
  updatedEvents    Event[]       @relation("EventUpdatedBy")
  phExclusions     PublicHolidayExclusion[]
  sessions         Session[]
  accounts         Account[]
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  @@index([businessUnitId, teamId])
  @@index([surname])
}

model WorkingPattern {
  id            String   @id @default(uuid(7))
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  effectiveFrom DateTime @db.Date            // always a Sunday; seed/default = 2000-01-02
  sun           WorkDay
  mon           WorkDay
  tue           WorkDay
  wed           WorkDay
  thu           WorkDay
  fri           WorkDay
  sat           WorkDay
  createdAt     DateTime @default(now())
  @@unique([userId, effectiveFrom])
}

model AvailabilityOverride {
  id     String   @id @default(uuid(7))
  userId String
  user   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date   DateTime @db.Date
  value  WorkDay                              // FULL | AM | PM = working; OFF = not working
  @@unique([userId, date])
}

model PublicHoliday {
  id         String   @id @default(uuid(7))
  date       DateTime @db.Date @unique
  name       String
  events     Event[]
  exclusions PublicHolidayExclusion[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model PublicHolidayExclusion {                  // "this user deliberately deleted/moved this PH"
  userId          String
  publicHolidayId String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  publicHoliday   PublicHoliday @relation(fields: [publicHolidayId], references: [id], onDelete: Cascade)
  @@id([userId, publicHolidayId])
}

model Event {
  id                String         @id @default(uuid(7))
  userId            String                                   // subject (whose calendar)
  user              User           @relation("EventSubject", fields: [userId], references: [id], onDelete: Cascade)
  type              LeaveType
  startDate         DateTime       @db.Date
  startHalf         HalfDay                                  // AM = from morning, PM = afternoon only
  endDate           DateTime       @db.Date
  endHalf           HalfDay                                  // PM = through end of day, AM = morning only
  notes             String?        @db.VarChar(500)
  publicHolidayId   String?                                  // set only on generated PH copies
  publicHoliday     PublicHoliday? @relation(fields: [publicHolidayId], references: [id], onDelete: SetNull)
  createdById       String?
  createdBy         User?          @relation("EventCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById       String?
  updatedBy         User?          @relation("EventUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  @@index([userId, startDate, endDate])
  @@index([startDate, endDate])
  @@index([publicHolidayId])
}
// Session, Account, Verification: as generated by the Better Auth CLI.
```

### 3.1 Half-day slot model (core idea)
Every date has two **slots**: `slot = dayNumber * 2 + (AM ? 0 : 1)`, where `dayNumber` is days since 1970-01-01. A booking covers the inclusive slot range `[start, end]`:

| Booking | startHalf | endHalf |
|---|---|---|
| Single full day | AM | PM |
| Single AM | AM | AM |
| Single PM | PM | PM |
| Thu PM → Tue full | PM | PM |
| Mon full → Fri AM | AM | AM |

**Invariant:** `startSlot ≤ endSlot`. For a multi-day booking, "first day Full" means `startHalf = AM` and "last day Full" means `endHalf = PM`.

### 3.2 No overlapping bookings
Every write that touches someone's bookings follows the same three steps inside one `prisma.$transaction`:
1. **Lock the person:** `await lockUsers(tx, [userId])`. This is a single helper in `src/server/db.ts`: one `SELECT … ORDER BY id FOR UPDATE` on their `User` rows. The `ORDER BY` makes every transaction lock rows in the same order, so two locks never deadlock. A second save for the same person waits until the first one finishes. It's one line of SQL, explained in a comment.
2. **Check:** load their bookings whose dates overlap the new range (a plain Prisma `where: { startDate: { lte: end }, endDate: { gte: start } }`), then call the domain function `findConflicts` for half-day precision. If anything clashes, throw `ConflictError` with the details (§6.2 turns it into `CONFLICT`).
3. **Write.**

That's the whole guarantee. There's no database-level constraint, so the services are the only code allowed to write `Event` rows. A race test in T22 proves it holds.

### 3.3 Deletion semantics
- **Delete user**: events, patterns, overrides, exclusions and sessions cascade. Other people's events they created or changed keep `createdById` / `updatedById = null`, and the UI shows "a deleted user".
- **Delete team**: members get `teamId = null` (Unassigned) inside the same transaction, before the delete.
- **Delete BU**: blocked (`Restrict`) while it has users or teams. The service returns a friendly error.

---

## 4. Permissions

All rules live in pure functions in `src/domain/permissions.ts` and `src/domain/time-rules.ts`. **Server actions and route handlers must call them. Never trust the client.** The UI uses the same functions to hide or disable controls.

```ts
type Actor = { id; role; businessUnitId; teamId };
type Subject = { id; businessUnitId; teamId };

canViewBusinessUnit(actor, bu)                  // member || !bu.hidden || SUPER_ADMIN
canManageBusinessUnit(actor, buId)              // ADMIN of buId || SUPER_ADMIN
canEditBookingsFor(actor, subject)              // spec §5.3
canEditProfileOf(actor, subject)                // self || canManageBusinessUnit(actor, subject.bu)
canManagePublicHolidays(actor)                  // ADMIN || SUPER_ADMIN
canManageBusinessUnits(actor)                   // SUPER_ADMIN
canExport(actor, buId)                          // canManageBusinessUnit
canSeeUnassigned(actor, buId)                   // canManageBusinessUnit

// time-rules.ts (today = Europe/London date)
earliestCreatableDate(role, today)              // USER: today; ADMIN/SA: today-7 (creating only)
classifyBooking(booking, today)                 // "past" | "ongoing" | "future"
canModify(booking, today)                       // not past
allowedEdits(booking, today)                    // "all" | "end-and-notes" | "none"
validateCreate(startDate, role, today)          // throws PastLockedError
validateUpdate(before, after, today)            // throws PastLockedError / ValidationError
```

A permission matrix test (T36) runs every server action against every role and relationship.

---

## 5. Authentication

### 5.1 Production (porting target)
- Better Auth `genericOAuth` plugin, configured from env: `SSO_DISCOVERY_URL`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_SCOPES`.
- A claim mapping function (one file, `src/server/sso-claims.ts`) turns the provider's claims into `SsoProfile { ssoId, employeeNumber, firstName, surname, email, formalGroups[] }`. Porting means editing this one function.

### 5.2 Single provisioning path
`syncSsoProfile(profile, { requestedBusinessUnitId? })` in `src/server/auth-sync.ts`:
1. Upsert the user by `ssoId`, refreshing `firstName`, `surname`, `email`, `employeeNumber` and `name`.
2. Compute the role: `SUPER_ADMIN` if `employeeNumber` ∈ `SUPER_ADMIN_EMPLOYEE_NUMBERS`, else `ADMIN` if `ADMIN_GROUP_NAME` ∈ `formalGroups`, else `USER`.
3. **If the user is new:** set the BU (the requested one if valid, else the only BU, else leave it null so they go to `/welcome`). Create the default working pattern (effectiveFrom `2000-01-02`). Generate future public holidays.
4. Set `lastSignInAt`.

It is called from the Better Auth sign-in hook (OAuth path) **and** from the dev sign-in endpoint, so both paths behave the same.

### 5.3 Development sign-in
- Enabled only when `DEV_SIGN_IN_ENABLED=true` **and** `NODE_ENV !== "production"`. The handler throws otherwise. A unit test checks this guard.
- The `/dev-sign-in` page lists the fake SSO profiles from `prisma/seed/dev-sso-profiles.ts`, labelled with role, BU and team. A form also lets you type a custom profile.
- The endpoint calls `syncSsoProfile` and then creates a Better Auth session through the internal adapter, setting the normal session cookie.
- `/sign-in` shows the BU dropdown (spec §1.3) and a "Sign in with SSO" button. In development it also shows a "Developer sign-in" link. The chosen BU goes in a short-lived, httpOnly, signed cookie `westcal-requested-bu` that `syncSsoProfile` reads.

### 5.4 Sessions
- Lifetime 12 hours (`expiresIn`), with no sliding refresh beyond one working day (`updateAge` 1 hour, capped at 12 hours). Each new sign-in recomputes the role.
- `proxy.ts` only does an **optimistic** redirect to `/sign-in` when there is no session cookie. Real checks happen in `requireUser()`, which every page, query and action calls, following `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
- `requireUser()` also redirects users with no BU to `/welcome`.

### 5.5 As built (T11)
- **SSO sync happens before the session exists.** `genericOAuth`'s `mapProfileToUser` calls `mapSsoClaims` and then `syncSsoProfile`, so the user row (with every required column) exists before Better Auth looks for it. Better Auth then links the SSO account to that user (`trustedProviders: ["sso"]`). An after-sign-in hook can't work here: Better Auth would first try to create the user itself without `ssoId`, `employeeNumber` and so on.
- **Sessions are never extended.** `expiresIn` is 12 hours with `disableSessionRefresh: true`. There is no `updateAge`, because a refreshing session could outlive a working day and keep an old role.
- **Dev sign-in is a Better Auth plugin endpoint**, `POST /api/auth/dev-sign-in` (`src/server/dev-sign-in-plugin.ts`). It uses Better Auth's `internalAdapter.createSession` and `setSessionCookie`, and throws a 404 unless `devSignInEnabled` (`src/lib/env.ts`). The `/dev-sign-in` page calls it through server actions in `src/server/actions/sign-in.ts`, and `nextCookies()` sets the cookie.
- **`proxy.ts` answers API calls with 401** (pages get a redirect to `/sign-in`) when there's no session cookie. Public paths: `/sign-in`, `/dev-sign-in`, `/dev/*` (the gallery), `/api/auth`, `/api/health`, and Next's static files.
- `getCurrentUser()` reads `role`, `businessUnitId` and `teamId` from the Better Auth session (`user.additionalFields`), so there's no extra query. `requireRole()` throws `ForbiddenError`.

---

## 6. Data flow

The whole app uses one pattern, so there's only one thing to learn:

> **The server component loads the data → the client component shows it → a server action changes it and calls `refresh()` → the server component loads fresh data.**

### 6.1 Reads
- `src/app/(app)/page.tsx` is a server component. It reads the URL params (nuqs `createSearchParamsCache`), calls `requireUser()`, then calls `getCalendarData(actor, bu, from, to)` from `src/server/queries/calendar.ts` and passes the result as props to the client `<CalendarGrid>`. The first paint already has data, with no loading spinner and no JSON API.
- `getCalendarData` returns one plain object:
  ```ts
  { range, today, publicHolidays, teams, people /* each with availability for the range */, bookings, viewer: { id, role, teamId, canManage }, collapsedTeamIds }
  ```
  - Availability is **resolved on the server for the range shown**: each person gets one `WorkDay` per date. The client never needs pattern history.
  - Unassigned people are only included when `canSeeUnassigned`.
- **As built (T14):** `getCalendarData(actor, businessUnit, from, to)` in `src/server/queries/calendar.ts`. The page first gets the BU with `getBusinessUnitBySlug(actor, slug | null)`, which throws `NotFoundError` for a hidden BU the actor can't view. The result is plain data, so it can be passed to the client grid:
  - Each person comes with `patterns` and `overrides`, not one `WorkDay` per date. A bar's day count can reach outside the range (T09), and a lookup function can't be passed to a client component. The client builds `availabilityLookup(person.patterns, person.overrides)`.
  - `viewer` is the actor plus `canSeeUnassigned`. The client builds `canEdit` with `canEditBookingsFor`.
  - The function runs 7 small indexed queries at once (Prisma loads patterns and overrides with one query each). 300 people × 6 weeks loads in well under 150ms locally.
- **Changing period, view or BU** updates the URL through nuqs with `shallow: false`, so Next re-renders the page on the server with the new data. Wrap the update in `startTransition` and dim the grid while `isPending` is true. That's the whole "loading between periods" story.
- **Filters are the exception** (T21): the page already has everyone in the BU, so a filter change updates the URL shallowly (`useCalendarFilters`) and the grid redraws in the browser, with no server round trip.
- **Other people's changes:** a tiny `useRefreshOnFocus()` hook calls `router.refresh()` when the window regains focus (spec §2.5). No polling.
- **Cache Components (`cacheComponents`) stays OFF.** All data is per-user and dynamic.

### 6.2 Writes
- Mutations are **server actions** in `src/server/actions/*`, built with one helper, `authedAction(schema, handler)` in `src/server/authed-action.ts`. It:
  1. resolves the session (`requireUser`);
  2. parses input with the zod schema;
  3. runs the handler (which calls a service);
  4. calls `refresh()` from `next/cache`, so the page reloads its data (see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`);
  5. returns `{ ok: true, data } | { ok: false, error: { code, message, details?, conflicts? } }`. `details` lists validation messages; `conflicts` lists each clash for a `CONFLICT` (booking id, type, the clashing dates and halves, and a sentence), so the form can show them and offer Replace (T22).
  Error codes: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `CONFLICT`, `PAST_LOCKED`, `NOT_FOUND`, `INTERNAL`. Unexpected errors are logged on the server and returned as `INTERNAL`, without leaking details.
- Services run in one `prisma.$transaction` and use `lockUsers` (§3.2) before touching bookings.
- **On the client** a component calls the action, waits for the result, and either closes the dialog or shows the error. Use `useTransition` for the pending state. There is no optimistic cache patching. On our internal network a save and refresh takes a fraction of a second, and the grow animation (design system §6) makes the new booking feel instant.
- **Undo** after delete: the delete action returns the deleted booking. The toast's Undo button sends it back to `restoreBooking`.

### 6.3 URL state (nuqs), in `src/lib/search-params.ts`
| Param | Type | Default |
|---|---|---|
| `view` | `"week" \| "month"` | Cookie `westcal-view`, else `"week"` |
| `date` | `"YYYY-MM-DD"` (anchor) | Today |
| `bu` | BU slug | The viewer's BU |
| `teams` | string[] (team ids) | [] |
| `people` | string[] (user ids) | [] |
| `profile` | `"me"` | Not set. When set, the page renders the profile dialog for the viewer |
| `person` | user id | Not set. When set, the page renders the profile dialog for that person (admins only) |
| `admin` | `"teams" \| "users" \| "holidays" \| "units"` | Not set. When set, the page renders the admin dialog on that tab |
| `tab` | Profile dialog tab | `"details"` |

**Dialogs with their own URL:** the profile and admin dialogs open by setting a search param (with `history: "push"`). Closing removes it, and the browser Back button closes them too. The page server component sees the param, checks permission, loads the dialog's data, and renders the dialog over the grid. That's all ordinary components, with no special routing files.

When the view changes, a small server action stores the `westcal-view` cookie for a year, so the next visit opens in that view (spec §2.2).

---

## 7. Dates

- **`CalendarDate`** is just `type CalendarDate = string // "YYYY-MM-DD"`. Zod checks the format wherever a date comes in (URL, form, action). Date maths turns it into a `dayNumber` (whole days since 1970-01-01) and back. **Never** use `new Date()` for calendar dates in the domain, so time zones and daylight saving can't shift them.
- `todayIn(env.APP_TIME_ZONE, now = new Date())` uses `Intl.DateTimeFormat` with that time zone (Europe/London). The server computes `today` and sends it to the client, so both agree.
- `toDayNumber` / `fromDayNumber` remember their answers in two small Maps, because the grid converts the same few dozen dates tens of thousands of times.
- Prisma `@db.Date` columns become `Date` at UTC midnight. Convert only where rows are read or written (`fromDbDate` / `toDbDate`).
- Weeks run Sunday to Saturday. Month view covers the 1st to the last day of the month.
- Formatting: `Thu 12`, `Thu 12 Nov`, `Thursday 12 November 2026`, and range summaries `Thu 10 – Tue 15 · 4 days` (en-GB, en-dash, middle dot).

---

## 8. Public holiday engine

These are pure functions in `src/domain/public-holidays.ts`. Each one works out **what should change** and returns it as a plain object (`BookingChanges`, defined in `src/domain/events.ts` with `emptyChanges`, `mergeChanges`, `carveBooking` and `changesForPieces`, and also returned by Replace and "Remove this day"). One service function saves that object. This keeps the tricky rules testable without a database.

```ts
// The one shape every planner returns. Plain arrays, nothing clever.
type BookingChanges = {
  create: NewBooking[];                                   // new bookings (PH copies, split-off pieces)
  update: { id: string; range: SlotRange }[];             // bookings that were shortened
  remove: string[];                                       // booking ids to delete
  addExclusions: { userId: string; publicHolidayId: string }[];
  unlink: string[];                                       // booking ids whose publicHolidayId becomes null
};

planPublicHolidayCreate(holiday, people: PersonSnapshot[]): BookingChanges
planPublicHolidayMove(holiday, oldDate, newDate, people): BookingChanges   // untouched copies only
planPublicHolidayDelete(holiday, people): BookingChanges                   // untouched copies only
planReconcileForPerson(person, futureHolidays, fromDate): BookingChanges   // after a pattern/override change
```

`saveBookingChanges(tx, changes, actorId)` in `src/server/services/save-booking-changes.ts` writes it (new bookings get `createdById ?? actorId`; shortened ones get `updatedById = actorId`): one `createMany`, one `deleteMany`, a loop of `update`s, one `createMany` for exclusions, and one `updateMany` to unlink. That's about 15 lines, used by bookings, public holidays, profile changes and the seed.

- **PersonSnapshot** = `{ userId, availability: AvailabilityLookup, bookings, exclusions: string[] }`: their availability, their events overlapping the dates involved, and the ids of holidays they've detached from.
- **Carving:** all of a person's holiday slots are cut out of each booking together (so two holidays inside one long booking split it correctly). The first remaining piece keeps the booking's id, and later pieces are created with the same details and original `createdById`. Remaining parts with **zero working days** are deleted (PH carving only; Replace keeps them). `PARENTAL` is never carved: those slots are skipped for the PH instead.
- **"Untouched copy"** means an event with `publicHolidayId = ph.id`. When a user edits or moves a generated copy, the service **sets `publicHolidayId = null` and adds an exclusion** (detached). When a user deletes it, the service adds an exclusion.
- **Generation condition** for person P on holiday H: P works on H's date (FULL/AM/PM), P has no exclusion for H, and P has no event linked to H.
- **Scale:** at 1,000 users, creating a PH is about 1,000 inserts plus the carves. Do it in one transaction with batched writes, and target under 2 seconds locally.

---

## 9. Grid rendering model

`buildGridModel(input) → GridModel` is a pure function in `src/domain/grid-model.ts` (its input and output types are in `grid-model-types.ts`). React only maps the model to the DOM. Each person comes with an `availability` lookup (T06), not a per-day array, because a bar's "· 4 days" counts the whole booking, including days outside the visible period. It builds 300 people × 31 days with 3,000 bookings in about 12ms.

- **Columns:** `days.length * 2` half-columns, after a fixed name column. Each day spans 2 tracks (AM, PM). CSS grid: `grid-template-columns: var(--name-col) repeat(N, minmax(0, 1fr))`.
- **Rows:** team groups in their order (own team pinned first, Unassigned last if visible). Members sorted by surname. Collapsed groups have no member rows.
- **Per person:**
  - `cells[]` (one per day) with `{ date, gridColumn, availability, isToday, accessibleLabel, bookings: { bookingId, type, portion }[] }`.
  - `bars[]` with `{ bookingId, type, code, gridColumn: "start / span n", label, clippedStart, clippedEnd, isHalf, isNarrow, title }`.
  - `offOverlays[]`: one `{ gridColumn }` per non-working half-day inside a multi-day bar.
- **Accessible names** come from the model, for example: `"Tuesday 10 November, Tom Okafor. Annual leave, Monday 9 to Wednesday 11 November, 3 days."`, plus ", not a working day" / ", morning only" and " View only." where they apply. T18 may append a short key hint.
- **Bars are presentational** (`aria-hidden`) pointer targets layered over the cells. **Keyboard and screen-reader users work through the cells** (`role="gridcell"`, roving tabindex). See `03-accessibility.md §3`.
- Any bar narrower than 24 CSS px, such as month-view half days, gets `pointer-events: none`, so the click lands on the cell (WCAG 2.5.8).
- **Performance without virtualisation:** every row is rendered normally. Each team group gets the CSS `content-visibility: auto` (with `contain-intrinsic-size` worked out from its row count), so the browser skips drawing groups that are off-screen. With the React Compiler on, that's enough for one BU (about 300 rows at most). The header row and name column are sticky with plain CSS `position: sticky`.
  - **As measured in T19:** two things keep an arrow key cheap with 300 rows. The model is built in a `useMemo`, because the compiler didn't cache that call. Only the team holding the tab stop gets new props, so React skips the other teams. Results: a production month view with 300 people loads the next month in about 0.3s, scrolls with no long tasks, and moves focus within one frame. `pnpm test:perf` checks this (nightly in CI).

---

## 10. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Domain | Vitest (node) | **100% branch coverage target** for `src/domain`. Table-driven tests for every spec example. |
| Services / queries | Vitest + real Postgres (`DATABASE_URL_TEST`, port 5433) | Transactions, overlap check and locking, PH bulk changes, cascades. `prisma migrate deploy` once per run (never `migrate reset`), plus truncation before every test. The setup refuses to run unless the database name ends in `_test`. Tests use the normal `db` client, which the integration project points at the test DB. |
| Components | Vitest + Testing Library + happy-dom + `axe-core` (`expect((await axe.run(container)).violations).toEqual([])`) | Forms, grid, popovers, menus; keyboard behaviour; no axe violations. |
| E2E | Playwright (Chromium; Firefox in CI nightly) + `@axe-core/playwright` | Sign in (dev), book, edit, conflict and replace, undo, filters, profile, admin, PDF download. Axe on every screen in light and dark. Zoom/reflow checks at 320×256. |

Commands: `pnpm test` (unit + component), `pnpm test:int`, `pnpm test:e2e`, `pnpm check` (biome + tsc + test).

---

## 11. Tooling and CI

- **Biome**: recommended rules plus the `a11y` group as errors, `noExplicitAny` error, sorted imports, `useSortedClasses` for Tailwind (with `cn`/`cva` functions configured), `noConsole` (allow `error`/`warn`). Biome is the formatter (2-space indent, double quotes, line width 100).
- **lefthook**:
  - `pre-commit`: `biome check --write --staged` (re-staging fixed files), plus `pnpm typecheck` when `.ts`/`.tsx` files are staged.
  - `pre-push`: `pnpm test`.
- **CI is a thin wrapper around `pnpm` scripts.** Every check is a script in `package.json`, and the CI file only installs and calls them. The same commands work locally, and moving CI means rewriting one small file.
- **GitHub Actions** (`.github/workflows/ci.yml`) during development: Node 24, pnpm store cached by lockfile. Three jobs, so the setup steps aren't repeated six times:
  1. `checks`: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (domain coverage gate) and `pnpm build`, each a separate step
  2. `integration`: `pnpm test:int` with a `postgres:17` service
  3. `e2e`: Playwright container + `postgres:17` service; `pnpm test:e2e` (nightly adds `--project=firefox`); uploads the report on failure. E2E always runs against `next dev`, because dev-only pages (dev sign-in, the design gallery) are off in production builds. The `checks` job covers the production build, and T36 adds a separate check that dev-only routes return 404 under `next start`.

  The pipeline fails on any axe violation.
- **GitLab CI** after the production move: `docs/MOVING-TO-GITLAB.md` (T37) holds the equivalent `.gitlab-ci.yml`, which calls the same scripts. Don't commit both CI files at once.

---

## 12. Environment variables (`src/lib/env.ts`, validated with zod at boot)

```
DATABASE_URL=postgresql://westcal:westcal@localhost:5432/westcal
DATABASE_URL_TEST=postgresql://westcal:westcal@localhost:5433/westcal_test
BETTER_AUTH_SECRET=...            # 32+ chars
BETTER_AUTH_URL=http://localhost:3000
ADMIN_GROUP_NAME=CALENDAR_ADMIN
SUPER_ADMIN_EMPLOYEE_NUMBERS=100001
DEV_SIGN_IN_ENABLED=true
SSO_DISCOVERY_URL= SSO_CLIENT_ID= SSO_CLIENT_SECRET= SSO_SCOPES="openid profile email"
APP_TIME_ZONE=Europe/London
```

---

## 13. Production readiness (scope of the final tasks)
- `output: "standalone"`, a multi-stage `Dockerfile`, `GET /api/health` (checks the DB), and `prisma migrate deploy` as an init step.
- Security headers in `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, HSTS when served over HTTPS).
- `docs/PORTING-SSO.md`: step-by-step guide to switching to the corporate IdP with Better Auth `genericOAuth`, the claim mapping, and how to verify the role sync.
