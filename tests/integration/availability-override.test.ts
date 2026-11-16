import { beforeEach, describe, expect, it } from "vitest";
import type { WorkDay } from "@/domain/availability";
import { addDays, toDbDate } from "@/domain/dates";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { setAvailabilityOverride } from "@/server/services/availability";
import { bookingsInDb, createPeople } from "./helpers/people";

// Today is Wednesday 12 June 2030.
const TODAY = "2030-06-12";

let actors: Record<string, Actor> = {};

beforeEach(async () => {
  actors = await createPeople();
});

function setOverride(actorId: string, userId: string, date: string, value: WorkDay | null) {
  return setAvailabilityOverride(actors[actorId], userId, date, value, TODAY);
}

describe("who can set a day swap", () => {
  it.each([
    ["a person can set their own", "priya", "priya", "ok"],
    ["an admin can set one for anyone in their BU", "tom", "priya", "ok"],
    ["a teammate can't (it's a profile change, not a booking)", "ben", "priya", "FORBIDDEN"],
  ] as const)("%s", async (_rule, actor, person, result) => {
    const saving = setOverride(actor, person, "2030-06-15", "FULL");
    if (result === "ok") {
      await expect(saving).resolves.toBeUndefined();
    } else {
      await expect(saving).rejects.toMatchObject({ code: result });
    }
  });
});

describe("the past lock", () => {
  it("a person can't add one for yesterday; an admin can, up to 7 days back", async () => {
    await expect(setOverride("priya", "priya", addDays(TODAY, -1), "OFF")).rejects.toMatchObject({
      code: "PAST_LOCKED",
    });
    await expect(setOverride("tom", "priya", addDays(TODAY, -7), "OFF")).resolves.toBeUndefined();
    await expect(setOverride("tom", "priya", addDays(TODAY, -8), "OFF")).rejects.toMatchObject({
      code: "PAST_LOCKED",
    });
  });

  it("nobody can change or remove one once its day has passed", async () => {
    await setOverride("tom", "priya", addDays(TODAY, -3), "OFF");
    await expect(setOverride("tom", "priya", addDays(TODAY, -3), null)).rejects.toMatchObject({
      code: "PAST_LOCKED",
    });
  });

  it("null removes it", async () => {
    await setOverride("priya", "priya", "2030-06-15", "FULL");
    await setOverride("priya", "priya", "2030-06-15", null);
    expect(await db.availabilityOverride.count()).toBe(0);
  });
});

describe("public holidays follow the day swap (spec §6.5)", () => {
  // Saturday 15 June 2030 is a public holiday, but Priya doesn't work Saturdays, so she
  // has no copy of it yet.
  beforeEach(async () => {
    await db.publicHoliday.create({ data: { date: toDbDate("2030-06-15"), name: "Gala day" } });
  });

  it("working that day creates her copy; not working removes it again", async () => {
    await setOverride("priya", "priya", "2030-06-15", "FULL");
    expect(await bookingsInDb()).toEqual(["priya PUBLIC_HOLIDAY 2030-06-15 AM – 2030-06-15 PM"]);

    await setOverride("priya", "priya", "2030-06-15", "OFF");
    expect(await bookingsInDb()).toEqual([]);
  });

  it("working only the morning gives a morning copy", async () => {
    await setOverride("priya", "priya", "2030-06-15", "AM");
    expect(await bookingsInDb()).toEqual(["priya PUBLIC_HOLIDAY 2030-06-15 AM – 2030-06-15 AM"]);
  });
});
