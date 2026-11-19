import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/domain/permissions";
import { getProfileLeave } from "@/server/queries/profile";
import { annualLeave, createPeople, insertRow } from "./helpers/people";

// Today is Wednesday 12 June 2030. Annual leave counts from 1 January 2030; the other
// tallied types count the 12 months from 13 June 2029, which is the earlier start.
// Upcoming leave is loaded up to 12 June 2032.
const TODAY = "2030-06-12";

let actors: Record<string, Actor> = {};

beforeEach(async () => {
  actors = await createPeople();
});

function specialLeave(startDate: string, endDate = startDate) {
  return { ...annualLeave("priya", startDate, endDate), type: "SPECIAL" as const };
}

describe("getProfileLeave", () => {
  it("is only loaded for people who may see the profile", async () => {
    expect(await getProfileLeave(actors.ben, "priya", TODAY)).toBeNull();
    expect(await getProfileLeave(actors.tom, "nina", TODAY)).toBeNull();
    expect(await getProfileLeave(actors.tom, "nobody", TODAY)).toBeNull();
    expect(await getProfileLeave(actors.tom, "priya", TODAY)).not.toBeNull();
    expect(await getProfileLeave(actors.priya, "priya", TODAY)).not.toBeNull();
  });

  it("loads a booking that crosses the start of the rolling window, and counts only the part inside", async () => {
    await insertRow(specialLeave("2029-06-08")); // Friday: before the window
    await insertRow(specialLeave("2029-06-11", "2029-06-13")); // Mon to Wed: only Wed counts
    const leave = await getProfileLeave(actors.priya, "priya", TODAY);
    const special = leave?.history.find((tally) => tally.type === "SPECIAL");
    expect(special?.taken).toBe(1);
    expect(special?.bookings.map(({ booking, days }) => [booking.startDate, days])).toEqual([
      ["2029-06-11", 3],
    ]);
  });

  it("loads upcoming leave up to two years ahead", async () => {
    await insertRow(specialLeave("2032-06-11")); // Friday: the last week loaded
    await insertRow(specialLeave("2032-06-14")); // the Monday after: too far ahead
    const leave = await getProfileLeave(actors.priya, "priya", TODAY);
    expect(leave?.upcoming).toMatchObject([
      { month: "2032-06-01", bookings: [{ booking: { startDate: "2032-06-11" }, days: 1 }] },
    ]);
  });
});
