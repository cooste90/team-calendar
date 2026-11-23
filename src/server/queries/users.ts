import "server-only";
import { compareBySurname, displayName, initialsOf } from "@/domain/display-name";
import { type Actor, canManageBusinessUnit, type Role } from "@/domain/permissions";
import { db } from "../db";

export type AdminUser = {
  id: string;
  name: string; // the display name
  ssoName: string | null; // "Thomas Okafor", only when a preferred name changes how they're shown
  initials: string;
  surname: string; // typed to confirm a delete
  email: string;
  employeeNumber: string;
  role: Role;
  teamId: string | null; // null = Unassigned
};

// The admin dialog's Users tab (spec §9): everyone in one BU, by surname. Only for admins
// of that BU and super admins; anyone else gets null.
export async function getAdminUsers(
  actor: Actor,
  businessUnitId: string,
): Promise<AdminUser[] | null> {
  if (!canManageBusinessUnit(actor, businessUnitId)) return null;

  const users = await db.user.findMany({
    where: { businessUnitId },
    select: {
      id: true,
      name: true,
      firstName: true,
      preferredName: true,
      surname: true,
      email: true,
      employeeNumber: true,
      role: true,
      teamId: true,
    },
  });
  return users.sort(compareBySurname).map((user) => ({
    id: user.id,
    name: displayName(user),
    ssoName: user.preferredName ? user.name : null, // name is "firstName surname" from SSO
    initials: initialsOf(user),
    surname: user.surname,
    email: user.email,
    employeeNumber: user.employeeNumber,
    role: user.role,
    teamId: user.teamId,
  }));
}
