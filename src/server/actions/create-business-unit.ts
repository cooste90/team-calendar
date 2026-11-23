"use server";

import { z } from "zod";
import { businessUnitNameSchema } from "@/lib/schemas/business-unit";
import { authedAction } from "@/server/authed-action";
import { createBusinessUnit } from "@/server/services/business-units";

// The Business units tab's New business unit form (spec §9).
export const createBusinessUnitAction = authedAction(
  z.object({ name: businessUnitNameSchema }),
  ({ name }, actor) => createBusinessUnit(actor, name),
);
