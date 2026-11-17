"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/domain/events";
import type { AllowedEdits } from "@/domain/time-rules";
import { requestDelete, trimRemaining } from "../booking-actions";

type Props = { booking: Booking; edits: AllowedEdits };

// The edit form's Delete button (before the booking starts) or "Delete remaining days"
// (once it has started), spec §5.4. They work as in the grid's booking details.
export function EditActions({ booking, edits }: Props) {
  const [pending, startTransition] = useTransition();
  if (edits === "none") return null;
  const notStarted = edits === "all";

  function handleClick() {
    startTransition(async () => {
      if (notStarted) {
        await requestDelete(booking);
      } else {
        await trimRemaining(booking.id);
      }
    });
  }

  return (
    <Button variant="ghost" className="text-destructive" onClick={handleClick} disabled={pending}>
      <Trash2Icon aria-hidden="true" />
      {notStarted ? "Delete" : "Delete remaining days"}
    </Button>
  );
}
