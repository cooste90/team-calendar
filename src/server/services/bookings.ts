// Creating a booking (spec §5): who can book for whom, how far back, and no clashes
// unless the person chose Replace. It all happens in one transaction (architecture §3.2).
import "server-only";
import { availabilityLookup } from "@/domain/availability";
import { conflictError, findConflicts, planReplace } from "@/domain/conflicts";
import { countWorkingDays } from "@/domain/counting";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { displayName } from "@/domain/display-name";
import { ForbiddenError, NotFoundError } from "@/domain/errors";
import type { BookingInput } from "@/domain/events";
import { type Actor, canEditBookingsFor } from "@/domain/permissions";
import { rangeOf } from "@/domain/slots";
import { validateCreate } from "@/domain/time-rules";
import type { Prisma } from "@/generated/prisma/client";
import { db, lockUsers } from "../db";
import { toBooking, toEventData, toOverride, toPatternVersion } from "../mappers";
import { saveBookingChanges } from "./save-booking-changes";

// Returns the new booking's id and how many days it counts (spec §5.2).
export async function createBooking(
  actor: Actor,
  input: BookingInput,
  options: { replace: boolean },
  today: CalendarDate,
) {
  const range = rangeOf(input);
  const { id, replacedCount } = await db.$transaction(async (tx) => {
    // 1. The person it's for.
    const subject = await loadSubject(tx, input.userId);
    // 2. Who can book for whom (spec §5.3). An unassigned USER can't book for anyone.
    if (!canEditBookingsFor(actor, subject)) {
      throw new ForbiddenError("You can't add bookings for this person.");
    }
    // 3. How far back (spec §5.4).
    validateCreate(input.startDate, actor.role, today);
    // 4. One save at a time for this person, so two saves can't both pass step 5.
    await lockUsers(tx, [subject.id]);
    // 5. Anything already on those half-days?
    const conflicts = findConflicts(range, await loadOverlapping(tx, input));
    // 6. A clash stops the save, unless the person chose Replace.
    if (conflicts.length > 0 && !options.replace) {
      throw conflictError(conflicts, displayName(subject), actor.id === subject.id);
    }
    // 7. Replace: cut these half-days out of the clashing bookings (never past ones).
    if (conflicts.length > 0) {
      await saveBookingChanges(tx, planReplace(range, conflicts, today), actor.id);
    }
    // 8. The booking. One made by hand, even a public holiday, isn't linked to a holiday.
    const data = toEventData({ ...input, publicHolidayId: null, createdById: actor.id });
    const created = await tx.event.create({ data: { ...data, updatedById: actor.id } });
    return { id: created.id, replacedCount: conflicts.length };
  });

  logCreated(actor.id, input, replacedCount);
  // 9. Its id and day count. The count needs the working pattern, which is loaded after
  //    the save so the lock above isn't held any longer than needed.
  return { id, count: await countDays(input) };
}

// The person's team and BU (for the permission check) and name (for clash messages).
// Someone who hasn't joined a BU yet can't have bookings.
async function loadSubject(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      businessUnitId: true,
      teamId: true,
      firstName: true,
      preferredName: true,
      surname: true,
    },
  });
  if (!user?.businessUnitId) {
    throw new NotFoundError("That person doesn't exist.");
  }
  // Spelled out so TypeScript knows businessUnitId isn't null from here on.
  return { ...user, businessUnitId: user.businessUnitId };
}

// The person's bookings that touch the dates, whole days at a time. findConflicts then
// checks them half-day by half-day.
async function loadOverlapping(tx: Prisma.TransactionClient, input: BookingInput) {
  const rows = await tx.event.findMany({
    where: {
      userId: input.userId,
      startDate: { lte: toDbDate(input.endDate) },
      endDate: { gte: toDbDate(input.startDate) },
    },
  });
  return rows.map(toBooking);
}

// How many days the booking counts for this person (spec §5.2): their pattern history,
// and only the day swaps inside the booking.
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

// An audit line for the server logs. Notes stay out: they can be personal.
function logCreated(actorId: string, input: BookingInput, replacedCount: number) {
  // biome-ignore lint/suspicious/noConsole: the audit trail goes to the server log (T22).
  console.info(
    JSON.stringify({
      event: "booking.created",
      actorId,
      subjectId: input.userId,
      type: input.type,
      start: `${input.startDate} ${input.startHalf}`,
      end: `${input.endDate} ${input.endHalf}`,
      replacedCount,
    }),
  );
}
