"use server";

import { z } from "zod";
import { weeklyPatternSchema } from "@/lib/schemas/availability";
import { authedAction } from "@/server/authed-action";
import { updateWorkingPattern } from "@/server/services/availability";
import { serverToday } from "@/server/today";

// The profile's Working pattern tab (spec §4.1): the new pattern starts next Sunday.
export const updateWorkingPatternAction = authedAction(
  z.object({ userId: z.string().min(1), pattern: weeklyPatternSchema }),
  ({ userId, pattern }, actor) => updateWorkingPattern(actor, userId, pattern, serverToday()),
);
