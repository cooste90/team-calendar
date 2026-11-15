// The people: a user for each dev sign-in profile, then fake people to fill each BU,
// with their working patterns (spec §4.1) and a few day swaps (§4.2).
import { fakerEN_GB as faker } from "@faker-js/faker";
import {
  type AvailabilityLookup,
  availabilityLookup,
  DEFAULT_PATTERN,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
  type Override,
  type PatternVersion,
  type WeeklyPattern,
} from "@/domain/availability";
import { addDays, type CalendarDate, nextSunday, toDbDate } from "@/domain/dates";
import type { Role } from "@/domain/permissions";
import { computeRole } from "@/domain/roles";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { toPatternColumns } from "@/server/mappers";
import type { SeededBusinessUnit } from "./business-units";
import { devSsoProfiles } from "./dev-sso-profiles";

export type SeededPerson = {
  id: string;
  businessUnitId: string;
  teamId: string | null; // null = Unassigned
  role: Role;
  availability: AvailabilityLookup;
};

type UserRow = {
  id: string;
  ssoId: string;
  employeeNumber: string;
  email: string;
  name: string;
  firstName: string;
  surname: string;
  preferredName: string | null;
  role: Role;
  businessUnitId: string;
  teamId: string | null;
};

// A few surnames with accents, so sorting and display get tested with them.
const ACCENTED_SURNAMES = ["Ó Súilleabháin", "Brontë", "Gómez", "Lefèvre", "Šimić", "Müller"];

const PART_TIME_PATTERNS: WeeklyPattern[] = [
  ["OFF", "FULL", "FULL", "OFF", "FULL", "FULL", "OFF"], // off on Wednesdays
  ["OFF", "FULL", "FULL", "FULL", "FULL", "AM", "OFF"], // Friday mornings only
  ["OFF", "OFF", "FULL", "FULL", "FULL", "FULL", "OFF"], // off on Mondays
];
const WEEKEND_PATTERN: WeeklyPattern = ["FULL", "OFF", "OFF", "FULL", "FULL", "FULL", "FULL"];

export async function createPeople(
  units: SeededBusinessUnit[],
  today: CalendarDate,
): Promise<SeededPerson[]> {
  const rows = [...profileUsers(units), ...fakeUsers(units)];
  await db.user.createMany({ data: rows });

  const patterns = new Map(rows.map((row) => [row.id, randomPatternVersions(today)]));
  await db.workingPattern.createMany({
    data: rows.flatMap((row) =>
      (patterns.get(row.id) ?? []).map((version) => ({
        userId: row.id,
        effectiveFrom: toDbDate(version.effectiveFrom),
        ...toPatternColumns(version.pattern),
      })),
    ),
  });

  const daySwaps = randomDaySwaps(rows, patterns, today);
  await db.availabilityOverride.createMany({
    data: [...daySwaps].flatMap(([userId, swaps]) =>
      swaps.map((swap) => ({ userId, date: toDbDate(swap.date), value: swap.value })),
    ),
  });

  return rows.map((row) => ({
    id: row.id,
    businessUnitId: row.businessUnitId,
    teamId: row.teamId,
    role: row.role,
    availability: availabilityLookup(patterns.get(row.id) ?? [], daySwaps.get(row.id) ?? []),
  }));
}

// One user per dev sign-in profile that names a BU, so signing in finds them.
function profileUsers(units: SeededBusinessUnit[]): UserRow[] {
  const rows: UserRow[] = [];
  for (const { profile, businessUnit, team } of devSsoProfiles) {
    const unit = units.find((item) => item.name === businessUnit);
    if (!unit) continue;
    rows.push({
      id: faker.string.uuid(),
      ssoId: profile.ssoId,
      employeeNumber: profile.employeeNumber,
      email: profile.email,
      name: `${profile.firstName} ${profile.surname}`,
      firstName: profile.firstName,
      surname: profile.surname,
      preferredName: null,
      role: computeRole(profile, env),
      businessUnitId: unit.id,
      teamId: unit.teams.find((item) => item.name === team)?.id ?? null,
    });
  }
  return rows;
}

// Fake people to bring each BU up to its size, a few of them Unassigned.
function fakeUsers(units: SeededBusinessUnit[]): UserRow[] {
  const rows: UserRow[] = [];
  let employeeNumber = 500000;
  for (const unit of units) {
    const profiles = devSsoProfiles.filter((item) => item.businessUnit === unit.name);
    const unassignedProfiles = profiles.filter((item) => item.team === null).length;
    for (let index = 0; index < unit.people - profiles.length; index++) {
      const isUnassigned = index < unit.unassigned - unassignedProfiles;
      employeeNumber++;
      rows.push(fakeUser(String(employeeNumber), unit, isUnassigned));
    }
  }
  return rows;
}

function fakeUser(employeeNumber: string, unit: SeededBusinessUnit, isUnassigned: boolean) {
  const firstName = faker.person.firstName();
  const surname = faker.datatype.boolean({ probability: 0.04 })
    ? faker.helpers.arrayElement(ACCENTED_SURNAMES)
    : faker.person.lastName();
  return {
    id: faker.string.uuid(),
    ssoId: `sso-${employeeNumber}`,
    employeeNumber,
    email: `${plain(firstName)}.${plain(surname)}.${employeeNumber}@example.com`,
    name: `${firstName} ${surname}`,
    firstName,
    surname,
    // A few people go by a different first name (spec §1.1).
    preferredName: faker.datatype.boolean({ probability: 0.05 }) ? faker.person.firstName() : null,
    role: "USER" as const,
    businessUnitId: unit.id,
    teamId: isUnassigned ? null : faker.helpers.arrayElement(unit.teams).id,
  };
}

// Letters only, without accents, for email addresses: "Ó Súilleabháin" -> "osuilleabhain".
function plain(name: string) {
  return name
    .normalize("NFD")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

// 75% the default pattern, 15% part-time, 5% weekend workers and 5% with a part-time
// pattern starting next Sunday (a pending change).
function randomPatternVersions(today: CalendarDate): PatternVersion[] {
  const standard = { effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN };
  const kind = faker.helpers.weightedArrayElement([
    { weight: 75, value: "default" },
    { weight: 15, value: "partTime" },
    { weight: 5, value: "weekend" },
    { weight: 5, value: "pendingChange" },
  ]);
  if (kind === "partTime") {
    return [{ ...standard, pattern: faker.helpers.arrayElement(PART_TIME_PATTERNS) }];
  }
  if (kind === "weekend") {
    return [{ ...standard, pattern: WEEKEND_PATTERN }];
  }
  if (kind === "pendingChange") {
    const pending = faker.helpers.arrayElement(PART_TIME_PATTERNS);
    return [standard, { effectiveFrom: nextSunday(today), pattern: pending }];
  }
  return [standard];
}

// About one person in 16 swaps a day within a month of today: a working day off, or a
// day off worked.
function randomDaySwaps(
  rows: UserRow[],
  patterns: Map<string, PatternVersion[]>,
  today: CalendarDate,
) {
  const swaps = new Map<string, Override[]>();
  for (let count = 0; count < Math.round(rows.length / 16); count++) {
    const row = faker.helpers.arrayElement(rows);
    const date = addDays(today, faker.number.int({ min: -30, max: 30 }));
    const usual = availabilityLookup(patterns.get(row.id) ?? [], [])(date);
    const existing = swaps.get(row.id) ?? [];
    if (existing.some((swap) => swap.date === date)) continue;
    swaps.set(row.id, [...existing, { date, value: usual === "OFF" ? "FULL" : "OFF" }]);
  }
  return swaps;
}
