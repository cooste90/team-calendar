import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { createUser } from "../helpers/create-user";
import { createPeople } from "../helpers/people";

// The business units, teams and people the permission matrix uses, made fresh for every
// case (the database is emptied before each test). createPeople (helpers/people.ts) makes
// West and North; this adds the rest:
// - West: Ops (Priya, her teammate Ben, and Tom the admin), Legal (Dan), and Newbie,
//   who is Unassigned.
// - North: Payroll (Nina, Nadia the admin, and Grace the super admin) and Audit.
// - Corporate, hidden: Records (Hal) and Archive.
// - Empty: a business unit with nobody in it, which can be deleted.
export type World = {
  people: Record<string, Actor>;
  businessUnits: Record<string, string>; // west, north, corporate, empty
  teams: Record<string, string>; // ops, legal, payroll, audit, records, archive
};

export async function createWorld(): Promise<World> {
  const people = await createPeople();
  const west = people.priya.businessUnitId;
  const north = people.nina.businessUnitId;

  const corporate = await db.businessUnit.create({
    data: { name: "Corporate", slug: "corporate", hidden: true },
  });
  const empty = await db.businessUnit.create({ data: { name: "Empty", slug: "empty" } });
  const audit = await db.team.create({
    data: { businessUnitId: north, name: "Audit", sortOrder: 2 },
  });
  const records = await db.team.create({
    data: { businessUnitId: corporate.id, name: "Records", sortOrder: 1 },
  });
  const archive = await db.team.create({
    data: { businessUnitId: corporate.id, name: "Archive", sortOrder: 2 },
  });

  const extras: Actor[] = [
    { id: "nadia", role: "ADMIN", businessUnitId: north, teamId: people.nina.teamId },
    { id: "hal", role: "USER", businessUnitId: corporate.id, teamId: records.id },
  ];
  for (const person of extras) {
    await createUser(person.id, { businessUnitId: person.businessUnitId, teamId: person.teamId });
    people[person.id] = person;
  }

  return {
    people,
    businessUnits: { west, north, corporate: corporate.id, empty: empty.id },
    teams: {
      ops: people.priya.teamId ?? "",
      legal: people.dan.teamId ?? "",
      payroll: people.nina.teamId ?? "",
      audit: audit.id,
      records: records.id,
      archive: archive.id,
    },
  };
}
