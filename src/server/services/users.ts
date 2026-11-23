// Managing people from the admin dialog's Users tab (spec §1.3, §9): move them to
// another team, delete them completely, or (super admins) move them to another BU.
import "server-only";
import { displayName } from "@/domain/display-name";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import {
  type Actor,
  canDeleteUser,
  canManageBusinessUnit,
  canManageBusinessUnits,
} from "@/domain/permissions";
import { db } from "../db";
import { loadPerson } from "./booking-queries";

// Only into a team of their own BU. Nobody can be moved into Unassigned by hand (spec
// §1.4), so teamId is always a real team.
export async function moveUserToTeam(actor: Actor, userId: string, teamId: string) {
  const person = await loadPerson(db, userId);
  if (!canManageBusinessUnit(actor, person.businessUnitId)) {
    throw new ForbiddenError("You can't manage people in this business unit.");
  }
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (team?.businessUnitId !== person.businessUnitId) {
    throw new ValidationError(`That team isn't in ${displayName(person)}'s business unit.`);
  }
  await db.user.update({ where: { id: userId }, data: { teamId } });
}

// Removes the person and everything of theirs: bookings, working patterns, day swaps
// and sessions all go with them (the database cascades, in one statement). Their
// session going means they're signed out at their next click. If they sign in again
// they start as a brand-new user.
export async function deleteUser(actor: Actor, userId: string) {
  const person = await loadPerson(db, userId);
  if (!canDeleteUser(actor, person)) {
    const message =
      actor.id === userId ? "You can't delete yourself." : "You can't delete this person.";
    throw new ForbiddenError(message);
  }
  await db.user.delete({ where: { id: userId } });
}

// Super admins only. They keep their bookings and start in the new BU's Unassigned group.
export async function moveUserToBusinessUnit(actor: Actor, userId: string, businessUnitId: string) {
  if (!canManageBusinessUnits(actor)) {
    throw new ForbiddenError("Only a super admin can move people to another business unit.");
  }
  await loadPerson(db, userId);
  const businessUnit = await db.businessUnit.findUnique({ where: { id: businessUnitId } });
  if (!businessUnit) {
    throw new NotFoundError("That business unit doesn't exist.");
  }
  await db.user.update({ where: { id: userId }, data: { businessUnitId, teamId: null } });
}
