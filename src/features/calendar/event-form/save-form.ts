// Sends the booking form to the server: the day swap first, if it changed, then the
// booking. The server checks every rule again; this only turns its answer into what
// the form shows.
import type { WorkDay } from "@/domain/availability";
import type { CalendarDate } from "@/domain/dates";
import type { ConflictDetail } from "@/domain/errors";
import type { BookingInput } from "@/domain/events";
import { createBookingAction } from "@/server/actions/create-booking";
import { setAvailabilityOverrideAction } from "@/server/actions/set-availability-override";
import { updateBookingAction } from "@/server/actions/update-booking";

type Request = {
  userId: string; // the person the booking or day swap is for
  booking: BookingInput | null; // null to save only the day swap
  bookingId: string | null; // set when editing
  replace: boolean;
  swap: { date: CalendarDate; value: WorkDay | null } | null; // null when unchanged
};

type Outcome = { saved: boolean; conflicts: ConflictDetail[]; problem: string | null };

export async function saveForm(request: Request): Promise<Outcome> {
  const { userId, booking, bookingId, replace, swap } = request;
  if (swap) {
    const result = await setAvailabilityOverrideAction({ userId, ...swap });
    if (!result.ok) return { saved: false, conflicts: [], problem: result.error.message };
  }
  if (!booking) return { saved: true, conflicts: [], problem: null };

  const result = bookingId
    ? await updateBookingAction({ id: bookingId, booking, replace })
    : await createBookingAction({ booking, replace });
  if (result.ok) return { saved: true, conflicts: [], problem: null };
  if (result.error.code === "CONFLICT") {
    return { saved: false, conflicts: result.error.conflicts ?? [], problem: null };
  }
  return { saved: false, conflicts: [], problem: result.error.message };
}
