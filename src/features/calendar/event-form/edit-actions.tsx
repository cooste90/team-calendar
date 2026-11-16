"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DeletedBooking } from "@/domain/events";
import type { AllowedEdits } from "@/domain/time-rules";
import { deleteBookingAction } from "@/server/actions/delete-booking";
import { restoreBookingAction } from "@/server/actions/restore-booking";
import { trimBookingAction } from "@/server/actions/trim-booking";

type Props = { bookingId: string; edits: AllowedEdits; onDone: () => void };

// The edit form's Delete button (before the booking starts) or "Delete remaining days"
// (once it has started), spec §5.4. A delete can be undone from the toast for 8 seconds.
export function EditActions({ bookingId, edits, onDone }: Props) {
  const [pending, startTransition] = useTransition();
  if (edits === "none") return null;
  const notStarted = edits === "all";

  function handleClick() {
    startTransition(async () => {
      if (notStarted) {
        const result = await deleteBookingAction({ id: bookingId });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        onDone();
        toast("Booking deleted", {
          duration: 8000,
          action: { label: "Undo", onClick: () => undo(result.data) },
        });
      } else {
        const result = await trimBookingAction({ id: bookingId });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        onDone();
        toast("Remaining days deleted");
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

async function undo(deleted: DeletedBooking) {
  const result = await restoreBookingAction(deleted);
  if (!result.ok) toast.error(result.error.message);
}
