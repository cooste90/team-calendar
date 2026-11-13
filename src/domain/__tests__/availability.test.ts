import { describe, expect, it } from "vitest";
import {
  availabilityLookup,
  DEFAULT_PATTERN,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
  planPatternChange,
  type WeeklyPattern,
  worksSlot,
} from "../availability";

// Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const FOUR_DAY_WEEK: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "OFF", "OFF"];
const SATURDAYS_TOO: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "FULL"];

describe("availabilityLookup", () => {
  it("with no pattern saved, uses Mon–Fri full days and weekends off", () => {
    const lookup = availabilityLookup([], []);
    expect(lookup("2026-11-12")).toBe("FULL"); // Thursday
    expect(lookup("2026-11-14")).toBe("OFF"); // Saturday
  });

  it("uses the newest pattern that started on or before the date", () => {
    // Deliberately out of order: the lookup sorts them.
    const lookup = availabilityLookup(
      [
        { effectiveFrom: "2026-06-07", pattern: FOUR_DAY_WEEK },
        { effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN },
        { effectiveFrom: "2026-09-06", pattern: SATURDAYS_TOO },
      ],
      [],
    );
    expect(lookup("2026-05-08")).toBe("FULL"); // a Friday before any change
    expect(lookup("2026-06-12")).toBe("OFF"); // a Friday on the four-day week
    expect(lookup("2026-09-12")).toBe("FULL"); // a Saturday after the Saturday change
  });

  it("an override for a date wins over the pattern", () => {
    const lookup = availabilityLookup(
      [],
      [
        { date: "2026-11-14", value: "AM" }, // working Saturday morning
        { date: "2026-11-09", value: "OFF" }, // not working Monday
      ],
    );
    expect(lookup("2026-11-14")).toBe("AM");
    expect(lookup("2026-11-09")).toBe("OFF");
    expect(lookup("2026-11-10")).toBe("FULL");
  });
});

describe("worksSlot", () => {
  it.each([
    ["FULL", "AM", true],
    ["FULL", "PM", true],
    ["AM", "AM", true],
    ["AM", "PM", false],
    ["PM", "AM", false],
    ["PM", "PM", true],
    ["OFF", "AM", false],
    ["OFF", "PM", false],
  ] as const)("a %s day: works the %s half? %s", (workDay, half, expected) => {
    expect(worksSlot(workDay, half)).toBe(expected);
  });
});

describe("planPatternChange", () => {
  // Changes apply from the next Sunday, even when today is a Sunday.
  it.each([
    ["2026-11-08"], // Sunday
    ["2026-11-09"],
    ["2026-11-10"],
    ["2026-11-11"],
    ["2026-11-12"],
    ["2026-11-13"],
    ["2026-11-14"], // Saturday
  ])("a change saved on %s starts on Sunday 15 November", (today) => {
    expect(planPatternChange([], FOUR_DAY_WEEK, today)).toEqual({
      effectiveFrom: "2026-11-15",
      pattern: FOUR_DAY_WEEK,
    });
  });

  it("saving again before Sunday replaces the pending change for that Sunday", () => {
    const pending = [{ effectiveFrom: "2026-11-15", pattern: FOUR_DAY_WEEK }];
    expect(planPatternChange(pending, SATURDAYS_TOO, "2026-11-13")).toEqual({
      effectiveFrom: "2026-11-15",
      pattern: SATURDAYS_TOO,
    });
  });

  it("returns null when the pattern from next Sunday would already be the same", () => {
    expect(planPatternChange([], DEFAULT_PATTERN, "2026-11-12")).toBeNull();
    const pending = [{ effectiveFrom: "2026-11-15", pattern: FOUR_DAY_WEEK }];
    expect(planPatternChange(pending, FOUR_DAY_WEEK, "2026-11-12")).toBeNull();
  });
});
