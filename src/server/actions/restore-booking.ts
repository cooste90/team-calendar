"use server";

import { z } from "zod";
import { bookingInputSchema } from "@/domain/events";
import { authedAction } from "@/server/authed-action";
import { restoreBooking } from "@/server/services/bookings";
import { serverToday } from "@/server/today";

// Undo after a delete (spec §5.6): takes what deleteBookingAction returned.
export const restoreBookingAction = authedAction(
  z.object({ booking: bookingInputSchema, publicHolidayId: z.string().min(1).nullable() }),
  (deleted, actor) => restoreBooking(actor, deleted, serverToday()),
);
