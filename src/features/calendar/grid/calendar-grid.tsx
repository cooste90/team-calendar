"use client";

import { availabilityLookup } from "@/domain/availability";
import type { Period, View } from "@/domain/dates";
import { formatPeriodTitle } from "@/domain/format";
import { buildGridModel } from "@/domain/grid-model";
import { canEditBookingsFor } from "@/domain/permissions";
import type { CalendarData } from "@/server/queries/calendar";
import { DayHeader } from "./day-header";
import { PersonRow } from "./person-row";
import { TeamGroupRow } from "./team-group-row";

type Props = {
  data: CalendarData;
  view: View;
  period: Period;
  filters: { teamIds: string[]; personIds: string[] };
};

// The calendar grid (architecture §9). buildGridModel works out everything; the
// components below only turn the model into elements.
export function CalendarGrid({ data, view, period, filters }: Props) {
  const { viewer } = data;
  const model = buildGridModel({
    view,
    period,
    today: data.today,
    viewer: {
      id: viewer.id,
      teamId: viewer.teamId,
      canSeeUnassigned: viewer.canSeeUnassigned,
      canEdit: (person) =>
        canEditBookingsFor(viewer, {
          ...person,
          businessUnitId: data.businessUnitId,
        }),
    },
    teams: data.teams,
    // Functions can't come from the server, so each lookup is built here.
    people: data.people.map((person) => ({
      ...person,
      availability: availabilityLookup(person.patterns, person.overrides),
    })),
    bookings: data.bookings,
    publicHolidays: data.publicHolidays,
    collapsedTeamIds: data.collapsedTeamIds,
    filters,
  });

  // Every row uses the same columns: the name, then two half-day tracks per day.
  const template = `var(--name-col) repeat(${model.columns.length * 2}, minmax(0, 1fr))`;
  const compact = view === "month";

  return (
    <section
      aria-label="Calendar"
      // The box scrolls both ways, so keyboard users must be able to focus it to scroll
      // (WCAG 2.1.1). T18 moves focus onto the cells, and this can then go.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable.
      tabIndex={0}
      className="mx-5 mb-6 max-h-[calc(100dvh-9.5rem)] scroll-pt-[3.375rem] scroll-pl-[var(--name-col)] overflow-auto rounded-2xl border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <div
        role="grid"
        aria-label={`Team calendar, ${formatPeriodTitle(view, period)}`}
        // A new key on each view change restarts the 150ms fade-in (design system §6).
        key={view}
        className="fade-in min-w-[56.25rem] animate-in duration-150"
      >
        <div
          role="row"
          style={{ gridTemplateColumns: template }}
          className="sticky top-0 z-10 grid min-h-[3.375rem] border-b bg-surface"
        >
          <div
            role="columnheader"
            className="sticky left-0 z-20 col-start-1 row-start-1 flex items-center border-r bg-surface px-3.5 font-medium text-muted-foreground text-xs"
          >
            Team / person
          </div>
          {model.columns.map((column) => (
            <DayHeader key={column.date} column={column} compact={compact} />
          ))}
        </div>
        {model.groups.map((group) => (
          // content-visibility lets the browser skip drawing teams that are off-screen.
          <div
            role="rowgroup"
            key={group.id}
            className="[contain-intrinsic-size:auto_20rem] [content-visibility:auto]"
          >
            <TeamGroupRow group={group} />
            {group.rows.map((row) => (
              <PersonRow key={row.personId} row={row} template={template} compact={compact} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
