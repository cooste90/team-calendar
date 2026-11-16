// Day swaps (spec §4.2): "I'm working this day" or "I'm not working this day" on one
// date. After a change, the person's public holiday copy on that date is brought in line
// (spec §6.5), in the same transaction.
import "server-only";
import { availabilityLookup, type WorkDay } from "@/domain/availability";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { ForbiddenError } from "@/domain/errors";
import { type Actor, canEditProfileOf } from "@/domain/permissions";
import { type PersonSnapshot, planReconcileForPerson } from "@/domain/public-holidays";
import { validateCreate, validateOverrideChange } from "@/domain/time-rules";
import type { Prisma } from "@/generated/prisma/client";
import { db, lockUsers } from "../db";
import { toOverride, toPatternVersion, toPublicHoliday } from "../mappers";
import { loadOverlapping, loadPerson } from "./booking-queries";
import { saveBookingChanges } from "./save-booking-changes";

// value null removes the day swap, so the weekly pattern applies again.
export async function setAvailabilityOverride(
  actor: Actor,
  userId: string,
  date: CalendarDate,
  value: WorkDay | null,
  today: CalendarDate,
) {
  await db.$transaction(async (tx) => {
    // 1. Who can change someone's working days: the person, or an admin of their BU.
    const person = await loadPerson(tx, userId);
    if (!canEditProfileOf(actor, person)) {
      throw new ForbiddenError("You can't change this person's working days.");
    }
    // 2. Lock them, because their public holiday copy may change in step 5.
    await lockUsers(tx, [userId]);
    // 3. A new day swap can go as far back as a new booking. One that exists can only be
    //    changed or removed from today on (spec §4.2).
    const dbDate = toDbDate(date);
    const key = { userId_date: { userId, date: dbDate } };
    const existing = await tx.availabilityOverride.findUnique({ where: key });
    if (existing) {
      validateOverrideChange(date, today);
    } else {
      validateCreate(date, actor.role, today);
    }
    // 4. Save it.
    if (value === null && existing) {
      await tx.availabilityOverride.delete({ where: key });
    } else if (value !== null) {
      await tx.availabilityOverride.upsert({
        where: key,
        create: { userId, date: dbDate, value },
        update: { value },
      });
    }
    // 5. A public holiday that day: add, change or remove their copy to match. The
    //    planner leaves past days and detached copies alone.
    const holidays = await tx.publicHoliday.findMany({ where: { date: dbDate } });
    if (holidays.length === 0) return;
    const snapshot = await loadSnapshot(tx, userId, date);
    const changes = planReconcileForPerson(snapshot, holidays.map(toPublicHoliday), today);
    await saveBookingChanges(tx, changes, actor.id);
  });
}

// What the public holiday planner needs to know about the person on that date: only
// that day's swap and bookings, and their exclusions (a few per year).
async function loadSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  date: CalendarDate,
): Promise<PersonSnapshot> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      patterns: true,
      overrides: { where: { date: toDbDate(date) } },
      phExclusions: { select: { publicHolidayId: true } },
    },
  });
  return {
    userId,
    availability: availabilityLookup(
      user.patterns.map(toPatternVersion),
      user.overrides.map(toOverride),
    ),
    bookings: await loadOverlapping(tx, userId, { startDate: date, endDate: date }),
    exclusions: user.phExclusions.map((exclusion) => exclusion.publicHolidayId),
  };
}
