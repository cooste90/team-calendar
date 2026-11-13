import { describe, expect, it } from "vitest";
import { availabilityLookup } from "../availability";
import { addDays, periodRange } from "../dates";
import type { Booking } from "../events";
import { buildGridModel } from "../grid-model";
import type { GridInput, GridPerson, GridRow } from "../grid-model-types";
import type { LeaveType } from "../leave-types";
import type { HalfDay } from "../slots";

// The week of Sunday 8 to Saturday 14 November 2026; today is Thursday 12.
// Grid columns: name = 1, Sun 8 = 2–3, Mon 9 = 4–5, … Thu 12 = 10–11, … Sat 14 = 14–15.
const standardWeek = availabilityLookup([], []);

function makePerson(
  id: string,
  surname: string,
  teamId: string | null,
  firstName = "Sam",
): GridPerson {
  return { id, firstName, preferredName: null, surname, teamId, availability: standardWeek };
}

function makeBooking(
  id: string,
  userId: string,
  type: LeaveType,
  startDate: string,
  startHalf: HalfDay,
  endDate: string,
  endHalf: HalfDay,
): Booking {
  return { id, userId, type, startDate, startHalf, endDate, endHalf, publicHolidayId: null };
}

const tom = { ...makePerson("tom", "Okafor", "ops"), firstName: "Thomas", preferredName: "Tom" };

function input(changes: Partial<GridInput> = {}): GridInput {
  return {
    view: "week",
    period: periodRange("week", "2026-11-12"),
    today: "2026-11-12",
    viewer: { id: "priya", teamId: "ops", canSeeUnassigned: false, canEdit: () => true },
    teams: [{ id: "ops", name: "Operations", sortOrder: 1 }],
    people: [tom],
    bookings: [],
    publicHolidays: [],
    collapsedTeamIds: [],
    filters: { teamIds: [], personIds: [] },
    ...changes,
  };
}

function tomsRow(changes: Partial<GridInput>): GridRow {
  return buildGridModel(input(changes)).groups[0].rows[0];
}

describe("columns", () => {
  it("has one column per day, two grid tracks each, with today and public holidays marked", () => {
    const { columns } = buildGridModel(
      input({ publicHolidays: [{ id: "ph", date: "2026-11-13", name: "Founders' Day" }] }),
    );
    expect(columns.map((column) => column.gridColumn)).toEqual([
      "2 / span 2",
      "4 / span 2",
      "6 / span 2",
      "8 / span 2",
      "10 / span 2",
      "12 / span 2",
      "14 / span 2",
    ]);
    expect(columns[4]).toMatchObject({
      date: "2026-11-12",
      isToday: true,
      header: {
        weekdayShort: "Thu",
        dayNumber: 12,
        accessibleLabel: "Thursday 12 November, today",
        publicHolidayName: null,
      },
    });
    expect(columns[5].header).toMatchObject({
      accessibleLabel: "Friday 13 November, public holiday: Founders' Day",
      publicHolidayName: "Founders' Day",
    });
  });
});

describe("bars", () => {
  it("a booking spanning the whole week is clipped on both sides", () => {
    const november = makeBooking("al", "tom", "ANNUAL", "2026-11-02", "AM", "2026-11-30", "PM");
    expect(tomsRow({ bookings: [november] }).bars).toEqual([
      {
        bookingId: "al",
        type: "ANNUAL",
        code: "AL",
        gridColumn: "2 / span 14",
        label: "AL · 21 days",
        clippedStart: true,
        clippedEnd: true,
        isHalf: false,
        isNarrow: false,
        title: "Annual leave, Monday 2 to Monday 30 November, 21 days",
      },
    ]);
  });

  it("half-day bars sit on the morning (even) or afternoon (odd) track", () => {
    const morning = makeBooking("am", "tom", "ANNUAL", "2026-11-12", "AM", "2026-11-12", "AM");
    const afternoon = makeBooking("pm", "tom", "FLEXI", "2026-11-12", "PM", "2026-11-12", "PM");
    const bars = tomsRow({ bookings: [afternoon, morning] }).bars;
    expect(bars.map((bar) => [bar.code, bar.gridColumn, bar.label, bar.isHalf])).toEqual([
      ["AL", "10 / span 1", "AL", true],
      ["FL", "11 / span 1", "FL", true],
    ]);
    expect(bars[0].title).toBe("Annual leave, Thursday 12 November, morning, 0.5 days");
  });

  it("half-day bars are marked narrow in month view", () => {
    const morning = makeBooking("am", "tom", "ANNUAL", "2026-11-12", "AM", "2026-11-12", "AM");
    const row = tomsRow({
      view: "month",
      period: periodRange("month", "2026-11-12"),
      bookings: [morning],
    });
    expect(row.bars[0].isNarrow).toBe(true);
  });

  it("days off inside a multi-day bar are hatched, half-day by half-day", () => {
    const friToTue = makeBooking("al", "tom", "ANNUAL", "2026-11-13", "AM", "2026-11-17", "PM");
    const saturdayOnly = makeBooking("wfh", "tom", "WFH", "2026-11-14", "AM", "2026-11-14", "PM");
    expect(tomsRow({ bookings: [friToTue] }).offOverlays).toEqual([
      { gridColumn: "14 / span 1" },
      { gridColumn: "15 / span 1" },
    ]);
    expect(tomsRow({ bookings: [saturdayOnly] }).offOverlays).toEqual([]);
  });

  it("ignores bookings outside the period", () => {
    const nextWeek = makeBooking("al", "tom", "ANNUAL", "2026-11-16", "AM", "2026-11-16", "PM");
    expect(tomsRow({ bookings: [nextWeek] }).bars).toEqual([]);
  });
});

describe("cells", () => {
  it("each cell says the date, person, availability and bookings for screen readers", () => {
    const leave = makeBooking("al", "tom", "ANNUAL", "2026-11-09", "AM", "2026-11-11", "PM");
    const row = tomsRow({ bookings: [leave] });
    expect(row.cells[2]).toEqual({
      date: "2026-11-10",
      gridColumn: "6 / span 2",
      availability: "FULL",
      isToday: false,
      bookings: [{ bookingId: "al", type: "ANNUAL", portion: "FULL" }],
      accessibleLabel:
        "Tuesday 10 November, Tom Okafor. Annual leave, Monday 9 to Wednesday 11 November, 3 days.",
    });
    expect(row.cells[6].accessibleLabel).toBe(
      "Saturday 14 November, Tom Okafor, not a working day.",
    );
  });

  it("says “morning only”, “afternoon only” and “view only” where they apply", () => {
    const partTime = availabilityLookup(
      [
        {
          effectiveFrom: "2000-01-02",
          pattern: ["OFF", "AM", "PM", "FULL", "FULL", "FULL", "OFF"],
        },
      ],
      [],
    );
    const row = tomsRow({
      people: [{ ...tom, availability: partTime }],
      viewer: { id: "priya", teamId: "ops", canSeeUnassigned: false, canEdit: () => false },
    });
    expect(row.canEdit).toBe(false);
    expect(row.cells[1].accessibleLabel).toBe(
      "Monday 9 November, Tom Okafor, morning only. View only.",
    );
    expect(row.cells[2].accessibleLabel).toBe(
      "Tuesday 10 November, Tom Okafor, afternoon only. View only.",
    );
  });
});

describe("groups and rows", () => {
  const teams = [
    { id: "finance", name: "Finance", sortOrder: 2 },
    { id: "ops", name: "Operations", sortOrder: 3 },
    { id: "design", name: "Design", sortOrder: 1 },
  ];
  const people = [
    makePerson("priya", "Shah", "ops"),
    makePerson("ana", "Silva", "finance"),
    makePerson("li", "Wei", "design"),
    makePerson("new", "Starter", null),
  ];

  it("pins the viewer's team first, then the others in admin order", () => {
    const groups = buildGridModel(input({ teams, people })).groups;
    expect(groups.map((group) => [group.name, group.isViewerTeam])).toEqual([
      ["Operations", true],
      ["Design", false],
      ["Finance", false],
    ]);
    expect(groups[0].rows[0]).toMatchObject({
      personId: "priya",
      displayName: "Sam Shah",
      isViewer: true,
    });
  });

  it("hides Unassigned from regular users and shows it last to admins", () => {
    const admin = { id: "priya", teamId: "ops", canSeeUnassigned: true, canEdit: () => true };
    expect(
      buildGridModel(input({ teams, people })).groups.some((group) => group.isUnassigned),
    ).toBe(false);
    const groups = buildGridModel(input({ teams, people, viewer: admin })).groups;
    expect(groups.at(-1)).toMatchObject({
      id: "unassigned",
      name: "Unassigned",
      isUnassigned: true,
      memberCount: 1,
    });
  });

  it("a collapsed group keeps its member count but has no rows", () => {
    const group = buildGridModel(input({ teams, people, collapsedTeamIds: ["ops"] })).groups[0];
    expect(group).toMatchObject({ id: "ops", collapsed: true, memberCount: 1, rows: [] });
  });

  it("filters show the union of the chosen teams and people, and drop empty groups", () => {
    const filters = { teamIds: ["design"], personIds: ["ana"] };
    const groups = buildGridModel(input({ teams, people, filters })).groups;
    expect(groups.map((group) => [group.name, group.rows.map((row) => row.personId)])).toEqual([
      ["Design", ["li"]],
      ["Finance", ["ana"]],
    ]);
  });

  it("keeps empty teams when no filters are set", () => {
    const groups = buildGridModel(input({ teams, people: [] })).groups;
    expect(groups.map((group) => group.memberCount)).toEqual([0, 0, 0]);
  });

  it("sorts by surname with en-GB rules (accents sort with their letter), then first name", () => {
    const team = [
      makePerson("p1", "Oyelaran", "ops"),
      makePerson("p2", "Ólafsson", "ops"),
      makePerson("p3", "Okafor", "ops", "Zoe"),
      makePerson("p4", "Okafor", "ops", "Adam"),
      makePerson("p5", "Évans", "ops"),
      makePerson("p6", "Ellis", "ops"),
    ];
    const rows = buildGridModel(input({ people: team })).groups[0].rows;
    expect(rows.map((row) => row.displayName)).toEqual([
      "Sam Ellis",
      "Sam Évans",
      "Adam Okafor",
      "Zoe Okafor",
      "Sam Ólafsson",
      "Sam Oyelaran",
    ]);
  });
});

describe("performance", () => {
  it("builds a month for 300 people with 3,000 bookings quickly", () => {
    const teams = Array.from({ length: 10 }, (_, index) => ({
      id: `t${index}`,
      name: `Team ${index}`,
      sortOrder: index,
    }));
    const people = Array.from({ length: 300 }, (_, index) =>
      makePerson(`p${index}`, `Surname${index}`, `t${index % 10}`),
    );
    const bookings = Array.from({ length: 3000 }, (_, index) => {
      const start = addDays("2026-11-01", index % 30);
      return makeBooking(
        `b${index}`,
        `p${index % 300}`,
        "ANNUAL",
        start,
        "AM",
        addDays(start, index % 3),
        "PM",
      );
    });
    const started = performance.now();
    const model = buildGridModel(
      input({ view: "month", period: periodRange("month", "2026-11-12"), teams, people, bookings }),
    );
    const elapsed = performance.now() - started;

    expect(model.groups.flatMap((group) => group.rows)).toHaveLength(300);
    // The target is under 25ms on a developer machine. The limit here is generous so
    // a slow CI runner doesn't fail the build.
    expect(elapsed).toBeLessThan(100);
  });
});
