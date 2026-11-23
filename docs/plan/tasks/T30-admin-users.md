# T30 — Admin Users tab: move team, delete user, move BU

**Phase:** 6 · **Depends on:** T29 · **Size:** M

**From T29:** `AdminDialog` (`src/features/admin/admin-dialog.tsx`) shows only the Teams tab, and any `admin` value opens it. Add the Users tab trigger, a `tab` prop from the `admin` param, and `onValueChange` that sets `admin` (as the profile dialog does with `tab`). The dialog's full-screen-on-phones classes are in their third copy (profile, booking form, admin); share them if a fourth appears.

## Goal
Admins can see everyone in the BU, grouped by team, move people between teams, open profiles and delete users. Super admins can also move people between BUs.

## Read first
- `00-product-spec.md` §1.3 (moving BU), §1.4, §9 (Users)
- `01-architecture.md` §3.3

## Deliverables
1. **Users tab:**
   - A search box filtering by name, email or employee number (a simple client-side `filter` on the list; one BU is small enough).
   - Sections per team (admin order), then **Unassigned**, each with a count.
   - Each row shows the avatar initials, display name (and "(First Surname)" if a preferred name is set), email, employee number, a role badge (Admin / Super admin), and:
     - a **Team** Select listing the BU's teams. Unassigned is **not** an option (spec §1.4). For someone currently unassigned the Select shows the placeholder "Choose team…";
     - **Open profile** (sets `?person=<id>`, which swaps the admin dialog for the profile dialog);
     - **Delete** (destructive);
     - for SUPER_ADMIN only, **Move to business unit…** (a dialog with a BU Select and the note "They'll keep their bookings and start in Unassigned").
2. **Delete user flow:**
   - An AlertDialog: "Delete {Name}? This permanently removes them and all their bookings (past and future). If they sign in again, they'll start as a new user."
   - Type-to-confirm with their surname. The delete button is disabled until it matches.
   - An admin **can't delete themselves**: the button is disabled with a tooltip.
3. **Services** (`src/server/services/users.ts`):
   - `moveUserToTeam(actor, userId, teamId)`: the team must be in the subject's BU, and the actor must manage that BU.
   - `deleteUser(actor, userId)`: a cascade delete in a transaction. It also deletes their Better Auth sessions, so an active session ends at once.
   - `moveUserToBusinessUnit(actor, userId, buId)`: SUPER_ADMIN only; sets `teamId = null`.
   - `authedAction`'s `refresh()` updates the dialog and the grid after each one.

## Tests
- Integration:
  - moving to a team in another BU is rejected;
  - delete cascades and removes sessions (the deleted user's next request → 401);
  - self-delete is rejected;
  - BU move keeps the bookings and sets the team to null;
  - a non-super-admin BU move is forbidden.
- Component: the team Select options exclude Unassigned; type-to-confirm gating; search.
- E2E: an admin moves an Unassigned person into a team → they appear in that team on the grid; delete a user → they disappear; a super admin moves a user to another BU → they appear in that BU's Unassigned. Axe.

## Acceptance criteria
- Spec §9 Users is fully covered; destructive actions always confirm and explain the consequences.
