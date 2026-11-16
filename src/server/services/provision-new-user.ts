// Everything a brand-new user starts with: the default working pattern and a copy of
// every public holiday from today onwards (spec §6.2), worked out by the PH planner.
import "server-only";
import {
  availabilityLookup,
  DEFAULT_PATTERN,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
} from "@/domain/availability";
import { toDbDate } from "@/domain/dates";
import { mergeChanges } from "@/domain/events";
import { planPublicHolidayCreate } from "@/domain/public-holidays";
import type { Prisma } from "@/generated/prisma/client";
import { toPatternColumns, toPublicHoliday } from "../mappers";
import { serverToday } from "../today";
import { saveBookingChanges } from "./save-booking-changes";

export async function provisionNewUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.workingPattern.create({
    data: {
      userId,
      effectiveFrom: toDbDate(DEFAULT_PATTERN_EFFECTIVE_FROM),
      ...toPatternColumns(DEFAULT_PATTERN),
    },
  });

  const today = serverToday();
  const rows = await tx.publicHoliday.findMany({ where: { date: { gte: toDbDate(today) } } });

  // A new user has no bookings or exclusions yet, so the planner only creates PHs.
  const newcomer = {
    userId,
    availability: availabilityLookup(
      [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN }],
      [],
    ),
    bookings: [],
    exclusions: [],
  };
  const changes = mergeChanges(
    rows.map((row) => planPublicHolidayCreate(toPublicHoliday(row), [newcomer])),
  );
  await saveBookingChanges(tx, changes, userId);
}
