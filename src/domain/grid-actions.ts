// What the grid offers on a cell or a booking (spec §5.6): which buttons to show. The
// server checks every rule again when a button is used.
import type { CalendarDate } from "./dates";
import type { Booking } from "./events";
import type { GridCell, GridModel, GridRow } from "./grid-model-types";
import type { Role } from "./permissions";
import type { HalfDay, Portion } from "./slots";
import { allowedEdits, earliestCreatableDate } from "./time-rules";

// A person's row and their cell on a date, or null if they aren't on the grid.
export function findCell(
  model: GridModel,
  personId: string,
  date: CalendarDate,
): { row: GridRow; cell: GridCell } | null {
  for (const group of model.groups) {
    const row = group.rows.find((item) => item.personId === personId);
    const cell = row?.cells.find((item) => item.date === date);
    if (row && cell) return { row, cell };
  }
  return null;
}

// Can the viewer add a booking, or a day swap, for this person on this date? `canEdit`
// says whether they may book for the person at all (canEditBookingsFor).
export function canAddOn(
  canEdit: boolean,
  role: Role,
  date: CalendarDate,
  today: CalendarDate,
): boolean {
  return canEdit && date >= earliestCreatableDate(role, today);
}

// The halves of a day that nothing is booked on yet, given the part of the day each
// booking on it covers.
export function freeHalves(portions: Portion[]): HalfDay[] {
  if (portions.includes("FULL")) return [];
  const halves: HalfDay[] = ["AM", "PM"];
  return halves.filter((half) => !portions.includes(half));
}

export type BookingActions = {
  edit: boolean;
  delete: boolean; // only before it starts
  trim: boolean; // "Delete remaining days", once it has started
  removeDay: boolean; // "Remove this day", for a booking over several days
};

// The buttons a booking's details show, for the date that was clicked.
export function bookingActions(
  booking: Booking,
  date: CalendarDate,
  canEdit: boolean,
  today: CalendarDate,
): BookingActions {
  const edits = canEdit ? allowedEdits(booking, today) : "none";
  const severalDays = booking.startDate !== booking.endDate;
  return {
    edit: edits !== "none",
    delete: edits === "all",
    trim: edits === "end-and-notes",
    removeDay: edits !== "none" && severalDays && date >= today,
  };
}
