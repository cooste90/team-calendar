import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GridColumn } from "@/domain/grid-model-types";

// One day at the top of the grid: "Thu" over "12", with today's date in a pill and a
// public holiday's name in a small chip. Its aria-label gives screen readers the full
// date instead ("Thursday 12 November, today").
export function DayHeader({ column, compact }: { column: GridColumn; compact: boolean }) {
  const { header } = column;
  return (
    <div
      role="columnheader"
      aria-label={header.accessibleLabel}
      data-today={column.isToday || undefined}
      style={{ gridColumn: column.gridColumn }}
      className={cn(
        "row-start-1 flex min-w-0 flex-col items-center justify-center gap-0.5 border-border-soft border-l py-1 font-medium text-[0.6875rem] text-muted-foreground",
        column.isToday && "bg-today text-foreground",
      )}
    >
      <span>{header.weekdayShort}</span>
      <b
        className={cn(
          "grid place-items-center rounded-full font-semibold text-foreground",
          compact ? "size-6 text-[0.8125rem]" : "size-7 text-[0.9375rem]",
          column.isToday && "bg-sunset text-on-sunset",
        )}
      >
        {header.dayNumber}
      </b>
      {header.publicHolidayName && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-hidden="true"
              className="max-w-full truncate rounded-chip bg-leave-ph px-1.5 font-semibold text-[0.625rem] text-leave-ph-fg"
            >
              {header.publicHolidayName}
            </span>
          </TooltipTrigger>
          <TooltipContent>{header.publicHolidayName}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
