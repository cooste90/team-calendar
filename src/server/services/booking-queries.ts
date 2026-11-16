// Reads the booking services share. Call them inside the service's transaction.
import "server-only";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { NotFoundError } from "@/domain/errors";
import type { Prisma } from "@/generated/prisma/client";
import { toBooking } from "../mappers";

// The person whose bookings or working days are changing: their team and BU (for the
// permission check) and name (for clash messages). Someone who hasn't joined a BU yet
// can't have bookings.
export async function loadPerson(tx: Prisma.TransactionClient, userId: string) {
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

// The person's bookings that touch these dates, whole days at a time. findConflicts then
// checks them half-day by half-day.
export async function loadOverlapping(
  tx: Prisma.TransactionClient,
  userId: string,
  dates: { startDate: CalendarDate; endDate: CalendarDate },
) {
  const rows = await tx.event.findMany({
    where: {
      userId,
      startDate: { lte: toDbDate(dates.endDate) },
      endDate: { gte: toDbDate(dates.startDate) },
    },
  });
  return rows.map(toBooking);
}
