import { expect, it } from "vitest";
import type { WeeklyPattern } from "@/domain/availability";
import { toDbDate } from "@/domain/dates";
import { leaveTypes } from "@/domain/leave-types";
import { LeaveType as PrismaLeaveType } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import {
  toBooking,
  toOverride,
  toPatternColumns,
  toPatternVersion,
  toPublicHoliday,
} from "@/server/mappers";
import { createUser } from "./helpers/create-user";

// The integration tests run in Europe/London (vitest.config.mts), so a date that
// slipped through local time would come back a day early in summer.
const DATES_AROUND_THE_CLOCK_CHANGES = [
  { date: "2026-03-28", note: "the day before the clocks go forward" },
  { date: "2026-03-29", note: "the day the clocks go forward" },
  { date: "2026-07-01", note: "a summer (BST) day" },
  { date: "2026-10-25", note: "the day the clocks go back" },
  { date: "2026-12-31", note: "a winter (GMT) day" },
];

it.each(
  DATES_AROUND_THE_CLOCK_CHANGES,
)("a booking on $note ($date) reads back with the same dates", async ({ date }) => {
  await createUser("anna");
  const row = await db.event.create({
    data: {
      userId: "anna",
      type: "WFH",
      startDate: toDbDate(date),
      startHalf: "PM",
      endDate: toDbDate(date),
      endHalf: "PM",
    },
  });

  const saved = await db.event.findUniqueOrThrow({ where: { id: row.id } });

  expect(toBooking(saved)).toEqual({
    id: row.id,
    userId: "anna",
    type: "WFH",
    startDate: date,
    startHalf: "PM",
    endDate: date,
    endHalf: "PM",
    notes: undefined,
    publicHolidayId: null,
    createdById: null,
  });
});

it.each(
  DATES_AROUND_THE_CLOCK_CHANGES,
)("a day swap and a public holiday on $note ($date) read back with the same date", async ({
  date,
}) => {
  await createUser("anna");
  await db.availabilityOverride.create({
    data: { userId: "anna", date: toDbDate(date), value: "AM" },
  });
  await db.publicHoliday.create({ data: { id: "ph1", date: toDbDate(date), name: "Holiday" } });

  const override = await db.availabilityOverride.findFirstOrThrow();
  const holiday = await db.publicHoliday.findFirstOrThrow();

  expect(toOverride(override)).toEqual({ date, value: "AM" });
  expect(toPublicHoliday(holiday)).toEqual({ id: "ph1", date, name: "Holiday" });
});

it("a working pattern saved from a list reads back as the same list, Sunday first", async () => {
  await createUser("anna");
  const pattern: WeeklyPattern = ["OFF", "FULL", "AM", "PM", "FULL", "OFF", "FULL"];
  await db.workingPattern.create({
    data: { userId: "anna", effectiveFrom: toDbDate("2026-03-29"), ...toPatternColumns(pattern) },
  });

  const saved = await db.workingPattern.findFirstOrThrow();

  expect(saved).toMatchObject({ sun: "OFF", mon: "FULL", tue: "AM", wed: "PM", sat: "FULL" });
  expect(toPatternVersion(saved)).toEqual({ effectiveFrom: "2026-03-29", pattern });
});

it("the database LeaveType enum has exactly the domain's leave types", () => {
  expect(Object.values(PrismaLeaveType).sort()).toEqual(Object.keys(leaveTypes).sort());
});
