"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { setBusinessUnitHidden } from "@/server/services/business-units";

// A business unit row's Hidden checkbox (spec §1.3). It says hidden or not, rather than
// "toggle", so sending it twice can't flip it the wrong way.
export const setBusinessUnitHiddenAction = authedAction(
  z.object({ id: z.string().min(1), hidden: z.boolean() }),
  ({ id, hidden }, actor) => setBusinessUnitHidden(actor, id, hidden),
);
