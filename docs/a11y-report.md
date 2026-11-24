# WestCal accessibility report (WCAG 2.2 AA)

**Status (24 November 2026):** the automated audit and keyboard journeys pass, with no axe violations in light or dark. **The manual screen-reader pass is still to do** (part 4). The agent building WestCal can't run a screen reader, so the product owner, or a colleague, follows the script below and fills in the results. Anything found then gets fixed, and this report is updated.

Rules and checklist: [docs/plan/03-accessibility.md](plan/03-accessibility.md). The public statement is at `/accessibility`.

## 1. What was fixed in T35

| Problem | WCAG | Fix |
|---|---|---|
| **The Undo toast couldn't be reached reliably from the keyboard.** The toast library moves focus to its notifications on Alt+T, which is also the calendar's "Today" shortcut. | 2.1.1 Keyboard, 2.2.1 Timing adjustable | Notifications are now on **Alt+N**. It's listed in the keyboard shortcuts, and a screen reader hears "Booking deleted. Press Alt+N to undo." |
| **In Windows High Contrast, days off lost their hatching.** Chrome drops gradient backgrounds in that mode, so non-working days looked the same as working days. | 1.4.1 Use of colour, 1.4.11 Non-text contrast | Hatched cells, the Key's sample and the day-off stripes on bars keep their own colours in that mode. The stripes are the system's GrayText, and their borders use the system text colour. |
| **In High Contrast, today wasn't marked.** The column tint and the date pill are both colour. | 1.4.1 Use of colour | Today's date gets a ring in that mode. |
| There was no accessibility statement. | (good practice; required for public sector sites) | `/accessibility`, linked from the user menu and the sign-in page, readable without signing in. |

## 2. Automated coverage

Every item in `03-accessibility.md` §5, and the test that checks it. Unless it says otherwise, each axe check runs in **light and dark** (Chromium; Firefox runs nightly in CI).

| Screen or state | Test |
|---|---|
| Sign-in (with the BU choice), dev sign-in | `smoke.spec.ts`, `onboarding.spec.ts` |
| Welcome | `a11y/screens.spec.ts` |
| Calendar week; More menu (narrow); Key | `header.spec.ts` |
| Calendar month | `a11y/screens.spec.ts` |
| Booking form: add, edit | `event-form.spec.ts` (and full screen at 320px) |
| Booking form: clash | `a11y/screens.spec.ts` |
| Cell menu, booking details, delete confirmation | `grid-interactions.spec.ts` |
| Keyboard shortcuts | `a11y/screens.spec.ts` |
| Filters (with a chosen chip) | `filters.spec.ts` |
| User menu | `user-menu.spec.ts` |
| Profile: every tab | `profile.spec.ts` |
| Admin: Teams, Users, Public holidays, Business units, and every confirmation | `admin-*.spec.ts` |
| Not found, session ended | `route-states.spec.ts` (session ended: light) |
| Something went wrong | `src/app/error.test.tsx` (component; the page can't be reached on purpose in the browser tests) |
| Accessibility statement | `a11y/screens.spec.ts` |
| Unassigned banner | `team-groups.spec.ts` (light) |
| Design system gallery | `design-system.spec.ts` |

| Check | Test | Result |
|---|---|---|
| **Keyboard journeys** (no mouse): book several days, edit, delete, Undo; filter teams; change theme; open the profile; reorder a team with the Move buttons. Each step also checks dialog names, focus and the polite messages a screen reader hears. | `a11y/keyboard-journeys.spec.ts` | Pass |
| Skip link, arrows, Page Down, Tab out; `?` and Esc back to the cell | `grid-keyboard.spec.ts`, `grid-interactions.spec.ts` | Pass |
| **Reduced motion:** nothing still animating after the view change, booking (grow), Key and booking details | `a11y/display.spec.ts` | Pass |
| **Forced colours:** screenshots of the grid, booking form, booking details and Key; bars keep a border | `a11y/display.spec.ts`, `design-system.spec.ts` | Pass (screenshots attached to the test report) |
| **Zoom / reflow:** 640×400 and 320×256 (1280×800 at 200% and 400%): no sideways page scroll outside the grid; every header control fits; Key and Export are in More | `a11y/display.spec.ts`, `header.spec.ts` | Pass |
| **Text spacing** (1.4.12 CSS injected): no clipped labels, buttons or headings on the calendar, booking form, profile or admin | `a11y/display.spec.ts` | Pass |
| **Target size** (2.5.8): every target ≥ 24×24px or with 24px of room, on week, month, booking form, filters and admin Users | `a11y/display.spec.ts` | Pass |
| Contrast of every colour pair, both themes | `src/domain/__tests__/contrast.test.ts` | Pass |
| Focus returns to where it was after every dialog and popover closes | checked by hand in T34; tests in `grid-*.spec.ts`, `admin-teams.spec.ts`, component tests | Pass |
| Lighthouse Accessibility (production build) | measured in T34 | 100 |

## 3. Residual notes (not AA failures, for the product owner to judge)

- **Undo lasts 8 seconds** (spec §5.6). Hovering over the toast, or moving focus to it with Alt+N, pauses the timer. A screen reader announces how to reach it. Undo is a convenience on top of a confirmed action, and a deleted booking can be added again, so this isn't treated as a 2.2.1 failure. The product owner is happy with 8 seconds (T35).
- **Stripes and bar labels** (fixed in T35, product owner's choice): the stripes for days off inside a bar used to be drawn over the start of its label. They're now drawn inside the bar, under the label.
- **The date picker's days off aren't hatched in High Contrast.** Its day buttons have numbers in them, so they can't opt out of the system colours the way the grid's empty cells do. The form's working-day count and the grid still show which days are off.
- **Tooltips open on focus**, including when focus returns to an icon button after a menu closes, so the next Esc closes the tooltip first. This is what WCAG 1.4.13 asks of tooltips, and the product owner chose to keep it (T35).
- **The grid scrolls in two directions** on narrow screens, with the names and dates sticky. This is the data-table exception to 1.4.10.
- **The PDF attendance sheet isn't a tagged PDF** (react-pdf can't make one). It's made for printing, and the same information is on the calendar. The statement says so.

## 4. Manual screen-reader pass: script and results

Run it with each of: **NVDA + Chrome**, **NVDA + Firefox**, **Narrator + Edge**. Use the dev sign-in on a local copy with the demo data (`pnpm db:seed`, `pnpm dev`), as **Priya Shah** (steps 1–9) and **Callum Reid** (step 10). Use a week at least 30 weeks ahead for the bookings, so the demo data doesn't get in the way.

For each step, write **Pass**, or **Fail** with what you heard. Anything that fails goes in part 5.

| # | Do this | You should hear (roughly) | NVDA + Chrome | NVDA + Firefox | Narrator + Edge |
|---|---|---|---|---|---|
| 1 | Open `/sign-in`. Tab through the page. | "Sign in to WestCal, heading"; the business unit question with its hint; "Sign in with SSO, button"; "Developer sign-in"; "Accessibility statement, link" | | | |
| 2 | Sign in as Priya. Press Tab once. | "Skip to calendar, link". Enter: "Tuesday 24 November, Priya Shah…, today" (the date and her bookings that day) | | | |
| 3 | Arrow ←→↑↓, Home, End, Page Down. | Each cell's full name: date, person, availability, bookings. Page Down: the new week ("Week of …") is announced | | | |
| 4 | On an empty day, press Enter. | "Add event, dialog, For Priya Shah · Service Design". Tab through: the leave types as a radio group (arrows move), Start date and End date with their hint, the range summary updating, Notes | | | |
| 5 | Type an end date two days later, then Add event. | The dialog closes; "Annual leave added for Priya Shah, Tuesday … to Thursday …, 3 days."; focus back on the day | | | |
| 6 | Book again over one of those days. | "You already have Annual leave on …" read out as an alert, with "Replace it" and "Change dates" buttons | | | |
| 7 | Choose "Change dates" and close the form. On the booking, press Delete, then Delete in the confirmation. | "Delete Annual leave, … (3 days)?, alert dialog"; then "Booking deleted. Press Alt+N to undo." | | | |
| 8 | Press Alt+N, Tab to Undo, press Enter. | "Notifications" region; "Undo, button"; then "Booking restored." | | | |
| 9 | Open the user menu (Tab to "User menu for Priya Shah, PS"), choose My profile. Move through the tabs. | "Menu"; the theme options as radio items; "My profile, dialog"; each tab's name and content; Esc returns to the user menu button | | | |
| 10 | As Callum: user menu, Admin. Tab to "Move … up", press Enter. | "Admin · Corporate Services, dialog"; after the move: "… moved to position … of …"; focus stays on the button | | | |
| 11 | Collapse a team (its button in the grid). | "Service Design, 9 people, your team, expanded/collapsed"; "Service Design collapsed, 9 people hidden." | | | |
| 12 | Open the Key, then the Teams filter; tick a team. | The Key's list of leave types; "Search teams, combo box"; each team as an option, "selected" when ticked; "Teams, 1 selected" on the button afterwards | | | |

**Tested by:** ______ **Date:** ______ **Versions** (NVDA, browsers, Windows): ______

## 5. Issues found in the manual pass

| # | Step | Screen reader + browser | What happened | WCAG | Fixed in |
|---|---|---|---|---|---|
| | | | | | |
