"use client";

import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { availabilityLookup } from "@/domain/availability";
import { countWorkingDays } from "@/domain/counting";
import { formatCount, formatShortRange } from "@/domain/format";
import { leaveTypes } from "@/domain/leave-types";
import { rangeOf } from "@/domain/slots";
import type { CalendarData } from "@/server/queries/calendar";
import { deleteWithUndo } from "./booking-actions";
import { useCalendarStore } from "./calendar-store";
import { focusLastCell } from "./grid/cell-elements";

// "Delete Annual leave, Mon 9 – Wed 11 Nov (3 days)?" for a booking over several days
// (spec §5.6), from the grid or the booking form. requestDelete opens it.
export function DeleteConfirmDialog({ data }: { data: CalendarData }) {
  const bookingId = useCalendarStore((store) => store.deleteConfirmId);
  const setBookingId = useCalendarStore((store) => store.setDeleteConfirmId);
  const [pending, startTransition] = useTransition();
  const booking = data.bookings.find((item) => item.id === bookingId);
  const person = booking && data.people.find((item) => item.id === booking.userId);

  let question = "";
  if (booking && person) {
    const lookup = availabilityLookup(person.patterns, person.overrides);
    const count = countWorkingDays(rangeOf(booking), lookup);
    const dates = formatShortRange(booking.startDate, booking.endDate);
    question = `Delete ${leaveTypes[booking.type].label}, ${dates} (${formatCount(count)})?`;
  }

  function confirm(id: string) {
    startTransition(async () => {
      await deleteWithUndo(id);
      setBookingId(null);
    });
  }

  return (
    <AlertDialog
      open={booking !== undefined && person !== undefined}
      onOpenChange={(open) => {
        if (!open) setBookingId(null);
      }}
    >
      {booking && person && (
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            // Back to the cell. If the booking form is still open underneath, its focus
            // trap keeps focus inside the form instead.
            event.preventDefault();
            focusLastCell();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{question}</AlertDialogTitle>
            <AlertDialogDescription>
              You can undo it for a few seconds afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={() => confirm(booking.id)}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
