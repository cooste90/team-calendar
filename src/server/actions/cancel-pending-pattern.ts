"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { cancelPendingPattern } from "@/server/services/availability";
import { serverToday } from "@/server/today";

// "Cancel pending change" on the profile's Working pattern tab.
export const cancelPendingPatternAction = authedAction(
  z.object({ userId: z.string().min(1) }),
  ({ userId }, actor) => cancelPendingPattern(actor, userId, serverToday()),
);
