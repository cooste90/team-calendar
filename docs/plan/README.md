# WestCal — Delivery plan

WestCal is a team availability calendar for a business unit of about 50 people, designed to grow to about 1,000 people across several business units. This folder is the complete plan. **AI agents work through the tasks one at a time, in order.**

| File | What it is |
|---|---|
| [00-product-spec.md](00-product-spec.md) | **What** the app does. The source of truth for behaviour. |
| [01-architecture.md](01-architecture.md) | **How** it's built: stack, folders, data model, auth, data flow, testing, CI. |
| [02-design-system.md](02-design-system.md) | Brand, tokens, leave colours, grid styling, motion. |
| [03-accessibility.md](03-accessibility.md) | The WCAG 2.2 AA rules, grid keyboard model and test checklist. |
| [04-code-style.md](04-code-style.md) | **Keep it simple.** Code rules for a junior maintainer, and the libraries and patterns we deliberately avoid. |
| [progress.md](progress.md) | Running hand-off log. Each agent appends an entry. |
| [backlog.md](backlog.md) | Future feature ideas, **not** part of the current build. Agents don't work from it. |
| [tasks/](tasks/) | One file per task, numbered in execution order. |

---

## Agent protocol (read before every task)

1. **Orient.** Read this README, then **`04-code-style.md`** (every time), then `progress.md` (the last 3 entries at least), then your task file. Read the spec and architecture sections the task links to.
2. **Check versions.** This is Next.js 16 / React 19.3 / Tailwind 4 / Prisma 7. Before using a Next.js API, read the relevant guide in `node_modules/next/dist/docs/`. Before adding a dependency, check its current stable version (`pnpm view <pkg> version`) and pin it exactly. For Prisma 7, Better Auth, nuqs and shadcn, read their current docs. Don't rely on memory.
3. **Keep it simple.** The product owner maintains this code by hand. Follow `04-code-style.md`: obvious over clever, no repetition, no abstractions before they're needed, and no libraries or patterns from its "don't use" list. Before committing, do the simplicity pass it describes.
4. **Stay in scope.** Do only what the task lists. If you find a gap or a contradiction, don't invent behaviour. Note it in `progress.md` under "Questions for the product owner", and if work can't continue without an answer, stop.
5. **Domain logic lives in `src/domain`** as pure, tested functions. UI and services call it and never re-implement rules.
6. **Accessibility is part of "done"**: semantic HTML, keyboard support, labels, contrast, no axe violations (see `03-accessibility.md`).
7. **Tests are part of "done".** Write them alongside the code. `pnpm check` (Biome + typecheck + unit tests) must pass. Run `pnpm test:int` / `pnpm test:e2e` when your task touches services or flows.
8. **Commit.** One or more commits on a branch `task/TXX-short-name`, with messages like `feat(T07): booking conflict detection`. Merge to `main` only when the task's acceptance criteria are met and the pipeline is green. (The product owner may choose to review pull requests on GitHub instead.)
9. **Hand off.** Append an entry to `progress.md`: what you did, files of note, any deviations and why, the simplicity pass, follow-ups, and open questions. Tick the task in the index below.

**Definition of done (every task):** acceptance criteria met · tests written and passing · `pnpm check` green · no new axe violations · **simplicity pass done (`04-code-style.md`): no repeated logic, no unused code, nothing a junior couldn't follow** · no `any`, no `@ts-ignore`, no disabled lint rules without a comment explaining why · `progress.md` updated.

**Where task files and `04-code-style.md` disagree, the simpler option wins.** If a task asks for something that seems more complicated than it needs to be, build the simple version and explain why in `progress.md`.

---

## Changing the plan

The product owner can change anything at any time. The plan is a living document, not a contract. Agents never change behaviour on their own (protocol step 4). Only the product owner decides, and then the plan is updated **before** code is written:

1. **Update the spec first.** Change `00-product-spec.md` (and the design system or architecture if affected), so the spec stays the single source of truth.
2. **Fix the tasks.**
   - If the change affects a task that **hasn't started**, edit that task file.
   - If it affects work that's **already done**, add a new task file. Number it after the current task with a letter suffix (for example `T17a-…`), and add it to the index below.
   - A brand-new feature gets its own new task.
3. **Log it.** Add a short `progress.md` entry saying what changed and why (like T00b and T00c).
4. **Keep it small.** A change task follows the same protocol, tests and simplicity pass as any other task.

Ideas that aren't for now go in [backlog.md](backlog.md), so they're not forgotten and don't creep into the current work.

---

## Task index

Size key: **S** ≈ small, under 300 lines changed · **M** ≈ 300–800 · **L** ≈ 800–1500. Each task is scoped to fit one agent session.

### Phase 0 — Foundation
- [x] [T01](tasks/T01-tooling-baseline.md) Tooling baseline: TS strict, Biome, lefthook, env validation, scripts · **S**
- [x] [T02](tasks/T02-database-prisma.md) Local Postgres (Docker) and Prisma 7 bootstrap · **S**
- [x] [T03](tasks/T03-test-ci-harness.md) Vitest, Playwright + axe, and the GitHub Actions pipeline · **M**
- [x] [T04](tasks/T04-design-foundation.md) Design tokens, Geist, next-themes, shadcn base components, dev gallery · **M**

### Phase 1 — Domain core (pure TypeScript)
- [x] [T05](tasks/T05-domain-dates-slots.md) Calendar dates, weeks, months, half-day slots, formatting · **M**
- [ ] [T06](tasks/T06-domain-availability-counting.md) Working patterns, overrides, availability, day counting · **M**
- [ ] [T07](tasks/T07-domain-booking-rules.md) Booking validation, conflicts, carving, time rules, permissions · **L**
- [ ] [T08](tasks/T08-domain-public-holidays.md) Public holiday planning engine · **M**
- [ ] [T09](tasks/T09-domain-tallies-grid-model.md) Tallies and the grid view-model · **M**

### Phase 2 — Data and auth
- [ ] [T10](tasks/T10-prisma-schema.md) Prisma schema and migrations · **M**
- [ ] [T11](tasks/T11-auth.md) Better Auth, SSO profile sync, roles, dev sign-in, session guard · **L**
- [ ] [T12](tasks/T12-onboarding.md) Sign-in page BU dropdown, welcome page, new-user provisioning · **M**
- [ ] [T13](tasks/T13-seed.md) Seed data (faker), dev SSO profiles, large seed · **M**
- [ ] [T14](tasks/T14-action-query-infrastructure.md) Server action helper, data loading, URL state (nuqs) · **M**

### Phase 3 — Calendar UI
- [ ] [T15](tasks/T15-app-shell-header.md) App shell and header navigation · **M**
- [ ] [T16](tasks/T16-grid-rendering.md) Grid rendering: week/month, bars, hatching, today, PH markers · **L**
- [ ] [T17](tasks/T17-grid-team-groups.md) Team groups: ordering, collapse persistence, Unassigned, admin links · **M**
- [ ] [T18](tasks/T18-grid-keyboard-sr.md) Grid keyboard navigation and screen-reader model · **M**
- [ ] [T19](tasks/T19-grid-performance.md) Grid performance check with the large seed · **S**
- [ ] [T20](tasks/T20-key-popover.md) Key popover and keyboard shortcuts help · **S**
- [ ] [T21](tasks/T21-filters.md) Team and person filter builders · **M**

### Phase 4 — Bookings
- [ ] [T22](tasks/T22-booking-create-service.md) Booking create service: conflicts, replace, transactions · **M**
- [ ] [T23](tasks/T23-booking-modify-service.md) Booking update/delete/split/trim/undo, PH detach, availability overrides · **L**
- [ ] [T24](tasks/T24-event-form.md) Add / edit event dialog · **L**
- [ ] [T25](tasks/T25-grid-interactions.md) Grid interactions, grow animation, undo · **L**

### Phase 5 — Profile and user menu
- [ ] [T26](tasks/T26-user-menu.md) User menu and theme selector · **S**
- [ ] [T27](tasks/T27-profile-details-pattern.md) Profile dialog, details, working pattern · **L**
- [ ] [T28](tasks/T28-profile-history-upcoming.md) Leave history tallies and upcoming leave · **M**

### Phase 6 — Admin
- [ ] [T29](tasks/T29-admin-teams.md) Admin dialog shell and Teams tab · **M**
- [ ] [T30](tasks/T30-admin-users.md) Users tab: move team, delete user, move BU · **M**
- [ ] [T31](tasks/T31-admin-public-holidays.md) Public holidays tab and bulk services · **L**
- [ ] [T32](tasks/T32-admin-business-units.md) Business units tab (super admin) · **S**

### Phase 7 — Export
- [ ] [T33](tasks/T33-pdf-export.md) PDF attendance sheets · **L**

### Phase 8 — Hardening and release
- [ ] [T34](tasks/T34-states-polish.md) Loading, empty, error and forbidden states; polish · **M**
- [ ] [T35](tasks/T35-accessibility-audit.md) Accessibility audit and fixes · **M**
- [ ] [T36](tasks/T36-security-permissions.md) Security headers and permission-matrix tests · **M**
- [ ] [T37](tasks/T37-release-readiness.md) Production build, Dockerfile, SSO porting guide, final QA · **M**

---

## Milestones (for demos to the product owner)
| After | You can see |
|---|---|
| T04 | Dev gallery with tokens and components in light and dark |
| T13 | Seeded DB; sign in as any fake user |
| T19 | A navigable read-only calendar for a BU of about 50 people, fast at 1,000 |
| T25 | Full booking experience |
| T28 | Profiles and working patterns |
| T32 | Admin complete |
| T37 | Release candidate |
