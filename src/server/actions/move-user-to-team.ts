"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { authedAction } from "@/server/authed-action";
import { moveUserToTeam } from "@/server/services/users";

// A person's Team select in the admin dialog's Users tab (spec §9).
export const moveUserToTeamAction = authedAction(
  z.object({ userId: idSchema, teamId: idSchema }),
  ({ userId, teamId }, actor) => moveUserToTeam(actor, userId, teamId),
);
