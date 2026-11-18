import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PATTERN, type WeeklyPattern } from "@/domain/availability";
import { toDbDate } from "@/domain/dates";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { toPatternColumns, toPatternVersion } from "@/server/mappers";
import { getProfile } from "@/server/queries/profile";
import { cancelPendingPattern, updateWorkingPattern } from "@/server/services/availability";
import { updatePreferredName } from "@/server/services/profile";
import { bookingsInDb, createPeople, insertRow } from "./helpers/people";

// Today is Wednesday 12 June 2030, so a pattern saved today starts on Sunday 16 June.
const TODAY = "2030-06-12";
const NEXT_SUNDAY = "2030-06-16";

// Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const FRIDAYS_OFF: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "OFF", "OFF"];
const SATURDAYS_TOO: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "FULL"];

let actors: Record<string, Actor> = {};

beforeEach(async () => {
  actors = await createPeople();
});

function savePattern(actorId: string, userId: string, pattern: WeeklyPattern) {
  return updateWorkingPattern(actors[actorId], userId, pattern, TODAY);
}

async function patternsInDb(userId: string) {
  const rows = await db.workingPattern.findMany({
    where: { userId },
    orderBy: { effectiveFrom: "asc" },
  });
  return rows.map(toPatternVersion);
}

describe("who can change a profile", () => {
  it.each([
    ["a person can change their own", "priya", "priya", "ok"],
    ["an admin can change anyone's in their BU", "tom", "priya", "ok"],
    ["a super admin can change anyone's", "grace", "priya", "ok"],
    ["a teammate can't", "ben", "priya", "FORBIDDEN"],
    ["an admin can't change someone's in another BU", "tom", "nina", "FORBIDDEN"],
  ] as const)("%s", async (_rule, actor, person, result) => {
    // Each one runs on its own, one after the other.
    const changes = [
      () => savePattern(actor, person, FRIDAYS_OFF),
      () => cancelPendingPattern(actors[actor], person, TODAY),
      () => updatePreferredName(actors[actor], person, "Pip"),
    ];
    for (const change of changes) {
      if (result === "ok") {
        await expect(change()).resolves.toBeUndefined();
      } else {
        await expect(change()).rejects.toMatchObject({ code: result });
      }
    }
  });

  it("the profile's data is only loaded for people who may change it", async () => {
    expect(await getProfile(actors.ben, "priya", TODAY)).toBeNull();
    expect(await getProfile(actors.tom, "nina", TODAY)).toBeNull();
    expect(await getProfile(actors.tom, "nobody", TODAY)).toBeNull();
    expect(await getProfile(actors.tom, "priya", TODAY)).toMatchObject({
      title: "Test priya's profile",
      isViewer: false,
      businessUnitName: "West",
      teamName: "Ops",
    });
    expect(await getProfile(actors.priya, "priya", TODAY)).toMatchObject({
      title: "My profile",
      ssoName: "Test priya",
    });
  });
});

describe("preferred first name", () => {
  it("is saved, and null clears it", async () => {
    await updatePreferredName(actors.priya, "priya", "Pip");
    expect(await getProfile(actors.priya, "priya", TODAY)).toMatchObject({ name: "Pip priya" });

    await updatePreferredName(actors.priya, "priya", null);
    expect(await getProfile(actors.priya, "priya", TODAY)).toMatchObject({ name: "Test priya" });
  });
});

describe("working pattern changes (spec §4.1)", () => {
  it("a change starts next Sunday, and the profile shows it as waiting", async () => {
    await savePattern("priya", "priya", FRIDAYS_OFF);
    expect(await patternsInDb("priya")).toEqual([
      { effectiveFrom: NEXT_SUNDAY, pattern: FRIDAYS_OFF },
    ]);
    expect(await getProfile(actors.priya, "priya", TODAY)).toMatchObject({
      currentPattern: DEFAULT_PATTERN,
      pendingPattern: FRIDAYS_OFF,
      nextChangeDate: NEXT_SUNDAY,
    });
  });

  it("saving twice before Sunday replaces the waiting change", async () => {
    await savePattern("priya", "priya", FRIDAYS_OFF);
    await savePattern("priya", "priya", SATURDAYS_TOO);
    expect(await patternsInDb("priya")).toEqual([
      { effectiveFrom: NEXT_SUNDAY, pattern: SATURDAYS_TOO },
    ]);
  });

  it("saving today's pattern again cancels the waiting change", async () => {
    await savePattern("priya", "priya", FRIDAYS_OFF);
    await savePattern("priya", "priya", DEFAULT_PATTERN);
    expect(await patternsInDb("priya")).toEqual([]);
  });

  it("Cancel pending change removes the waiting change, and leaves today's pattern alone", async () => {
    await db.workingPattern.create({
      data: {
        userId: "priya",
        effectiveFrom: toDbDate("2030-06-09"),
        ...toPatternColumns(FRIDAYS_OFF),
      },
    });
    await savePattern("priya", "priya", SATURDAYS_TOO);
    await cancelPendingPattern(actors.priya, "priya", TODAY);
    expect(await patternsInDb("priya")).toEqual([
      { effectiveFrom: "2030-06-09", pattern: FRIDAYS_OFF },
    ]);
  });
});

describe("public holidays follow a pattern change (spec §6.5)", () => {
  // Friday 21 June and Saturday 22 June 2030 are public holidays. Priya works Fridays,
  // so she has a copy of the first one.
  let friday = "";

  beforeEach(async () => {
    friday = (
      await db.publicHoliday.create({ data: { date: toDbDate("2030-06-21"), name: "Fri" } })
    ).id;
    await db.publicHoliday.create({ data: { date: toDbDate("2030-06-22"), name: "Sat" } });
    await insertRow({
      userId: "priya",
      type: "PUBLIC_HOLIDAY",
      startDate: "2030-06-21",
      startHalf: "AM",
      endDate: "2030-06-21",
      endHalf: "PM",
      publicHolidayId: friday,
    });
  });

  it("a day she stops working loses its copy; a day she starts working gets one", async () => {
    await savePattern("priya", "priya", FRIDAYS_OFF);
    expect(await bookingsInDb()).toEqual([]);

    await savePattern("priya", "priya", SATURDAYS_TOO);
    expect(await bookingsInDb()).toEqual([
      "priya PUBLIC_HOLIDAY 2030-06-21 AM – 2030-06-21 PM",
      "priya PUBLIC_HOLIDAY 2030-06-22 AM – 2030-06-22 PM",
    ]);
  });

  it("cancelling the waiting change puts the copies back as they were", async () => {
    await savePattern("priya", "priya", FRIDAYS_OFF);
    await cancelPendingPattern(actors.priya, "priya", TODAY);
    expect(await bookingsInDb()).toEqual(["priya PUBLIC_HOLIDAY 2030-06-21 AM – 2030-06-21 PM"]);
  });

  it("a holiday she deleted herself isn't added back", async () => {
    await db.event.deleteMany();
    await db.publicHolidayExclusion.create({ data: { userId: "priya", publicHolidayId: friday } });
    await savePattern("priya", "priya", SATURDAYS_TOO);
    expect(await bookingsInDb()).toEqual(["priya PUBLIC_HOLIDAY 2030-06-22 AM – 2030-06-22 PM"]);
  });

  it("a holiday before next Sunday stays as it is", async () => {
    // Friday 14 June: still on the old pattern, so her copy stays.
    const thisFriday = await db.publicHoliday.create({
      data: { date: toDbDate("2030-06-14"), name: "Soon" },
    });
    await insertRow({
      userId: "priya",
      type: "PUBLIC_HOLIDAY",
      startDate: "2030-06-14",
      startHalf: "AM",
      endDate: "2030-06-14",
      endHalf: "PM",
      publicHolidayId: thisFriday.id,
    });
    await savePattern("priya", "priya", FRIDAYS_OFF);
    expect(await bookingsInDb()).toEqual(["priya PUBLIC_HOLIDAY 2030-06-14 AM – 2030-06-14 PM"]);
  });
});
