// Everything the calendar page needs for one BU and date range (architecture §6.1), as
// plain data that can be passed to the client grid.
import "server-only";
import type { Override, PatternVersion } from "@/domain/availability";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { displayName, type PersonName } from "@/domain/display-name";
import { NotFoundError } from "@/domain/errors";
import { formatTimestamp } from "@/domain/format";
import {
  type Actor,
  type BusinessUnitAccess,
  canSeeUnassigned,
  canViewBusinessUnit,
} from "@/domain/permissions";
import { env } from "@/lib/env";
import { db } from "../db";
import { toBooking, toOverride, toPatternVersion, toPublicHoliday } from "../mappers";
import { serverToday } from "../today";

const nameFields = { firstName: true, preferredName: true, surname: true } as const;

// A person on the grid. Their pattern history and day swaps come too, so the client can
// work out any day's availability (a bar's day count can reach outside the range).
// Turn them into a lookup with availabilityLookup(patterns, overrides).
export type CalendarPerson = PersonName & {
  id: string;
  teamId: string | null;
  patterns: PatternVersion[];
  overrides: Override[];
};

export async function getCalendarData(
  actor: Actor,
  businessUnit: BusinessUnitAccess,
  from: CalendarDate,
  to: CalendarDate,
) {
  if (!canViewBusinessUnit(actor, businessUnit)) {
    throw new NotFoundError("That business unit doesn't exist.");
  }
  // Unassigned people are only shown to admins of this BU (spec §1.4).
  const seesUnassigned = canSeeUnassigned(actor, businessUnit.id);
  const people = seesUnassigned
    ? { businessUnitId: businessUnit.id }
    : { businessUnitId: businessUnit.id, teamId: { not: null } };

  // Seven small queries, run at the same time (Prisma loads patterns and overrides with
  // one extra query each).
  const [teams, users, bookings, publicHolidays, viewerRow] = await Promise.all([
    db.team.findMany({
      where: { businessUnitId: businessUnit.id },
      select: { id: true, name: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.user.findMany({
      where: people,
      select: {
        id: true,
        ...nameFields,
        teamId: true,
        patterns: true,
        overrides: true,
      },
    }),
    db.event.findMany({
      where: { user: people, startDate: { lte: toDbDate(to) }, endDate: { gte: toDbDate(from) } },
      include: { createdBy: { select: nameFields }, updatedBy: { select: nameFields } },
    }),
    db.publicHoliday.findMany({ where: { date: { gte: toDbDate(from), lte: toDbDate(to) } } }),
    db.user.findUniqueOrThrow({ where: { id: actor.id }, select: { collapsedTeamIds: true } }),
  ]);

  return {
    businessUnitId: businessUnit.id,
    range: { from, to },
    today: serverToday(),
    teams,
    people: users.map(
      (user): CalendarPerson => ({
        id: user.id,
        firstName: user.firstName,
        preferredName: user.preferredName,
        surname: user.surname,
        teamId: user.teamId,
        patterns: user.patterns.map(toPatternVersion),
        overrides: user.overrides.map(toOverride),
      }),
    ),
    // Who added and last changed each booking, and when, for the booking form and the
    // details popover. A deleted person's name is null.
    bookings: bookings.map((row) => ({
      ...toBooking(row),
      audit: {
        createdBy: row.createdBy && displayName(row.createdBy),
        createdAt: formatTimestamp(row.createdAt, env.APP_TIME_ZONE),
        updatedBy: row.updatedBy && displayName(row.updatedBy),
        updatedAt: formatTimestamp(row.updatedAt, env.APP_TIME_ZONE),
      },
    })),
    publicHolidays: publicHolidays.map(toPublicHoliday),
    viewer: { ...actor, canSeeUnassigned: seesUnassigned },
    collapsedTeamIds: viewerRow.collapsedTeamIds,
  };
}

// What the page passes to the client grid.
export type CalendarData = Awaited<ReturnType<typeof getCalendarData>>;
