import { describe, expect, it } from "vitest";
import { toDbDate } from "@/domain/dates";
import { db } from "@/server/db";
import { createUser } from "./helpers/create-user";

const FULL_WEEK = {
  sun: "OFF",
  mon: "FULL",
  tue: "FULL",
  wed: "FULL",
  thu: "FULL",
  fri: "FULL",
  sat: "OFF",
} as const;

describe("the Event start/end check", () => {
  it.each([
    {
      range: "a single full day",
      start: ["2026-11-16", "AM"],
      end: ["2026-11-16", "PM"],
      allowed: true,
    },
    {
      range: "a single afternoon",
      start: ["2026-11-16", "PM"],
      end: ["2026-11-16", "PM"],
      allowed: true,
    },
    {
      range: "afternoon to the next morning",
      start: ["2026-11-16", "PM"],
      end: ["2026-11-17", "AM"],
      allowed: true,
    },
    {
      range: "an end date before the start date",
      start: ["2026-11-17", "AM"],
      end: ["2026-11-16", "PM"],
      allowed: false,
    },
    {
      range: "afternoon to morning of one day",
      start: ["2026-11-16", "PM"],
      end: ["2026-11-16", "AM"],
      allowed: false,
    },
  ] as const)("$range is allowed: $allowed", async ({ start, end, allowed }) => {
    const [startDate, startHalf] = start;
    const [endDate, endHalf] = end;
    await createUser("anna");

    const insert = db.event.create({
      data: {
        userId: "anna",
        type: "ANNUAL",
        startDate: toDbDate(startDate),
        startHalf,
        endDate: toDbDate(endDate),
        endHalf,
      },
    });

    if (allowed) {
      await expect(insert).resolves.toBeDefined();
    } else {
      await expect(insert).rejects.toThrow(/Event_start_not_after_end/);
    }
  });
});

describe("the WorkingPattern Sunday check", () => {
  it.each([
    { effectiveFrom: "2026-11-15", day: "a Sunday", allowed: true },
    { effectiveFrom: "2026-11-16", day: "a Monday", allowed: false },
    { effectiveFrom: "2026-11-21", day: "a Saturday", allowed: false },
  ])("a pattern starting on $day is allowed: $allowed", async ({ effectiveFrom, allowed }) => {
    await createUser("anna");

    const insert = db.workingPattern.create({
      data: { userId: "anna", effectiveFrom: toDbDate(effectiveFrom), ...FULL_WEEK },
    });

    if (allowed) {
      await expect(insert).resolves.toBeDefined();
    } else {
      await expect(insert).rejects.toThrow(/WorkingPattern_effectiveFrom_is_sunday/);
    }
  });
});

it("deleting a user deletes their own data and keeps other people's events they touched", async () => {
  await createUser("anna");
  await createUser("ben");
  const holiday = await db.publicHoliday.create({
    data: { date: toDbDate("2026-12-25"), name: "Christmas Day" },
  });
  const day = {
    startDate: toDbDate("2026-11-16"),
    startHalf: "AM",
    endDate: toDbDate("2026-11-16"),
    endHalf: "PM",
  } as const;
  await db.event.create({ data: { userId: "anna", type: "ANNUAL", ...day } });
  await db.workingPattern.create({
    data: { userId: "anna", effectiveFrom: toDbDate("2000-01-02"), ...FULL_WEEK },
  });
  await db.availabilityOverride.create({
    data: { userId: "anna", date: toDbDate("2026-11-18"), value: "OFF" },
  });
  await db.publicHolidayExclusion.create({ data: { userId: "anna", publicHolidayId: holiday.id } });
  await db.session.create({
    data: { id: "s1", userId: "anna", token: "t1", expiresAt: new Date() },
  });
  // Anna booked and then changed Ben's leave.
  const bensEvent = await db.event.create({
    data: { userId: "ben", type: "WFH", createdById: "anna", updatedById: "anna", ...day },
  });

  await db.user.delete({ where: { id: "anna" } });

  expect(await db.event.count({ where: { userId: "anna" } })).toBe(0);
  expect(await db.workingPattern.count()).toBe(0);
  expect(await db.availabilityOverride.count()).toBe(0);
  expect(await db.publicHolidayExclusion.count()).toBe(0);
  expect(await db.session.count()).toBe(0);
  expect(await db.event.findUniqueOrThrow({ where: { id: bensEvent.id } })).toMatchObject({
    userId: "ben",
    createdById: null,
    updatedById: null,
  });
});

it("deleting a team makes its members Unassigned", async () => {
  const unit = await db.businessUnit.create({ data: { name: "Finance", slug: "finance" } });
  const team = await db.team.create({
    data: { businessUnitId: unit.id, name: "Payroll", sortOrder: 1 },
  });
  await createUser("anna", team.id);

  await db.team.delete({ where: { id: team.id } });

  expect(await db.user.findUniqueOrThrow({ where: { id: "anna" } })).toMatchObject({
    teamId: null,
  });
});
