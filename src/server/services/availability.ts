// Who works when, after a change (spec §4): a day swap on one date, or a new weekly
// pattern from next Sunday. Either way the person's public holiday copies are brought in
// line (spec §6.5), in the same transaction.
import "server-only";
import {
  availabilityLookup,
  type PatternVersion,
  planPatternChange,
  type WeeklyPattern,
  type WorkDay,
} from "@/domain/availability";
import { type CalendarDate, nextSunday, toDbDate } from "@/domain/dates";
import { ForbiddenError } from "@/domain/errors";
import { type Actor, canEditProfileOf } from "@/domain/permissions";
import {
  type PersonSnapshot,
  type PublicHoliday,
  planReconcileForPerson,
} from "@/domain/public-holidays";
import { validateCreate, validateOverrideChange } from "@/domain/time-rules";
import type { Prisma } from "@/generated/prisma/client";
import { db, lockUsers } from "../db";
import { toOverride, toPatternColumns, toPatternVersion, toPublicHoliday } from "../mappers";
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
    await checkAndLock(tx, actor, userId);
    // A new day swap can go as far back as a new booking. One that exists can only be
    // changed or removed from today on (spec §4.2).
    const dbDate = toDbDate(date);
    const key = { userId_date: { userId, date: dbDate } };
    const existing = await tx.availabilityOverride.findUnique({ where: key });
    if (existing) {
      validateOverrideChange(date, today);
    } else {
      validateCreate(date, actor.role, today);
    }
    if (value === null && existing) {
      await tx.availabilityOverride.delete({ where: key });
    } else if (value !== null) {
      await tx.availabilityOverride.upsert({
        where: key,
        create: { userId, date: dbDate, value },
        update: { value },
      });
    }
    // A public holiday that day: add, change or remove their copy to match. The planner
    // leaves past days and detached copies alone.
    const holidays = await tx.publicHoliday.findMany({ where: { date: dbDate } });
    await reconcileHolidays(tx, actor.id, userId, holidays.map(toPublicHoliday), today);
  });
}

// A new weekly pattern, from next Sunday (spec §4.1). It replaces a change already
// waiting for that Sunday; saving today's pattern again cancels it.
export async function updateWorkingPattern(
  actor: Actor,
  userId: string,
  pattern: WeeklyPattern,
  today: CalendarDate,
) {
  await db.$transaction(async (tx) => {
    await checkAndLock(tx, actor, userId);
    const versions = await tx.workingPattern.findMany({ where: { userId } });
    const change = planPatternChange(versions.map(toPatternVersion), pattern, today);
    await replacePendingPattern(tx, actor.id, userId, change, today);
  });
}

// "Cancel pending change": the pattern in force today carries on.
export async function cancelPendingPattern(actor: Actor, userId: string, today: CalendarDate) {
  await db.$transaction(async (tx) => {
    await checkAndLock(tx, actor, userId);
    await replacePendingPattern(tx, actor.id, userId, null, today);
  });
}

// Only the person or an admin of their BU can change their working days. They're locked
// because their public holiday copies may change.
async function checkAndLock(tx: Prisma.TransactionClient, actor: Actor, userId: string) {
  const person = await loadPerson(tx, userId);
  if (!canEditProfileOf(actor, person)) {
    throw new ForbiddenError("You can't change this person's working days.");
  }
  await lockUsers(tx, [userId]);
}

// Removes any waiting pattern, saves the new one (if any), and then brings the public
// holidays from next Sunday in line with it.
async function replacePendingPattern(
  tx: Prisma.TransactionClient,
  actorId: string,
  userId: string,
  change: PatternVersion | null,
  today: CalendarDate,
) {
  await tx.workingPattern.deleteMany({
    where: { userId, effectiveFrom: { gt: toDbDate(today) } },
  });
  if (change) {
    await tx.workingPattern.create({
      data: {
        userId,
        effectiveFrom: toDbDate(change.effectiveFrom),
        ...toPatternColumns(change.pattern),
      },
    });
  }
  const from = nextSunday(today);
  const holidays = await tx.publicHoliday.findMany({
    where: { date: { gte: toDbDate(from) } },
    orderBy: { date: "asc" },
  });
  await reconcileHolidays(tx, actorId, userId, holidays.map(toPublicHoliday), from);
}

// Adds, changes or removes the person's copies of these holidays (sorted by date) to
// match their working days. Copies they moved or deleted themselves are left alone.
async function reconcileHolidays(
  tx: Prisma.TransactionClient,
  actorId: string,
  userId: string,
  holidays: PublicHoliday[],
  fromDate: CalendarDate,
) {
  if (holidays.length === 0) return;
  const dates = { startDate: holidays[0].date, endDate: holidays[holidays.length - 1].date };
  const snapshot = await loadSnapshot(tx, userId, dates);
  const changes = planReconcileForPerson(snapshot, holidays, fromDate);
  await saveBookingChanges(tx, changes, actorId);
}

// What the public holiday planner needs to know about the person between these dates:
// their patterns, day swaps and bookings, and their exclusions (a few per year).
async function loadSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  dates: { startDate: CalendarDate; endDate: CalendarDate },
): Promise<PersonSnapshot> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      patterns: true,
      overrides: {
        where: { date: { gte: toDbDate(dates.startDate), lte: toDbDate(dates.endDate) } },
      },
      phExclusions: { select: { publicHolidayId: true } },
    },
  });
  return {
    userId,
    availability: availabilityLookup(
      user.patterns.map(toPatternVersion),
      user.overrides.map(toOverride),
    ),
    bookings: await loadOverlapping(tx, userId, dates),
    exclusions: user.phExclusions.map((exclusion) => exclusion.publicHolidayId),
  };
}
