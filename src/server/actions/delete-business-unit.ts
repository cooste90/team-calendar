"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { deleteBusinessUnit } from "@/server/services/business-units";

// A business unit row's Delete, after the confirmation (spec §9). Only an empty one.
export const deleteBusinessUnitAction = authedAction(
  z.object({ id: z.string().min(1) }),
  ({ id }, actor) => deleteBusinessUnit(actor, id),
);
