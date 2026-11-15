import { cache } from "react";
import "server-only";
import { NotFoundError } from "@/domain/errors";
import { type Actor, canViewBusinessUnit } from "@/domain/permissions";
import { db } from "../db";

const columns = { id: true, name: true, slug: true, hidden: true } as const;

// The BUs this person may look at (spec §1.3): every normal BU, plus a hidden one only
// for its own members and super admins.
export async function getVisibleBusinessUnits(actor: Actor) {
  const units = await db.businessUnit.findMany({ select: columns, orderBy: { name: "asc" } });
  return units.filter((unit) => canViewBusinessUnit(actor, unit));
}

// The BU in the URL, or the person's own BU when there's none. A hidden BU they can't
// view is "not found", so its name never leaks. cache() means one lookup per request:
// the page, its header and its title all ask for it.
export const getBusinessUnitBySlug = cache(async (actor: Actor, slug: string | null) => {
  const where = slug === null ? { id: actor.businessUnitId } : { slug };
  const unit = await db.businessUnit.findUnique({ where, select: columns });
  if (!unit || !canViewBusinessUnit(actor, unit)) {
    throw new NotFoundError("That business unit doesn't exist.");
  }
  return unit;
});

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
