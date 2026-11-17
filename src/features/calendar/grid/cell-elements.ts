// Finding grid cells in the page and moving focus to them. Each cell (and each admin's
// name link) carries data-person and data-column, so one handler on the grid serves all.
import type { CellPosition } from "@/domain/grid-navigation";
import { useCalendarStore } from "../calendar-store";

// Which cell an element is, from its data attributes. Null for anything else.
export function positionOf(target: EventTarget | null): CellPosition | null {
  if (!(target instanceof HTMLElement)) return null;
  const { person, column } = target.dataset;
  if (!person || !column) return null;
  return { personId: person, column };
}

// The element for a person and column, if it's on screen.
export function findGridCell(cell: CellPosition): HTMLElement | null {
  const selector = `[role="grid"] [data-person="${cell.personId}"][data-column="${cell.column}"]`;
  return document.querySelector<HTMLElement>(selector);
}

// Moves keyboard focus to a cell. scroll-padding on the scroll box keeps it clear of the
// sticky header and name column (WCAG 2.4.11).
export function focusGridCell(cell: CellPosition) {
  const element = findGridCell(cell);
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}

// Puts focus back on the cell the person was last on, when a popup over the grid closes
// (accessibility §1).
export function focusLastCell() {
  const cell = useCalendarStore.getState().focusedCell;
  if (cell) focusGridCell(cell);
}
