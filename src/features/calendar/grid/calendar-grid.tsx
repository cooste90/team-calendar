"use client";

import { startTransition, useEffect, useOptimistic, useRef } from "react";
import { toast } from "sonner";
import { availabilityLookup } from "@/domain/availability";
import type { Period, View } from "@/domain/dates";
import { formatPeople, formatPeriodAnnouncement, formatPeriodTitle } from "@/domain/format";
import { buildGridModel, withGroupCollapsed } from "@/domain/grid-model";
import type { GridGroup } from "@/domain/grid-model-types";
import { type GridLayout, NAME_COLUMN, tabStopCell } from "@/domain/grid-navigation";
import { canEditBookingsFor, canManageBusinessUnit } from "@/domain/permissions";
import { setTeamCollapsed } from "@/server/actions/set-team-collapsed";
import type { CalendarData } from "@/server/queries/calendar";
import { useCalendarStore } from "../calendar-store";
import { ShortcutsHelpDialog } from "../shortcuts-help-dialog";
import { DayHeaderRow } from "./day-header";
import { NoTeamsMessage } from "./no-teams-message";
import { TeamGroup } from "./team-group";
import { useGridKeyboard } from "./use-grid-keyboard";

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
  const announce = useCalendarStore((store) => store.announce);
  // The server's collapsed teams, plus any clicks still being saved, so a click shows at
  // once. React drops the pending ones when the save finishes: by then the refreshed
  // page has the saved list, and if the save failed, the team springs back.
  const [collapsedTeamIds, collapseOptimistically] = useOptimistic(
    data.collapsedTeamIds,
    (ids: string[], change: { groupId: string; collapsed: boolean }) =>
      withGroupCollapsed(ids, change.groupId, change.collapsed),
  );

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
    collapsedTeamIds,
    filters,
  });

  function toggleGroup(group: GridGroup) {
    const collapsed = !group.collapsed;
    // Focus stays on the button; tell screen readers how many rows came or went.
    const people = formatPeople(group.memberCount);
    if (collapsed) {
      announce(`${group.name} collapsed, ${people} hidden.`);
    } else {
      announce(`${group.name} expanded, ${people} shown.`);
    }
    startTransition(async () => {
      collapseOptimistically({ groupId: group.id, collapsed });
      const result = await setTeamCollapsed({ groupId: group.id, collapsed });
      if (!result.ok) toast.error(result.error.message);
    });
  }

  // Keyboard focus: the cells the arrow keys can visit, and the one in the Tab order
  // (accessibility §3). It starts on the viewer's row, today.
  const canManage = canManageBusinessUnit(viewer, data.businessUnitId);
  const dates = model.columns.map((column) => column.date);
  const layout: GridLayout = {
    personIds: model.groups.flatMap((group) => group.rows.map((row) => row.personId)),
    columns: canManage ? [NAME_COLUMN, ...dates] : dates,
  };
  const focusedCell = useCalendarStore((store) => store.focusedCell);
  const tabStop = tabStopCell(layout, focusedCell, { personId: viewer.id, column: data.today });
  const { gridRef, onKeyDown, onFocus } = useGridKeyboard({ layout, tabStop, view, period });

  // Tell screen readers when the period changes, however it was changed.
  const periodText = formatPeriodAnnouncement(view, period);
  const announcedPeriod = useRef(periodText);
  useEffect(() => {
    if (announcedPeriod.current === periodText) return;
    announcedPeriod.current = periodText;
    announce(periodText);
  }, [periodText, announce]);

  // Every row uses the same columns: the name, then two half-day tracks per day.
  const template = `var(--name-col) repeat(${model.columns.length * 2}, minmax(0, 1fr))`;
  const compact = view === "month";
  const hasTeams = data.teams.length > 0;
  // A BU with no teams shows just the message, unless an admin has Unassigned people
  // to see.
  const showGrid = hasTeams || model.groups.length > 0;

  return (
    <>
      {!hasTeams && <NoTeamsMessage canManage={canManage} />}
      {showGrid && (
        // scroll-padding matches the sticky header and name column, so a focused cell is
        // never scrolled underneath them (WCAG 2.4.11).
        <section
          aria-label="Calendar"
          className="mx-5 mb-6 max-h-[calc(100dvh-9.5rem)] scroll-pt-[3.375rem] scroll-pl-[var(--name-col)] overflow-auto rounded-2xl border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
        >
          <div
            role="grid"
            ref={gridRef}
            aria-label={`Team calendar, ${formatPeriodTitle(view, period)}`}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            // A new key on each view change restarts the 150ms fade-in (design system §6).
            key={view}
            className="fade-in min-w-[56.25rem] animate-in duration-150"
          >
            <DayHeaderRow columns={model.columns} template={template} compact={compact} />
            {model.groups.map((group) => (
              <TeamGroup
                key={group.id}
                group={group}
                template={template}
                compact={compact}
                canOpenProfiles={canManage}
                tabStop={tabStop}
                onToggle={() => toggleGroup(group)}
              />
            ))}
          </div>
        </section>
      )}
      <ShortcutsHelpDialog />
    </>
  );
}
