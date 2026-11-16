"use server";

import { z } from "zod";
import { bookingInputSchema } from "@/domain/events";
import { authedAction } from "@/server/authed-action";
import { createBooking } from "@/server/services/bookings";
import { serverToday } from "@/server/today";

// The booking form's Save (spec §5.5). replace is true when the person pressed Replace
// after being shown the clashes.
export const createBookingAction = authedAction(
  z.object({ booking: bookingInputSchema, replace: z.boolean() }),
  ({ booking, replace }, actor) => createBooking(actor, booking, { replace }, serverToday()),
);
