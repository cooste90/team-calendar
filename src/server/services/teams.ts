// Managing a BU's teams from the admin dialog (spec §1.4, §9): create, rename, reorder
// and delete. Only admins of the team's BU and super admins may do any of it.
import "server-only";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { type Actor, canManageBusinessUnit } from "@/domain/permissions";
import { db } from "../db";

function checkCanManage(actor: Actor, businessUnitId: string) {
  if (!canManageBusinessUnit(actor, businessUnitId)) {
    throw new ForbiddenError("You can't manage this business unit's teams.");
  }
}

// The team, once we know the actor may change it.
async function loadTeamToManage(actor: Actor, teamId: string) {
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new NotFoundError("That team doesn't exist.");
  }
  checkCanManage(actor, team.businessUnitId);
  return team;
}

// Names are unique within a BU whatever their case, so "legal" can't sit next to "Legal".
// The database's unique index catches exact copies saved at the same moment.
async function checkNameIsFree(businessUnitId: string, name: string, renamingTeamId?: string) {
  const sameName = await db.team.findFirst({
    where: {
      businessUnitId,
      name: { equals: name, mode: "insensitive" },
      id: { not: renamingTeamId }, // when creating it's undefined, which Prisma ignores
    },
  });
  if (sameName) {
    throw new ValidationError(`There's already a team called ${sameName.name}.`);
  }
}

// A new team goes at the end of the list.
export async function createTeam(actor: Actor, businessUnitId: string, name: string) {
  checkCanManage(actor, businessUnitId);
  await checkNameIsFree(businessUnitId, name);
  const last = await db.team.aggregate({ where: { businessUnitId }, _max: { sortOrder: true } });
  const sortOrder = (last._max.sortOrder ?? 0) + 1;
  await db.team.create({ data: { businessUnitId, name, sortOrder } });
}

export async function renameTeam(actor: Actor, teamId: string, name: string) {
  const team = await loadTeamToManage(actor, teamId);
  await checkNameIsFree(team.businessUnitId, name, teamId);
  await db.team.update({ where: { id: teamId }, data: { name } });
}

// Swaps the team's place with the one above or below it. The first team can't go up
// and the last can't go down, so then nothing changes.
export async function moveTeam(actor: Actor, teamId: string, direction: "up" | "down") {
  const team = await loadTeamToManage(actor, teamId);
  const teams = await db.team.findMany({
    where: { businessUnitId: team.businessUnitId },
    orderBy: { sortOrder: "asc" },
  });
  const index = teams.findIndex((item) => item.id === teamId);
  const neighbour = teams[direction === "up" ? index - 1 : index + 1];
  if (!neighbour) return;

  await db.$transaction([
    db.team.update({ where: { id: team.id }, data: { sortOrder: neighbour.sortOrder } }),
    db.team.update({ where: { id: neighbour.id }, data: { sortOrder: team.sortOrder } }),
  ]);
}

// The members move to Unassigned first, in the same transaction, so nobody is left
// pointing at a team that's gone (architecture §3.3).
export async function deleteTeam(actor: Actor, teamId: string) {
  await loadTeamToManage(actor, teamId);
  await db.$transaction([
    db.user.updateMany({ where: { teamId }, data: { teamId: null } }),
    db.team.delete({ where: { id: teamId } }),
  ]);
}
