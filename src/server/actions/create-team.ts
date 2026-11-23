"use server";

import { z } from "zod";
import { teamNameSchema } from "@/lib/schemas/team";
import { authedAction } from "@/server/authed-action";
import { createTeam } from "@/server/services/teams";

// The admin dialog's New team form (spec §9).
export const createTeamAction = authedAction(
  z.object({ businessUnitId: z.string().min(1), name: teamNameSchema }),
  ({ businessUnitId, name }, actor) => createTeam(actor, businessUnitId, name),
);
