"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { authedAction } from "@/server/authed-action";
import { deleteBooking } from "@/server/services/booking-edits";
import { serverToday } from "@/server/today";

// Delete (spec §5.6). Returns the deleted booking, for the toast's Undo button to pass to
// restoreBookingAction.
export const deleteBookingAction = authedAction(z.object({ id: idSchema }), ({ id }, actor) =>
  deleteBooking(actor, id, serverToday()),
);
