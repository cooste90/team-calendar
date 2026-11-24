"use client";

import { type ReactNode, useState, useTransition } from "react";
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
import type { ActionResult } from "@/server/authed-action";

type Props = {
  title: string;
  description: string;
  children?: ReactNode; // anything else to show, e.g. the "type their surname" box
  // Leave it out when there's nothing to delete yet: the dialog then only has "OK".
  confirmLabel?: string;
  canConfirm?: boolean;
  onConfirm: () => Promise<ActionResult<unknown>>; // runs the delete action
  onDeleted: () => void;
  onCancel: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

// The admin dialog's delete confirmations (teams, users, public holidays, business
// units) all look and behave the same: a title, what will happen, Cancel and a red
// Delete. If the server refuses, its message shows here and the dialog stays open.
// The tabs only render it while it's open, so it starts fresh every time.
export function ConfirmDeleteDialog({
  title,
  description,
  children,
  confirmLabel,
  canConfirm = true,
  onConfirm,
  onDeleted,
  onCancel,
  onCloseAutoFocus,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      // Updates after an await go in their own startTransition (see 04-code-style.md).
      startTransition(() => {
        if (result.ok) {
          onDeleted();
        } else {
          setError(result.error.message);
        }
      });
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{confirmLabel ? "Cancel" : "OK"}</AlertDialogCancel>
          {confirmLabel && (
            <Button variant="destructive" disabled={!canConfirm || pending} onClick={confirm}>
              {confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
