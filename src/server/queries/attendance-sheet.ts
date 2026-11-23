import "server-only";
import { type SheetRange, type SheetRow, sheetDays, sheetRows } from "@/domain/attendance-sheet";
import { availabilityLookup } from "@/domain/availability";
import type { CalendarDate } from "@/domain/dates";
import { displayName } from "@/domain/display-name";
import { ForbiddenError } from "@/domain/errors";
import { formatTimestamp } from "@/domain/format";
import { type Actor, type BusinessUnitAccess, canExport } from "@/domain/permissions";
import { env } from "@/lib/env";
import { db } from "../db";
import { getCalendarData } from "./calendar";

export type AttendanceSheet = {
  range: SheetRange;
  businessUnitName: string;
  days: CalendarDate[];
  rows: SheetRow[];
  printedAt: string; // "12 Nov 2026, 09:30"
  printedBy: string;
  filename: string; // "westcal-attendance-west-operations-2026-11-08.pdf"
};

// Everything the printed attendance sheet shows (spec §10): the whole BU, ignoring the
// calendar's filters, without Unassigned people. Admins of the BU only.
export async function getAttendanceSheet(
  actor: Actor,
  businessUnit: BusinessUnitAccess & { name: string; slug: string },
  range: SheetRange,
  today: CalendarDate,
): Promise<AttendanceSheet> {
  if (!canExport(actor, businessUnit.id)) {
    throw new ForbiddenError("Only admins of this business unit can print its sheets.");
  }
  const days = sheetDays(range, today);
  const data = await getCalendarData(actor, businessUnit, days[0], days[days.length - 1]);
  const people = data.people.map((person) => ({
    ...person,
    availability: availabilityLookup(person.patterns, person.overrides),
  }));
  const viewer = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { firstName: true, preferredName: true, surname: true },
  });

  return {
    range,
    businessUnitName: businessUnit.name,
    days,
    rows: sheetRows(days, data.teams, people, data.bookings),
    printedAt: formatTimestamp(new Date(), env.APP_TIME_ZONE),
    printedBy: displayName(viewer),
    filename: `westcal-attendance-${businessUnit.slug}-${days[0]}.pdf`,
  };
}
