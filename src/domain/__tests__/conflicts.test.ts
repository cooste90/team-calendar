import { describe, expect, it } from "vitest";
import { conflictError, describeConflict, findConflicts, planReplace } from "../conflicts";
import { PastLockedError } from "../errors";
import type { Booking } from "../events";
import { type HalfDay, rangeOf } from "../slots";

// Today is Thursday 12 November 2026.
const TODAY = "2026-11-12";

function makeBooking(
  id: string,
  type: Booking["type"],
  startDate: string,
  startHalf: HalfDay,
  endDate: string,
  endHalf: HalfDay,
): Booking {
  return {
    id,
    userId: "user-1",
    type,
    startDate,
    startHalf,
    endDate,
    endHalf,
    publicHolidayId: null,
  };
}

function range(startDate: string, startHalf: HalfDay, endDate: string, endHalf: HalfDay) {
  return rangeOf({ startDate, startHalf, endDate, endHalf });
}

describe("findConflicts", () => {
  const wfhFriday = makeBooking("wfh", "WFH", "2026-11-13", "AM", "2026-11-13", "PM");
  const alNextWeek = makeBooking("al", "ANNUAL", "2026-11-16", "AM", "2026-11-20", "PM");

  it("returns each clashing booking with the exact half-days that clash", () => {
    const candidate = range("2026-11-13", "PM", "2026-11-16", "AM");
    expect(findConflicts(candidate, [wfhFriday, alNextWeek])).toEqual([
      { booking: wfhFriday, overlap: range("2026-11-13", "PM", "2026-11-13", "PM") },
      { booking: alNextWeek, overlap: range("2026-11-16", "AM", "2026-11-16", "AM") },
    ]);
  });

  it("finds nothing when the halves don't overlap (AM and PM on the same day)", () => {
    const morning = makeBooking("am", "ANNUAL", "2026-11-13", "AM", "2026-11-13", "AM");
    expect(findConflicts(range("2026-11-13", "PM", "2026-11-13", "PM"), [morning])).toEqual([]);
  });

  it("ignores the booking being edited", () => {
    expect(
      findConflicts(range("2026-11-13", "AM", "2026-11-13", "PM"), [wfhFriday], "wfh"),
    ).toEqual([]);
  });
});

describe("describeConflict", () => {
  it.each([
    [range("2026-11-13", "AM", "2026-11-13", "PM"), "on Fri 13 Nov (full day)"],
    [range("2026-11-13", "AM", "2026-11-13", "AM"), "on Fri 13 Nov (morning)"],
    [range("2026-11-13", "PM", "2026-11-13", "PM"), "on Fri 13 Nov (afternoon)"],
    [range("2026-11-12", "AM", "2026-11-17", "PM"), "from Thu 12 Nov to Tue 17 Nov"],
    [range("2026-11-12", "PM", "2026-11-17", "PM"), "from Thu 12 Nov (afternoon) to Tue 17 Nov"],
    [range("2026-11-12", "AM", "2026-11-17", "AM"), "from Thu 12 Nov to Tue 17 Nov (morning)"],
    [
      range("2026-11-12", "PM", "2026-11-17", "AM"),
      "from Thu 12 Nov (afternoon) to Tue 17 Nov (morning)",
    ],
  ])("an overlap of %o reads “%s”", (overlap, when) => {
    const booking = makeBooking("b", "WFH", "2026-11-01", "AM", "2026-11-30", "PM");
    expect(describeConflict({ booking, overlap }, "Tom Okafor", true)).toBe(
      `You already have Working from home ${when}.`,
    );
  });

  it("names the person when the viewer is booking for someone else", () => {
    const booking = makeBooking("b", "ANNUAL", "2026-11-12", "AM", "2026-11-12", "AM");
    const overlap = range("2026-11-12", "AM", "2026-11-12", "AM");
    expect(describeConflict({ booking, overlap }, "Tom Okafor", false)).toBe(
      "Tom Okafor already has Annual leave on Thu 12 Nov (morning).",
    );
  });
});

describe("conflictError", () => {
  it("lists each clash with its booking, the clashing half-days and a sentence", () => {
    const booking = makeBooking("b1", "ANNUAL", "2026-11-12", "AM", "2026-11-17", "PM");
    const overlap = range("2026-11-13", "PM", "2026-11-13", "PM");
    const error = conflictError([{ booking, overlap }], "Tom Okafor", false);

    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("This clashes with a booking that's already there.");
    expect(error.conflicts).toEqual([
      {
        bookingId: "b1",
        type: "ANNUAL",
        startDate: "2026-11-13",
        startHalf: "PM",
        endDate: "2026-11-13",
        endHalf: "PM",
        message: "Tom Okafor already has Annual leave on Fri 13 Nov (afternoon).",
      },
    ]);
  });

  it("counts the clashes in its message when there are several", () => {
    const am = makeBooking("am", "WFH", "2026-11-13", "AM", "2026-11-13", "AM");
    const pm = makeBooking("pm", "FLEXI", "2026-11-13", "PM", "2026-11-13", "PM");
    const conflicts = findConflicts(range("2026-11-13", "AM", "2026-11-13", "PM"), [am, pm]);
    expect(conflictError(conflicts, "Tom Okafor", true).message).toBe(
      "This clashes with 2 bookings that are already there.",
    );
  });
});

describe("planReplace", () => {
  it("a new booking inside a long booking splits it into two remainders", () => {
    const long = makeBooking("al", "ANNUAL", "2026-11-16", "AM", "2026-11-27", "PM");
    const candidate = range("2026-11-19", "AM", "2026-11-19", "PM");
    const changes = planReplace(candidate, findConflicts(candidate, [long]), TODAY);
    expect(changes.update).toEqual([
      { id: "al", range: range("2026-11-16", "AM", "2026-11-18", "PM") },
    ]);
    expect(changes.create).toMatchObject([
      { startDate: "2026-11-20", startHalf: "AM", endDate: "2026-11-27" },
    ]);
    expect(changes.remove).toEqual([]);
  });

  it("a new morning booking over a full day leaves an afternoon remainder", () => {
    const fullDay = makeBooking("wfh", "WFH", "2026-11-13", "AM", "2026-11-13", "PM");
    const candidate = range("2026-11-13", "AM", "2026-11-13", "AM");
    const changes = planReplace(candidate, findConflicts(candidate, [fullDay]), TODAY);
    expect(changes.update).toEqual([
      { id: "wfh", range: range("2026-11-13", "PM", "2026-11-13", "PM") },
    ]);
  });

  it("a new booking covering a whole booking removes it", () => {
    const fullDay = makeBooking("wfh", "WFH", "2026-11-13", "AM", "2026-11-13", "PM");
    const candidate = range("2026-11-13", "AM", "2026-11-16", "PM");
    expect(planReplace(candidate, findConflicts(candidate, [fullDay]), TODAY).remove).toEqual([
      "wfh",
    ]);
  });

  it("keeps a remainder even when it only covers days off (Sat and Sun)", () => {
    const friToSun = makeBooking("al", "ANNUAL", "2026-11-13", "AM", "2026-11-15", "PM");
    const candidate = range("2026-11-13", "AM", "2026-11-13", "PM");
    const changes = planReplace(candidate, findConflicts(candidate, [friToSun]), TODAY);
    expect(changes.update).toEqual([
      { id: "al", range: range("2026-11-14", "AM", "2026-11-15", "PM") },
    ]);
  });

  it("detaches a public holiday copy it cuts, so later holiday changes leave it alone", () => {
    const copy = {
      ...makeBooking("ph", "PUBLIC_HOLIDAY", "2026-12-25", "AM", "2026-12-25", "PM"),
      publicHolidayId: "christmas",
    };
    const candidate = range("2026-12-25", "AM", "2026-12-25", "AM");
    const changes = planReplace(candidate, findConflicts(candidate, [copy]), TODAY);
    expect(changes.update).toEqual([
      { id: "ph", range: range("2026-12-25", "PM", "2026-12-25", "PM") },
    ]);
    expect(changes.unlink).toEqual(["ph"]);
    expect(changes.addExclusions).toEqual([{ userId: "user-1", publicHolidayId: "christmas" }]);
  });

  it("refuses to replace a booking in the past", () => {
    const yesterday = makeBooking("old", "ANNUAL", "2026-11-11", "AM", "2026-11-12", "PM");
    const candidate = range("2026-11-11", "AM", "2026-11-12", "PM");
    expect(() => planReplace(candidate, findConflicts(candidate, [yesterday]), TODAY)).toThrow(
      PastLockedError,
    );
  });
});
