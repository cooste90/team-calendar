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

// One person on one day. Its accessible name says everything about that day, so screen
// reader users never need the bars. Keyboard focus and actions come in T18 and T25.
export function GridCell({ cell, isViewer }: { cell: GridCellModel; isViewer: boolean }) {
  return (
    <div
      role="gridcell"
      aria-label={cell.accessibleLabel}
      data-today={cell.isToday || undefined}
      data-availability={cell.availability}
      style={{ gridColumn: cell.gridColumn }}
      // A plain join, not cn(): cn would treat the hatch and the today colour as clashing
      // "bg-" classes and drop the hatch, but here they combine (stripes over a tint).
      className={[
        "row-start-1 min-h-[2.625rem] min-w-0 border-border-soft border-l hover:bg-cell-hover",
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
