"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { authedAction } from "@/server/authed-action";
import { deleteTeam } from "@/server/services/teams";

// A team row's Delete, after the confirmation (spec §9). Its members move to Unassigned.
export const deleteTeamAction = authedAction(z.object({ teamId: idSchema }), ({ teamId }, actor) =>
  deleteTeam(actor, teamId),
);
