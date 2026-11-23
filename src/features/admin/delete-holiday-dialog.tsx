"use client";

import { useEffect, useState, useTransition } from "react";
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
import { formatHolidayImpact } from "@/domain/format";
import type { PublicHoliday } from "@/domain/public-holidays";
import { previewPublicHolidayChangeAction } from "@/server/actions/preview-public-holiday-change";
import { savePublicHolidayChangeAction } from "@/server/actions/save-public-holiday-change";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    previewPublicHolidayChangeAction({ kind: "delete", id: holiday.id }).then((result) => {
      if (result.ok) {
        setWarning(formatHolidayImpact("delete", result.data));
      } else {
        setError(result.error.message);
      }
    });
  }, [holiday.id]);

  function confirm() {
    startTransition(async () => {
      const result = await savePublicHolidayChangeAction({ kind: "delete", id: holiday.id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onDeleted(`${holiday.name} deleted.`);
    });
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {holiday.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {warning ?? "Working out who's affected…"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!warning || pending} onClick={confirm}>
            Delete holiday
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
