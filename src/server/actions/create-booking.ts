"use server";

import { z } from "zod";
import { todayIn } from "@/domain/dates";
import { bookingInputSchema } from "@/domain/events";
import { env } from "@/lib/env";
import { authedAction } from "@/server/authed-action";
import { createBooking } from "@/server/services/bookings";

// The booking form's Save (spec §5.5). replace is true when the person pressed Replace
// after being shown the clashes.
export const createBookingAction = authedAction(
  z.object({ booking: bookingInputSchema, replace: z.boolean() }),
  ({ booking, replace }, actor) =>
    createBooking(actor, booking, { replace }, todayIn(env.APP_TIME_ZONE)),
);
