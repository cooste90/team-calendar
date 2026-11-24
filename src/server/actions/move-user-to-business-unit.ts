"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { authedAction } from "@/server/authed-action";
import { moveUserToBusinessUnit } from "@/server/services/users";

// Move to business unit… in the admin dialog's Users tab (super admins, spec §1.3).
export const moveUserToBusinessUnitAction = authedAction(
  z.object({ userId: idSchema, businessUnitId: idSchema }),
  ({ userId, businessUnitId }, actor) => moveUserToBusinessUnit(actor, userId, businessUnitId),
);
