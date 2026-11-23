import { describe, expect, it } from "vitest";
import {
  formatBookings,
  formatCount,
  formatDateInput,
  formatDateWindow,
  formatDayHeader,
  formatDocumentTitlePeriod,
  formatFilterName,
  formatFilterSummary,
  formatHolidayImpact,
  formatLong,
  formatLongRange,
  formatMonthYear,
  formatPeople,
  formatPeriodAnnouncement,
  formatPeriodTitle,
  formatRangeSummary,
  formatRangeWithMonth,
  formatShort,
  formatShortRange,
  formatTimestamp,
  formatWeekdayDayMonth,
  formatWeekdayShort,
  parseDateText,
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

describe("formatPeople", () => {
  it.each([
    [1, "1 person"],
    [0, "0 people"],
    [6, "6 people"],
  ])("%d → %s", (count, expected) => {
    expect(formatPeople(count)).toBe(expected);
  });
});

describe("formatBookings", () => {
  it.each([
    [1, "1 booking"],
    [0, "0 bookings"],
    [3, "3 bookings"],
  ])("%d → %s", (count, expected) => {
    expect(formatBookings(count)).toBe(expected);
  });
});

describe("formatHolidayImpact (the warning before a public holiday change)", () => {
  const start = "This applies to every business unit:";
  const stay = "Copies people moved or deleted themselves stay as they are.";
  it.each([
    [
      "create",
      214,
      37,
      `${start} 214 people will get this holiday. 37 existing bookings will be replaced (parental leave is kept).`,
    ],
    [
      "create",
      1,
      1,
      `${start} 1 person will get this holiday. 1 existing booking will be replaced (parental leave is kept).`,
    ],
    [
      "create",
      50,
      0,
      `${start} 50 people will get this holiday. No existing bookings will be replaced.`,
    ],
    [
      "move",
      48,
      2,
      `${start} 48 people will have it moved to the new date. 2 existing bookings will be replaced (parental leave is kept). ${stay}`,
    ],
    ["delete", 214, 0, `${start} 214 people will lose this holiday. ${stay}`],
    ["rename", 0, 0, `${start} the holiday is renamed on everyone's calendar.`],
  ] as const)("%s, %d people, %d replaced", (kind, people, bookingsReplaced, expected) => {
    expect(formatHolidayImpact(kind, { people, bookingsReplaced })).toBe(expected);
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

describe("formatRangeWithMonth (the profile's lists)", () => {
  it.each([
    ["2026-11-12", "AM", "2026-11-12", "AM", 0.5, "Thu 12 Nov, morning · 0.5 days"],
    // Same month: the month is still on the end.
    ["2026-11-10", "AM", "2026-11-15", "PM", 4, "Tue 10 – Sun 15 Nov · 4 days"],
    ["2026-11-12", "PM", "2026-11-17", "PM", 3.5, "Thu 12 PM – Tue 17 Nov · 3.5 days"],
    ["2026-10-30", "AM", "2026-11-03", "PM", 3, "Fri 30 Oct – Tue 3 Nov · 3 days"],
  ] as const)("%s %s to %s %s → %s", (startDate, startHalf, endDate, endHalf, count, expected) => {
    const range = rangeOf({ startDate, startHalf, endDate, endHalf });
    expect(formatRangeWithMonth(range, count)).toBe(expected);
  });
});

describe("formatShortRange (the delete confirmation's dates)", () => {
  it.each([
    ["2026-11-12", "2026-11-12", "Thu 12 Nov"],
    ["2026-11-09", "2026-11-11", "Mon 9 – Wed 11 Nov"],
    ["2026-10-30", "2026-11-03", "Fri 30 Oct – Tue 3 Nov"],
  ])("%s to %s → %s", (from, to, expected) => {
    expect(formatShortRange(from, to)).toBe(expected);
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

describe("formatPeriodAnnouncement", () => {
  it.each([
    ["week", "2026-11-08", "2026-11-14", "Week of 8 to 14 November 2026"],
    ["week", "2026-11-29", "2026-12-05", "Week of 29 November to 5 December 2026"],
    ["month", "2026-11-01", "2026-11-30", "November 2026"],
  ] as const)("%s %s to %s → %s", (view, from, to, expected) => {
    expect(formatPeriodAnnouncement(view, { from, to })).toBe(expected);
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

describe("formatMonthYear (Upcoming leave's month headings)", () => {
  it.each([
    ["2026-11-01", "November 2026"],
    ["2027-01-15", "January 2027"],
  ])("%s → %s", (date, expected) => {
    expect(formatMonthYear(date)).toBe(expected);
  });
});

describe("formatDateWindow (the dates a leave tally covers)", () => {
  it.each([
    ["2026-01-01", "2026-12-31", "1 Jan – 31 Dec 2026"],
    ["2025-11-13", "2026-11-12", "13 Nov 2025 – 12 Nov 2026"],
  ])("%s to %s → %s", (from, to, expected) => {
    expect(formatDateWindow({ from, to })).toBe(expected);
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

describe("formatFilterName", () => {
  it.each([
    [0, "Teams"],
    [1, "Teams, 1 selected"],
    [2, "Teams, 2 selected"],
  ])("with %i chosen it's %s", (count, expected) => {
    expect(formatFilterName("Teams", count)).toBe(expected);
  });
});

describe("formatFilterSummary", () => {
  it.each([
    [
      ["Service Design", "Finance Operations"],
      2,
      "Filtered: Service Design, Finance Operations · 2 people",
    ],
    [["Service Design"], 0, "Filtered: Service Design"],
    [[], 1, "Filtered: 1 person"],
  ])("teams %j and %i people → %s", (teamNames, peopleCount, expected) => {
    expect(formatFilterSummary(teamNames, peopleCount)).toBe(expected);
  });
});

describe("the booking form's date inputs", () => {
  it("show a date as “Thu 12 Nov 2026”", () => {
    expect(formatDateInput("2026-11-12")).toBe("Thu 12 Nov 2026");
  });

  it.each([
    ["12/11/2026", "2026-11-12"],
    ["1/2/2027", "2027-02-01"],
    ["12 Nov 2026", "2026-11-12"],
    ["12 november 2026", "2026-11-12"],
    ["Thu 12 Nov 2026", "2026-11-12"],
    ["3 Sept 2026", "2026-09-03"],
    ["2026-11-12", "2026-11-12"],
    ["  12/11/2026  ", "2026-11-12"],
    ["31/02/2026", null],
    ["12 Nox 2026", null],
    ["12 No 2026", null],
    ["next Tuesday", null],
    ["", null],
  ])("read “%s” as %s", (text, expected) => {
    expect(parseDateText(text)).toBe(expected);
  });
});

describe("formatTimestamp", () => {
  it.each([
    ["2026-11-03T09:14:00Z", "3 Nov 2026, 09:14"], // GMT in winter
    ["2026-07-01T08:05:00Z", "1 Jul 2026, 09:05"], // BST in summer
    ["2026-12-31T23:30:00Z", "31 Dec 2026, 23:30"],
  ])("%s reads “%s” in London", (instant, expected) => {
    expect(formatTimestamp(new Date(instant), "Europe/London")).toBe(expected);
  });
});
