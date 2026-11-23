"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { moveUserToTeam } from "@/server/services/users";

// A person's Team select in the admin dialog's Users tab (spec §9).
export const moveUserToTeamAction = authedAction(
  z.object({ userId: z.string().min(1), teamId: z.string().min(1) }),
  ({ userId, teamId }, actor) => moveUserToTeam(actor, userId, teamId),
);
