"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { moveTeam } from "@/server/services/teams";

// A team row's Move up and Move down buttons (spec §9; no dragging, WCAG 2.5.7).
export const moveTeamAction = authedAction(
  z.object({ teamId: z.string().min(1), direction: z.enum(["up", "down"]) }),
  ({ teamId, direction }, actor) => moveTeam(actor, teamId, direction),
);
