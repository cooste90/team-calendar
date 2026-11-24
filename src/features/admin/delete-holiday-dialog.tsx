"use client";

import { useEffect, useState } from "react";
import { formatHolidayImpact } from "@/domain/format";
import type { PublicHoliday } from "@/domain/public-holidays";
import { previewPublicHolidayChangeAction } from "@/server/actions/preview-public-holiday-change";
import { savePublicHolidayChangeAction } from "@/server/actions/save-public-holiday-change";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

type Props = {
  holiday: PublicHoliday;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// "Delete Christmas Day?" with what it will do to everyone's bookings (spec §6.1, §6.4).
// The numbers load as it opens; Delete waits for them.
export function DeleteHolidayDialog({ holiday, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  const [warning, setWarning] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    previewPublicHolidayChangeAction({ kind: "delete", id: holiday.id }).then((result) => {
      if (result.ok) {
        setWarning(formatHolidayImpact("delete", result.data));
      } else {
        setPreviewError(result.error.message);
      }
    });
  }, [holiday.id]);

  return (
    <ConfirmDeleteDialog
      title={`Delete ${holiday.name}?`}
      description={warning ?? "Working out who's affected…"}
      confirmLabel="Delete holiday"
      canConfirm={warning !== null}
      onConfirm={() => savePublicHolidayChangeAction({ kind: "delete", id: holiday.id })}
      onDeleted={() => onDeleted(`${holiday.name} deleted.`)}
      onCancel={onCancel}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {previewError && (
        <p role="alert" className="text-destructive text-sm">
          {previewError}
        </p>
      )}
    </ConfirmDeleteDialog>
  );
}
