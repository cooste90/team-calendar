"use client";

import { useState, useTransition } from "react";
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
import { formatPeople } from "@/domain/format";
import { deleteBusinessUnitAction } from "@/server/actions/delete-business-unit";
import type { AdminBusinessUnit } from "@/server/queries/business-units";

type Props = {
  unit: AdminBusinessUnit;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// Deleting a business unit (spec §1.3): only once nobody is in it. While people are, it
// says so instead of offering Delete. Its empty teams go with it.
export function DeleteBusinessUnitDialog({ unit, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = unit.peopleCount === 0;

  function confirm() {
    startTransition(async () => {
      const result = await deleteBusinessUnitAction({ id: unit.id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onDeleted(`${unit.name} deleted.`);
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
          <AlertDialogTitle>
            {empty ? `Delete ${unit.name}?` : `${unit.name} can't be deleted yet`}
          </AlertDialogTitle>
          <AlertDialogDescription>{whatHappens(unit)}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{empty ? "Cancel" : "OK"}</AlertDialogCancel>
          {empty && (
            <Button variant="destructive" disabled={pending} onClick={confirm}>
              Delete business unit
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function whatHappens(unit: AdminBusinessUnit) {
  if (unit.peopleCount > 0) return `Move or delete its ${formatPeople(unit.peopleCount)} first.`;
  if (unit.teamCount === 0) return "It has no people.";
  if (unit.teamCount === 1) return "It has no people, and its 1 empty team goes with it.";
  return `It has no people, and its ${unit.teamCount} empty teams go with it.`;
}
