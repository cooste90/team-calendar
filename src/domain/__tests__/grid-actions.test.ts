import { describe, expect, it } from "vitest";
import type { Booking } from "../events";
import { bookingActions, canAddOn, findCell, freeHalves } from "../grid-actions";
import type { GridCell, GridModel, GridRow } from "../grid-model-types";

// Today is Thursday 12 November 2026.
const TODAY = "2026-11-12";

function makeBooking(startDate: string, endDate: string): Booking {
  return {
    id: "b1",
    userId: "user-1",
    type: "ANNUAL",
    startDate,
    startHalf: "AM",
    endDate,
    endHalf: "PM",
    publicHolidayId: null,
  };
}

describe("findCell", () => {
  const cell: GridCell = {
    date: TODAY,
    gridColumn: "2 / span 2",
    availability: "FULL",
    isToday: true,
    bookings: [],
    accessibleLabel: "",
  };
  const row: GridRow = {
    personId: "tom",
    displayName: "Tom Okafor",
    isViewer: false,
    canEdit: true,
    cells: [cell],
    bars: [],
  };
  const group = {
    id: "ops",
    name: "Operations",
    isViewerTeam: false,
    isUnassigned: false,
    memberCount: 1,
    collapsed: false,
  };
  const model: GridModel = {
    columns: [],
    groups: [
      { ...group, id: "empty", rows: [] },
      { ...group, rows: [row] },
    ],
  };

  it("finds a person's row and cell in any team", () => {
    expect(findCell(model, "tom", TODAY)).toEqual({ row, cell });
  });

  it.each([
    ["someone not on the grid", "priya", TODAY],
    ["a date not on the grid", "tom", "2026-11-13"],
  ])("finds nothing for %s", (_case, personId, date) => {
    expect(findCell(model, personId, date)).toBeNull();
  });
});

describe("canAddOn", () => {
  it.each([
    ["a USER can add from today", true, "USER", "2026-11-12", true],
    ["a USER can't add yesterday", true, "USER", "2026-11-11", false],
    ["an ADMIN can add 7 days back", true, "ADMIN", "2026-11-05", true],
    ["an ADMIN can't add 8 days back", true, "ADMIN", "2026-11-04", false],
    ["nobody can add for someone they can't book for", false, "SUPER_ADMIN", "2026-11-20", false],
  ] as const)("%s", (_rule, canEdit, role, date, expected) => {
    expect(canAddOn(canEdit, role, date, TODAY)).toBe(expected);
  });
});

describe("freeHalves", () => {
  it.each([
    [[], ["AM", "PM"]],
    [["AM"], ["PM"]],
    [["PM"], ["AM"]],
    [["AM", "PM"], []],
    [["FULL"], []],
  ] as const)("booked %j leaves %j free", (portions, expected) => {
    expect(freeHalves([...portions])).toEqual(expected);
  });
});

describe("bookingActions", () => {
  it.each([
    // rule, start, end, clicked date, can edit, expected
    [
      "a future booking over several days can be edited, deleted or have a day removed",
      "2026-11-16",
      "2026-11-20",
      "2026-11-17",
      true,
      { edit: true, delete: true, trim: false, removeDay: true },
    ],
    [
      "a single day can't have a day removed",
      "2026-11-16",
      "2026-11-16",
      "2026-11-16",
      true,
      { edit: true, delete: true, trim: false, removeDay: false },
    ],
    [
      "a booking that has started offers Delete remaining days instead of Delete",
      "2026-11-09",
      "2026-11-13",
      "2026-11-13",
      true,
      { edit: true, delete: false, trim: true, removeDay: true },
    ],
    [
      "a past day of a booking that has started can't be removed",
      "2026-11-09",
      "2026-11-13",
      "2026-11-10",
      true,
      { edit: true, delete: false, trim: true, removeDay: false },
    ],
    [
      "a past booking offers nothing",
      "2026-11-02",
      "2026-11-06",
      "2026-11-03",
      true,
      { edit: false, delete: false, trim: false, removeDay: false },
    ],
    [
      "someone who can't book for the person gets nothing",
      "2026-11-16",
      "2026-11-20",
      "2026-11-17",
      false,
      { edit: false, delete: false, trim: false, removeDay: false },
    ],
  ])("%s", (_rule, start, end, date, canEdit, expected) => {
    expect(bookingActions(makeBooking(start, end), date, canEdit, TODAY)).toEqual(expected);
  });
});
