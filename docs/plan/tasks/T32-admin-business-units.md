# T32 — Business units tab (super admin)

**From T31:** `AdminDialog` (`src/features/admin/admin-dialog.tsx`) has Teams, Users and Public holidays tabs; `?admin=units` still opens Teams. Add the Business units trigger and its `tab` line (super admins only).

**Phase:** 6 · **Depends on:** T31 · **Size:** S

## Goal
Super admins manage business units: create, rename, toggle hidden and delete.

## Read first
- `00-product-spec.md` §1.3, §9 (Business units)

## Deliverables
1. **Services** (`src/server/services/business-units.ts`), `canManageBusinessUnits` only:
   - `createBusinessUnit(name)`: generates a unique slug.
   - `renameBusinessUnit(id, name)`: keeps the slug stable, unless you choose to regenerate it. If it regenerates, old `?bu=` links must redirect; simplest is to **keep the slug** (document this).
   - `setBusinessUnitHidden(id, hidden)`.
   - `deleteBusinessUnit(id)`: rejected with a friendly message while it has users or teams ("Move or delete its 42 people and 6 teams first").
2. **Tab UI** (visible only to SUPER_ADMIN): a table of BUs with name, people count, teams count, a Hidden switch (with the help text "Hidden units are only visible to their own members"), Rename and Delete. Plus "New business unit".
3. **Side effects:**
   - The header BU switcher and the sign-in dropdown reflect the changes.
   - When a BU becomes hidden, non-members currently viewing it get a 404 on their next fetch, and the client shows "This business unit is no longer available" and goes back to their own BU.

## Tests
- Integration: CRUD; delete is blocked with users; slug uniqueness; hidden visibility via `getVisibleBusinessUnits`.
- E2E: a super admin creates a BU → it appears on the sign-in dropdown (log out and check) → toggles hidden → a non-member user can't see it in the switcher. Axe.

## Acceptance criteria
- Only super admins can reach or perform any of this (server-enforced).
