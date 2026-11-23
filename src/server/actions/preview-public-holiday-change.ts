"use server";

import { holidayChangeSchema } from "@/lib/schemas/public-holiday";
import { authedAction } from "@/server/authed-action";
import { previewPublicHolidayChange } from "@/server/services/public-holidays";
import { serverToday } from "@/server/today";

// The confirm step's numbers before a public holiday change (spec §6.1). It only reads,
// so the page isn't reloaded.
export const previewPublicHolidayChangeAction = authedAction(
  holidayChangeSchema,
  (change, actor) => previewPublicHolidayChange(actor, change, serverToday()),
  { readOnly: true },
);
