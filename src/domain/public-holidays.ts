// Public holidays (spec §6). These planners work out which bookings must change when
// a holiday is added, moved or deleted, or when someone's working days change. Each
// returns one BookingChanges object for saveBookingChanges to write.
//
// The rules, in short:
// - Everyone gets a PH booking on the halves they work that day (none on a day off).
// - The PH replaces other bookings on those halves, except parental leave, which stays
//   (and gets no PH on its halves). Pieces of a replaced booking left with no working
//   days are deleted.
// - An "untouched copy" is a booking linked to the holiday (publicHolidayId). Once a
//   person edits or deletes their copy, it's detached: they get an exclusion and later
//   admin changes leave them alone.
import type { AvailabilityLookup, WorkDay } from "./availability";
import { countWorkingDays } from "./counting";
import type { CalendarDate } from "./dates";
import {
  type Booking,
  type BookingChanges,
  changesForPieces,
  emptyChanges,
  mergeChanges,
} from "./events";
import { fromSlot, overlaps, rangeOf, type Slot, type SlotRange, subtract, toSlot } from "./slots";

export type PublicHoliday = { id: string; date: CalendarDate; name: string };

// What a planner needs to know about one person.
export type PersonSnapshot = {
  userId: string;
  availability: AvailabilityLookup;
  bookings: Booking[]; // at least those overlapping the dates involved
  exclusions: string[]; // ids of holidays this person has detached from
};

// The half-days a person would get a PH on, based on how they work that day.
export function phSlotsFor(workDay: WorkDay, date: CalendarDate): Slot[] {
  const slots: Slot[] = [];
  if (workDay === "FULL" || workDay === "AM") slots.push(toSlot(date, "AM"));
  if (workDay === "FULL" || workDay === "PM") slots.push(toSlot(date, "PM"));
  return slots;
}

function byStart(a: Booking, b: Booking): number {
  return rangeOf(a).start - rangeOf(b).start;
}

function byUserId(a: PersonSnapshot, b: PersonSnapshot): number {
  return a.userId.localeCompare(b.userId);
}

function linkedCopy(person: PersonSnapshot, holiday: PublicHoliday): Booking | undefined {
  return person.bookings.find((booking) => booking.publicHolidayId === holiday.id);
}

// The half-days the PH would cover on `date`: the person's working halves, minus any
// covered by parental leave. Null if that leaves nothing.
function holidayRange(
  person: PersonSnapshot,
  date: CalendarDate,
  bookings: Booking[],
): SlotRange | null {
  const parental = bookings.filter((booking) => booking.type === "PARENTAL");
  const slots = phSlotsFor(person.availability(date), date).filter(
    (slot) => !parental.some((booking) => overlaps(rangeOf(booking), { start: slot, end: slot })),
  );
  if (slots.length === 0) return null;
  return { start: slots[0], end: slots[slots.length - 1] };
}

// Creates PH bookings for one person on several holidays at once, carving them out of
// the person's other bookings. Carving all holidays together means a long booking with
// two holidays inside it (Christmas and Boxing Day) is split correctly in one go.
function planHolidaysForPerson(
  person: PersonSnapshot,
  holidays: PublicHoliday[],
  bookings: Booking[],
): BookingChanges {
  const planned = holidays
    .map((holiday) => ({ holiday, range: holidayRange(person, holiday.date, bookings) }))
    .filter((item): item is { holiday: PublicHoliday; range: SlotRange } => item.range !== null);
  const cuts = planned.map((item) => item.range);

  const carved = [...bookings]
    .sort(byStart)
    .filter((booking) => booking.type !== "PARENTAL")
    .filter((booking) => cuts.some((cut) => overlaps(rangeOf(booking), cut)))
    .map((booking) => {
      let pieces = [rangeOf(booking)];
      for (const cut of cuts) {
        pieces = pieces.flatMap((piece) => subtract(piece, cut));
      }
      const worthKeeping = pieces.filter(
        (piece) => countWorkingDays(piece, person.availability) > 0,
      );
      return changesForPieces(booking, worthKeeping);
    });

  const created = emptyChanges();
  for (const { holiday, range } of planned) {
    created.create.push({
      userId: person.userId,
      type: "PUBLIC_HOLIDAY",
      startDate: holiday.date,
      startHalf: fromSlot(range.start).half,
      endDate: holiday.date,
      endHalf: fromSlot(range.end).half,
      notes: holiday.name,
      publicHolidayId: holiday.id,
    });
  }
  return mergeChanges([...carved, created]);
}

// A new holiday: everyone without an exclusion or an existing copy gets one.
export function planPublicHolidayCreate(
  holiday: PublicHoliday,
  people: PersonSnapshot[],
): BookingChanges {
  return mergeChanges(
    [...people]
      .sort(byUserId)
      .filter((person) => !person.exclusions.includes(holiday.id) && !linkedCopy(person, holiday))
      .map((person) => planHolidaysForPerson(person, [holiday], person.bookings)),
  );
}

// A holiday moved to a new date. Untouched copies move (overwriting bookings on the new
// date). People with no copy only because the old date was their day off count as
// untouched too. Everyone else, including anyone with an exclusion, is left alone.
export function planPublicHolidayMove(
  holiday: PublicHoliday,
  oldDate: CalendarDate,
  newDate: CalendarDate,
  people: PersonSnapshot[],
): BookingChanges {
  const moved = { ...holiday, date: newDate };
  const changes: BookingChanges[] = [];

  for (const person of [...people].sort(byUserId)) {
    if (person.exclusions.includes(holiday.id)) continue;
    const copy = linkedCopy(person, holiday);
    if (copy) {
      const others = person.bookings.filter((booking) => booking.id !== copy.id);
      changes.push(
        { ...emptyChanges(), remove: [copy.id] },
        planHolidaysForPerson(person, [moved], others),
      );
    } else if (person.availability(oldDate) === "OFF") {
      changes.push(planHolidaysForPerson(person, [moved], person.bookings));
    }
  }
  return mergeChanges(changes);
}

// A holiday deleted: untouched copies go. Detached copies stay.
export function planPublicHolidayDelete(
  holiday: PublicHoliday,
  people: PersonSnapshot[],
): BookingChanges {
  const changes = emptyChanges();
  for (const person of [...people].sort(byUserId)) {
    const copy = linkedCopy(person, holiday);
    if (copy) changes.remove.push(copy.id);
  }
  return changes;
}

// After someone's working days change (spec §6.5): bring their untouched future PH
// copies in line. A copy that no longer matches is replaced (or just removed if the day
// is now off), and a holiday that now falls on a working day is created.
export function planReconcileForPerson(
  person: PersonSnapshot,
  holidays: PublicHoliday[],
  fromDate: CalendarDate,
): BookingChanges {
  const toRemove: string[] = [];
  const toCreate: PublicHoliday[] = [];

  const upcoming = holidays
    .filter((holiday) => holiday.date >= fromDate && !person.exclusions.includes(holiday.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const holiday of upcoming) {
    const copy = linkedCopy(person, holiday);
    const others = person.bookings.filter((booking) => booking.id !== copy?.id);
    const wanted = holidayRange(person, holiday.date, others);
    const copyMatches =
      copy && wanted && rangeOf(copy).start === wanted.start && rangeOf(copy).end === wanted.end;
    if (copyMatches) continue;
    if (copy) toRemove.push(copy.id);
    if (wanted) toCreate.push(holiday);
  }

  const remaining = person.bookings.filter((booking) => !toRemove.includes(booking.id));
  return mergeChanges([
    { ...emptyChanges(), remove: toRemove },
    planHolidaysForPerson(person, toCreate, remaining),
  ]);
}

// A person edits or moves their copy: it becomes an ordinary booking, and they're
// excluded from later admin changes to that holiday.
export function planUserEditsPhCopy(booking: Booking): BookingChanges {
  if (!booking.publicHolidayId) return emptyChanges();
  return {
    ...emptyChanges(),
    unlink: [booking.id],
    addExclusions: [{ userId: booking.userId, publicHolidayId: booking.publicHolidayId }],
  };
}

// A person deletes their copy: it goes, and they're excluded so it isn't recreated.
export function planUserDeletesPhCopy(booking: Booking): BookingChanges {
  if (!booking.publicHolidayId) return { ...emptyChanges(), remove: [booking.id] };
  return {
    ...emptyChanges(),
    remove: [booking.id],
    addExclusions: [{ userId: booking.userId, publicHolidayId: booking.publicHolidayId }],
  };
}
