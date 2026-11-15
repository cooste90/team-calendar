import { cn } from "cn";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { GridRow } from "@/domain/grid-model-types";
import { NAME_COLUMN } from "@/domain/grid-navigation";
import { serializeCalendarParams } from "@/lib/search-params";
import { GridBar } from "./grid-bar";
import { CALENDAR_FOCUS_ID, GridCell } from "./grid-cell";

type Props = {
  row: GridRow;
  template: string;
  compact: boolean;
  // Admins get a link to the person's profile (spec §2.3); regular users get plain text.
  canOpenProfile: boolean;
  // The column in this row that's in the Tab order, if this row has it.
  tabStopColumn: string | null;
};

// One person: their sticky name, a cell per day, and the bars and day-off stripes laid
// over the cells. Everything sits in the same grid row, placed by grid-column.
export function PersonRow({ row, template, compact, canOpenProfile, tabStopColumn }: Props) {
  return (
    <div
      role="row"
      data-viewer={row.isViewer || undefined}
      style={{ gridTemplateColumns: template }}
      className={cn(
        "grid min-h-(--person-row-height) border-border-soft border-t",
        row.isViewer && "bg-me",
      )}
    >
      <div
        role="rowheader"
        className={cn(
          "sticky left-0 z-[5] col-start-1 row-start-1 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap border-r px-3.5 font-medium",
          row.isViewer ? "bg-me font-[650]" : "bg-surface",
        )}
      >
        {canOpenProfile ? (
          <ProfileLink
            personId={row.personId}
            name={row.displayName}
            isTabStop={tabStopColumn === NAME_COLUMN}
          />
        ) : (
          <span className="truncate">{row.displayName}</span>
        )}
        {row.isViewer && (
          <span className="rounded-full bg-primary-solid px-2 py-px font-semibold text-[0.6875rem] text-on-primary">
            You
          </span>
        )}
      </div>
      {row.cells.map((cell) => (
        <GridCell
          key={cell.date}
          cell={cell}
          personId={row.personId}
          isViewer={row.isViewer}
          isTabStop={tabStopColumn === cell.date}
        />
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

// The person's name as a link that opens their profile (?person=), keeping the rest of
// the URL. T27 builds the profile dialog. It's part of the grid's arrow-key navigation
// (← from the first day), so only one name at a time is in the Tab order.
type ProfileLinkProps = { personId: string; name: string; isTabStop: boolean };

function ProfileLink({ personId, name, isTabStop }: ProfileLinkProps) {
  const searchParams = useSearchParams();
  const href = `/${serializeCalendarParams(searchParams, { person: personId })}` as Route;
  return (
    <Link
      href={href}
      scroll={false}
      data-person={personId}
      data-column={NAME_COLUMN}
      tabIndex={isTabStop ? 0 : -1}
      id={isTabStop ? CALENDAR_FOCUS_ID : undefined}
      // py-1 makes it at least 24px tall, the minimum target size (WCAG 2.5.8).
      className="truncate rounded-sm py-1 underline-offset-4 hover:underline"
    >
      {name}
    </Link>
  );
}
