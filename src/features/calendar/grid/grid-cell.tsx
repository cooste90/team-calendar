import type { WorkDay } from "@/domain/availability";
import type { GridCell as GridCellModel } from "@/domain/grid-model-types";

// Hatching shows the hours someone doesn't work: the whole day, or the afternoon
// (morning-only day) or the morning (afternoon-only day).
const HATCH: Record<WorkDay, string> = {
  FULL: "",
  OFF: "bg-hatch",
  AM: "bg-hatch-right",
  PM: "bg-hatch-left",
};

// The element id of the grid cell (or name) that's in the Tab order. The layout's
// "Skip to calendar" link jumps to it (accessibility §1).
export const CALENDAR_FOCUS_ID = "calendar-focus";

type Props = {
  cell: GridCellModel;
  personId: string;
  isViewer: boolean;
  isTabStop: boolean;
};

// One person on one day. Its accessible name says everything about that day, so screen
// reader users never need the bars. Actions on the cell come in T25.
export function GridCell({ cell, personId, isViewer, isTabStop }: Props) {
  return (
    <div
      role="gridcell"
      aria-label={cell.accessibleLabel}
      data-person={personId}
      data-column={cell.date}
      tabIndex={isTabStop ? 0 : -1}
      id={isTabStop ? CALENDAR_FOCUS_ID : undefined}
      data-today={cell.isToday || undefined}
      data-availability={cell.availability}
      style={{ gridColumn: cell.gridColumn }}
      // A plain join, not cn(): cn would treat the hatch and the today colour as clashing
      // "bg-" classes and drop the hatch, but here they combine (stripes over a tint).
      className={[
        "row-start-1 min-h-(--person-row-height) min-w-0 border-border-soft border-l hover:bg-cell-hover",
        HATCH[cell.availability],
        todayTint(cell.isToday, isViewer),
      ].join(" ")}
    />
  );
}

// Today's column; where it crosses your own row it gets a stronger "crosshair" tint.
function todayTint(isToday: boolean, isViewer: boolean) {
  if (!isToday) return "";
  return isViewer ? "bg-me-today" : "bg-today";
}
