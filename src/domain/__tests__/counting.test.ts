import { describe, expect, it } from "vitest";
import {
  availabilityLookup,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
  type Override,
  type WeeklyPattern,
} from "../availability";
import { countWorkingDays, describeExcludedDays, nonWorkingSlots, workingSlots } from "../counting";
import { type HalfDay, rangeOf, toSlot } from "../slots";

// November 2026: Sun 8, Mon 9, Tue 10, Wed 11, Thu 12, Fri 13, Sat 14, Sun 15, Mon 16, Tue 17.
// Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const STANDARD: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "OFF"];

function lookupFor(pattern: WeeklyPattern, overrides: Override[] = []) {
  return availabilityLookup(
    [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern }],
    overrides,
  );
}

function booking(startDate: string, startHalf: HalfDay, endDate: string, endHalf: HalfDay) {
  return rangeOf({ startDate, startHalf, endDate, endHalf });
}

describe("countWorkingDays: the spec examples", () => {
  it("a Thursday-and-Friday-only worker booking Thu to Tue counts 2", () => {
    const lookup = lookupFor(["OFF", "OFF", "OFF", "OFF", "FULL", "FULL", "OFF"]);
    expect(countWorkingDays(booking("2026-11-12", "AM", "2026-11-17", "PM"), lookup)).toBe(2);
  });

  it("with a morning-only Wednesday, a Mon–Fri booking counts 4.5", () => {
    const lookup = lookupFor(["OFF", "FULL", "FULL", "AM", "FULL", "FULL", "OFF"]);
    expect(countWorkingDays(booking("2026-11-09", "AM", "2026-11-13", "PM"), lookup)).toBe(4.5);
  });

  it("a single morning booking on an afternoon-only day counts 0", () => {
    const lookup = lookupFor(["OFF", "FULL", "FULL", "FULL", "PM", "FULL", "OFF"]);
    expect(countWorkingDays(booking("2026-11-12", "AM", "2026-11-12", "AM"), lookup)).toBe(0);
  });

  it("a booking entirely on days off counts 0", () => {
    expect(
      countWorkingDays(booking("2026-11-14", "AM", "2026-11-15", "PM"), lookupFor(STANDARD)),
    ).toBe(0);
  });

  it("an override of FULL on a Saturday makes a Saturday booking count 1", () => {
    const lookup = lookupFor(STANDARD, [{ date: "2026-11-14", value: "FULL" }]);
    expect(countWorkingDays(booking("2026-11-14", "AM", "2026-11-14", "PM"), lookup)).toBe(1);
  });

  it("an override of OFF on a Monday removes it from the count", () => {
    const lookup = lookupFor(STANDARD, [{ date: "2026-11-09", value: "OFF" }]);
    expect(countWorkingDays(booking("2026-11-09", "AM", "2026-11-13", "PM"), lookup)).toBe(4);
  });

  it("a pattern changed from 7 June 2026 doesn't change counts for May", () => {
    const lookup = availabilityLookup(
      [
        { effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: STANDARD },
        {
          effectiveFrom: "2026-06-07",
          pattern: ["OFF", "FULL", "FULL", "FULL", "FULL", "OFF", "OFF"],
        },
      ],
      [],
    );
    expect(countWorkingDays(booking("2026-05-04", "AM", "2026-05-08", "PM"), lookup)).toBe(5);
    expect(countWorkingDays(booking("2026-06-08", "AM", "2026-06-12", "PM"), lookup)).toBe(4);
  });
});

describe("working and non-working slots", () => {
  it("splits a booking's half-days into worked and not worked", () => {
    // Fri 13 to Sat 14 on a standard week: Friday worked, Saturday not.
    const range = booking("2026-11-13", "AM", "2026-11-14", "PM");
    const lookup = lookupFor(STANDARD);
    expect(workingSlots(range, lookup)).toEqual([
      toSlot("2026-11-13", "AM"),
      toSlot("2026-11-13", "PM"),
    ]);
    expect(nonWorkingSlots(range, lookup)).toEqual([
      toSlot("2026-11-14", "AM"),
      toSlot("2026-11-14", "PM"),
    ]);
  });
});

describe("describeExcludedDays (the hint in the booking form)", () => {
  it.each([
    ["nothing was left out", STANDARD, booking("2026-11-09", "AM", "2026-11-13", "PM"), ""],
    [
      "one day off",
      STANDARD,
      booking("2026-11-13", "AM", "2026-11-14", "PM"),
      "Sat 14 is not a working day, so it is not counted.",
    ],
    [
      "two days off",
      STANDARD,
      booking("2026-11-13", "AM", "2026-11-16", "PM"),
      "Sat 14 and Sun 15 are not working days, so they are not counted.",
    ],
    [
      "three days off",
      ["OFF", "FULL", "FULL", "FULL", "FULL", "OFF", "OFF"],
      booking("2026-11-13", "AM", "2026-11-15", "PM"),
      "Fri 13, Sat 14 and Sun 15 are not working days, so they are not counted.",
    ],
    [
      "a morning-only day",
      ["OFF", "FULL", "FULL", "AM", "FULL", "FULL", "OFF"],
      booking("2026-11-09", "AM", "2026-11-13", "PM"),
      "Wed 11 is a morning-only day.",
    ],
    [
      "two afternoon-only days",
      ["OFF", "PM", "PM", "FULL", "FULL", "FULL", "OFF"],
      booking("2026-11-09", "AM", "2026-11-11", "PM"),
      "Mon 9 and Tue 10 are afternoon-only days.",
    ],
    [
      "only the worked half of a morning-only day was booked",
      ["OFF", "FULL", "FULL", "AM", "FULL", "FULL", "OFF"],
      booking("2026-11-11", "AM", "2026-11-11", "AM"),
      "",
    ],
    [
      "a day off and a morning-only day together",
      ["OFF", "FULL", "FULL", "FULL", "FULL", "AM", "OFF"],
      booking("2026-11-12", "AM", "2026-11-14", "PM"),
      "Sat 14 is not a working day, so it is not counted. Fri 13 is a morning-only day.",
    ],
  ] as const)("%s", (_, pattern, range, expected) => {
    expect(describeExcludedDays(range, lookupFor([...pattern]))).toBe(expected);
  });
});
