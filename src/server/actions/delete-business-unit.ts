"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { authedAction } from "@/server/authed-action";
import { deleteBusinessUnit } from "@/server/services/business-units";

// A business unit row's Delete, after the confirmation (spec §9). Only an empty one.
export const deleteBusinessUnitAction = authedAction(z.object({ id: idSchema }), ({ id }, actor) =>
  deleteBusinessUnit(actor, id),
);
