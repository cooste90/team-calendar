import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  anchorForMonthSelection,
  calendarDateSchema,
  diffDays,
  eachDate,
  endOfMonth,
  endOfWeek,
  fromDayNumber,
  fromDbDate,
  fromLocalDate,
  isCalendarDate,
  nextSunday,
  periodRange,
  shiftPeriod,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toDayNumber,
  toDbDate,
  todayIn,
  toLocalDate,
  weekday,
  weekForMonthSelection,
  yearOptions,
} from "../dates";

// Reference: Thursday 12 November 2026. Sunday 8 November starts that week.

describe("isCalendarDate", () => {
  it.each([
    ["2026-11-12", true],
    ["2028-02-29", true], // leap year
    ["2026-02-29", false], // not a leap year
    ["2026-02-30", false],
    ["2026-13-01", false],
    ["2026-1-5", false],
    ["12/11/2026", false],
    ["", false],
  ])("%s is %s", (value, expected) => {
    expect(isCalendarDate(value)).toBe(expected);
  });

  it("the zod schema accepts real dates and rejects impossible ones", () => {
    expect(calendarDateSchema.safeParse("2026-11-12").success).toBe(true);
    expect(calendarDateSchema.safeParse("2026-02-30").success).toBe(false);
  });
});

describe("day numbers", () => {
  it.each([
    ["1970-01-01", 0],
    ["1970-01-02", 1],
    ["2026-11-12", 20_769],
    ["1969-12-31", -1],
  ])("%s is day %i", (date, dayNumber) => {
    expect(toDayNumber(date)).toBe(dayNumber);
    expect(fromDayNumber(dayNumber)).toBe(date);
  });
});

describe("adding and counting days", () => {
  it.each([
    ["2026-11-12", 1, "2026-11-13"],
    ["2026-11-30", 1, "2026-12-01"],
    ["2026-12-31", 1, "2027-01-01"], // year boundary
    ["2028-02-28", 1, "2028-02-29"], // leap day
    ["2028-02-29", 1, "2028-03-01"],
    ["2026-03-28", 2, "2026-03-30"], // across the clocks going forward
    ["2026-01-01", -1, "2025-12-31"],
  ])("%s + %i days = %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
    expect(diffDays(date, expected)).toBe(days);
  });

  it("eachDate lists every date, both ends included", () => {
    expect(eachDate("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(eachDate("2026-11-12", "2026-11-12")).toEqual(["2026-11-12"]);
    expect(eachDate("2026-11-13", "2026-11-12")).toEqual([]);
  });
});

describe("weeks run Sunday to Saturday", () => {
  it.each([
    ["2026-11-08", 0, "2026-11-08", "2026-11-14"], // Sunday
    ["2026-11-12", 4, "2026-11-08", "2026-11-14"], // Thursday
    ["2026-11-14", 6, "2026-11-08", "2026-11-14"], // Saturday
    ["2026-12-01", 2, "2026-11-29", "2026-12-05"], // week spanning two months
    ["2027-01-01", 5, "2026-12-27", "2027-01-02"], // week spanning two years
    ["1969-12-28", 0, "1969-12-28", "1970-01-03"], // before day 0
  ])("%s is weekday %i, in the week %s to %s", (date, day, start, end) => {
    expect(weekday(date)).toBe(day);
    expect(startOfWeek(date)).toBe(start);
    expect(endOfWeek(date)).toBe(end);
  });

  // Pattern changes apply from the next Sunday, never the same day.
  it.each([
    ["2026-11-08", "2026-11-15"], // Sunday → the following Sunday
    ["2026-11-09", "2026-11-15"],
    ["2026-11-10", "2026-11-15"],
    ["2026-11-11", "2026-11-15"],
    ["2026-11-12", "2026-11-15"],
    ["2026-11-13", "2026-11-15"],
    ["2026-11-14", "2026-11-15"],
  ])("the next Sunday after %s is %s", (date, expected) => {
    expect(nextSunday(date)).toBe(expected);
  });
});

describe("months and years", () => {
  it.each([
    ["2026-11-12", "2026-11-01", "2026-11-30"],
    ["2028-02-10", "2028-02-01", "2028-02-29"], // leap year
    ["2026-02-10", "2026-02-01", "2026-02-28"],
    ["2026-12-31", "2026-12-01", "2026-12-31"],
  ])("%s is in the month %s to %s", (date, start, end) => {
    expect(startOfMonth(date)).toBe(start);
    expect(endOfMonth(date)).toBe(end);
  });

  it.each([
    ["2026-01-31", 1, "2026-02-28"], // clamped to the end of February
    ["2028-01-31", 1, "2028-02-29"],
    ["2026-11-12", 2, "2027-01-12"], // into the next year
    ["2026-01-15", -1, "2025-12-15"], // back into the previous year
    ["2026-03-31", -1, "2026-02-28"],
  ])("%s + %i months = %s", (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });

  it("startOfYear is 1 January", () => {
    expect(startOfYear("2026-11-12")).toBe("2026-01-01");
  });

  it("the year dropdown offers 5 years either side of this year", () => {
    expect(yearOptions("2026-11-12")).toEqual([
      2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031,
    ]);
  });
});

describe("todayIn Europe/London", () => {
  it.each([
    ["2026-01-15T23:30:00Z", "2026-01-15"], // winter (GMT): same date as UTC
    ["2026-07-15T23:30:00Z", "2026-07-16"], // summer (BST): already tomorrow in London
    ["2026-03-28T23:30:00Z", "2026-03-28"], // the night before the clocks go forward
    ["2026-03-29T00:59:00Z", "2026-03-29"], // just before the switch
    ["2026-03-29T23:30:00Z", "2026-03-30"], // first night of BST
    ["2026-10-24T23:30:00Z", "2026-10-25"], // last night of BST
    ["2026-10-25T23:30:00Z", "2026-10-25"], // first night back on GMT
  ])("at %s it is %s in London", (instant, expected) => {
    expect(todayIn("Europe/London", new Date(instant))).toBe(expected);
  });

  it("uses the current time when none is given", () => {
    expect(isCalendarDate(todayIn("Europe/London"))).toBe(true);
  });
});

describe("periods on screen", () => {
  it("week view is Sunday to Saturday", () => {
    const period = periodRange("week", "2026-11-12");
    expect(period.from).toBe("2026-11-08");
    expect(period.to).toBe("2026-11-14");
    expect(period.days).toHaveLength(7);
  });

  it("month view is the 1st to the last day", () => {
    const period = periodRange("month", "2026-11-12");
    expect(period.from).toBe("2026-11-01");
    expect(period.to).toBe("2026-11-30");
    expect(period.days).toHaveLength(30);
  });

  it.each([
    ["week", "2026-11-12", 1, "2026-11-15"],
    ["week", "2026-11-12", -1, "2026-11-01"],
    ["week", "2026-12-31", 1, "2027-01-03"],
    ["month", "2026-11-12", 1, "2026-12-01"],
    ["month", "2026-12-12", 1, "2027-01-01"],
    ["month", "2026-01-31", -1, "2025-12-01"],
  ] as const)("%s view: from %s, step %i goes to %s", (view, anchor, step, expected) => {
    expect(shiftPeriod(view, anchor, step)).toBe(expected);
  });

  it("choosing a month in week view jumps to the week containing the 1st", () => {
    expect(weekForMonthSelection(11, 2026)).toBe("2026-11-01"); // the 1st is a Sunday
    expect(weekForMonthSelection(1, 2027)).toBe("2026-12-27"); // the 1st is a Friday
  });

  it.each([
    { view: "week", month: 1, year: 2027, anchor: "2026-12-27" },
    { view: "month", month: 1, year: 2027, anchor: "2027-01-01" },
  ] as const)("picking a month in $view view goes to $anchor", ({ view, month, year, anchor }) => {
    expect(anchorForMonthSelection(view, month, year)).toBe(anchor);
  });
});

describe("database dates", () => {
  it("round-trips through a UTC-midnight Date", () => {
    const dbDate = toDbDate("2026-03-29");
    expect(dbDate.toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(fromDbDate(dbDate)).toBe("2026-03-29");
  });
});

describe("the date picker's local dates", () => {
  it.each([
    "2026-11-12",
    "2026-03-29",
    "2026-10-25",
    "2028-02-29",
  ])("%s survives a round trip, even across a clock change", (date) => {
    expect(fromLocalDate(toLocalDate(date))).toBe(date);
  });
});
