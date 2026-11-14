# T17 — Team groups: ordering, collapse persistence, Unassigned, admin links

**Phase:** 3 · **Depends on:** T16 · **Size:** M

## Goal
Complete the left-hand structure of the grid as described in spec §2.3 and §1.4.

## Read first
- `00-product-spec.md` §1.4, §2.3
- `03-accessibility.md` §3 (team rows)
- Mockup "App": team rows, the "Your team" tag, the "Visible to admins only" tag

## Deliverables
1. **`TeamGroupRow`** becomes a disclosure:
   - A button with `aria-expanded` and `aria-controls` (pointing to the group's rowgroup id).
   - It shows the chevron, team name and member count, plus a "Your team" tag (viewer's team) or a "Visible to admins only" tag (Unassigned).
   - Collapsing is instant. Only the chevron rotates (CSS transition).
2. **Persistence:**
   - A `toggleTeamCollapsed(teamId | "unassigned")` server action updates `User.collapsedTeamIds`.
   - The grid keeps a local `useState` copy of the collapsed ids (initialised from the server data), so the click responds instantly. It then calls the action in the background. That's the only bit of "optimistic" state in the app, and it's one `useState`.
   - `getCalendarData` already returns `collapsedTeamIds`, so the first paint is correct.
3. **Ordering:** the viewer's team is first, then the others by `sortOrder`, then Unassigned (only if `canSeeUnassigned`). This comes from the T09 model; just verify it with real data.
4. **Admin name links:** when `viewer.canManage` for that person's BU, the name renders as a link that sets `?person=<id>` (keeping the other params). T27 builds the dialog; until then the param does nothing, which is fine.
   - For regular users the name is plain text, not focusable.
5. **Unassigned viewer banner:**
   - If the actor is Unassigned (`actor.teamId === null`; T12 didn't add a separate `isUnassigned` flag), show a dismissible-for-session info banner above the grid: "An admin needs to add you to a team before you can book."
   - The viewer's own row isn't shown (spec §1.4). The cell-click booking entry point is disabled for them (enforced in T25).
6. **Empty states:**
   - A BU with no teams yet shows a friendly message (with an admin hint linking to Admin › Teams if the viewer is an admin).
   - A team with no members shows "No one in this team yet" when expanded.

## Tests
- Component: toggling calls the action and flips `aria-expanded`; collapsed groups render no person rows; the Unassigned group isn't rendered for users.
- Integration: the action persists, and the next `getCalendarData` (prefs) returns the collapsed ids.
- E2E: collapse a team → reload → still collapsed; an admin sees the Unassigned group and clickable names; a user doesn't; the unassigned user sees the banner.

## Acceptance criteria
- Collapse state survives reloads and devices (it's in the DB), with no flicker on load.
