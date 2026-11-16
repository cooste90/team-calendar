import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { addDays, toDbDate } from "@/domain/dates";
import type { BookingInput } from "@/domain/events";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { toBooking, toEventData } from "@/server/mappers";
import { createBooking } from "@/server/services/bookings";
import { createUser } from "./helpers/create-user";

// Today is Wednesday 12 June 2030.
const TODAY = "2030-06-12";

// West: Ops (Priya, Ben, and Tom the admin), Legal (Dan), and Newbie, who is unassigned.
// North: Payroll (Nina, and Grace the super admin). Roles only matter on the Actor the
// service is given, so the user rows are all created the same way.
const actors: Record<string, Actor> = {};
let auditLog: MockInstance; // console.info, where the audit lines go

beforeEach(async () => {
  auditLog = vi.spyOn(console, "info").mockImplementation(() => {});
  const west = await db.businessUnit.create({ data: { name: "West", slug: "west" } });
  const north = await db.businessUnit.create({ data: { name: "North", slug: "north" } });
  const ops = await db.team.create({
    data: { businessUnitId: west.id, name: "Ops", sortOrder: 1 },
  });
  const legal = await db.team.create({
    data: { businessUnitId: west.id, name: "Legal", sortOrder: 2 },
  });
  const payroll = await db.team.create({
    data: { businessUnitId: north.id, name: "Payroll", sortOrder: 1 },
  });
  const people: Actor[] = [
    { id: "priya", role: "USER", businessUnitId: west.id, teamId: ops.id },
    { id: "ben", role: "USER", businessUnitId: west.id, teamId: ops.id },
    { id: "tom", role: "ADMIN", businessUnitId: west.id, teamId: ops.id },
    { id: "dan", role: "USER", businessUnitId: west.id, teamId: legal.id },
    { id: "newbie", role: "USER", businessUnitId: west.id, teamId: null },
    { id: "nina", role: "USER", businessUnitId: north.id, teamId: payroll.id },
    { id: "grace", role: "SUPER_ADMIN", businessUnitId: north.id, teamId: payroll.id },
  ];
  for (const person of people) {
    await createUser(person.id, { businessUnitId: person.businessUnitId, teamId: person.teamId });
    actors[person.id] = person;
  }
});

// Full days of annual leave, e.g. annualLeave("priya", "2030-06-17", "2030-06-21").
function annualLeave(userId: string, startDate: string, endDate = startDate): BookingInput {
  return { userId, type: "ANNUAL", startDate, startHalf: "AM", endDate, endHalf: "PM" };
}

function create(actorId: string, input: BookingInput, options = { replace: false }) {
  return createBooking(actors[actorId], input, options, TODAY);
}

// Every booking in the database, by person then start date, e.g.
// "priya ANNUAL 2030-06-17 AM – 2030-06-18 PM".
async function bookingsInDb() {
  const rows = await db.event.findMany({ orderBy: [{ userId: "asc" }, { startDate: "asc" }] });
  return rows
    .map(toBooking)
    .map((b) => `${b.userId} ${b.type} ${b.startDate} ${b.startHalf} – ${b.endDate} ${b.endHalf}`);
}

describe("who can book for whom, and when", () => {
  // [rule, actor, for whom, start (days from today), result]
  it.each([
    ["a USER can book for themselves", "priya", "priya", 0, "ok"],
    ["a USER can book for a teammate", "priya", "ben", 0, "ok"],
    ["a USER can't book for another team", "priya", "dan", 0, "FORBIDDEN"],
    ["a USER can't book yesterday", "priya", "priya", -1, "PAST_LOCKED"],
    ["an ADMIN can book for an unassigned person in their BU", "tom", "newbie", 0, "ok"],
    ["an ADMIN can book for another team in their BU", "tom", "dan", 0, "ok"],
    ["an ADMIN can't book in another BU", "tom", "nina", 0, "FORBIDDEN"],
    ["an ADMIN can book 7 days back", "tom", "priya", -7, "ok"],
    ["an ADMIN can't book 8 days back", "tom", "priya", -8, "PAST_LOCKED"],
    ["a SUPER_ADMIN can book for anyone", "grace", "priya", 0, "ok"],
    ["an unassigned USER can't book, even for themselves", "newbie", "newbie", 0, "FORBIDDEN"],
  ] as const)("%s", async (_rule, actor, subject, daysFromToday, result) => {
    const saving = create(actor, annualLeave(subject, addDays(TODAY, daysFromToday)));
    if (result === "ok") {
      await expect(saving).resolves.toMatchObject({ id: expect.any(String) });
    } else {
      await expect(saving).rejects.toMatchObject({ code: result });
    }
  });

  it("returns the day count and records who created it", async () => {
    // Mon 17 to Fri 21 June: 5 working days on the default pattern.
    const { id, count } = await create("tom", annualLeave("priya", "2030-06-17", "2030-06-21"));
    expect(count).toBe(5);
    const row = await db.event.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ createdById: "tom", updatedById: "tom", publicHolidayId: null });
  });

  it("allows AM and PM bookings of different types on the same day", async () => {
    const day = "2030-06-19";
    await create("priya", {
      userId: "priya",
      type: "ANNUAL",
      startDate: day,
      startHalf: "AM",
      endDate: day,
      endHalf: "AM",
    });
    await create("priya", {
      userId: "priya",
      type: "FLEXI",
      startDate: day,
      startHalf: "PM",
      endDate: day,
      endHalf: "PM",
    });
    expect(await bookingsInDb()).toEqual([
      "priya ANNUAL 2030-06-19 AM – 2030-06-19 AM",
      "priya FLEXI 2030-06-19 PM – 2030-06-19 PM",
    ]);
  });

  it("writes an audit line without the notes", async () => {
    await create("priya", { ...annualLeave("priya", TODAY), notes: "Dentist" });
    const line = JSON.parse(auditLog.mock.lastCall?.[0]);
    expect(line).toEqual({
      event: "booking.created",
      actorId: "priya",
      subjectId: "priya",
      type: "ANNUAL",
      start: `${TODAY} AM`,
      end: `${TODAY} PM`,
      replacedCount: 0,
    });
  });
});

describe("clashes", () => {
  beforeEach(async () => {
    // Priya: annual leave Mon 17 – Fri 21 June, and working from home on Mon 24 morning.
    await create("priya", annualLeave("priya", "2030-06-17", "2030-06-21"));
    await create("priya", { ...annualLeave("priya", "2030-06-24"), type: "WFH", endHalf: "AM" });
  });

  it("without Replace, it saves nothing and lists every clash", async () => {
    const saving = create("ben", {
      userId: "priya",
      type: "SICKNESS",
      startDate: "2030-06-20",
      startHalf: "PM",
      endDate: "2030-06-24",
      endHalf: "PM",
    });

    await expect(saving).rejects.toMatchObject({
      code: "CONFLICT",
      conflicts: [
        {
          type: "ANNUAL",
          startDate: "2030-06-20",
          startHalf: "PM",
          endDate: "2030-06-21",
          endHalf: "PM",
          message: "Test priya already has Annual leave from Thu 20 Jun (afternoon) to Fri 21 Jun.",
        },
        {
          type: "WFH",
          startDate: "2030-06-24",
          startHalf: "AM",
          endDate: "2030-06-24",
          endHalf: "AM",
          message: "Test priya already has Working from home on Mon 24 Jun (morning).",
        },
      ],
    });
    expect(await bookingsInDb()).toHaveLength(2);
  });

  it("with Replace, it splits a long booking around the new one in one go", async () => {
    const sickness = { ...annualLeave("priya", "2030-06-19"), type: "SICKNESS" } as const;
    await create("priya", sickness, { replace: true });
    expect(await bookingsInDb()).toEqual([
      "priya ANNUAL 2030-06-17 AM – 2030-06-18 PM",
      "priya SICKNESS 2030-06-19 AM – 2030-06-19 PM",
      "priya ANNUAL 2030-06-20 AM – 2030-06-21 PM",
      "priya WFH 2030-06-24 AM – 2030-06-24 AM",
    ]);
  });

  it("Replace can't touch the past, and then nothing changes", async () => {
    // An admin adds leave from 3 days back to tomorrow, then tries to replace part of it
    // from 2 days back: those days are past.
    await create("tom", annualLeave("priya", addDays(TODAY, -3), addDays(TODAY, 1)));
    const before = await bookingsInDb();

    const wfh = { ...annualLeave("priya", addDays(TODAY, -2)), type: "WFH" } as const;
    const saving = create("tom", wfh, { replace: true });

    await expect(saving).rejects.toMatchObject({ code: "PAST_LOCKED" });
    expect(await bookingsInDb()).toEqual(before);
  });

  it("ten saves for the same day at once: exactly one wins, the rest clash", async () => {
    // Without lockUsers, several of these read "no clash" before any of them writes.
    // (Checked: with lockUsers commented out, this test fails.)
    const savers: string[] = Array(10).fill("priya");
    // Open a database connection for each first, as a busy server would have. Otherwise
    // the first save finishes while the others are still connecting, and nothing races.
    await Promise.all(savers.map(() => db.$transaction((tx) => tx.$executeRaw`SELECT 1`)));

    const results = await Promise.allSettled(
      savers.map((actorId) => create(actorId, annualLeave("priya", "2030-07-01"))),
    );

    const outcomes = results.map((result) =>
      result.status === "fulfilled" ? "saved" : result.reason.code,
    );
    expect(outcomes.filter((outcome) => outcome === "saved")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome === "CONFLICT")).toHaveLength(9);
  });
});

it("replacing part of a public holiday copy detaches it from the holiday", async () => {
  const holiday = await db.publicHoliday.create({
    data: { date: toDbDate("2030-08-26"), name: "Summer bank holiday" },
  });
  const copy = await db.event.create({
    data: toEventData({
      ...annualLeave("priya", "2030-08-26"),
      type: "PUBLIC_HOLIDAY",
      publicHolidayId: holiday.id,
    }),
  });

  const morningAtHome = {
    ...annualLeave("priya", "2030-08-26"),
    type: "WFH",
    endHalf: "AM",
  } as const;
  await create("priya", morningAtHome, { replace: true });

  const left = await db.event.findUniqueOrThrow({ where: { id: copy.id } });
  expect(left).toMatchObject({ startHalf: "PM", endHalf: "PM", publicHolidayId: null });
  expect(
    await db.publicHolidayExclusion.findMany({ select: { userId: true, publicHolidayId: true } }),
  ).toEqual([{ userId: "priya", publicHolidayId: holiday.id }]);
});
