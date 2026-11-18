# T26 — User menu and theme selector

**Phase:** 5 · **Depends on:** T25 · **Size:** S

**From T21:** the calendar page (`src/app/(app)/page.tsx`) renders `AppHeader`, not the layout. The page has the signed-in person (`actor`), so pass what the menu needs from there. Sign out is currently the last item in the header's right-hand group, in `app-header.tsx`.

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

## As built
- **The trigger's label is "User menu for Tom Okafor, TO".** It includes the initials people see, so axe's label-in-name rule (WCAG 2.5.3) passes and speech users can say "click TO". (Axe ignores text in brackets, so "(TO)" doesn't count.)
- **Dropdown menus aren't modal.** The shared `ui/dropdown-menu.tsx` wrapper now defaults to `modal={false}`, for this menu and More. A modal Radix menu marks the rest of the page `aria-hidden` while it can still be focused, which axe reports. Esc and clicking outside still close it.
- **The theme row** uses Radix's `RadioItem` directly, styled like the segmented control, without shadcn's tick. Up/Down arrows move through it like any other item. Choosing a theme keeps the menu open (`onSelect` calls `preventDefault`), so people can try each one.
- **My profile and Admin are links** (`?profile=me` / `?admin=teams`, built with `serializeCalendarParams` like the grid's profile links). A link adds a history entry, so Back will close the dialogs.
- **The details come from `getUserMenuDetails(actor, businessUnitName)`** (`src/server/queries/user-menu.ts`): name, initials, email, "BU · team · role" and `canOpenAdmin` (`canManageBusinessUnit` for the person's own BU). `initialsOf` and `roleLabel` are in `src/domain`.
