import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatDayHeader,
  formatDocumentTitlePeriod,
  formatLong,
  formatLongRange,
  formatPeriodTitle,
  formatRangeSummary,
  formatShort,
  formatWeekdayDayMonth,
  formatWeekdayShort,
} from "../format";
import { rangeOf } from "../slots";

describe("single dates", () => {
  it.each([
    ["2026-11-12", "Thu 12", "Thu 12 Nov", "Thursday 12 November 2026"],
    ["2026-09-01", "Tue 1", "Tue 1 Sep", "Tuesday 1 September 2026"],
    ["2028-02-29", "Tue 29", "Tue 29 Feb", "Tuesday 29 February 2028"],
  ])("%s", (date, header, short, long) => {
    expect(formatDayHeader(date)).toBe(header);
    expect(formatShort(date)).toBe(short);
    expect(formatLong(date)).toBe(long);
  });
});

describe("formatCount", () => {
  it.each([
    [1, "1 day"],
    [0.5, "0.5 days"],
    [3.5, "3.5 days"],
    [0, "0 days"],
    [4, "4 days"],
  ])("%d → %s", (days, expected) => {
    expect(formatCount(days)).toBe(expected);
  });
});

describe("formatRangeSummary (the live summary in the booking form)", () => {
  it.each([
    ["2026-11-12", "AM", "2026-11-12", "PM", 1, "Thu 12 Nov · 1 day"],
    ["2026-11-12", "AM", "2026-11-12", "AM", 0.5, "Thu 12 Nov, morning · 0.5 days"],
    ["2026-11-12", "PM", "2026-11-12", "PM", 0.5, "Thu 12 Nov, afternoon · 0.5 days"],
    // Same month: the month is left off.
    ["2026-11-10", "AM", "2026-11-15", "PM", 4, "Tue 10 – Sun 15 · 4 days"],
    // Different months: both ends show the month.
    ["2026-10-30", "AM", "2026-11-03", "PM", 3, "Fri 30 Oct – Tue 3 Nov · 3 days"],
    // Afternoon-only first day.
    ["2026-11-12", "PM", "2026-11-17", "PM", 3.5, "Thu 12 PM – Tue 17 · 3.5 days"],
    // Morning-only last day.
    ["2026-11-16", "AM", "2026-11-20", "AM", 4.5, "Mon 16 – Fri 20 AM · 4.5 days"],
  ] as const)("%s %s to %s %s → %s", (startDate, startHalf, endDate, endHalf, count, expected) => {
    const range = rangeOf({ startDate, startHalf, endDate, endHalf });
    expect(formatRangeSummary(range, count)).toBe(expected);
  });
});

describe("formatPeriodTitle", () => {
  it.each([
    ["week", "2026-11-08", "2026-11-14", "8 – 14 November 2026"],
    ["week", "2026-11-29", "2026-12-05", "29 November – 5 December 2026"],
    ["week", "2026-12-27", "2027-01-02", "27 December 2026 – 2 January 2027"],
    ["month", "2026-11-01", "2026-11-30", "November 2026"],
  ] as const)("%s %s to %s → %s", (view, from, to, expected) => {
    expect(formatPeriodTitle(view, { from, to })).toBe(expected);
  });
});

describe("formatDocumentTitlePeriod", () => {
  it.each([
    ["week", "2026-11-08", "Week of 8 Nov 2026"],
    ["month", "2026-11-01", "November 2026"],
  ] as const)("%s from %s → %s", (view, from, expected) => {
    expect(formatDocumentTitlePeriod(view, from)).toBe(expected);
  });
});

describe("long dates for screen readers", () => {
  it("formatWeekdayShort and formatWeekdayDayMonth", () => {
    expect(formatWeekdayShort("2026-11-12")).toBe("Thu");
    expect(formatWeekdayDayMonth("2026-11-12")).toBe("Thursday 12 November");
  });

  it.each([
    ["2026-11-12", "2026-11-12", "Thursday 12 November"],
    ["2026-11-09", "2026-11-11", "Monday 9 to Wednesday 11 November"],
    ["2026-10-30", "2026-11-03", "Friday 30 October to Tuesday 3 November"],
  ])("formatLongRange(%s, %s) → %s", (from, to, expected) => {
    expect(formatLongRange(from, to)).toBe(expected);
  });
});
