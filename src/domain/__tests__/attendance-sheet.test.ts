import { describe, expect, it } from "vitest";
import { paginate, type SheetRow, sheetCell, sheetDays, sheetRows } from "../attendance-sheet";
import {
  availabilityLookup,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
  type WeeklyPattern,
} from "../availability";
import type { Booking } from "../events";
import type { GridPerson } from "../grid-model-types";

// November 2026: Sun 8 … Sat 14. Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const WEEK = [
  "2026-11-08",
  "2026-11-09",
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
];
const FULL_TIME: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "OFF"];
const THURSDAY_MORNINGS: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "AM", "FULL", "OFF"];

function person(
  id: string,
  surname: string,
  teamId: string | null,
  pattern = FULL_TIME,
): GridPerson {
  return {
    id,
    firstName: "Test",
    preferredName: null,
    surname,
    teamId,
    availability: availabilityLookup(
      [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern }],
      [],
    ),
  };
}

function booking(
  type: Booking["type"],
  startDate: string,
  startHalf: "AM" | "PM",
  endDate: string,
  endHalf: "AM" | "PM",
): Booking {
  return {
    id: `${type}-${startDate}`,
    userId: "priya",
    type,
    startDate,
    startHalf,
    endDate,
    endHalf,
    publicHolidayId: null,
  };
}

const priya = person("priya", "Shah", "design");

describe("sheetDays", () => {
  // Thursday 12 November 2026.
  it.each([
    ["today", ["2026-11-12"]],
    ["this-week", WEEK],
    [
      "next-week",
      [
        "2026-11-15",
        "2026-11-16",
        "2026-11-17",
        "2026-11-18",
        "2026-11-19",
        "2026-11-20",
        "2026-11-21",
      ],
    ],
  ] as const)("%s", (range, days) => {
    expect(sheetDays(range, "2026-11-12")).toEqual(days);
  });
});

describe("sheetCell: what one person's day shows (spec §10)", () => {
  it.each([
    ["a working day with nothing booked is a box to tick", "2026-11-10", [], { kind: "box" }],
    ["a day off is hatched", "2026-11-08", [], { kind: "off" }],
    [
      "a booked day shows the leave code",
      "2026-11-10",
      [booking("ANNUAL", "2026-11-09", "AM", "2026-11-11", "PM")],
      { kind: "code", code: "AL" },
    ],
    [
      "a week of leave still shows the weekend as a day off",
      "2026-11-14",
      [booking("ANNUAL", "2026-11-09", "AM", "2026-11-16", "PM")],
      { kind: "off" },
    ],
    [
      "a morning booked and an afternoon working is split",
      "2026-11-10",
      [booking("FLEXI", "2026-11-10", "AM", "2026-11-10", "AM")],
      { kind: "split", am: { kind: "code", code: "FL" }, pm: { kind: "box" } },
    ],
  ] as const)("%s", (_rule, date, bookings, expected) => {
    expect(sheetCell(priya, [...bookings], date)).toEqual(expected);
  });

  it("someone who only works the morning is split box / off", () => {
    const owen = person("owen", "Hughes", "design", THURSDAY_MORNINGS);
    expect(sheetCell(owen, [], "2026-11-12")).toEqual({
      kind: "split",
      am: { kind: "box" },
      pm: { kind: "off" },
    });
  });
});

describe("sheetRows", () => {
  const teams = [
    { id: "finance", name: "Finance Operations", sortOrder: 2 },
    { id: "design", name: "Service Design", sortOrder: 1 },
    { id: "empty", name: "Records", sortOrder: 3 },
  ];
  const people = [
    priya,
    person("ben", "Adams", "design"),
    person("tom", "Okafor", "finance"),
    person("newbie", "Zed", null),
  ];

  it("lists teams in admin order, people by surname, without Unassigned or empty teams", () => {
    const rows = sheetRows(WEEK, teams, people, []);
    expect(
      rows.map((row) => (row.kind === "team" ? `# ${row.name} (${row.size})` : row.name)),
    ).toEqual([
      "# Service Design (2)",
      "Test Adams",
      "Test Shah",
      "# Finance Operations (1)",
      "Test Okafor",
    ]);
  });

  it("gives each person only their own bookings", () => {
    const leave = { ...booking("SICKNESS", "2026-11-09", "AM", "2026-11-09", "PM"), userId: "tom" };
    const rows = sheetRows(WEEK, teams, people, [leave]);
    // Each person's Monday.
    const mondays = rows.flatMap((row) =>
      row.kind === "person" ? [[row.name, row.cells[1]]] : [],
    );
    expect(mondays).toEqual([
      ["Test Adams", { kind: "box" }],
      ["Test Shah", { kind: "box" }],
      ["Test Okafor", { kind: "code", code: "SK" }],
    ]);
  });
});

describe("paginate", () => {
  // Roughly the week sheet's numbers: about 55 person rows fit on an A4 page.
  const heights = { team: 12, person: 11 };
  const PAGE = 660;

  // `teamSizes` people in each team, e.g. [6, 6] is two teams of six.
  function rowsFor(teamSizes: number[]): SheetRow[] {
    return teamSizes.flatMap((size, team) => [
      { kind: "team" as const, name: `Team ${team}`, size },
      ...Array.from({ length: size }, (_, index) => ({
        kind: "person" as const,
        name: `Person ${team}-${index}`,
        cells: [],
      })),
    ]);
  }

  it("50 people in 8 teams fit on one page", () => {
    expect(paginate(rowsFor([7, 7, 6, 6, 6, 6, 6, 6]), PAGE, heights)).toHaveLength(1);
  });

  it("90 people flow onto a second page", () => {
    expect(paginate(rowsFor(Array(9).fill(10)), PAGE, heights)).toHaveLength(2);
  });

  it("a team's header is never left at the bottom of a page without 2 of its people", () => {
    // The first team uses 12 + 56 × 11 = 628 of 660, leaving 32: room for the next team's
    // header (12) but not with 2 of its people (12 + 22 = 34), so the header moves over.
    const pages = paginate(rowsFor([56, 5]), PAGE, heights);
    expect(pages).toHaveLength(2);
    expect(pages[1][0]).toMatchObject({ kind: "team", name: "Team 1" });
    for (const page of pages) {
      const last = page[page.length - 1];
      expect(last.kind).toBe("person");
    }
  });

  it("nothing to print is no pages", () => {
    expect(paginate([], PAGE, heights)).toEqual([]);
  });
});
