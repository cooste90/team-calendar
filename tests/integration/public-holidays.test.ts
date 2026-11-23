import { beforeEach, describe, expect, it } from "vitest";
import type { WeeklyPattern } from "@/domain/availability";
import { toDbDate } from "@/domain/dates";
import type { Actor } from "@/domain/permissions";
import type { HolidayChange } from "@/lib/schemas/public-holiday";
import { db } from "@/server/db";
import { toBooking, toPatternColumns } from "@/server/mappers";
import { provisionNewUser } from "@/server/services/provision-new-user";
import {
  previewPublicHolidayChange,
  savePublicHolidayChange,
} from "@/server/services/public-holidays";
import { createUser } from "./helpers/create-user";
import { annualLeave, createPeople, insertRow } from "./helpers/people";

// Today is Wednesday 12 June 2030. The holiday goes on Wednesday 19 June.
// June 2030: Mon 17, Tue 18, Wed 19, Thu 20, Fri 21.
// Everyone works Monday to Friday, except Ben (Wednesdays off) and Dan (Wednesday
// mornings only). Priya has annual leave all week, and Nina has parental leave on the 19th.
const TODAY = "2030-06-12";
const WEDNESDAY = "2030-06-19";
const THURSDAY = "2030-06-20";

// Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const WEDNESDAYS_OFF: WeeklyPattern = ["OFF", "FULL", "FULL", "OFF", "FULL", "FULL", "OFF"];
const WEDNESDAY_MORNINGS: WeeklyPattern = ["OFF", "FULL", "FULL", "AM", "FULL", "FULL", "OFF"];

let actors: Record<string, Actor> = {};

beforeEach(async () => {
  actors = await createPeople();
  for (const [userId, pattern] of [
    ["ben", WEDNESDAYS_OFF],
    ["dan", WEDNESDAY_MORNINGS],
  ] as const) {
    await db.workingPattern.create({
      data: { userId, effectiveFrom: toDbDate("2000-01-02"), ...toPatternColumns(pattern) },
    });
  }
  await insertRow(annualLeave("priya", "2030-06-17", "2030-06-21"));
  await insertRow({ ...annualLeave("nina", WEDNESDAY), type: "PARENTAL" });
});

function save(change: HolidayChange, actor = "tom") {
  return savePublicHolidayChange(actors[actor], change, TODAY);
}

async function addFoundersDay() {
  await save({ kind: "create", name: "Founders' Day", date: WEDNESDAY });
  const holiday = await db.publicHoliday.findFirstOrThrow();
  return holiday.id;
}

// One person's bookings, e.g. ["ANNUAL 2030-06-17 AM – 2030-06-18 PM"].
async function bookingsOf(userId: string) {
  const rows = await db.event.findMany({ where: { userId }, orderBy: { startDate: "asc" } });
  return rows
    .map(toBooking)
    .map((b) => `${b.type} ${b.startDate} ${b.startHalf} – ${b.endDate} ${b.endHalf}`);
}

// Tom moves his own copy a day later, so it's detached (spec §6.3).
async function tomMovesHisCopy(holidayId: string) {
  await db.event.updateMany({
    where: { userId: "tom", publicHolidayId: holidayId },
    data: { publicHolidayId: null, startDate: toDbDate(THURSDAY), endDate: toDbDate(THURSDAY) },
  });
  await db.publicHolidayExclusion.create({ data: { userId: "tom", publicHolidayId: holidayId } });
}

describe("adding a public holiday (spec §6.2)", () => {
  it("everyone gets it on the halves they work, around parental leave and days off", async () => {
    await addFoundersDay();

    // Priya's week of annual leave is split around it.
    expect(await bookingsOf("priya")).toEqual([
      "ANNUAL 2030-06-17 AM – 2030-06-18 PM",
      "PUBLIC_HOLIDAY 2030-06-19 AM – 2030-06-19 PM",
      "ANNUAL 2030-06-20 AM – 2030-06-21 PM",
    ]);
    expect(await bookingsOf("dan")).toEqual(["PUBLIC_HOLIDAY 2030-06-19 AM – 2030-06-19 AM"]);
    expect(await bookingsOf("ben")).toEqual([]); // Wednesday is his day off
    expect(await bookingsOf("nina")).toEqual(["PARENTAL 2030-06-19 AM – 2030-06-19 PM"]);
  });

  it("someone who joins afterwards gets it too", async () => {
    await addFoundersDay();
    await createUser("late");
    await db.$transaction((tx) => provisionNewUser(tx, "late"));
    expect(await bookingsOf("late")).toEqual(["PUBLIC_HOLIDAY 2030-06-19 AM – 2030-06-19 PM"]);
  });

  it("the preview's numbers are what saving then does", async () => {
    const change = { kind: "create", name: "Founders' Day", date: WEDNESDAY } as const;
    const preview = await previewPublicHolidayChange(actors.tom, change, TODAY);
    // Priya, Tom, Dan, Newbie and Grace get it; Priya's annual leave is replaced.
    expect(preview).toEqual({ people: 5, bookingsReplaced: 1 });
    expect(await db.event.count({ where: { type: "PUBLIC_HOLIDAY" } })).toBe(0);
    expect(await save(change)).toEqual(preview);
  });
});

describe("moving a public holiday (spec §6.4)", () => {
  it("untouched copies move, overwriting the new date; detached copies stay", async () => {
    const id = await addFoundersDay();
    await tomMovesHisCopy(id);
    const move = { kind: "update", id, name: "Founders' Day", date: THURSDAY } as const;

    const preview = await previewPublicHolidayChange(actors.tom, move, TODAY);
    expect(await save(move)).toEqual(preview);

    // Her Wednesday isn't given back as annual leave: replaced bookings stay deleted.
    expect(await bookingsOf("priya")).toEqual([
      "ANNUAL 2030-06-17 AM – 2030-06-18 PM",
      "PUBLIC_HOLIDAY 2030-06-20 AM – 2030-06-20 PM",
      "ANNUAL 2030-06-21 AM – 2030-06-21 PM",
    ]);
    // Ben was off on the old date, but works the new one, so he gets it now.
    expect(await bookingsOf("ben")).toEqual(["PUBLIC_HOLIDAY 2030-06-20 AM – 2030-06-20 PM"]);
    expect(await bookingsOf("tom")).toEqual(["PUBLIC_HOLIDAY 2030-06-20 AM – 2030-06-20 PM"]);
    const tomsCopy = await db.event.findFirstOrThrow({ where: { userId: "tom" } });
    expect(tomsCopy.publicHolidayId).toBeNull();
  });

  it("renaming relabels copies still showing the old name, and keeps notes people wrote", async () => {
    const id = await addFoundersDay();
    await db.event.updateMany({
      where: { userId: "dan", publicHolidayId: id },
      data: { notes: "Going to the coast" },
    });

    await save({ kind: "update", id, name: "Foundation Day", date: WEDNESDAY });

    const copies = await db.event.findMany({ where: { publicHolidayId: id } });
    const notes = new Set(copies.map((copy) => copy.notes));
    expect(notes).toEqual(new Set(["Foundation Day", "Going to the coast"]));
    expect(await bookingsOf("priya")).toContain("PUBLIC_HOLIDAY 2030-06-19 AM – 2030-06-19 PM");
  });
});

describe("deleting a public holiday (spec §6.4)", () => {
  it("removes untouched copies and leaves detached ones", async () => {
    const id = await addFoundersDay();
    await tomMovesHisCopy(id);
    const preview = await previewPublicHolidayChange(actors.tom, { kind: "delete", id }, TODAY);

    expect(await save({ kind: "delete", id })).toEqual(preview);

    expect(await db.publicHoliday.count()).toBe(0);
    expect(await bookingsOf("dan")).toEqual([]);
    expect(await bookingsOf("tom")).toEqual(["PUBLIC_HOLIDAY 2030-06-20 AM – 2030-06-20 PM"]);
  });
});

describe("the rules every change follows (spec §6.1)", () => {
  it("a past holiday can't be changed or deleted", async () => {
    const past = await db.publicHoliday.create({
      data: { name: "Spring holiday", date: toDbDate("2030-06-03") },
    });
    for (const change of [
      { kind: "update", id: past.id, name: "Renamed", date: "2030-06-03" },
      { kind: "delete", id: past.id },
    ] as const) {
      await expect(save(change)).rejects.toMatchObject({ code: "PAST_LOCKED" });
    }
  });

  it.each([
    ["in the past", "2030-06-11", "A public holiday can't be in the past."],
    [
      "on a day that already has one",
      WEDNESDAY,
      "There's already a public holiday on Wednesday 19 June 2030: Founders' Day.",
    ],
  ])("a holiday can't be added %s", async (_where, date, message) => {
    await addFoundersDay();
    await expect(save({ kind: "create", name: "Another", date })).rejects.toMatchObject({
      code: "VALIDATION",
      message,
    });
  });

  it("a regular user can't manage holidays, but any admin can, whatever their BU", async () => {
    const change = { kind: "create", name: "Founders' Day", date: WEDNESDAY } as const;
    await expect(save(change, "priya")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(previewPublicHolidayChange(actors.priya, change, TODAY)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(save(change, "grace")).resolves.toMatchObject({ people: 5 });
  });
});
