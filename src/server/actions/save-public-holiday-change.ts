"use server";

import { holidayChangeSchema } from "@/lib/schemas/public-holiday";
import { authedAction } from "@/server/authed-action";
import { savePublicHolidayChange } from "@/server/services/public-holidays";
import { serverToday } from "@/server/today";

// Adding, changing or deleting a public holiday, after the confirm step (spec §6).
export const savePublicHolidayChangeAction = authedAction(holidayChangeSchema, (change, actor) =>
  savePublicHolidayChange(actor, change, serverToday()),
);
