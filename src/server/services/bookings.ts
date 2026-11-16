// Creating a booking (spec §5), and undoing a delete by creating it again. The checks:
// who can book for whom, how far back, and no clashes unless the person chose Replace.
// Changing an existing booking is in booking-edits.ts.
import "server-only";
import { availabilityLookup } from "@/domain/availability";
import { conflictError, findConflicts, planReplace } from "@/domain/conflicts";
import { countWorkingDays } from "@/domain/counting";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { displayName } from "@/domain/display-name";
import { ConflictError, ForbiddenError } from "@/domain/errors";
import type { BookingInput, DeletedBooking } from "@/domain/events";
import { type Actor, canEditBookingsFor } from "@/domain/permissions";
import { rangeOf } from "@/domain/slots";
import { validateCreate } from "@/domain/time-rules";
import type { Prisma } from "@/generated/prisma/client";
import { logBookingChange } from "../audit";
import { db, lockUsers } from "../db";
import { toEventData, toOverride, toPatternVersion } from "../mappers";
import { loadOverlapping, loadPerson } from "./booking-queries";
import { saveBookingChanges } from "./save-booking-changes";

// Returns the new booking's id and how many days it counts (spec §5.2).
export async function createBooking(
  actor: Actor,
  input: BookingInput,
  options: { replace: boolean },
  today: CalendarDate,
) {
  const { id, replacedCount } = await db.$transaction((tx) =>
    insertBooking(tx, actor, input, options.replace, today),
  );
  logBookingChange("booking.created", actor.id, input, { replacedCount });
  // The count needs the working pattern, which is loaded after the save so the lock
  // isn't held any longer than needed.
  return { id, count: await countDays(input) };
}

// Undo after a delete (spec §5.6): the booking is created again with the normal checks,
// so there's no separate time limit. A public holiday copy is linked to its holiday
// again, if the holiday still exists and hasn't passed.
export async function restoreBooking(actor: Actor, deleted: DeletedBooking, today: CalendarDate) {
  const { booking, publicHolidayId } = deleted;
  try {
    const id = await db.$transaction(async (tx) => {
      const created = await insertBooking(tx, actor, booking, false, today);
      if (publicHolidayId && booking.startDate >= today) {
        await relinkCopy(tx, created.id, booking.userId, publicHolidayId);
      }
      return created.id;
    });
    logBookingChange("booking.restored", actor.id, booking);
    return { id };
  } catch (error) {
    // The person sees this instead of the usual clash message.
    if (error instanceof ConflictError) {
      throw new ConflictError(
        "Couldn't undo — something else is booked there now.",
        error.conflicts,
      );
    }
    throw error;
  }
}

// Undo of a public holiday copy: link it to its holiday again and drop the exclusion
// the delete added, unless an admin has deleted the holiday meanwhile.
async function relinkCopy(
  tx: Prisma.TransactionClient,
  bookingId: string,
  userId: string,
  publicHolidayId: string,
) {
  const holiday = await tx.publicHoliday.findUnique({ where: { id: publicHolidayId } });
  if (!holiday) return;
  await tx.event.update({ where: { id: bookingId }, data: { publicHolidayId } });
  await tx.publicHolidayExclusion.deleteMany({ where: { userId, publicHolidayId } });
}

// The steps of a create, inside the caller's transaction.
async function insertBooking(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: BookingInput,
  replace: boolean,
  today: CalendarDate,
) {
  // 1. The person it's for.
  const subject = await loadPerson(tx, input.userId);
  // 2. Who can book for whom (spec §5.3). An unassigned USER can't book for anyone.
  if (!canEditBookingsFor(actor, subject)) {
    throw new ForbiddenError("You can't add bookings for this person.");
  }
  // 3. How far back (spec §5.4).
  validateCreate(input.startDate, actor.role, today);
  // 4. One save at a time for this person, so two saves can't both pass step 5.
  await lockUsers(tx, [subject.id]);
  // 5. Anything already on those half-days?
  const range = rangeOf(input);
  const conflicts = findConflicts(range, await loadOverlapping(tx, input.userId, input));
  // 6. A clash stops the save, unless the person chose Replace.
  if (conflicts.length > 0 && !replace) {
    throw conflictError(conflicts, displayName(subject), actor.id === subject.id);
  }
  // 7. Replace: cut these half-days out of the clashing bookings (never past ones).
  await saveBookingChanges(tx, planReplace(range, conflicts, today), actor.id);
  // 8. The booking. One made by hand, even a public holiday, isn't linked to a holiday.
  const data = toEventData({ ...input, publicHolidayId: null, createdById: actor.id });
  const created = await tx.event.create({ data: { ...data, updatedById: actor.id } });
  return { id: created.id, replacedCount: conflicts.length };
}

// How many days a booking counts for its person (spec §5.2): their pattern history, and
// only the day swaps inside the booking.
async function countDays(input: BookingInput) {
  const person = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: {
      patterns: true,
      overrides: {
        where: { date: { gte: toDbDate(input.startDate), lte: toDbDate(input.endDate) } },
      },
    },
  });
  const lookup = availabilityLookup(
    person.patterns.map(toPatternVersion),
    person.overrides.map(toOverride),
  );
  return countWorkingDays(rangeOf(input), lookup);
}
