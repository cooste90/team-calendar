# T20 — Key popover and keyboard shortcuts help

**Phase:** 3 · **Depends on:** T19 · **Size:** S

## Goal
The header Key button shows the leave types on hover, focus or click, accessibly.

## Read first
- `00-product-spec.md` §2.1 (Key), §3
- `03-accessibility.md` §1 (1.4.13), §2
- Mockup "App" (hover over Key)

## Deliverables
1. **`features/calendar/key/KeyPopover`:**
   - The trigger is a button labelled "Key" with an icon and `aria-expanded`.
   - It opens on **pointer hover** (with a small open/close delay), on **keyboard focus**, and on **click or tap**. A click "pins" it open until Esc, an outside click, or another click. Use a Radix Popover with controlled `open` state and hover handlers, or a HoverCard plus a click fallback. Whichever is used, it must meet WCAG 1.4.13:
     - **dismissible:** Esc closes it without moving the pointer;
     - **hoverable:** the pointer can move into the content without it closing;
     - **persistent:** it stays open until dismissed or until hover/focus leaves.
   - Content:
     - heading "Leave types";
     - a list of 9 `LeaveChip` + label pairs (two columns);
     - a swatch for "Not a working day" (hatch);
     - "Half days: morning on the left, afternoon on the right";
     - a "Keyboard shortcuts" link button that opens the T18 help dialog.
2. Put it in the header slot reserved in T15, and in the "More" menu when the header is narrow. There, it opens as a dialog instead of a hover popover.

## Tests
- Component: opens on hover, focus and click; Esc closes it and returns focus to the trigger; the content stays open while hovered; the list has 9 items with codes and labels.
- E2E: axe with the popover open in both themes.

## Acceptance criteria
- Meets 1.4.13 and 2.1.1 (manual check written up in `progress.md`).
