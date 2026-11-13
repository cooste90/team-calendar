// Leave history for the profile dialog (spec §7): how many days of each counted type
// someone has taken, plus the bookings behind the numbers and their upcoming leave.
// Which types are counted, and over what window, comes from leave-types.ts.
import type { AvailabilityLookup } from "./availability";
import { countWorkingDays } from "./counting";
import { addDays, addMonths, type CalendarDate, startOfYear } from "./dates";
import type { Booking } from "./events";
import { type LeaveType, leaveTypes } from "./leave-types";
import { intersect, rangeOf, toSlot } from "./slots";

type DateWindow = { from: CalendarDate; to: CalendarDate };

// Annual leave counts the calendar year. The others count the 12 months ending today.
export function tallyWindows(
  today: CalendarDate,
): Record<"calendarYear" | "rolling12Months", DateWindow> {
  return {
    calendarYear: { from: startOfYear(today), to: `${today.slice(0, 4)}-12-31` },
    rolling12Months: { from: addDays(addMonths(today, -12), 1), to: today },
  };
}

// `booked` is only for annual leave: days booked from tomorrow to 31 December.
export type Tally = { type: LeaveType; taken: number; booked?: number };

// Days of a type inside a date window. A booking crossing the window's edge only
// counts the part inside it.
function daysWithin(bookings: Booking[], window: DateWindow, lookup: AvailabilityLookup): number {
  const windowRange = { start: toSlot(window.from, "AM"), end: toSlot(window.to, "PM") };
  let total = 0;
  for (const booking of bookings) {
    const inside = intersect(rangeOf(booking), windowRange);
    if (inside) total += countWorkingDays(inside, lookup);
  }
  return total;
}

// The counted types in display order, each with its window for `today`.
function talliedTypes(today: CalendarDate) {
  const windows = tallyWindows(today);
  return Object.values(leaveTypes).flatMap((info) =>
    info.tallyWindow === null
      ? []
      : [{ type: info.type, kind: info.tallyWindow, window: windows[info.tallyWindow] }],
  );
}

// One tally per counted type, in display order. "Taken" includes today.
export function computeTallies(
  bookings: Booking[],
  lookup: AvailabilityLookup,
  today: CalendarDate,
): Tally[] {
  return talliedTypes(today).map(({ type, kind, window }) => {
    const ofType = bookings.filter((booking) => booking.type === type);
    const taken = daysWithin(ofType, { from: window.from, to: today }, lookup);
    if (kind !== "calendarYear") return { type, taken };
    const booked = daysWithin(ofType, { from: addDays(today, 1), to: window.to }, lookup);
    return { type, taken, booked };
  });
}

// The bookings behind the "taken" numbers: for each counted type, the bookings that
// started on or before today inside its window, newest first. Empty groups are left out.
export function historyGroups(
  bookings: Booking[],
  today: CalendarDate,
): { type: LeaveType; bookings: Booking[] }[] {
  return talliedTypes(today)
    .map(({ type, window }) => ({
      type,
      bookings: bookings
        .filter((booking) => booking.type === type)
        .filter((booking) => booking.startDate <= today && booking.endDate >= window.from)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    }))
    .filter((group) => group.bookings.length > 0);
}

// Leave from today onwards, soonest first. A booking that started before today and is
// still going is included and marked as ongoing.
export function upcomingBookings(
  bookings: Booking[],
  today: CalendarDate,
): { booking: Booking; ongoing: boolean }[] {
  return bookings
    .filter((booking) => booking.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((booking) => ({ booking, ongoing: booking.startDate < today }));
}
