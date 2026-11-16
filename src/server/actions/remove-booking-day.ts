"use server";

import { z } from "zod";
import { calendarDateSchema } from "@/domain/dates";
import { authedAction } from "@/server/authed-action";
import { removeBookingDay } from "@/server/services/booking-edits";
import { serverToday } from "@/server/today";

// "Remove this day" in the booking details (spec §5.6).
export const removeBookingDayAction = authedAction(
  z.object({ id: z.string().min(1), date: calendarDateSchema }),
  ({ id, date }, actor) => removeBookingDay(actor, id, date, serverToday()),
);
