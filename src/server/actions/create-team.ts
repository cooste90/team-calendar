"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { teamNameSchema } from "@/lib/schemas/team";
import { authedAction } from "@/server/authed-action";
import { createTeam } from "@/server/services/teams";

// The admin dialog's New team form (spec §9).
export const createTeamAction = authedAction(
  z.object({ businessUnitId: idSchema, name: teamNameSchema }),
  ({ businessUnitId, name }, actor) => createTeam(actor, businessUnitId, name),
);
