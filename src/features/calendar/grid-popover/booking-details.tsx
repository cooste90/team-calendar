"use client";

import { useTransition } from "react";
import { LabelledLeaveChip } from "@/components/leave-chip";
import { Button } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/dates";
import { formatShort } from "@/domain/format";
import { removeDay, requestDelete, trimRemaining } from "../booking-actions";
import type { EventDialogTarget } from "../calendar-store";
import { BookingHistory } from "../event-form/booking-history";
import type { BookingItem } from "../grid/describe-cell";

type Props = {
  item: BookingItem;
  date: CalendarDate; // the day that was clicked
  personName: string;
  onOpenForm: (form: EventDialogTarget) => void;
};

// A booking's details (spec §5.6): type, dates, count, notes and who added and changed
// it, which everyone can see, then the buttons the viewer is allowed.
export function BookingDetails({ item, date, personName, onOpenForm }: Props) {
  const { booking, summary, actions } = item;
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">
          <LabelledLeaveChip type={booking.type} />
        </h2>
        <p>
          {personName} · {summary}
        </p>
      </div>
      {booking.notes && <p className="wrap-break-word whitespace-pre-wrap">{booking.notes}</p>}
      <BookingHistory audit={booking.audit} />
      <div className="flex flex-wrap gap-2">
        {actions.edit && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenForm({ mode: "edit", bookingId: booking.id })}
          >
            Edit
          </Button>
        )}
        {actions.delete && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={pending}
            onClick={() => startTransition(() => requestDelete(booking))}
          >
            Delete
          </Button>
        )}
        {actions.removeDay && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => removeDay(booking.id, date))}
          >
            Remove this day ({formatShort(date)})
          </Button>
        )}
        {actions.trim && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={pending}
            onClick={() => startTransition(() => trimRemaining(booking.id))}
          >
            Delete remaining days
          </Button>
        )}
      </div>
    </div>
  );
}
