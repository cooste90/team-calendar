// Deleting and trimming bookings from the grid and the booking form (spec §5.4, §5.6).
// Both go through here, so the confirmation, Undo, messages and focus behave the same.
// A problem shows as a toast; success closes whatever was showing the booking and tells
// screen readers what happened. The action's refresh() brings the new data.
import { toast } from "sonner";
import type { CalendarDate } from "@/domain/dates";
import type { Booking, DeletedBooking } from "@/domain/events";
import { formatShort } from "@/domain/format";
import { deleteBookingAction } from "@/server/actions/delete-booking";
import { removeBookingDayAction } from "@/server/actions/remove-booking-day";
import { restoreBookingAction } from "@/server/actions/restore-booking";
import { trimBookingAction } from "@/server/actions/trim-booking";
import { useCalendarStore } from "./calendar-store";
import { focusGridCell } from "./grid/cell-elements";

// It worked: tell screen readers, and close the form and the popover.
function finish(message: string) {
  const store = useCalendarStore.getState();
  store.announce(message);
  store.setEventDialog(null);
  store.setGridPopover(null);
}

// Delete: a booking over several days is confirmed first (DeleteConfirmDialog); a single
// day goes at once.
export async function requestDelete(booking: Booking) {
  if (booking.startDate !== booking.endDate) {
    useCalendarStore.getState().setDeleteConfirmId(booking.id);
    return;
  }
  await deleteWithUndo(booking.id);
}

// Deletes, then offers Undo in a toast for 8 seconds (spec §5.6).
export async function deleteWithUndo(bookingId: string) {
  const result = await deleteBookingAction({ id: bookingId });
  if (!result.ok) {
    toast.error(result.error.message);
    return;
  }
  finish("Booking deleted. Undo available.");
  toast("Booking deleted", {
    duration: 8000,
    action: { label: "Undo", onClick: () => undoDelete(result.data) },
  });
}

// Puts a deleted booking back. If something else has been booked there since, the
// server says "Couldn't undo — something else is booked there now."
async function undoDelete(deleted: DeletedBooking) {
  const result = await restoreBookingAction(deleted);
  if (!result.ok) {
    toast.error(result.error.message);
    return;
  }
  finish("Booking restored.");
  // It grows back into place, and focus goes to its first day.
  useCalendarStore.getState().setLastCreatedId(result.data.id);
  focusGridCell({ personId: deleted.booking.userId, column: deleted.booking.startDate });
}

// "Delete remaining days" on a booking that has started: it now ends yesterday.
export async function trimRemaining(bookingId: string) {
  const result = await trimBookingAction({ id: bookingId });
  if (!result.ok) {
    toast.error(result.error.message);
    return;
  }
  finish("Remaining days deleted.");
  toast("Remaining days deleted");
}

// "Remove this day": a day in the middle splits the booking in two.
export async function removeDay(bookingId: string, date: CalendarDate) {
  const result = await removeBookingDayAction({ id: bookingId, date });
  if (!result.ok) {
    toast.error(result.error.message);
    return;
  }
  finish(`${formatShort(date)} removed from the booking.`);
}
