# WestCal — Product specification

This is the **source of truth for behaviour**. Every rule here came from a decision made with the product owner. If a task file and this spec disagree, this spec wins. Raise the conflict in `progress.md` rather than guessing.

WestCal is a team availability calendar for a business unit (BU) of about 50 people, built to scale to about 1,000 people across several BUs. It is **not an official attendance or leave-allowance system**. It shows who is in on each day.

---

## 1. Users, roles and identity

### 1.1 Identity (corporate SSO)
- In production, people sign in with corporate SSO through **Better Auth**. In development, a **dev sign-in page** lets you pick a fake SSO profile (see `01-architecture.md §5`).
- SSO profile fields used: `id` (stable SSO ID), `employeeNumber`, `firstName`, `surname`, `email`, `formalGroups` (string array).
- A user record is **created automatically on first sign-in**. `firstName`, `surname` and `email` are refreshed from SSO at every sign-in.
- **Display name** = `(preferredName ?? firstName) + " " + surname`. Preferred name is a first name only, set by the user in their profile.

### 1.2 Roles (exactly three)
| Role | How it is granted | Scope |
|---|---|---|
| `USER` | Default | Their own BU |
| `ADMIN` | SSO `formalGroups` contains `CALENDAR_ADMIN` (group name configurable by env `ADMIN_GROUP_NAME`) | Admin powers **only inside their own BU** |
| `SUPER_ADMIN` | Employee number listed in env `SUPER_ADMIN_EMPLOYEE_NUMBERS` (comma-separated) | Admin powers in **every** BU, plus BU management |

- The role is **recomputed at every sign-in**. Removing someone from the group, or from the env list, removes their rights at their next sign-in. Sessions must therefore have a bounded lifetime (see architecture).
- If a person matches both, SUPER_ADMIN wins.
- There is **no in-app UI to grant or revoke roles**.

### 1.3 Business units
- BUs exist in the data model from day one.
- Every user belongs to **exactly one BU**. Admins too.
- Only **SUPER_ADMIN** can create, rename and delete BUs and set the **hidden** flag. Deleting a BU is blocked while it has users.
- **Visibility:** any signed-in user can view any non-hidden BU's calendar. A **hidden** BU is visible only to its own members and to super admins.
- **Editing** is never cross-BU, except for super admins.
- **First sign-in BU choice:**
  - If only one BU exists, the new user goes straight into it.
  - If there is more than one BU, the **sign-in screen shows a dropdown**: "First time here? Which business unit do you belong to?" listing the non-hidden BUs. Hidden BUs are listed too, because new members need to join them. The choice is only used when the account is new. Returning users' choices are ignored.
  - If a brand-new user signs in without choosing and more than one BU exists, they are sent to a one-off "Choose your business unit" page before seeing the calendar.
- New users land in their BU's **Unassigned** group.
- **Moving between BUs:** only a SUPER_ADMIN can move a user to another BU. The user keeps their events and lands in the new BU's Unassigned group.

### 1.4 Teams and Unassigned
- A user is in **exactly one team, or Unassigned**.
- **Unassigned** is a built-in group per BU (modelled as "no team"). It is always **last**, cannot be edited, renamed, deleted or reordered, and users cannot be moved *into* it by hand. People only arrive there by first sign-in, by their team being deleted, or by a BU move.
- Regular users **cannot see** the Unassigned group on the grid. Admins (of that BU) and super admins can.
- An **unassigned user** sees the grid without themselves, plus a banner: "An admin needs to add you to a team before you can book." They **cannot create bookings**. They **can** edit their profile (preferred name, working pattern).

---

## 2. Calendar views

### 2.1 Header bar (left to right)
1. **Brand**: WestCal logo and wordmark.
2. **BU switcher**: shown only when the viewer can see more than one BU. Defaults to the viewer's own BU.
3. **View toggle**: Week / Month.
4. **Previous** button: previous week or month.
5. **Month dropdown** and **Year dropdown**. Years run from 5 years in the past to 5 years in the future, relative to the current year. In week view, choosing a month or year jumps to the week containing the 1st of that month.
6. **Next** button.
7. **Today** button: jumps back to the current week or month. (Added for usability.)
8. **Team filter**: a filter builder where you pick multiple teams.
9. **Person filter**: a filter builder where you pick multiple people.
10. **Key** button: a popover listing the leave types. It opens on hover, keyboard focus and click, and is dismissible with Esc (WCAG 1.4.13).
11. **Export PDF**: **admins and super admins only**. It offers Today / This week / Next week.
12. **User menu** (avatar).

### 2.2 Week and month
- **Week view runs Sunday to Saturday.**
- **Month view** shows every day of the month. Weekends are styled the same as weekdays. A person's non-working days are hatched according to *their own* pattern.
- Day headers look like `Thu 12`. **Today's column is highlighted.** A public holiday shows its name as a marker in the day header.
- **On open**, the app shows the view (week or month) the person last used, for the current period, with **no filters applied**.
- View, date, BU and filters live in the URL (nuqs), so links can be shared.

### 2.3 Rows
- Teams are listed down the left in the admin-defined order, **except that the viewer's own team is pinned at the top**, and Unassigned is last (admins only).
- Within a team, people are sorted **by surname**, then display first name (en-GB collation).
- Each team can be **collapsed and expanded**. This state is **remembered per user** across sessions and devices (stored in the database).
- **The viewer's own row is highlighted**, and where it crosses the today column a distinct crosshair tint appears.
- Names are **not clickable for regular users**. For admins and super admins, a name opens that person's profile (preferred name, working pattern, leave history, upcoming leave), which they can edit.

### 2.4 Filters
- Team filter and person filter are multi-select builders (search, chips, keyboard operable).
- Filters are scoped to the BU currently shown. The grid shows the union of the selected teams and selected people. With no filters, everyone visible is shown.

### 2.5 Live updates
- A user's own changes appear **as soon as they save**, without a manual refresh.
- Other people's changes are fetched **when the window regains focus**. There is no polling.

---

## 3. Leave types (fixed list)
| Code | Name | Tallied? |
|---|---|---|
| AL | Annual Leave | Yes: calendar year from 1 January |
| FL | Flexi Leave | No |
| SK | Sickness | No |
| SL | Special Leave | Yes: rolling 12 months |
| PL | Parental Leave | Yes: rolling 12 months |
| WBD | Wellbeing Day | Yes: rolling 12 months |
| OT | Other | No |
| WFH | Working From Home | No (it looks the same as other types; it is just not counted) |
| PH | Public Holiday | Yes: rolling 12 months |

The types are fixed and not admin-editable. Colours are in `02-design-system.md`.

---

## 4. Working patterns and availability

### 4.1 Weekly pattern
- Each weekday is set to one of **`FULL` / `AM` / `PM` / `OFF`**.
- The default is Mon–Fri `FULL`, Sat and Sun `OFF`. Weekends can be changed.
- Only **the user themselves and admins** (of that BU) or super admins can change it.
- **A change takes effect from the next week onwards**, meaning the next Sunday after today. Patterns are **effective-dated**, so past day counts never change. Saving twice before that Sunday overwrites the pending change.

### 4.2 One-off overrides (day swaps)
- On any single date, a person can say **"I'm working this day"** (on a non-working day) or **"I'm not working this day"** (on a working day). A working override can be full day, AM or PM.
- These are set from the add-event dialog when clicking a cell. The same people who can change the pattern can set them: the user and admins.
- An override changes availability for that date only. That affects hatching, day counts, the PDF tick boxes and public holiday generation.
- The same past lock applies: overrides cannot be created, changed or removed for dates before today. Admins follow the same 7-day rule as for events.

### 4.3 Availability resolution
`availability(person, date)` = the override for that date if one exists, otherwise the weekly pattern whose `effectiveFrom ≤ date` is latest.

---

## 5. Bookings (events)

### 5.1 What a booking is
- A booking has a type, a start date, an end date, **half-day precision at the ends**, optional notes (up to 500 characters), and audit fields.
- **Single-day** booking: Full day, AM or PM.
- **Multi-day** booking: the first day is Full or PM-only, and the last day is Full or AM-only. Example: Thursday PM to Tuesday, as one booking.
- A person can have **two different bookings on one day** (AM and PM), for example AL in the morning and FL in the afternoon.
- Bookings **cannot overlap** for the same person (checked at half-day level).

### 5.2 Day counting
- Day counts follow the person's availability. A `FULL` day counts 1, the working half of an `AM` or `PM` day counts 0.5, and `OFF` days count 0.
- *Example:* someone works only Thursday and Friday. A booking from Thursday to Tuesday counts 2 days.
- *Example:* Wednesday is an AM-only day. A Mon–Fri AL booking counts 4.5 days.
- Booking a non-working day is allowed. It shows on the grid and counts 0.

### 5.3 Who can book for whom
| Actor | Can create, edit and delete bookings for |
|---|---|
| USER (in a team) | Themselves and anyone in **their own team** |
| USER (unassigned) | Nobody |
| ADMIN | Anyone in **their BU**, including Unassigned people |
| SUPER_ADMIN | Anyone |

### 5.4 Time rules (apply to everyone, including admins)
- **Past bookings cannot be edited or deleted.** "Past" means the dates are before today (Europe/London). Today is editable.
- **Creating:** users can create bookings from today onwards. **Admins and super admins can also create up to 7 days in the past** (today − 7 up to yesterday). Once created, those past bookings are locked like any other.
- **Ongoing bookings** (started before today, ending today or later):
  - The past days are locked.
  - The **end date and end half** can be changed (to today or later), and the notes can be edited.
  - Type and start cannot be changed.
  - **"Delete the remaining days"** trims the booking so it ends yesterday.
- Public holiday bookings follow the same lock. **Today's** public holiday can still be edited.

### 5.5 Create and edit form
- It opens when you click any grid cell, prefilled with the clicked person and date.
- **Fields:**
  - **Type**: radio cards for all 9 types.
  - **Start date**: defaults to the clicked day.
  - **End date**: defaults to **the same day**.
  - **Duration**: Full / AM / PM, shown only for single-day bookings.
  - **First day** (Full / Afternoon only) and **Last day** (Full / Morning only), shown only for multi-day bookings.
  - **Notes**: optional, maximum 500 characters.
- **Range summary** under the dates, recalculated live, for example `Thu 10 – Tue 15 · 4 days`. Halves show as `Thu 12 PM – Tue 17 · 3.5 days`. A hint explains which days were not counted and why.
- **Availability override** options for the clicked date (see §4.2).
- **Conflicts:** the booking is blocked, with a message saying exactly what is already there (type, person, date, half) and a **Replace** button. Replace removes the conflicting parts, splitting other bookings where needed, then saves, all in one transaction. You cannot replace a conflict that is in the past.
- In edit mode the form shows **who created the booking and when**, and **who last changed it and when**. Everyone can see this. A Delete button is shown when allowed.

### 5.6 On the grid
- A multi-day booking is **one continuous bar** labelled like `AL · 4 days`. Non-working days inside it are hatched within the bar and not counted.
- **Half days split each cell left and right: AM on the left, PM on the right.**
- Clicking a bar opens a details popover showing type, dates, count, notes, and who created it and last changed it. It also has Edit / Delete / "Remove this day" when permitted.
- **"Remove this day"** splits a block into two bookings.
- **New bookings animate**: the bar grows from the start date (a CSS animation). Reduced-motion preferences are respected.
- **Delete** shows a toast with **Undo**, available for about 8 seconds.
- Everyone can see every booking's type and notes.

---

## 6. Public holidays

### 6.1 Admin management
- Public holidays are **global**: one list for every BU. Each has a **date** and a **name** (for example "Christmas Day").
- **Any ADMIN or SUPER_ADMIN** can create, edit and delete them. Each action shows a warning that it applies to **every business unit**, with an impact preview (number of people affected and bookings that will be replaced).
- Past public holidays (date before today) cannot be edited or deleted.

### 6.2 Generating bookings
When a public holiday is created on date D, every user gets a `PH` booking on D according to their availability that day:
- `FULL` gives a full-day PH.
- `AM` or `PM` gives a half-day PH on the half they work.
- `OFF` gives **no PH**.

The PH **replaces any existing booking on those halves, except Parental Leave**. Parental leave is kept and no PH is created on those halves. Replaced bookings are **deleted permanently**: they are not restored if the PH is later removed. A multi-day booking that crosses D is split around it, so the count drops and the PH sits inside the span.

**New users** get every future public holiday (D ≥ today) when their account is created.

### 6.3 Individual changes
- A user (or anyone allowed to edit their bookings) can **move, edit or delete their own PH booking** on the grid, with no warnings, because people take holidays on different days. They can also create PH bookings by hand.
- Once someone has moved or deleted their copy, it is **"detached"**. Later admin changes to that holiday leave detached copies alone.

### 6.4 Admin edits after generation
- **Rename:** the label updates everywhere. Bookings are not affected.
- **Move date:** only people who still have the **untouched original** are updated. Their old-date copy is removed, and a new copy is generated on the new date using the §6.2 rules (including overwriting). People who had no copy only because the old date was a non-working day for them (and who have not deleted or moved it) count as untouched, so they get the holiday on the new date if they work it.
- **Delete:** untouched copies are removed. Detached copies stay.

### 6.5 Reconciliation
When someone's availability changes (a pattern change taking effect, or an override), their untouched future PH bookings are regenerated to match. A PH that no longer falls on a working day is removed. A PH that now falls on a working day is created, unless they had deliberately deleted or moved that holiday.

---

## 7. Profile (user menu, then "My profile")
Admins and super admins open the same profile for other people from the grid.

The dialog has these sections:
1. **Details**: preferred name (first name only, optional; clearing it falls back to the SSO first name). Shows the read-only SSO name, email, employee number, BU and team.
2. **Working pattern**: a 7-day editor (Sun–Sat) with FULL / AM / PM / OFF for each day, with the message "Changes apply from Sunday 15 November".
3. **Leave history**: tallies plus the past bookings behind them.
   - AL: **calendar year from 1 January**, shown as taken so far and booked for the rest of the year.
   - SL, PL, WBD, PH: **rolling 12 months** ending today, shown as taken.
   - FL, SK, OT and WFH are not tallied.
   - Below the tallies, a list of the past bookings in those windows, grouped by type.
4. **Upcoming leave**: future bookings, **read-only**. Editing happens on the grid.

The dialog has its own URL (`?profile=me`, or `?person=<id>` for admins viewing someone else) and opens as a modal over the grid. Back closes it.

---

## 8. User menu
- Basic details: display name, email, BU, team and role.
- **Theme**: Light / Dark / System. This is remembered on the device for the next visit (next-themes); it does not follow the person across devices.
- My profile.
- **Admin**: shown only for ADMIN or SUPER_ADMIN.
- Sign out.

---

## 9. Admin dialog
It opens from the user menu, as a modal with its own URL (`?admin=teams`, `?admin=users`, and so on) and tabs. Back closes it.

1. **Teams** (current BU): create, rename and delete teams, and change their order with **Move up / Move down** buttons (no drag and drop: simpler, and accessible by default). **Deleting a team that has members moves those members to Unassigned**, after a confirmation stating how many people are affected.
2. **Users** (current BU): grouped by team, with Unassigned included. There is a search box, and each person has a **team dropdown** to move them. **Delete user** removes the person **completely**, including all their past and future bookings, after a type-to-confirm dialog. If they sign in again they are a brand-new user. "Open profile" goes to the profile. SUPER_ADMIN also gets **Move to business unit**.
3. **Public holidays**: a list split into upcoming and past (past is read-only), with create, edit and delete and the global warning (see §6).
4. **Business units** (SUPER_ADMIN only): create, rename, toggle hidden, and delete (blocked while the BU has users).

Admins act on the BU currently shown in the BU switcher. A plain ADMIN can only ever select their own BU here. A SUPER_ADMIN can select any.

---

## 10. PDF export (admins and super admins)
- **Today / This week / Next week**, for the **whole BU currently shown**, ignoring any filters. Unassigned people are not included.
- The purpose is a printout a manager uses to tick off, by hand, everyone who should be in.
- **Week sheets show Sunday to Saturday.** **Today is not highlighted** on any sheet. There is no logo, only the WestCal wordmark as text.
- Each cell shows one of:
  - the leave code if something is booked;
  - an **empty tick box** if the person is expected in;
  - hatching if it is a non-working day.
  A half-day cell is split left (AM) and right (PM), and each half follows the same rules.
- The sheet fits **one page**, flowing to **two if needed**. A4 portrait is the default for week sheets because it fits about 55 rows. The table header repeats on page 2. A legend of codes goes at the bottom.
- The **Today** sheet lists people grouped by team, each with one status cell. If needed it uses two columns of people to stay on one page.

---

## 11. Non-functional requirements
- **Accessibility: WCAG 2.2 AA from the start.** See `03-accessibility.md`.
- **Devices:** desktop and meeting-room screens with unusual resolutions and zoom levels. No phone support is required, but the layout must work at **400% zoom** (320 CSS px wide). The grid may scroll in two directions, as allowed for data tables.
- **Feel:** modern, smooth and fast. No layout shift, skeletons instead of spinners, motion that is meaningful but subtle.
- **Code:** simple and readable enough for a junior developer to maintain and extend by hand (see `04-code-style.md`). Where a simpler solution meets the requirement, it wins.
- **Scale:** smooth with about 1,000 users across BUs, and a single BU with up to about 300 rows visible.
- **Locale:** UK only. en-GB formatting, Europe/London time zone, weeks start on **Sunday** in the grid.
- **Hosting:** the production target is the internal Kubernetes. The plan covers local development only, plus a production-ready build (standalone output, Dockerfile, health endpoint) and an SSO porting guide.
- **Source control and CI:** GitHub (GitHub Actions) during development, moving to GitLab for production. Either way there's a strict pipeline for lint, types, tests, accessibility checks and build. Each CI job only calls a `pnpm` script, so moving means rewriting one small YAML file.
- **Not in scope:** leave allowances, approvals, email notifications, error monitoring, mobile layout, importing existing data, drag-to-create on the grid.
