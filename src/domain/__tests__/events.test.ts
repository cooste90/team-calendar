import { describe, expect, it } from "vitest";
import {
  type Booking,
  bookingInputSchema,
  carveBooking,
  emptyChanges,
  formPortionToHalves,
  halvesToFormPortion,
  mergeChanges,
} from "../events";
import { rangeOf, toSlot } from "../slots";

const validInput = {
  userId: "user-1",
  type: "ANNUAL",
  startDate: "2026-11-12",
  startHalf: "AM",
  endDate: "2026-11-12",
  endHalf: "PM",
};

describe("bookingInputSchema", () => {
  it.each([
    ["a single full day", {}],
    ["a single morning", { endHalf: "AM" }],
    ["a single afternoon", { startHalf: "PM" }],
    ["Thu afternoon to Tue morning", { startHalf: "PM", endDate: "2026-11-17", endHalf: "AM" }],
    ["exactly 366 days long", { startDate: "2026-01-01", endDate: "2027-01-01" }],
  ])("accepts %s", (_, changes) => {
    expect(bookingInputSchema.safeParse({ ...validInput, ...changes }).success).toBe(true);
  });

  it.each([
    ["an end before the start", { endDate: "2026-11-11" }, "The end can't be before the start"],
    [
      "a single day from afternoon to morning",
      { startHalf: "PM", endHalf: "AM" },
      "The end can't be before the start",
    ],
    ["more than 366 days", { startDate: "2026-01-01", endDate: "2027-01-02" }, "at most 366 days"],
    ["an impossible date", { startDate: "2026-02-30" }, "real date"],
    ["an unknown leave type", { type: "HOLIDAY" }, "Choose a leave type"],
    ["notes over 500 characters", { notes: "x".repeat(501) }, "up to 500 characters"],
  ])("rejects %s", (_, changes, message) => {
    const result = bookingInputSchema.safeParse({ ...validInput, ...changes });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });

  it("trims notes, and treats blank notes as no notes", () => {
    expect(bookingInputSchema.parse({ ...validInput, notes: "  Dentist  " }).notes).toBe("Dentist");
    expect(bookingInputSchema.parse({ ...validInput, notes: "   " }).notes).toBeUndefined();
    expect(bookingInputSchema.parse(validInput).notes).toBeUndefined();
  });
});

describe("the form's half-day controls", () => {
  it.each([
    [true, { duration: "FULL", firstDay: "FULL", lastDay: "FULL" }, "AM", "PM"],
    [true, { duration: "AM", firstDay: "FULL", lastDay: "FULL" }, "AM", "AM"],
    [true, { duration: "PM", firstDay: "FULL", lastDay: "FULL" }, "PM", "PM"],
    [false, { duration: "FULL", firstDay: "FULL", lastDay: "FULL" }, "AM", "PM"],
    [false, { duration: "FULL", firstDay: "PM", lastDay: "FULL" }, "PM", "PM"],
    [false, { duration: "FULL", firstDay: "FULL", lastDay: "AM" }, "AM", "AM"],
    [false, { duration: "FULL", firstDay: "PM", lastDay: "AM" }, "PM", "AM"],
  ] as const)("single day %s, %o ↔ %s to %s", (singleDay, form, startHalf, endHalf) => {
    expect(formPortionToHalves(singleDay, form)).toEqual({ startHalf, endHalf });
    expect(halvesToFormPortion(singleDay, startHalf, endHalf)).toEqual(form);
  });
});

describe("carveBooking", () => {
  // Mon 9 to Fri 13 November, full days.
  const booking: Booking = {
    id: "b1",
    userId: "user-1",
    type: "ANNUAL",
    startDate: "2026-11-09",
    startHalf: "AM",
    endDate: "2026-11-13",
    endHalf: "PM",
    notes: "Trip",
    publicHolidayId: null,
  };

  it("removes the booking when the cut covers all of it", () => {
    const changes = carveBooking(booking, {
      start: toSlot("2026-11-01", "AM"),
      end: toSlot("2026-11-30", "PM"),
    });
    expect(changes).toEqual({ ...emptyChanges(), remove: ["b1"] });
  });

  it("shortens the booking when the cut takes the end", () => {
    const changes = carveBooking(booking, {
      start: toSlot("2026-11-13", "AM"),
      end: toSlot("2026-11-13", "PM"),
    });
    expect(changes.update).toEqual([
      { id: "b1", range: rangeOf({ ...booking, endDate: "2026-11-12" }) },
    ]);
    expect(changes.create).toEqual([]);
  });

  it("splits the booking in two when the cut is in the middle, copying its details", () => {
    const changes = carveBooking(booking, {
      start: toSlot("2026-11-11", "AM"),
      end: toSlot("2026-11-11", "PM"),
    });
    expect(changes.update).toEqual([
      { id: "b1", range: rangeOf({ ...booking, endDate: "2026-11-10" }) },
    ]);
    expect(changes.create).toEqual([
      {
        userId: "user-1",
        type: "ANNUAL",
        startDate: "2026-11-12",
        startHalf: "AM",
        endDate: "2026-11-13",
        endHalf: "PM",
        notes: "Trip",
        publicHolidayId: null,
      },
    ]);
  });
});

describe("mergeChanges", () => {
  it("combines every list from every set of changes", () => {
    const a = { ...emptyChanges(), remove: ["b1"], unlink: ["b3"] };
    const b = {
      ...emptyChanges(),
      remove: ["b2"],
      update: [{ id: "b4", range: { start: 1, end: 2 } }],
      addExclusions: [{ userId: "u1", publicHolidayId: "ph1" }],
    };
    expect(mergeChanges([a, b])).toEqual({
      create: [],
      update: [{ id: "b4", range: { start: 1, end: 2 } }],
      remove: ["b1", "b2"],
      addExclusions: [{ userId: "u1", publicHolidayId: "ph1" }],
      unlink: ["b3"],
    });
  });
});
