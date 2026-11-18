"use server";

import { z } from "zod";
import { preferredNameSchema } from "@/lib/schemas/profile";
import { authedAction } from "@/server/authed-action";
import { updatePreferredName } from "@/server/services/profile";

// The profile's Details tab (spec §7). An empty name clears it.
export const updatePreferredNameAction = authedAction(
  z.object({ userId: z.string().min(1), preferredName: preferredNameSchema }),
  ({ userId, preferredName }, actor) => updatePreferredName(actor, userId, preferredName),
);
