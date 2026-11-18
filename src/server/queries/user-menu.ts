import "server-only";
import { displayName, initialsOf } from "@/domain/display-name";
import { type Actor, canManageBusinessUnit } from "@/domain/permissions";
import { roleLabel } from "@/domain/roles";
import { UNASSIGNED_GROUP_NAME } from "@/domain/teams";
import { db } from "../db";

export type UserMenuDetails = {
  name: string;
  initials: string;
  email: string;
  details: string; // e.g. "West Operations · Service Design · Admin"
  canOpenAdmin: boolean;
};

// What the user menu shows about the signed-in person (spec §8). businessUnitName is
// their own BU's name, which the page has already loaded.
export async function getUserMenuDetails(
  actor: Actor,
  businessUnitName: string,
): Promise<UserMenuDetails> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: {
      firstName: true,
      preferredName: true,
      surname: true,
      email: true,
      team: { select: { name: true } },
    },
  });

  let details = `${businessUnitName} · ${user.team?.name ?? UNASSIGNED_GROUP_NAME}`;
  const role = roleLabel(actor.role);
  if (role) {
    details += ` · ${role}`;
  }

  return {
    name: displayName(user),
    initials: initialsOf(user),
    email: user.email,
    details,
    canOpenAdmin: canManageBusinessUnit(actor, actor.businessUnitId),
  };
}
