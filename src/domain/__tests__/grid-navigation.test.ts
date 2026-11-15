import { describe, expect, it } from "vitest";
import {
  type CellPosition,
  type GridLayout,
  NAME_COLUMN,
  type NavigationKey,
  nextCell,
  tabStopCell,
} from "../grid-navigation";

// Three people over Sun 8 – Tue 10 November 2026. Admins also get the name column.
const days = ["2026-11-08", "2026-11-09", "2026-11-10"];
const user: GridLayout = { personIds: ["ann", "ben", "cat"], columns: days };
const admin: GridLayout = { personIds: ["ann", "ben", "cat"], columns: [NAME_COLUMN, ...days] };

function cell(personId: string, column: string): CellPosition {
  return { personId, column };
}

describe("nextCell", () => {
  it.each<[string, GridLayout, CellPosition, NavigationKey, CellPosition]>([
    ["→ moves to the next day", user, cell("ben", days[0]), "ArrowRight", cell("ben", days[1])],
    ["← moves to the previous day", user, cell("ben", days[1]), "ArrowLeft", cell("ben", days[0])],
    ["↓ moves to the next person", user, cell("ann", days[1]), "ArrowDown", cell("ben", days[1])],
    ["↑ moves to the previous person", user, cell("cat", days[1]), "ArrowUp", cell("ben", days[1])],
    ["→ stops at the last day", user, cell("ben", days[2]), "ArrowRight", cell("ben", days[2])],
    ["← stops at the first day", user, cell("ben", days[0]), "ArrowLeft", cell("ben", days[0])],
    ["↓ stops at the last person", user, cell("cat", days[0]), "ArrowDown", cell("cat", days[0])],
    ["↑ stops at the first person", user, cell("ann", days[0]), "ArrowUp", cell("ann", days[0])],
    ["Home goes to the first day", user, cell("ben", days[2]), "Home", cell("ben", days[0])],
    ["End goes to the last day", user, cell("ben", days[0]), "End", cell("ben", days[2])],
    [
      "Ctrl+Home goes to the first cell",
      user,
      cell("cat", days[2]),
      "CtrlHome",
      cell("ann", days[0]),
    ],
    ["Ctrl+End goes to the last cell", user, cell("ann", days[0]), "CtrlEnd", cell("cat", days[2])],
    [
      "for an admin, ← from the first day reaches the name",
      admin,
      cell("ben", days[0]),
      "ArrowLeft",
      cell("ben", NAME_COLUMN),
    ],
    [
      "↓ from a name goes to the next name",
      admin,
      cell("ann", NAME_COLUMN),
      "ArrowDown",
      cell("ben", NAME_COLUMN),
    ],
    [
      "Home goes to the first day, not the name",
      admin,
      cell("ben", days[2]),
      "Home",
      cell("ben", days[0]),
    ],
    [
      "Ctrl+Home goes to the first day, not the name",
      admin,
      cell("cat", days[2]),
      "CtrlHome",
      cell("ann", days[0]),
    ],
  ])("%s", (_rule, layout, current, key, expected) => {
    expect(nextCell(layout, current, key)).toEqual(expected);
  });
});

describe("tabStopCell", () => {
  const viewerToday = cell("ben", days[2]);

  it.each<[string, GridLayout, CellPosition | null, CellPosition | null]>([
    ["starts on the viewer's row, today", user, null, cell("ben", days[2])],
    ["keeps the last focused cell", user, cell("cat", days[0]), cell("cat", days[0])],
    ["keeps a focused name", admin, cell("cat", NAME_COLUMN), cell("cat", NAME_COLUMN)],
    [
      "after a period change, keeps the person and the weekday",
      { ...user, columns: ["2026-11-15", "2026-11-16", "2026-11-17"] },
      cell("cat", "2026-11-09"), // a Monday
      cell("cat", "2026-11-16"), // the next Monday
    ],
    [
      "if the focused person is hidden, goes back to the viewer",
      { ...user, personIds: ["ann", "ben"] },
      cell("cat", days[0]),
      cell("ben", days[0]),
    ],
    [
      "if the viewer isn't shown either, uses the first person",
      { ...user, personIds: ["ann"] },
      null,
      cell("ann", days[2]),
    ],
    [
      "if today isn't shown, uses the first day",
      { ...user, columns: ["2026-11-15", "2026-11-16"] },
      null,
      cell("ben", "2026-11-15"),
    ],
    [
      "a name falls back to a day when names aren't focusable",
      user,
      cell("ann", NAME_COLUMN),
      cell("ann", days[2]),
    ],
    ["there's no tab stop when nobody is shown", { ...user, personIds: [] }, null, null],
  ])("%s", (_rule, layout, wanted, expected) => {
    expect(tabStopCell(layout, wanted, viewerToday)).toEqual(expected);
  });

  it("uses the first day when neither the old weekday nor today is in the period", () => {
    // Possible only for a period shorter than a week, which the app never shows, but the
    // rule still needs an answer.
    const short = { ...user, columns: ["2026-11-15"] };
    expect(tabStopCell(short, cell("ann", "2026-11-09"), viewerToday)).toEqual(
      cell("ann", "2026-11-15"),
    );
  });
});
