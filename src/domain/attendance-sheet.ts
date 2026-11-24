// The printed attendance sheet (spec §10): what each person's day shows, and how the rows
// are split into pages (or columns). The PDF only draws what this decides.
import { worksSlot } from "./availability";
import { addDays, type CalendarDate, periodRange } from "./dates";
import { compareBySurname, displayName } from "./display-name";
import type { Booking } from "./events";
import type { GridPerson, GridTeam } from "./grid-model-types";
import { leaveTypes } from "./leave-types";
import { type HalfDay, overlaps, rangeOf, toSlot } from "./slots";
import { byAdminOrder } from "./teams";

export type SheetRange = "today" | "this-week" | "next-week";

// The days a sheet covers: today, or this or next week, Sunday to Saturday (spec §10).
export function sheetDays(range: SheetRange, today: CalendarDate): CalendarDate[] {
  if (range === "today") return [today];
  if (range === "next-week") return periodRange("week", addDays(today, 7)).days;
  return periodRange("week", today).days;
}

// One half of a day: a leave code, a box to tick ("expected in"), or not a working day.
export type SheetHalf = { kind: "code"; code: string } | { kind: "box" } | { kind: "off" };

// A day is one of those, or split into morning and afternoon when the halves differ.
export type SheetCell = SheetHalf | { kind: "split"; am: SheetHalf; pm: SheetHalf };

export type SheetRow =
  | { kind: "team"; name: string; size: number }
  | { kind: "person"; name: string; cells: SheetCell[] };

// Not working beats a booking (a week of leave doesn't print codes on the weekend), and a
// booking beats a box.
function halfFor(
  person: GridPerson,
  bookings: Booking[],
  date: CalendarDate,
  half: HalfDay,
): SheetHalf {
  if (!worksSlot(person.availability(date), half)) return { kind: "off" };
  const slot = toSlot(date, half);
  const booking = bookings.find((each) => overlaps(rangeOf(each), { start: slot, end: slot }));
  if (booking) return { kind: "code", code: leaveTypes[booking.type].code };
  return { kind: "box" };
}

function sameHalf(a: SheetHalf, b: SheetHalf) {
  if (a.kind === "code" && b.kind === "code") return a.code === b.code;
  return a.kind === b.kind;
}

export function sheetCell(person: GridPerson, bookings: Booking[], date: CalendarDate): SheetCell {
  const am = halfFor(person, bookings, date, "AM");
  const pm = halfFor(person, bookings, date, "PM");
  return sameHalf(am, pm) ? am : { kind: "split", am, pm };
}

// Teams in the order an admin set, each followed by its people by surname. Unassigned
// people aren't on the sheet (spec §10), and nor are teams with nobody in them.
export function sheetRows(
  days: CalendarDate[],
  teams: GridTeam[],
  people: GridPerson[],
  bookings: Booking[],
): SheetRow[] {
  const rows: SheetRow[] = [];
  for (const team of byAdminOrder(teams)) {
    const members = people.filter((person) => person.teamId === team.id).sort(compareBySurname);
    if (members.length === 0) continue;
    rows.push({ kind: "team", name: team.name, size: members.length });
    for (const person of members) {
      const theirs = bookings.filter((booking) => booking.userId === person.id);
      const cells = days.map((date) => sheetCell(person, theirs, date));
      rows.push({ kind: "person", name: displayName(person), cells });
    }
  }
  return rows;
}

type RowHeights = { team: number; person: number };

// Splits the rows into pages (or columns) of a given height. A team's header never ends a
// page on its own: it moves to the next page unless at least 2 of its people fit after it.
export function paginate(rows: SheetRow[], height: number, heights: RowHeights): SheetRow[][] {
  const pages: SheetRow[][] = [];
  let page: SheetRow[] = [];
  let used = 0;

  for (const row of rows) {
    let needed = heights[row.kind];
    if (row.kind === "team") {
      const followers = Math.min(2, row.size);
      needed += followers * heights.person;
    }
    if (used + needed > height && page.length > 0) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(row);
    used += heights[row.kind];
  }
  if (page.length > 0) pages.push(page);
  return pages;
}
