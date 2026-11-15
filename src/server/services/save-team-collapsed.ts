// Remembers which team groups a person has collapsed on the grid (spec §2.3). It's
// stored on their user row, so it follows them across sessions and devices.
import "server-only";
import { withGroupCollapsed } from "@/domain/grid-model";
import type { Actor } from "@/domain/permissions";
import { db } from "../db";

// groupId is a team id, or "unassigned" for the Unassigned group. Only the actor's own
// preference changes, so there's nothing to permission-check.
export async function saveTeamCollapsed(actor: Actor, groupId: string, collapsed: boolean) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { collapsedTeamIds: true },
  });
  await db.user.update({
    where: { id: actor.id },
    data: { collapsedTeamIds: withGroupCollapsed(user.collapsedTeamIds, groupId, collapsed) },
  });
}
