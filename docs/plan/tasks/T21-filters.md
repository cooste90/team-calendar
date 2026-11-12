# T21 — Team and person filter builders

**Phase:** 3 · **Depends on:** T20 · **Size:** M

## Goal
Multi-select team and person filters, stored in the URL, that feel fast and are fully accessible.

## Read first
- `00-product-spec.md` §2.4
- `02-design-system.md` §7 (FilterBuilder)
- `03-accessibility.md` §2 (filters)
- The shadcn Command (cmdk) docs, and nuqs `parseAsArrayOf`

## Deliverables
1. **`FilterBuilder` component** (generic, in `features/calendar/filters/`):
   - The trigger button shows an icon, the label ("Teams" / "People") and a count badge when active. Its accessible name is "Teams, 2 selected".
   - The popover contains:
     - a search input;
     - a list of checkable options (`aria-multiselectable`), with people grouped by team in the person filter;
     - selected chips at the top, each with a "Remove {name}" button;
     - footer actions "Clear" and "Done".
   - Keyboard: type to filter, ↑↓ to move, Space/Enter to toggle, Esc to close and return focus to the trigger.
2. **`TeamFilter` and `PersonFilter`**, wired to the nuqs `teams` / `people` arrays. Options come from the current calendar data (current BU only). Changing BU clears both (already done in T15; check it).
3. **Active filter summary:**
   - The sub-header context line shows "Filtered: Service Design, Finance Operations · 2 people", with a "Clear filters" link.
   - The grid shows a friendly empty state when the filters match nobody.
4. The grid applies the filters through the T09 model (union semantics). Check that keyboard focus recovers (T18) when the focused row is filtered out.
5. Under the narrow header, filters move into the "More" menu, opening as dialogs.

## Tests
- Component: selecting updates the URL; chips remove selections; search narrows the options; the badge count; the accessible names.
- E2E: filter two teams → only those rows; add one person from another team → that person appears too (union); reload → filters persist (URL); clear; axe with the popover open.

## Acceptance criteria
- No filters on a fresh open (spec §2.2), unless they're in the URL.
- Filter changes render in under 50ms on a BU of about 300 people (no refetch needed).
