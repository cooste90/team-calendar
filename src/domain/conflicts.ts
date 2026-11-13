// Clashes between bookings. A person can't have two bookings on the same half-day
// (spec §5.1). The services call findConflicts inside a locked transaction (architecture §3.2).
import type { CalendarDate } from "./dates";
import { PastLockedError } from "./errors";
import { type Booking, type BookingChanges, carveBooking, mergeChanges } from "./events";
import { formatShort } from "./format";
import { leaveTypes } from "./leave-types";
import {
  fromSlot,
  intersect,
  isSingleDay,
  portionOf,
  rangeOf,
  type SlotRange,
  toSlot,
} from "./slots";

// A clashing booking and the exact half-days that clash.
export type Conflict = { booking: Booking; overlap: SlotRange };

// `ignoreId` skips the booking being edited, so it doesn't clash with itself.
export function findConflicts(
  candidate: SlotRange,
  existing: Booking[],
  ignoreId?: string,
): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const booking of existing) {
    if (booking.id === ignoreId) continue;
    const overlap = intersect(candidate, rangeOf(booking));
    if (overlap) conflicts.push({ booking, overlap });
  }
  return conflicts;
}

// e.g. "You already have Working from home on Fri 13 Nov (full day)." or
// "Tom Okafor already has Annual leave from Thu 12 Nov (afternoon) to Tue 17 Nov."
export function describeConflict(
  conflict: Conflict,
  displayName: string,
  viewerIsSubject: boolean,
): string {
  const who = viewerIsSubject ? "You already have" : `${displayName} already has`;
  const type = leaveTypes[conflict.booking.type].label;
  return `${who} ${type} ${describeWhen(conflict.overlap)}.`;
}

function describeWhen(range: SlotRange): string {
  const start = fromSlot(range.start);
  const end = fromSlot(range.end);
  if (isSingleDay(range)) {
    const portion = { FULL: "full day", AM: "morning", PM: "afternoon" }[portionOf(range)];
    return `on ${formatShort(start.date)} (${portion})`;
  }
  const startText = formatShort(start.date) + (start.half === "PM" ? " (afternoon)" : "");
  const endText = formatShort(end.date) + (end.half === "AM" ? " (morning)" : "");
  return `from ${startText} to ${endText}`;
}

// "Replace": cut the new booking's half-days out of every clashing booking, splitting
// a booking in two where needed. Pieces left on non-working days are kept, because
// booking a day off is allowed. Past half-days can't be replaced.
export function planReplace(
  candidate: SlotRange,
  conflicts: Conflict[],
  today: CalendarDate,
): BookingChanges {
  if (conflicts.some((conflict) => conflict.overlap.start < toSlot(today, "AM"))) {
    throw new PastLockedError("You can't replace a booking in the past.");
  }
  return mergeChanges(conflicts.map((conflict) => carveBooking(conflict.booking, candidate)));
}
