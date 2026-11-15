// Moving keyboard focus around the calendar grid (accessibility §3): which cell the arrow
// keys go to next, and which single cell is in the Tab order (the "roving tab stop").
import { weekday } from "./dates";

// Admins can open profiles, so their grid has the names as a column before the days.
export const NAME_COLUMN = "name";

// A focusable spot in the grid: a person's row and a column (a date, or NAME_COLUMN).
export type CellPosition = { personId: string; column: string };

// The rows and columns keyboard focus can visit, in screen order. Collapsed teams have
// no rows here; team rows aren't cells (their buttons are reached with Tab).
export type GridLayout = { personIds: string[]; columns: string[] };

export type NavigationKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Home"
  | "End"
  | "CtrlHome"
  | "CtrlEnd";

// Arrows move one step and stop at the edges. Home/End and Ctrl+Home/End go to the first
// or last *day*, so only the left arrow reaches the name column.
export function nextCell(layout: GridLayout, current: CellPosition, key: NavigationKey) {
  const row = layout.personIds.indexOf(current.personId);
  const column = layout.columns.indexOf(current.column);
  const lastRow = layout.personIds.length - 1;
  const lastColumn = layout.columns.length - 1;
  const firstDay = layout.columns[0] === NAME_COLUMN ? 1 : 0;

  function at(rowIndex: number, columnIndex: number): CellPosition {
    return { personId: layout.personIds[rowIndex], column: layout.columns[columnIndex] };
  }

  switch (key) {
    case "ArrowLeft":
      return at(row, Math.max(column - 1, 0));
    case "ArrowRight":
      return at(row, Math.min(column + 1, lastColumn));
    case "ArrowUp":
      return at(Math.max(row - 1, 0), column);
    case "ArrowDown":
      return at(Math.min(row + 1, lastRow), column);
    case "Home":
      return at(row, firstDay);
    case "End":
      return at(row, lastColumn);
    case "CtrlHome":
      return at(0, firstDay);
    case "CtrlEnd":
      return at(lastRow, lastColumn);
  }
}

// The cell that holds the tab stop. It's the last focused cell while that's still on
// screen. If its person is gone (collapsed or filtered out), `start` (the viewer on today)
// or the first person is used. If its date is gone (a new period), the same weekday in
// the new period is used, so PageDown on a Wednesday lands on a Wednesday.
// Null when there are no people to focus.
export function tabStopCell(
  layout: GridLayout,
  wanted: CellPosition | null,
  start: CellPosition,
): CellPosition | null {
  if (layout.personIds.length === 0) return null;
  return {
    personId: choosePerson(layout, wanted, start),
    column: chooseColumn(layout, wanted, start),
  };
}

function choosePerson(layout: GridLayout, wanted: CellPosition | null, start: CellPosition) {
  if (wanted && layout.personIds.includes(wanted.personId)) return wanted.personId;
  if (layout.personIds.includes(start.personId)) return start.personId;
  return layout.personIds[0];
}

function chooseColumn(layout: GridLayout, wanted: CellPosition | null, start: CellPosition) {
  if (wanted && layout.columns.includes(wanted.column)) return wanted.column;
  const days = layout.columns.filter((column) => column !== NAME_COLUMN);
  if (wanted && wanted.column !== NAME_COLUMN) {
    const sameWeekday = days.find((day) => weekday(day) === weekday(wanted.column));
    if (sameWeekday) return sameWeekday;
  }
  if (layout.columns.includes(start.column)) return start.column;
  return days[0];
}
