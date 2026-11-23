"use server";

import { z } from "zod";
import { teamNameSchema } from "@/lib/schemas/team";
import { authedAction } from "@/server/authed-action";
import { renameTeam } from "@/server/services/teams";

// A team row's Rename (spec §9).
export const renameTeamAction = authedAction(
  z.object({ teamId: z.string().min(1), name: teamNameSchema }),
  ({ teamId, name }, actor) => renameTeam(actor, teamId, name),
);
