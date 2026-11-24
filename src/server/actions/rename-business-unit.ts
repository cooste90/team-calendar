"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { businessUnitNameSchema } from "@/lib/schemas/business-unit";
import { authedAction } from "@/server/authed-action";
import { renameBusinessUnit } from "@/server/services/business-units";

// A business unit row's Rename (spec §9).
export const renameBusinessUnitAction = authedAction(
  z.object({ id: idSchema, name: businessUnitNameSchema }),
  ({ id, name }, actor) => renameBusinessUnit(actor, id, name),
);
