// Sends the booking form to the server: the day swap first, if it changed, then the
// booking. The server checks every rule again; this only turns its answer into what
// the form shows.
import type { AvailabilityLookup, WorkDay } from "@/domain/availability";
import { countWorkingDays } from "@/domain/counting";
import type { CalendarDate } from "@/domain/dates";
import type { ConflictDetail } from "@/domain/errors";
import type { BookingInput } from "@/domain/events";
import { formatCount, formatLongRange } from "@/domain/format";
import { leaveTypes } from "@/domain/leave-types";
import { rangeOf } from "@/domain/slots";
import { createBookingAction } from "@/server/actions/create-booking";
import { setAvailabilityOverrideAction } from "@/server/actions/set-availability-override";
import { updateBookingAction } from "@/server/actions/update-booking";
import type { ActionError } from "@/server/authed-action";

type Request = {
  userId: string; // the person the booking or day swap is for
  booking: BookingInput | null; // null to save only the day swap
  bookingId: string | null; // set when editing
  replace: boolean;
  swap: { date: CalendarDate; value: WorkDay | null } | null; // null when unchanged
};

type Outcome = {
  saved: boolean;
  createdId: string | null; // a new booking's id, so its bar can grow into place
  conflicts: ConflictDetail[];
  problem: string | null;
};

export async function saveForm(request: Request): Promise<Outcome> {
  const { userId, booking, bookingId, replace, swap } = request;
  if (swap) {
    const result = await setAvailabilityOverrideAction({ userId, ...swap });
    if (!result.ok) return problemOutcome(result.error);
  }
  if (!booking) return { saved: true, createdId: null, conflicts: [], problem: null };

  if (bookingId) {
    const result = await updateBookingAction({ id: bookingId, booking, replace });
    if (result.ok) return { saved: true, createdId: null, conflicts: [], problem: null };
    return problemOutcome(result.error);
  }
  const result = await createBookingAction({ booking, replace });
  if (result.ok) return { saved: true, createdId: result.data.id, conflicts: [], problem: null };
  return problemOutcome(result.error);
}

// A clash is shown with Replace; anything else as a message.
function problemOutcome(error: ActionError): Outcome {
  if (error.code === "CONFLICT") {
    return { saved: false, createdId: null, conflicts: error.conflicts ?? [], problem: null };
  }
  return { saved: false, createdId: null, conflicts: [], problem: error.message };
}

// What screen readers hear after a save, e.g. "Annual leave added for Tom Okafor,
// Monday 9 to Wednesday 11 November, 3 days." The count uses the person's availability.
export function savedMessage(
  booking: BookingInput | null,
  editing: boolean,
  personName: string,
  lookup: AvailabilityLookup,
): string {
  if (!booking) return "Availability saved.";
  const verb = editing ? "changed" : "added";
  const dates = formatLongRange(booking.startDate, booking.endDate);
  const count = formatCount(countWorkingDays(rangeOf(booking), lookup));
  return `${leaveTypes[booking.type].label} ${verb} for ${personName}, ${dates}, ${count}.`;
}
