"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { trimRemainingDays } from "@/server/services/booking-edits";
import { serverToday } from "@/server/today";

// "Delete the remaining days" on a booking that has started (spec §5.4).
export const trimBookingAction = authedAction(
  z.object({ id: z.string().min(1) }),
  ({ id }, actor) => trimRemainingDays(actor, id, serverToday()),
);
