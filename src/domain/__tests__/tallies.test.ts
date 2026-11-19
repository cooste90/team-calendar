import { describe, expect, it } from "vitest";
import { availabilityLookup } from "../availability";
import type { Booking } from "../events";
import type { LeaveType } from "../leave-types";
import type { HalfDay } from "../slots";
import {
  computeTallies,
  historyGroups,
  leaveSummary,
  tallyWindows,
  upcomingBookings,
} from "../tallies";

// Everyone here works Mon–Fri (the default pattern).
const standardWeek = availabilityLookup([], []);

let nextId = 1;
function makeBooking(
  type: LeaveType,
  startDate: string,
  endDate: string,
  startHalf: HalfDay = "AM",
  endHalf: HalfDay = "PM",
): Booking {
  return {
    id: `b${nextId++}`,
    userId: "priya",
    type,
    startDate,
    startHalf,
    endDate,
    endHalf,
    publicHolidayId: null,
  };
}

function tallyFor(type: LeaveType, bookings: Booking[], today: string) {
  return computeTallies(bookings, standardWeek, today).find((tally) => tally.type === type);
}

describe("tallyWindows", () => {
  it.each([
    ["2026-11-12", "2026-01-01", "2026-12-31", "2025-11-13", "2026-11-12"],
    ["2028-02-29", "2028-01-01", "2028-12-31", "2027-03-01", "2028-02-29"], // leap day
  ])("on %s: the year is %s to %s, the rolling 12 months %s to %s", (today, yearFrom, yearTo, rollingFrom, rollingTo) => {
    expect(tallyWindows(today)).toEqual({
      calendarYear: { from: yearFrom, to: yearTo },
      rolling12Months: { from: rollingFrom, to: rollingTo },
    });
  });
});

describe("computeTallies", () => {
  it("counts only the tallied types, in display order (FL, SK, OT and WFH are ignored)", () => {
    const tallies = computeTallies(
      [makeBooking("FLEXI", "2026-11-09", "2026-11-09")],
      standardWeek,
      "2026-11-12",
    );
    expect(tallies).toEqual([
      { type: "ANNUAL", window: { from: "2026-01-01", to: "2026-12-31" }, taken: 0, booked: 0 },
      { type: "SPECIAL", window: { from: "2025-11-13", to: "2026-11-12" }, taken: 0 },
      { type: "PARENTAL", window: { from: "2025-11-13", to: "2026-11-12" }, taken: 0 },
      { type: "WELLBEING", window: { from: "2025-11-13", to: "2026-11-12" }, taken: 0 },
      { type: "PUBLIC_HOLIDAY", window: { from: "2025-11-13", to: "2026-11-12" }, taken: 0 },
    ]);
  });

  it("annual leave: taken includes today, booked runs from tomorrow to 31 December", () => {
    const thisWeek = makeBooking("ANNUAL", "2026-11-09", "2026-11-13"); // Mon to Fri; today is Thu
    expect(tallyFor("ANNUAL", [thisWeek], "2026-11-12")).toMatchObject({ taken: 4, booked: 1 });
  });

  it("an annual leave booking crossing 31 December is split between the two years", () => {
    const newYear = makeBooking("ANNUAL", "2026-12-28", "2027-01-08"); // Mon 28 Dec to Fri 8 Jan
    expect(tallyFor("ANNUAL", [newYear], "2026-12-01")).toMatchObject({ taken: 0, booked: 4 });
    expect(tallyFor("ANNUAL", [newYear], "2027-01-15")).toMatchObject({ taken: 6, booked: 0 });
  });

  it("the rolling window starts the day after the same date last year", () => {
    const dayBefore = makeBooking("SPECIAL", "2025-11-12", "2025-11-12"); // Wednesday, outside
    const firstDay = makeBooking("SPECIAL", "2025-11-13", "2025-11-13"); // Thursday, inside
    expect(tallyFor("SPECIAL", [dayBefore], "2026-11-12")?.taken).toBe(0);
    expect(tallyFor("SPECIAL", [firstDay], "2026-11-12")?.taken).toBe(1);
  });

  it("a half day counts 0.5", () => {
    const morning = makeBooking("WELLBEING", "2026-11-10", "2026-11-10", "AM", "AM");
    expect(tallyFor("WELLBEING", [morning], "2026-11-12")?.taken).toBe(0.5);
  });
});

describe("historyGroups", () => {
  it("groups past bookings in each window by type, newest first, leaving out empty groups", () => {
    const olderAl = makeBooking("ANNUAL", "2026-03-02", "2026-03-03");
    const newerAl = makeBooking("ANNUAL", "2026-08-03", "2026-08-07");
    const lastYearAl = makeBooking("ANNUAL", "2025-12-01", "2025-12-02"); // before this year
    const futureAl = makeBooking("ANNUAL", "2026-12-21", "2026-12-23"); // not taken yet
    const holiday = makeBooking("PUBLIC_HOLIDAY", "2026-08-31", "2026-08-31");
    const flexi = makeBooking("FLEXI", "2026-10-01", "2026-10-01"); // not tallied

    expect(
      historyGroups([olderAl, lastYearAl, futureAl, newerAl, holiday, flexi], "2026-11-12"),
    ).toEqual([
      { type: "ANNUAL", bookings: [newerAl, olderAl] },
      { type: "PUBLIC_HOLIDAY", bookings: [holiday] },
    ]);
  });
});

describe("upcomingBookings", () => {
  it("lists leave from today onwards, soonest first, marking a booking that has already started", () => {
    const ended = makeBooking("ANNUAL", "2026-11-02", "2026-11-06");
    const ongoing = makeBooking("SICKNESS", "2026-11-10", "2026-11-13");
    const later = makeBooking("WFH", "2026-11-20", "2026-11-20");
    const today = makeBooking("FLEXI", "2026-11-12", "2026-11-12");

    expect(upcomingBookings([later, ended, today, ongoing], "2026-11-12")).toEqual([
      { booking: ongoing, ongoing: true },
      { booking: today, ongoing: false },
      { booking: later, ongoing: false },
    ]);
  });
});

describe("leaveSummary", () => {
  it("gives every tallied type its bookings with their working days, even when there are none", () => {
    const week = makeBooking("ANNUAL", "2026-08-03", "2026-08-09"); // Mon to Sun: 5 working days
    const { history } = leaveSummary([week], standardWeek, "2026-11-12");
    expect(history.map((tally) => [tally.type, tally.bookings])).toEqual([
      ["ANNUAL", [{ booking: week, days: 5 }]],
      ["SPECIAL", []],
      ["PARENTAL", []],
      ["WELLBEING", []],
      ["PUBLIC_HOLIDAY", []],
    ]);
    expect(history[0]).toMatchObject({ taken: 5, booked: 0 });
  });

  it("puts upcoming leave under month headings, with leave that has already started under this month", () => {
    const ongoing = makeBooking("SICKNESS", "2026-10-29", "2026-11-13"); // started in October
    const later = makeBooking("WFH", "2026-11-20", "2026-11-20", "PM", "PM");
    const january = makeBooking("ANNUAL", "2027-01-04", "2027-01-05");

    expect(leaveSummary([january, later, ongoing], standardWeek, "2026-11-12").upcoming).toEqual([
      {
        month: "2026-11-01",
        bookings: [
          { booking: ongoing, days: 12, ongoing: true },
          { booking: later, days: 0.5, ongoing: false },
        ],
      },
      { month: "2027-01-01", bookings: [{ booking: january, days: 2, ongoing: false }] },
    ]);
  });
});
