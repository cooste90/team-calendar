# T27 — Profile dialog: details and working pattern

**Phase:** 5 · **Depends on:** T26 · **Size:** L

## Goal
"My profile" and the admin's view of anyone's profile, as a modal over the grid with its own URL, covering details and working pattern.

## Read first
- `00-product-spec.md` §4.1, §6.5, §7
- `01-architecture.md` §6.3 (dialogs with their own URL)
- T06 (`planPatternChange`), T08 (`planReconcileForPerson`)

## Deliverables
1. **Opening the dialog (search params, no special routes):**
   - `(app)/page.tsx` checks the `profile` and `person` params. If `profile=me`, or `person=<id>` and `canEditProfileOf(actor, subject)`, it loads that person's profile data (`src/server/queries/profile.ts`) and renders `<ProfileDialog open>` next to the grid.
   - If the actor isn't allowed to see `person=<id>`, ignore the param and show a toast "You can't view that profile". Don't render anything sensitive.
   - Closing the dialog removes the params through nuqs. Opening uses `history: "push"`, so the browser Back button closes it too.
   - The `tab` URL param selects the tab: `details | pattern | history | upcoming`.
2. **`ProfileDialog` shell:**
   - Title "My profile" or "{Name}'s profile". A header with avatar, display name, email, employee number (Geist Mono), BU and team.
   - Tabs: Details, Working pattern, Leave history, Upcoming leave. History and Upcoming are placeholders until T28.
3. **Details tab:**
   - A "Preferred first name" input: optional, 1–40 characters, letters plus space, hyphen and apostrophe (zod), with help text "Shown on the calendar instead of {firstName}". Saving an empty value clears it.
   - Read-only SSO fields with the note "Managed by your organisation's directory".
   - Server action `updatePreferredName(subjectId, value)`.
4. **Working pattern tab:**
   - A 7-row editor (Sun → Sat). Each row is a segmented radiogroup with Full day / Morning / Afternoon / Not working, plus a small visual preview strip.
   - It shows the **current** pattern and, if a change is pending, a notice: "Your new pattern starts on Sunday 15 November", with a "Cancel pending change" action.
   - Save button text: "Save — applies from Sunday 15 November".
   - Server action `updateWorkingPattern(subjectId, pattern)`:
     - `planPatternChange` → upsert the version;
     - then `planReconcileForPerson(person, futurePHs, effectiveFrom)` → `saveBookingChanges`;
     - all in one transaction, after `lockUsers(tx, [subjectId])`.
   - Cancelling the pending change deletes that version and reconciles again.
   - After saving, `authedAction`'s `refresh()` updates both the dialog and the grid. Show a toast "Working pattern saved. It applies from Sunday 15 November."
5. **Permissions:** self, the BU's admin, or a super admin. Everything is enforced in the actions.

## Tests
- Integration:
  - pattern change creates the version for the next Sunday; saving twice before Sunday replaces it; reconcile adds or removes future PH copies correctly;
  - cancelling pending works;
  - a USER can't update another user;
  - an ADMIN can update someone in their BU but not in another BU.
- Component: the pattern editor radiogroups; the pending notice; validation messages.
- E2E: open My profile from the user menu → the URL has `?profile=me` → change the preferred name → the grid shows the new name after closing → as an admin, open another user from the grid name link → change their pattern → a hard refresh keeps the dialog open → Back closes it. A USER visiting `?person=<someone else>` sees no dialog. Axe on each tab.

## Acceptance criteria
- One `ProfileDialog` component serves both "My profile" and the admin view; the dialog semantics and focus return are correct.
