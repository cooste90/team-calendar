// Turns the calendar data into exactly what the grid draws (architecture §9): columns,
// team groups, person rows, cells, bars and hatching. React only maps this to the DOM.
//
// Grid columns: column 1 is the name column, then each day takes two columns, AM then
// PM. So day 0's AM is column 2, its PM column 3, day 1's AM column 4, and so on.
import type { WorkDay } from "./availability";
import { countWorkingDays, nonWorkingSlots } from "./counting";
import { displayFirstName, displayName } from "./display-name";
import type { Booking } from "./events";
import {
  formatCount,
  formatLongRange,
  formatWeekdayDayMonth,
  formatWeekdayShort,
  PORTION_SUFFIX,
} from "./format";
import type {
  GridBar,
  GridCell,
  GridColumn,
  GridGroup,
  GridInput,
  GridModel,
  GridPerson,
  GridRow,
} from "./grid-model-types";
import { leaveTypes } from "./leave-types";
import { intersect, isSingleDay, portionOf, rangeOf, type SlotRange, toSlot } from "./slots";

export const UNASSIGNED_GROUP_ID = "unassigned";

// The list of collapsed groups after collapsing or expanding one, with no duplicates.
export function withGroupCollapsed(ids: string[], groupId: string, collapsed: boolean): string[] {
  const others = ids.filter((id) => id !== groupId);
  return collapsed ? [...others, groupId] : others;
}

const collator = new Intl.Collator("en-GB");

const availabilityText: Record<WorkDay, string> = {
  FULL: "",
  OFF: ", not a working day",
  AM: ", morning only",
  PM: ", afternoon only",
};

// "Annual leave, Monday 9 to Wednesday 11 November, 3 days" or
// "Annual leave, Thursday 12 November, morning, 0.5 days"
function describeBooking(booking: Booking, range: SlotRange, count: number): string {
  const halfText = isSingleDay(range) ? PORTION_SUFFIX[portionOf(range)] : "";
  const dates = formatLongRange(booking.startDate, booking.endDate);
  return `${leaveTypes[booking.type].label}, ${dates}${halfText}, ${formatCount(count)}`;
}

export function buildGridModel(input: GridInput): GridModel {
  const { period, today, viewer, filters } = input;
  const visible: SlotRange = { start: toSlot(period.from, "AM"), end: toSlot(period.to, "PM") };
  const column = (slot: number) => 2 + slot - visible.start;
  const holidayNames = new Map(input.publicHolidays.map((holiday) => [holiday.date, holiday.name]));

  const columns = period.days.map((date, index): GridColumn => {
    const holidayName = holidayNames.get(date) ?? null;
    const label =
      formatWeekdayDayMonth(date) +
      (date === today ? ", today" : "") +
      (holidayName ? `, public holiday: ${holidayName}` : "");
    return {
      date,
      gridColumn: `${2 + index * 2} / span 2`,
      isToday: date === today,
      header: {
        weekdayShort: formatWeekdayShort(date),
        dayNumber: Number(date.slice(8)),
        accessibleLabel: label,
        publicHolidayName: holidayName,
      },
    };
  });

  // Worked out once per grid, not once per row.
  const dayRanges = period.days.map((date) => ({
    start: toSlot(date, "AM"),
    end: toSlot(date, "PM"),
  }));
  const dayLabels = period.days.map(formatWeekdayDayMonth);

  // Each person's bookings that show in this period.
  const bookingsByPerson = new Map<string, Booking[]>();
  for (const booking of input.bookings) {
    if (!intersect(rangeOf(booking), visible)) continue;
    const list = bookingsByPerson.get(booking.userId) ?? [];
    list.push(booking);
    bookingsByPerson.set(booking.userId, list);
  }

  function buildRow(person: GridPerson): GridRow {
    const lookup = person.availability;
    // Each booking's range, day count and description, worked out once (in date order).
    const items = (bookingsByPerson.get(person.id) ?? [])
      .map((booking) => {
        const range = rangeOf(booking);
        const count = countWorkingDays(range, lookup);
        return { booking, range, count, description: describeBooking(booking, range, count) };
      })
      .sort((a, b) => a.range.start - b.range.start);
    const name = displayName(person);
    const canEdit = viewer.canEdit(person);

    const cells = period.days.map((date, index): GridCell => {
      const onDay = items.flatMap((item) => {
        const overlap = intersect(item.range, dayRanges[index]);
        return overlap ? [{ ...item, portion: portionOf(overlap) }] : [];
      });
      const availability = lookup(date);
      const bookingText = onDay.map((item) => ` ${item.description}.`).join("");
      return {
        date,
        gridColumn: columns[index].gridColumn,
        availability,
        isToday: date === today,
        bookings: onDay.map(({ booking, portion }) => ({
          bookingId: booking.id,
          type: booking.type,
          portion,
        })),
        accessibleLabel: `${dayLabels[index]}, ${name}${availabilityText[availability]}.${bookingText}${canEdit ? "" : " View only."}`,
      };
    });

    const bars = items.map(({ booking, range, count, description }): GridBar => {
      const shown = intersect(range, visible) as SlotRange; // every booking here overlaps the period
      const code = leaveTypes[booking.type].code;
      const isHalf = range.start === range.end;
      return {
        bookingId: booking.id,
        type: booking.type,
        code,
        gridColumn: `${column(shown.start)} / span ${shown.end - shown.start + 1}`,
        label: isSingleDay(range) ? code : `${code} · ${formatCount(count)}`,
        clippedStart: range.start < visible.start,
        clippedEnd: range.end > visible.end,
        isHalf,
        isNarrow: isHalf && input.view === "month",
        title: description,
      };
    });

    // Hatching for days off inside bars that cover more than one day.
    const offOverlays = items
      .filter((item) => !isSingleDay(item.range))
      .flatMap((item) => nonWorkingSlots(intersect(item.range, visible) as SlotRange, lookup))
      .map((slot) => ({ gridColumn: `${column(slot)} / span 1` }));

    return {
      personId: person.id,
      displayName: name,
      isViewer: person.id === viewer.id,
      canEdit,
      cells,
      bars,
      offOverlays,
    };
  }

  const filtersActive = filters.teamIds.length > 0 || filters.personIds.length > 0;
  const shown = input.people.filter(
    (person) =>
      !filtersActive ||
      (person.teamId !== null && filters.teamIds.includes(person.teamId)) ||
      filters.personIds.includes(person.id),
  );

  function makeGroup(id: string, name: string, teamId: string | null): GridGroup {
    const members = shown
      .filter((person) => person.teamId === teamId)
      .sort(
        (a, b) =>
          collator.compare(a.surname, b.surname) ||
          collator.compare(displayFirstName(a), displayFirstName(b)),
      );
    const collapsed = input.collapsedTeamIds.includes(id);
    return {
      id,
      name,
      isViewerTeam: teamId !== null && teamId === viewer.teamId,
      isUnassigned: teamId === null,
      memberCount: members.length,
      collapsed,
      rows: collapsed ? [] : members.map(buildRow),
    };
  }

  // The viewer's own team first, then the rest in admin order, then Unassigned (admins only).
  const teams = [...input.teams].sort((a, b) => a.sortOrder - b.sortOrder);
  const ordered = [
    ...teams.filter((team) => team.id === viewer.teamId),
    ...teams.filter((team) => team.id !== viewer.teamId),
  ];
  const groups = ordered.map((team) => makeGroup(team.id, team.name, team.id));
  if (viewer.canSeeUnassigned) groups.push(makeGroup(UNASSIGNED_GROUP_ID, "Unassigned", null));

  return {
    columns,
    groups: filtersActive ? groups.filter((group) => group.memberCount > 0) : groups,
  };
}
