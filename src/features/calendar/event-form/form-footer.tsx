import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import type { AllowedEdits } from "@/domain/time-rules";
import { EditActions } from "./edit-actions";

type Props = {
  bookingId: string | null; // set when editing
  edits: AllowedEdits;
  pending: boolean;
  swapChanged: boolean; // a day swap is waiting to be saved
  onSaveSwapOnly: () => void;
  onDone: () => void;
};

// The form's buttons: Delete (when editing), then Cancel and Save on the right.
export function FormFooter(props: Props) {
  const { bookingId, edits, pending, swapChanged, onSaveSwapOnly, onDone } = props;

  let submitLabel = bookingId ? "Save changes" : "Add event";
  if (pending) submitLabel = "Saving…";

  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">
      {bookingId && <EditActions bookingId={bookingId} edits={edits} onDone={onDone} />}
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
