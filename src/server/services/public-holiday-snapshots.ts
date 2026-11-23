// What the public holiday planners need to know about everyone, for an admin change to a
// holiday (spec §6): each person's working days, bookings and exclusions on the dates
// involved. A handful of queries for everyone at once, not a few per person, so 1,000
// people load quickly.
import "server-only";
import { availabilityLookup } from "@/domain/availability";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import type { Booking } from "@/domain/events";
import type { PersonSnapshot } from "@/domain/public-holidays";
import type { Prisma } from "@/generated/prisma/client";
import { toBooking, toOverride, toPatternVersion } from "../mappers";

export async function loadEveryone(
  tx: Prisma.TransactionClient,
  dates: CalendarDate[],
  holidayId: string,
): Promise<PersonSnapshot[]> {
  const dbDates = dates.map(toDbDate);
  const users = await tx.user.findMany({
    select: {
      id: true,
      patterns: true,
      overrides: { where: { date: { in: dbDates } } },
      phExclusions: { where: { publicHolidayId: holidayId }, select: { publicHolidayId: true } },
    },
  });
  // Bookings that touch any of the dates (a holiday's untouched copies are on its date).
  const rows = await tx.event.findMany({
    where: {
      OR: dbDates.map((date) => ({ startDate: { lte: date }, endDate: { gte: date } })),
    },
  });

  const bookingsByUser = new Map<string, Booking[]>();
  for (const booking of rows.map(toBooking)) {
    const list = bookingsByUser.get(booking.userId) ?? [];
    list.push(booking);
    bookingsByUser.set(booking.userId, list);
  }

  return users.map((user) => ({
    userId: user.id,
    availability: availabilityLookup(
      user.patterns.map(toPatternVersion),
      user.overrides.map(toOverride),
    ),
    bookings: bookingsByUser.get(user.id) ?? [],
    exclusions: user.phExclusions.map((exclusion) => exclusion.publicHolidayId),
  }));
}
