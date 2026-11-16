"use server";

import { z } from "zod";
import { bookingInputSchema } from "@/domain/events";
import { authedAction } from "@/server/authed-action";
import { updateBooking } from "@/server/services/booking-edits";
import { serverToday } from "@/server/today";

// The booking form's Save in edit mode (spec §5.5). replace is true when the person
// pressed Replace after being shown the clashes.
export const updateBookingAction = authedAction(
  z.object({ id: z.string().min(1), booking: bookingInputSchema, replace: z.boolean() }),
  ({ id, booking, replace }, actor) =>
    updateBooking(actor, id, booking, { replace }, serverToday()),
);
