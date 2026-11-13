import { describe, expect, it } from "vitest";
import { PastLockedError, ValidationError } from "../errors";
import type { Booking } from "../events";
import { rangeOf } from "../slots";
import {
  allowedEdits,
  canModify,
  classifyBooking,
  earliestCreatableDate,
  planRemoveDay,
  planTrimRemaining,
  validateCreate,
  validateOverrideChange,
  validateUpdate,
} from "../time-rules";

// Today is Thursday 12 November 2026.
const TODAY = "2026-11-12";

function makeBooking(startDate: string, endDate: string): Booking {
  return {
    id: "b1",
    userId: "user-1",
    type: "ANNUAL",
    startDate,
    startHalf: "AM",
    endDate,
    endHalf: "PM",
    publicHolidayId: null,
  };
}

const past = makeBooking("2026-11-02", "2026-11-11"); // ended yesterday
const ongoing = makeBooking("2026-11-09", "2026-11-13"); // Mon to Fri this week
const startsToday = makeBooking("2026-11-12", "2026-11-13");
const future = makeBooking("2026-11-16", "2026-11-20");

describe("how far back a booking can be added", () => {
  it.each([
    ["USER", "2026-11-12"],
    ["ADMIN", "2026-11-05"],
    ["SUPER_ADMIN", "2026-11-05"],
  ] as const)("a %s can add bookings from %s", (role, earliest) => {
    expect(earliestCreatableDate(role, TODAY)).toBe(earliest);
  });

  it("a USER can book today", () => {
    expect(() => validateCreate("2026-11-12", "USER", TODAY)).not.toThrow();
  });

  it("a USER can't book yesterday", () => {
    expect(() => validateCreate("2026-11-11", "USER", TODAY)).toThrow(
      "You can't add a booking in the past.",
    );
  });

  it("an ADMIN can book up to 7 days in the past", () => {
    expect(() => validateCreate("2026-11-05", "ADMIN", TODAY)).not.toThrow();
  });

  it("an ADMIN can't book 8 days in the past", () => {
    expect(() => validateCreate("2026-11-04", "ADMIN", TODAY)).toThrow(
      "Admins can add bookings up to 7 days in the past.",
    );
  });
});

describe("past, ongoing and future bookings", () => {
  it.each([
    ["ended yesterday", past, "past", false, "none"],
    ["started before today, ends after", ongoing, "ongoing", true, "end-and-notes"],
    [
      "started before today, ends today",
      makeBooking("2026-11-09", "2026-11-12"),
      "ongoing",
      true,
      "end-and-notes",
    ],
    ["starts today", startsToday, "future", true, "all"],
    ["starts next week", future, "future", true, "all"],
  ] as const)("a booking that %s is %s", (_, booking, timing, modifiable, edits) => {
    expect(classifyBooking(booking, TODAY)).toBe(timing);
    expect(canModify(booking, TODAY)).toBe(modifiable);
    expect(allowedEdits(booking, TODAY)).toBe(edits);
  });
});

describe("validateUpdate", () => {
  it("a past booking can't be changed at all", () => {
    expect(() => validateUpdate(past, { ...past, notes: "x" }, TODAY)).toThrow(PastLockedError);
  });

  it.each([
    ["the type", { type: "FLEXI" }],
    ["the start date", { startDate: "2026-11-10" }],
    ["the start half", { startHalf: "PM" }],
    ["the person", { userId: "user-2" }],
  ] as const)("changing %s of an ongoing booking is refused", (_, change) => {
    expect(() => validateUpdate(ongoing, { ...ongoing, ...change }, TODAY)).toThrow(
      ValidationError,
    );
  });

  it("extending the end of an ongoing booking is fine", () => {
    expect(() =>
      validateUpdate(ongoing, { ...ongoing, endDate: "2026-11-20" }, TODAY),
    ).not.toThrow();
  });

  it("editing the notes of an ongoing booking is fine", () => {
    expect(() =>
      validateUpdate(ongoing, { ...ongoing, notes: "Back Monday" }, TODAY),
    ).not.toThrow();
  });

  it("setting an ongoing booking's end to yesterday is refused (use “Delete the remaining days”)", () => {
    expect(() => validateUpdate(ongoing, { ...ongoing, endDate: "2026-11-11" }, TODAY)).toThrow(
      "Delete the remaining days",
    );
  });

  it("a future booking can be changed freely, but not moved into the past", () => {
    expect(() =>
      validateUpdate(future, { ...future, type: "WFH", startDate: "2026-11-12" }, TODAY),
    ).not.toThrow();
    expect(() => validateUpdate(future, { ...future, startDate: "2026-11-11" }, TODAY)).toThrow(
      PastLockedError,
    );
  });
});

describe("planTrimRemaining (“Delete the remaining days”)", () => {
  it("makes an ongoing booking end yesterday afternoon", () => {
    expect(planTrimRemaining(ongoing, TODAY).update).toEqual([
      { id: "b1", range: rangeOf({ ...ongoing, endDate: "2026-11-11", endHalf: "PM" }) },
    ]);
  });

  it("only works on a booking that has started", () => {
    expect(() => planTrimRemaining(future, TODAY)).toThrow(ValidationError);
  });
});

describe("planRemoveDay (“Remove this day”)", () => {
  it("removing a middle day splits the booking in two", () => {
    const changes = planRemoveDay(future, "2026-11-18", TODAY);
    expect(changes.update).toEqual([
      { id: "b1", range: rangeOf({ ...future, endDate: "2026-11-17" }) },
    ]);
    expect(changes.create).toMatchObject([{ startDate: "2026-11-19", endDate: "2026-11-20" }]);
  });

  it("removing the last day just shortens it", () => {
    const changes = planRemoveDay(future, "2026-11-20", TODAY);
    expect(changes.update).toEqual([
      { id: "b1", range: rangeOf({ ...future, endDate: "2026-11-19" }) },
    ]);
    expect(changes.create).toEqual([]);
  });

  it("removing the only day removes the booking", () => {
    const oneDay = makeBooking("2026-11-16", "2026-11-16");
    expect(planRemoveDay(oneDay, "2026-11-16", TODAY).remove).toEqual(["b1"]);
  });

  it("a past day can't be removed", () => {
    expect(() => planRemoveDay(ongoing, "2026-11-10", TODAY)).toThrow(PastLockedError);
  });

  it("a day outside the booking can't be removed", () => {
    expect(() => planRemoveDay(future, "2026-11-21", TODAY)).toThrow(ValidationError);
    expect(() => planRemoveDay(future, "2026-11-15", TODAY)).toThrow(ValidationError);
  });
});

describe("day swaps (availability overrides)", () => {
  it("can be changed today but not for a past date", () => {
    expect(() => validateOverrideChange("2026-11-12", TODAY)).not.toThrow();
    expect(() => validateOverrideChange("2026-11-11", TODAY)).toThrow(PastLockedError);
  });
});
