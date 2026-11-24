// The time rules (spec §5.4): the past is locked for everyone, admins can add bookings
// up to 7 days back, and a booking that has started can only have its end and notes changed.
// "today" is always the Europe/London date, worked out on the server.
import { addDays, type CalendarDate } from "./dates";
import { PastLockedError, ValidationError } from "./errors";
import { type Booking, type BookingChanges, carveBooking, emptyChanges } from "./events";
import type { Role } from "./permissions";
import { toSlot } from "./slots";

type BookingTiming = "past" | "ongoing" | "future";

// What can still be changed on a booking: everything, only its end and notes, or nothing.
export type AllowedEdits = "all" | "end-and-notes" | "none";

// How far back someone can add a booking or a day swap.
export function earliestCreatableDate(role: Role, today: CalendarDate): CalendarDate {
  return role === "USER" ? today : addDays(today, -7);
}

// "past": ended before today. "ongoing": started before today, ends today or later.
export function classifyBooking(booking: Booking, today: CalendarDate): BookingTiming {
  if (booking.endDate < today) return "past";
  if (booking.startDate < today) return "ongoing";
  return "future";
}

export function canModify(booking: Booking, today: CalendarDate): boolean {
  return classifyBooking(booking, today) !== "past";
}

export function allowedEdits(booking: Booking, today: CalendarDate): AllowedEdits {
  const timing = classifyBooking(booking, today);
  if (timing === "future") return "all";
  if (timing === "ongoing") return "end-and-notes";
  return "none";
}

// Throws if a new booking (or day swap) would start too far in the past.
export function validateCreate(startDate: CalendarDate, role: Role, today: CalendarDate): void {
  if (startDate >= earliestCreatableDate(role, today)) return;
  if (role === "USER") {
    throw new PastLockedError("You can't add a booking in the past.");
  }
  throw new PastLockedError("Admins can add bookings up to 7 days in the past.");
}

// Throws if `after` changes something the time rules don't allow.
export function validateUpdate(before: Booking, after: Booking, today: CalendarDate): void {
  const edits = allowedEdits(before, today);
  if (edits === "none") {
    throw new PastLockedError("Past bookings can't be changed.");
  }
  if (edits === "end-and-notes") {
    const lockedFieldChanged =
      after.type !== before.type ||
      after.startDate !== before.startDate ||
      after.startHalf !== before.startHalf ||
      after.userId !== before.userId;
    if (lockedFieldChanged) {
      throw new ValidationError(
        "Once a booking has started, only its end date and notes can be changed.",
      );
    }
    if (after.endDate < today) {
      throw new PastLockedError(
        "The end can't be before today. Use “Delete the remaining days” instead.",
      );
    }
    return;
  }
  if (after.startDate < today) {
    throw new PastLockedError("A booking can't be moved into the past.");
  }
}

// A booking can be deleted until it starts. After that its past days stay: "Delete the
// remaining days" ends it yesterday instead (spec §5.4).
export function validateDelete(booking: Booking, today: CalendarDate): void {
  const edits = allowedEdits(booking, today);
  if (edits === "none") {
    throw new PastLockedError("Past bookings can't be deleted.");
  }
  if (edits === "end-and-notes") {
    throw new PastLockedError("This booking has started. Use “Delete the remaining days” instead.");
  }
}

// "Delete the remaining days" on a booking that has started: it now ends yesterday.
export function planTrimRemaining(booking: Booking, today: CalendarDate): BookingChanges {
  if (classifyBooking(booking, today) !== "ongoing") {
    throw new ValidationError(
      "Only a booking that has already started can have its remaining days deleted.",
    );
  }
  const changes = emptyChanges();
  changes.update.push({
    id: booking.id,
    range: {
      start: toSlot(booking.startDate, booking.startHalf),
      end: toSlot(addDays(today, -1), "PM"),
    },
  });
  return changes;
}

// "Remove this day": takes one date out of a booking, splitting it in two if the date
// is in the middle. Removing the first or last day just shortens it.
export function planRemoveDay(
  booking: Booking,
  date: CalendarDate,
  today: CalendarDate,
): BookingChanges {
  if (date < today) {
    throw new PastLockedError("Past days can't be removed.");
  }
  if (date < booking.startDate || date > booking.endDate) {
    throw new ValidationError("That day isn't part of this booking.");
  }
  return carveBooking(booking, { start: toSlot(date, "AM"), end: toSlot(date, "PM") });
}

// Day swaps (availability overrides) follow the same lock: once a date is in the past,
// its override can't be changed or removed. Creating one uses validateCreate.
export function validateOverrideChange(date: CalendarDate, today: CalendarDate): void {
  if (date < today) {
    throw new PastLockedError("Past days can't be changed.");
  }
}
