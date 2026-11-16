// Changing an existing booking (spec §5.4–§5.6): edit it, delete it, remove one day, or
// delete the remaining days of one that has started. Each one starts with the same
// checks (startChange) and saves in one transaction.
import "server-only";
import { conflictError, findConflicts, planReplace } from "@/domain/conflicts";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { displayName } from "@/domain/display-name";
import { ForbiddenError, NotFoundError, PastLockedError } from "@/domain/errors";
import {
  type Booking,
  type BookingInput,
  type DeletedBooking,
  mergeChanges,
} from "@/domain/events";
import { type Actor, canEditBookingsFor } from "@/domain/permissions";
import {
  planUserDeletesPhCopy,
  planUserEditsPhCopy,
  planUserUpdatesPhCopy,
} from "@/domain/public-holidays";
import { rangeOf } from "@/domain/slots";
import {
  canModify,
  planRemoveDay,
  planTrimRemaining,
  validateDelete,
  validateUpdate,
} from "@/domain/time-rules";
import type { Prisma } from "@/generated/prisma/client";
import { logBookingChange } from "../audit";
import { db, lockUsers } from "../db";
import { toBooking } from "../mappers";
import { loadOverlapping, loadPerson } from "./booking-queries";
import { saveBookingChanges } from "./save-booking-changes";

// The form's Save in edit mode. `input` is the whole form; the booking stays with its
// person whatever userId it says.
export async function updateBooking(
  actor: Actor,
  id: string,
  input: BookingInput,
  options: { replace: boolean },
  today: CalendarDate,
) {
  const saved = await db.$transaction(async (tx) => {
    // 1. Load it, check who and when, and lock the person.
    const { booking: before, subject } = await startChange(tx, actor, id, today);
    const after: Booking = { ...before, ...input, userId: before.userId };
    // 2. Once it has started, only its end and notes can change (spec §5.4).
    validateUpdate(before, after, today);
    // 3. Anything else already on its new half-days?
    const range = rangeOf(after);
    const others = await loadOverlapping(tx, after.userId, after);
    const conflicts = findConflicts(range, others, before.id);
    if (conflicts.length > 0 && !options.replace) {
      throw conflictError(conflicts, displayName(subject), actor.id === subject.id);
    }
    // 4. Replace, and detach a public holiday copy whose type or dates change (spec §6.3).
    const replaced = planReplace(range, conflicts, today);
    const detached = planUserUpdatesPhCopy(before, after);
    await saveBookingChanges(tx, mergeChanges([replaced, detached]), actor.id);
    // 5. Save the booking itself.
    await tx.event.update({
      where: { id },
      data: {
        type: after.type,
        startDate: toDbDate(after.startDate),
        startHalf: after.startHalf,
        endDate: toDbDate(after.endDate),
        endHalf: after.endHalf,
        notes: after.notes ?? null,
        updatedById: actor.id,
      },
    });
    return after;
  });
  logBookingChange("booking.updated", actor.id, saved);
}

// Delete, with Undo (spec §5.6). Returns what Undo needs to create it again.
export async function deleteBooking(
  actor: Actor,
  id: string,
  today: CalendarDate,
): Promise<DeletedBooking> {
  const booking = await db.$transaction(async (tx) => {
    const { booking } = await startChange(tx, actor, id, today);
    validateDelete(booking, today);
    // A public holiday copy also gets an exclusion, so it isn't created again (spec §6.3).
    await saveBookingChanges(tx, planUserDeletesPhCopy(booking), actor.id);
    return booking;
  });
  logBookingChange("booking.deleted", actor.id, booking);
  return { booking, publicHolidayId: booking.publicHolidayId };
}

// "Remove this day" (spec §5.6): a day in the middle splits the booking in two.
export async function removeBookingDay(
  actor: Actor,
  id: string,
  date: CalendarDate,
  today: CalendarDate,
) {
  const booking = await db.$transaction(async (tx) => {
    const { booking } = await startChange(tx, actor, id, today);
    // A public holiday copy is only one day, so removing it detaches it (spec §6.3).
    const changes = mergeChanges([
      planRemoveDay(booking, date, today),
      planUserEditsPhCopy(booking),
    ]);
    await saveBookingChanges(tx, changes, actor.id);
    return booking;
  });
  logBookingChange("booking.day-removed", actor.id, booking, { date });
}

// "Delete the remaining days" (spec §5.4): a booking that has started ends yesterday.
export async function trimRemainingDays(actor: Actor, id: string, today: CalendarDate) {
  const booking = await db.$transaction(async (tx) => {
    const { booking } = await startChange(tx, actor, id, today);
    await saveBookingChanges(tx, planTrimRemaining(booking, today), actor.id);
    return booking;
  });
  logBookingChange("booking.trimmed", actor.id, booking);
}

// The checks every change starts with: the booking exists, the actor may change this
// person's bookings, and it isn't in the past. The person is locked first, so nothing
// else changes their bookings until this transaction ends (architecture §3.2).
async function startChange(
  tx: Prisma.TransactionClient,
  actor: Actor,
  bookingId: string,
  today: CalendarDate,
) {
  const owner = await tx.event.findUnique({ where: { id: bookingId }, select: { userId: true } });
  if (!owner) throw new NotFoundError("That booking doesn't exist any more.");
  const subject = await loadPerson(tx, owner.userId);
  if (!canEditBookingsFor(actor, subject)) {
    throw new ForbiddenError("You can't change this person's bookings.");
  }
  await lockUsers(tx, [subject.id]);
  // Read it now that it's locked, in case it changed in the meantime.
  const row = await tx.event.findUnique({ where: { id: bookingId } });
  if (!row) throw new NotFoundError("That booking doesn't exist any more.");
  const booking = toBooking(row);
  if (!canModify(booking, today)) {
    throw new PastLockedError("Past bookings can't be changed.");
  }
  return { booking, subject };
}
