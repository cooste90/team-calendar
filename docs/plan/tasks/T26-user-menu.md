# T26 — User menu and theme selector

**Phase:** 5 · **Depends on:** T25 · **Size:** S

## Goal
The avatar menu from the mockup: who you are, theme choice, and links to your profile and admin.

## Read first
- `00-product-spec.md` §8
- `03-accessibility.md` §2 (user menu)
- Mockup "App" (click the PS avatar)

## Deliverables
1. **`features/calendar/header/UserMenu`** (Radix DropdownMenu):
   - The trigger is an avatar with initials and a gradient (as in the mockup), labelled "User menu for {display name}".
   - The header block shows the display name, email, and "{BU} · {team or Unassigned} · {role label}".
   - **Theme:** `DropdownMenuRadioGroup` with Light / Dark / System (next-themes `setTheme`, icons as in the mockup). It is remembered on the device.
   - **My profile**: sets `?profile=me` (opens the profile dialog from T27).
   - **Admin**: only for ADMIN or SUPER_ADMIN, sets `?admin=teams`.
   - **Sign out**: calls the T11 action.
2. Put it in the header slot from T15. It stays visible in the narrow header; it is never moved into "More".
3. **Role labels:** "Admin" and "Super admin". Nothing is shown for users.

## Tests
- Component: Admin is only visible for admin roles; the theme radio reflects and sets the theme; the menu semantics (`menuitemradio`).
- E2E: switch to dark → reload → still dark; axe with the menu open in both themes.

## Acceptance criteria
- Matches the mockup and is fully keyboard operable (arrows, Esc, typeahead).
