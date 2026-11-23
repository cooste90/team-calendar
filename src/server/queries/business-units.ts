import { cache } from "react";
import "server-only";
import { type Actor, canManageBusinessUnits, canViewBusinessUnit } from "@/domain/permissions";
import { db } from "../db";

const columns = { id: true, name: true, slug: true, hidden: true } as const;

// The BUs this person may look at (spec §1.3): every normal BU, plus a hidden one only
// for its own members and super admins.
export async function getVisibleBusinessUnits(actor: Actor) {
  const units = await db.businessUnit.findMany({ select: columns, orderBy: { name: "asc" } });
  return units.filter((unit) => canViewBusinessUnit(actor, unit));
}

// The BU in the URL, or the person's own BU when there's none, or when it's one they can't
// see: hidden from them, deleted or mistyped (spec §1.3). The page then says it's no longer
// available. A hidden BU's name never leaks. cache() means one lookup per request: the
// page, its header and its title all ask for it.
export const getBusinessUnitBySlug = cache(async (actor: Actor, slug: string | null) => {
  if (slug !== null) {
    const unit = await db.businessUnit.findUnique({ where: { slug }, select: columns });
    if (unit && canViewBusinessUnit(actor, unit)) return unit;
  }
  return db.businessUnit.findUniqueOrThrow({
    where: { id: actor.businessUnitId },
    select: columns,
  });
});

export type AdminBusinessUnit = {
  id: string;
  name: string;
  hidden: boolean;
  peopleCount: number;
  teamCount: number;
};

// The admin dialog's Business units tab (spec §9): every BU, hidden ones included, by name.
// Super admins only; anyone else gets null.
export async function getAdminBusinessUnits(actor: Actor): Promise<AdminBusinessUnit[] | null> {
  if (!canManageBusinessUnits(actor)) return null;
  const units = await db.businessUnit.findMany({
    select: {
      id: true,
      name: true,
      hidden: true,
      _count: { select: { users: true, teams: true } },
    },
    orderBy: { name: "asc" },
  });
  return units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    hidden: unit.hidden,
    peopleCount: unit._count.users,
    teamCount: unit._count.teams,
  }));
}

// Before sign-in: every BU, hidden ones included, for first-time users to pick from
// (spec §1.3: new members of a hidden BU need to be able to join it).
export function listBusinessUnits() {
  return db.businessUnit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

// Dev sign-in only: the seeded BU a dev profile belongs to, looked up by name.
export async function findBusinessUnitIdByName(name: string) {
  const unit = await db.businessUnit.findUnique({ where: { name }, select: { id: true } });
  return unit?.id;
}
