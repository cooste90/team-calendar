// Saves a BookingChanges object (architecture §8): the one way planned booking changes
// reach the database. Call it inside the caller's transaction, after lockUsers.
import "server-only";
import { toDbDate } from "@/domain/dates";
import type { BookingChanges } from "@/domain/events";
import { datesOfRange } from "@/domain/slots";
import type { Prisma } from "@/generated/prisma/client";
import { toEventData } from "../mappers";

export async function saveBookingChanges(
  tx: Prisma.TransactionClient,
  changes: BookingChanges,
  actorId: string,
) {
  // Each step only runs when it has something to do: this runs while the person is
  // locked, so empty statements would only make other saves wait.

  // Removals first, so a new booking never sits on top of one that's being replaced.
  if (changes.remove.length > 0) {
    await tx.event.deleteMany({ where: { id: { in: changes.remove } } });
  }

  // Split-off pieces keep the original creator; everything else is created by the actor.
  if (changes.create.length > 0) {
    await tx.event.createMany({
      data: changes.create.map((booking) =>
        toEventData({ ...booking, createdById: booking.createdById ?? actorId }),
      ),
    });
  }

  for (const { id, range } of changes.update) {
    const dates = datesOfRange(range);
    await tx.event.update({
      where: { id },
      data: {
        startDate: toDbDate(dates.startDate),
        startHalf: dates.startHalf,
        endDate: toDbDate(dates.endDate),
        endHalf: dates.endHalf,
        updatedById: actorId,
      },
    });
  }

  if (changes.addExclusions.length > 0) {
    await tx.publicHolidayExclusion.createMany({
      data: changes.addExclusions,
      skipDuplicates: true,
    });
  }
  if (changes.unlink.length > 0) {
    await tx.event.updateMany({
      where: { id: { in: changes.unlink } },
      data: { publicHolidayId: null },
    });
  }
}
