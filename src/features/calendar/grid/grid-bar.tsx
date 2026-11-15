import { cn } from "cn";
import type { GridBar as GridBarModel } from "@/domain/grid-model-types";
import { leaveTypes } from "@/domain/leave-types";

// A coloured booking bar laid over the day cells. It's hidden from screen readers:
// the cells underneath already describe every booking (accessibility §3).
export function GridBar({ bar, compact }: { bar: GridBarModel; compact: boolean }) {
  return (
    <div
      aria-hidden="true"
      title={bar.title}
      data-clipped-start={bar.clippedStart || undefined}
      data-clipped-end={bar.clippedEnd || undefined}
      data-half={bar.isHalf || undefined}
      style={{ gridColumn: bar.gridColumn }}
      className={cn(
        leaveTypes[bar.type].className,
        "z-[2] row-start-1 flex min-w-0 items-center self-center overflow-hidden whitespace-nowrap font-[650] tracking-[0.01em] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.05)] transition hover:-translate-y-px hover:saturate-[1.15]",
        "forced-colors:border forced-colors:border-[CanvasText]",
        compact
          ? "h-7 rounded-lg px-1.5 text-[0.6875rem]"
          : "h-[1.875rem] rounded-bar px-[9px] text-xs",
        bar.isHalf ? "mx-0.5 justify-center px-[3px]" : "mx-[3px]",
        bar.isHalf && compact && "mx-px rounded-md px-0 text-[0.59375rem] tracking-[-0.02em]",
        // A booking that carries on past the visible dates has a square, flush edge.
        bar.clippedStart && "ml-0 rounded-l-none",
        bar.clippedEnd && "mr-0 rounded-r-none",
        // Too thin to aim at (month-view half days): clicks go to the cell instead (WCAG 2.5.8).
        bar.isNarrow && "pointer-events-none",
      )}
    >
      <span className="truncate">{bar.label}</span>
    </div>
  );
}
