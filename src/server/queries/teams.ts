import "server-only";
import { type Actor, canManageBusinessUnit } from "@/domain/permissions";
import { db } from "../db";

export type AdminTeam = { id: string; name: string; memberCount: number };

export type AdminTeams = {
  teams: AdminTeam[]; // in the order the grid shows them
  unassignedCount: number;
};

// The admin dialog's Teams tab (spec §9) for one BU. Only for admins of that BU and
// super admins; anyone else gets null, and the page shows no dialog.
export async function getAdminTeams(
  actor: Actor,
  businessUnitId: string,
): Promise<AdminTeams | null> {
  if (!canManageBusinessUnit(actor, businessUnitId)) return null;

  const teams = await db.team.findMany({
    where: { businessUnitId },
    select: { id: true, name: true, _count: { select: { members: true } } },
    orderBy: { sortOrder: "asc" },
  });
  const unassignedCount = await db.user.count({ where: { businessUnitId, teamId: null } });
  return {
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      memberCount: team._count.members,
    })),
    unassignedCount,
  };
}
