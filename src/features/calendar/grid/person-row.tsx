import { cn } from "cn";
import type { GridRow } from "@/domain/grid-model-types";
import { GridBar } from "./grid-bar";
import { GridCell } from "./grid-cell";

// One person: their sticky name, a cell per day, and the bars and day-off stripes laid
// over the cells. Everything sits in the same grid row, placed by grid-column.
export function PersonRow({
  row,
  template,
  compact,
}: {
  row: GridRow;
  template: string;
  compact: boolean;
}) {
  return (
    <div
      role="row"
      data-viewer={row.isViewer || undefined}
      style={{ gridTemplateColumns: template }}
      className={cn("grid min-h-[2.625rem] border-border-soft border-t", row.isViewer && "bg-me")}
    >
      <div
        role="rowheader"
        className={cn(
          "sticky left-0 z-[5] col-start-1 row-start-1 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap border-r px-3.5 font-medium",
          row.isViewer ? "bg-me font-[650]" : "bg-surface",
        )}
      >
        <span className="truncate">{row.displayName}</span>
        {row.isViewer && (
          <span className="rounded-full bg-primary-solid px-2 py-px font-semibold text-[0.6875rem] text-on-primary">
            You
          </span>
        )}
      </div>
      {row.cells.map((cell) => (
        <GridCell key={cell.date} cell={cell} isViewer={row.isViewer} />
      ))}
      {row.bars.map((bar) => (
        <GridBar key={bar.bookingId} bar={bar} compact={compact} />
      ))}
      {row.offOverlays.map((overlay) => (
        <span
          key={overlay.gridColumn}
          aria-hidden="true"
          style={{ gridColumn: overlay.gridColumn }}
          className={cn(
            "pointer-events-none z-[3] row-start-1 self-center bg-bar-hatch",
            compact ? "h-7" : "h-[1.875rem]",
          )}
        />
      ))}
    </div>
  );
}
