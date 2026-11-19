// Leave history for the profile dialog (spec §7): how many days of each counted type
// someone has taken, plus the bookings behind the numbers and their upcoming leave.
// Which types are counted, and over what window, comes from leave-types.ts.
import type { AvailabilityLookup } from "./availability";
import { countWorkingDays } from "./counting";
import { addDays, addMonths, type CalendarDate, startOfMonth, startOfYear } from "./dates";
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

// `window` is the dates the tally covers. `booked` is only for annual leave: days
// booked from tomorrow to 31 December.
export type Tally = { type: LeaveType; window: DateWindow; taken: number; booked?: number };

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
    if (kind !== "calendarYear") return { type, window, taken };
    const booked = daysWithin(ofType, { from: addDays(today, 1), to: window.to }, lookup);
    return { type, window, taken, booked };
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

// A booking with its length in working days, as the profile lists it.
export type CountedBooking = { booking: Booking; days: number };

// A tally with the past bookings behind it.
export type TallyWithBookings = Tally & { bookings: CountedBooking[] };

// Upcoming leave under one month heading. `month` is the 1st of the month.
export type UpcomingMonth = {
  month: CalendarDate;
  bookings: (CountedBooking & { ongoing: boolean })[];
};

export type LeaveSummary = { history: TallyWithBookings[]; upcoming: UpcomingMonth[] };

// Everything the profile's Leave history and Upcoming leave tabs show (spec §7). It is
// all worked out here, so the tabs do no counting of their own.
export function leaveSummary(
  bookings: Booking[],
  lookup: AvailabilityLookup,
  today: CalendarDate,
): LeaveSummary {
  function counted(booking: Booking): CountedBooking {
    return { booking, days: countWorkingDays(rangeOf(booking), lookup) };
  }

  const groups = historyGroups(bookings, today);
  const history = computeTallies(bookings, lookup, today).map((tally) => {
    const group = groups.find((each) => each.type === tally.type);
    return { ...tally, bookings: group ? group.bookings.map(counted) : [] };
  });

  // Leave that has already started goes under this month's heading.
  const upcoming: UpcomingMonth[] = [];
  for (const { booking, ongoing } of upcomingBookings(bookings, today)) {
    const month = startOfMonth(ongoing ? today : booking.startDate);
    const item = { ...counted(booking), ongoing };
    const last = upcoming.at(-1);
    if (last?.month === month) {
      last.bookings.push(item);
    } else {
      upcoming.push({ month, bookings: [item] });
    }
  }
  return { history, upcoming };
}
