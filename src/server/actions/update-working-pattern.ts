"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { weeklyPatternSchema } from "@/lib/schemas/availability";
import { authedAction } from "@/server/authed-action";
import { updateWorkingPattern } from "@/server/services/availability";
import { serverToday } from "@/server/today";

// The profile's Working pattern tab (spec §4.1): the new pattern starts next Sunday.
export const updateWorkingPatternAction = authedAction(
  z.object({ userId: idSchema, pattern: weeklyPatternSchema }),
  ({ userId, pattern }, actor) => updateWorkingPattern(actor, userId, pattern, serverToday()),
);
