"use server";

import { z } from "zod";
import { calendarDateSchema } from "@/domain/dates";
import { workDaySchema } from "@/lib/schemas/availability";
import { authedAction } from "@/server/authed-action";
import { setAvailabilityOverride } from "@/server/services/availability";
import { serverToday } from "@/server/today";

// The day swap options in the booking form (spec §4.2). value null removes the swap.
export const setAvailabilityOverrideAction = authedAction(
  z.object({
    userId: z.string().min(1),
    date: calendarDateSchema,
    value: workDaySchema.nullable(),
  }),
  ({ userId, date, value }, actor) =>
    setAvailabilityOverride(actor, userId, date, value, serverToday()),
);
