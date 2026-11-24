"use client";

import { formatPeople } from "@/domain/format";
import { deleteBusinessUnitAction } from "@/server/actions/delete-business-unit";
import type { AdminBusinessUnit } from "@/server/queries/business-units";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

type Props = {
  unit: AdminBusinessUnit;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// Deleting a business unit (spec §1.3): only once nobody is in it. While people are, it
// says so instead of offering Delete. Its empty teams go with it.
export function DeleteBusinessUnitDialog({ unit, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  const empty = unit.peopleCount === 0;

  return (
    <ConfirmDeleteDialog
      title={empty ? `Delete ${unit.name}?` : `${unit.name} can't be deleted yet`}
      description={whatHappens(unit)}
      confirmLabel={empty ? "Delete business unit" : undefined}
      onConfirm={() => deleteBusinessUnitAction({ id: unit.id })}
      onDeleted={() => onDeleted(`${unit.name} deleted.`)}
      onCancel={onCancel}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  );
}

function whatHappens(unit: AdminBusinessUnit) {
  if (unit.peopleCount > 0) return `Move or delete its ${formatPeople(unit.peopleCount)} first.`;
  if (unit.teamCount === 0) return "It has no people.";
  if (unit.teamCount === 1) return "It has no people, and its 1 empty team goes with it.";
  return `It has no people, and its ${unit.teamCount} empty teams go with it.`;
}
