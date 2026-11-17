// What one person's day on the grid holds and offers: its bookings, with the buttons each
// one gets, and whether the viewer can add to it. Clicks, keys and the cell popover all
// read it from here; the rules themselves are in src/domain/grid-actions.ts.
import { availabilityLookup } from "@/domain/availability";
import { countWorkingDays } from "@/domain/counting";
import type { CalendarDate } from "@/domain/dates";
import { formatRangeSummary } from "@/domain/format";
import {
  type BookingActions,
  bookingActions,
  canAddOn,
  findCell,
  freeHalves,
} from "@/domain/grid-actions";
import type { GridModel } from "@/domain/grid-model-types";
import { canEditProfileOf } from "@/domain/permissions";
import { type HalfDay, rangeOf } from "@/domain/slots";
import type { CalendarBooking, CalendarData } from "@/server/queries/calendar";

// A booking, with its dates and day count ("Mon 9 – Wed 11 · 3 days") and what the
// viewer can do with it.
export type BookingItem = { booking: CalendarBooking; summary: string; actions: BookingActions };

export type CellSummary = {
  date: CalendarDate;
  personId: string;
  personName: string;
  items: BookingItem[]; // the bookings that day
  canAdd: boolean; // can add a booking on this day
  freeHalves: HalfDay[]; // halves still free to add to, next to a booking
  canSetAvailability: boolean; // can set a day swap for this date (spec §4.2)
};

// Null if the person or date isn't on the grid.
export function describeCell(
  model: GridModel,
  data: CalendarData,
  personId: string,
  date: CalendarDate,
): CellSummary | null {
  const found = findCell(model, personId, date);
  const person = data.people.find((item) => item.id === personId);
  if (!found || !person) return null;
  const { row, cell } = found;
  const lookup = availabilityLookup(person.patterns, person.overrides);
  const canAdd = canAddOn(row.canEdit, data.viewer.role, date, data.today);
  const subject = { ...person, businessUnitId: data.businessUnitId };

  const items = cell.bookings.flatMap((summary): BookingItem[] => {
    const booking = data.bookings.find((each) => each.id === summary.bookingId);
    if (!booking) return [];
    const range = rangeOf(booking);
    return [
      {
        booking,
        summary: formatRangeSummary(range, countWorkingDays(range, lookup)),
        actions: bookingActions(booking, date, row.canEdit, data.today),
      },
    ];
  });
  const portions = cell.bookings.map((summary) => summary.portion);

  return {
    date,
    personId,
    personName: row.displayName,
    items,
    canAdd,
    // "Add to morning / afternoon" sits next to a booking; an empty day opens the form.
    freeHalves: canAdd && items.length > 0 ? freeHalves(portions) : [],
    canSetAvailability: canAdd && canEditProfileOf(data.viewer, subject),
  };
}
