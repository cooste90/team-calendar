import { describe, expect, it } from "vitest";
import {
  datesOf,
  fromSlot,
  intersect,
  isSingleDay,
  overlaps,
  portionOf,
  rangeOf,
  type SlotRange,
  slotsOf,
  subtract,
  toSlot,
} from "../slots";

// 2026-11-12 is day 20769, so its slots are 41538 (AM) and 41539 (PM).
const THU_AM = 41_538;
const THU_PM = 41_539;

describe("slots", () => {
  it("each date has an AM slot then a PM slot", () => {
    expect(toSlot("2026-11-12", "AM")).toBe(THU_AM);
    expect(toSlot("2026-11-12", "PM")).toBe(THU_PM);
    expect(fromSlot(THU_AM)).toEqual({ date: "2026-11-12", half: "AM" });
    expect(fromSlot(THU_PM)).toEqual({ date: "2026-11-12", half: "PM" });
  });

  // Architecture §3.1: how bookings map to slot ranges.
  it.each([
    ["single full day", "2026-11-12", "AM", "2026-11-12", "PM", THU_AM, THU_PM],
    ["single AM", "2026-11-12", "AM", "2026-11-12", "AM", THU_AM, THU_AM],
    ["single PM", "2026-11-12", "PM", "2026-11-12", "PM", THU_PM, THU_PM],
    ["Thu PM to Tue full", "2026-11-12", "PM", "2026-11-17", "PM", THU_PM, THU_PM + 10],
    ["Mon full to Fri AM", "2026-11-09", "AM", "2026-11-13", "AM", THU_AM - 6, THU_AM + 2],
  ] as const)("%s", (_, startDate, startHalf, endDate, endHalf, start, end) => {
    expect(rangeOf({ startDate, startHalf, endDate, endHalf })).toEqual({ start, end });
  });
});

describe("comparing ranges", () => {
  const booking: SlotRange = { start: 10, end: 20 };

  // [description, other range, overlaps?, intersection, what's left of `booking`]
  it.each([
    ["entirely before", { start: 2, end: 9 }, false, null, [{ start: 10, end: 20 }]],
    ["entirely after", { start: 21, end: 30 }, false, null, [{ start: 10, end: 20 }]],
    [
      "touching the first slot",
      { start: 5, end: 10 },
      true,
      { start: 10, end: 10 },
      [{ start: 11, end: 20 }],
    ],
    [
      "touching the last slot",
      { start: 20, end: 25 },
      true,
      { start: 20, end: 20 },
      [{ start: 10, end: 19 }],
    ],
    [
      "overlapping the start",
      { start: 5, end: 14 },
      true,
      { start: 10, end: 14 },
      [{ start: 15, end: 20 }],
    ],
    [
      "overlapping the end",
      { start: 16, end: 25 },
      true,
      { start: 16, end: 20 },
      [{ start: 10, end: 15 }],
    ],
    [
      "inside (splits it in two)",
      { start: 13, end: 15 },
      true,
      { start: 13, end: 15 },
      [
        { start: 10, end: 12 },
        { start: 16, end: 20 },
      ],
    ],
    ["exactly the same", { start: 10, end: 20 }, true, { start: 10, end: 20 }, []],
    ["covering it", { start: 0, end: 30 }, true, { start: 10, end: 20 }, []],
  ])("another range %s", (_, other, overlap, shared, left) => {
    expect(overlaps(booking, other)).toBe(overlap);
    expect(overlaps(other, booking)).toBe(overlap);
    expect(intersect(booking, other)).toEqual(shared);
    expect(subtract(booking, other)).toEqual(left);
  });
});

describe("what a range covers", () => {
  it("lists its slots and the dates it touches", () => {
    const thuPmToFriAm = { start: THU_PM, end: THU_PM + 1 };
    expect(slotsOf(thuPmToFriAm)).toEqual([THU_PM, THU_PM + 1]);
    expect(datesOf(thuPmToFriAm)).toEqual(["2026-11-12", "2026-11-13"]);
  });

  it.each([
    [{ start: THU_AM, end: THU_PM }, true, "FULL"],
    [{ start: THU_AM, end: THU_AM }, true, "AM"],
    [{ start: THU_PM, end: THU_PM }, true, "PM"],
  ] as const)("%o is a single day: %s, portion %s", (range, single, portion) => {
    expect(isSingleDay(range)).toBe(single);
    expect(portionOf(range)).toBe(portion);
  });

  it("a range over two days is not a single day, so it has no portion", () => {
    const range = { start: THU_PM, end: THU_PM + 1 };
    expect(isSingleDay(range)).toBe(false);
    expect(() => portionOf(range)).toThrow("single-day");
  });
});
