import { cn } from "cn";
import type { GridBar as GridBarModel } from "@/domain/grid-model-types";
import { leaveTypes } from "@/domain/leave-types";
import { useCalendarStore } from "../calendar-store";

// A coloured booking bar laid over the day cells. It's hidden from screen readers:
// the cells underneath already describe every booking (accessibility §3). Clicking it
// opens its details; the grid handles that click (use-cell-actions.ts), using data-booking.
export function GridBar({ bar, compact }: { bar: GridBarModel; compact: boolean }) {
  // A booking that's just been added grows into place once (design system §6). The
  // reduced-motion rule in globals.css makes the animation instant.
  // (One store subscription per bar: there can be about 900 of them.)
  const grows = useCalendarStore((store) => store.lastCreatedId === bar.bookingId);
  const stopGrowing = () => useCalendarStore.getState().setLastCreatedId(null);

  return (
    <div
      aria-hidden="true"
      title={bar.title}
      data-booking={bar.bookingId}
      data-clipped-start={bar.clippedStart || undefined}
      data-clipped-end={bar.clippedEnd || undefined}
      data-half={bar.isHalf || undefined}
      style={{ gridColumn: bar.gridColumn }}
      onAnimationEnd={grows ? stopGrowing : undefined}
      className={cn(
        leaveTypes[bar.type].className,
        "z-[2] row-start-1 flex min-w-0 cursor-pointer items-center self-center overflow-hidden whitespace-nowrap font-[650] tracking-[0.01em] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.05)] transition hover:-translate-y-px hover:saturate-[1.15]",
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
        grows && "animate-grow",
      )}
    >
      <span className="truncate">{bar.label}</span>
    </div>
  );
}
