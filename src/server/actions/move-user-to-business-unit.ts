"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { moveUserToBusinessUnit } from "@/server/services/users";

// Move to business unit… in the admin dialog's Users tab (super admins, spec §1.3).
export const moveUserToBusinessUnitAction = authedAction(
  z.object({ userId: z.string().min(1), businessUnitId: z.string().min(1) }),
  ({ userId, businessUnitId }, actor) => moveUserToBusinessUnit(actor, userId, businessUnitId),
);
