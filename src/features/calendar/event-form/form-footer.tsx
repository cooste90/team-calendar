import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import type { Booking } from "@/domain/events";
import type { AllowedEdits } from "@/domain/time-rules";
import { EditActions } from "./edit-actions";

type Props = {
  booking: Booking | null; // set when editing
  edits: AllowedEdits;
  pending: boolean;
  swapChanged: boolean; // a day swap is waiting to be saved
  onSaveSwapOnly: () => void;
};

// The form's buttons: Delete (when editing), then Cancel and Save on the right.
export function FormFooter(props: Props) {
  const { booking, edits, pending, swapChanged, onSaveSwapOnly } = props;

  let submitLabel = booking ? "Save changes" : "Add event";
  if (pending) submitLabel = "Saving…";

  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">
      {booking && <EditActions booking={booking} edits={edits} />}
      <div className="ml-auto flex flex-wrap gap-2">
        {swapChanged && (
          <Button variant="outline" disabled={pending} onClick={onSaveSwapOnly}>
            Save availability only
          </Button>
        )}
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        {edits !== "none" && (
          <Button type="submit" disabled={pending}>
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
