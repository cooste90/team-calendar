# T29 — Admin dialog shell and Teams tab

**Phase:** 6 · **Depends on:** T28 · **Size:** M

**From T26:** the user menu's "Admin" item (admins and super admins only) already links to `?admin=teams` (`src/features/calendar/header/user-menu.tsx`). Nothing reads it yet.

**Decided with the product owner (2026-11-23):**
- **Only the Teams tab for now.** Users, Public holidays and Business units are hidden until T30–T32 add them, as T27 did with the profile's tabs. Until then any `admin` value opens Teams.
- **The look matches the profile dialog** (the mockup has no admin design): the same size, title, line tabs and full screen on phones. Screenshots are approved before merging.
- **Deleting always asks first,** even for an empty team ("Delete Legal? It has no members.").
- **A plain ADMIN viewing another BU** with `?admin=` gets no dialog and no message (the param is ignored).

## Goal
The admin dialog (modal with its own URL), and team management: create, rename, delete and reorder.

## Read first
- `00-product-spec.md` §1.4, §9
- `01-architecture.md` §6.3 (dialogs with their own URL)

## Deliverables
1. **Opening the dialog:** the same search-param pattern as T27. When `admin` is set, `(app)/page.tsx` loads the admin data and renders `<AdminDialog open tab={admin}>`.
   - Access: `canManageBusinessUnit(actor, bu)` for the **BU currently in the URL** (`bu` param). If not allowed, ignore the param.
   - Tabs come from the `admin` param itself: `teams | users | holidays | units` (units only for SUPER_ADMIN).
   - Header: "Admin · {BU name}". A SUPER_ADMIN gets a BU Select in the dialog header to switch which BU they administer (it updates `bu`).
2. **Teams tab:**
   - A list in `sortOrder`. Each row has the name, member count, and actions: Rename (inline edit), **Move up**, **Move down**, Delete. No drag and drop. After a move, keep focus on the moved team's button and announce its new position.
   - Unassigned is shown at the bottom, non-interactive, with the note "Built-in. New people land here."
   - "New team" form: name, 1–60 characters, unique within the BU (case-insensitive check plus a DB unique constraint). The team is added at the end.
   - **Delete:** an AlertDialog: "Delete Finance Operations? Its 4 members will move to Unassigned." Requires confirmation.
3. **Services and actions** (`src/server/services/teams.ts`):
   - `createTeam`, `renameTeam`, `moveTeam(teamId, "up" | "down")` (swaps `sortOrder` with its neighbour in a transaction), `deleteTeam` (sets members' `teamId = null` and deletes, in a transaction).
   - All of them check `canManageBusinessUnit`. `authedAction`'s `refresh()` updates the dialog and the grid.

## Tests
- Integration: CRUD; a duplicate name is rejected; moving the first team up (or the last down) does nothing; delete moves members to Unassigned; an ADMIN of another BU is forbidden; a SUPER_ADMIN is allowed for any BU.
- Component: Move up/down buttons reorder and announce ("Finance Operations moved to position 2 of 7"); the first row's Move up and the last row's Move down are disabled.
- E2E: create → rename → reorder with buttons → the grid order changes after closing → delete → its members appear under Unassigned for the admin. Axe on the tab, including the dialogs.

## Acceptance criteria
- Reordering is possible without dragging (2.5.7); Unassigned can't be edited.
