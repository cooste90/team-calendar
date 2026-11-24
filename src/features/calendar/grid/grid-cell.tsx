import type { WorkDay } from "@/domain/availability";
import type { GridCell as GridCellModel } from "@/domain/grid-model-types";

// In Windows High Contrast, Chrome drops gradient backgrounds, which would lose the
// hatching. So hatched boxes keep their own colours there (the stripes are already the
// system's GrayText, see globals.css) and draw their border in the system text colour
// (T35). Only use it on empty boxes: forced-color-adjust is inherited, so any text
// inside would keep its normal colours too. (The date picker's hatched days have
// numbers in them, so they don't use it.)
export const KEEP_IN_HIGH_CONTRAST = "forced-color-adjust-none forced-colors:border-[CanvasText]";

// Hatching shows the hours someone doesn't work: the whole day, or the afternoon
// (morning-only day) or the morning (afternoon-only day). The profile's working pattern
// preview uses it too.
export const HATCH: Record<WorkDay, string> = {
  FULL: "",
  OFF: `bg-hatch ${KEEP_IN_HIGH_CONTRAST}`,
  AM: `bg-hatch-right ${KEEP_IN_HIGH_CONTRAST}`,
  PM: `bg-hatch-left ${KEEP_IN_HIGH_CONTRAST}`,
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
// reader users never need the bars. Clicks, Enter, Space and Delete are handled by the
// grid (use-cell-actions.ts and use-grid-keyboard.ts), using data-person and data-column.
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
        "row-start-1 min-h-(--person-row-height) min-w-0 cursor-pointer border-border-soft border-l hover:bg-cell-hover",
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
