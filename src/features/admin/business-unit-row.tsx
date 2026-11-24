"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { startTransition, useOptimistic, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import { formatPeople, formatTeams } from "@/domain/format";
import { businessUnitNameSchema } from "@/lib/schemas/business-unit";
import { renameBusinessUnitAction } from "@/server/actions/rename-business-unit";
import { setBusinessUnitHiddenAction } from "@/server/actions/set-business-unit-hidden";
import type { AdminBusinessUnit } from "@/server/queries/business-units";
import { RenameForm } from "./rename-form";

type Props = {
  unit: AdminBusinessUnit;
  hiddenHintId: string; // the tab's "Hidden units are only visible…" line
  onDelete: (unit: AdminBusinessUnit) => void;
  onAnnounce: (message: string) => void;
};

// One business unit in the Business units tab: its name and size, a Hidden checkbox
// (saved as soon as it's ticked), Rename and Delete.
export function BusinessUnitRow({ unit, hiddenHintId, onDelete, onAnnounce }: Props) {
  const [renaming, setRenaming] = useState(false);
  // Ticks at once while it saves, and goes back if saving fails.
  const [hiddenShown, setHiddenShown] = useOptimistic(unit.hidden);
  const renameButton = useRef<HTMLButtonElement>(null);

  function finishRenaming(message: string | null) {
    // flushSync puts the Rename button back on screen straight away, so it can take focus.
    flushSync(() => setRenaming(false));
    renameButton.current?.focus();
    if (message) onAnnounce(message);
  }

  function setHidden(hidden: boolean) {
    startTransition(async () => {
      setHiddenShown(hidden);
      const result = await setBusinessUnitHiddenAction({ id: unit.id, hidden });
      if (!result.ok) {
        toast.error(result.error.message);
        onAnnounce(result.error.message);
        return;
      }
      onAnnounce(hidden ? `${unit.name} is now hidden.` : `${unit.name} is visible to everyone.`);
    });
  }

  if (renaming) {
    return (
      <li className="flex border-b py-2.5 last:border-b-0">
        <RenameForm
          currentName={unit.name}
          schema={businessUnitNameSchema}
          onSave={(name) => renameBusinessUnitAction({ id: unit.id, name })}
          onDone={finishRenaming}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 basis-32 flex-col">
        <span className="wrap-break-word font-medium">{unit.name}</span>
        <span className="text-muted-foreground text-xs">
          {formatPeople(unit.peopleCount)} · {formatTeams(unit.teamCount)}
        </span>
      </div>
      <label className="flex min-h-6 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hiddenShown}
          onChange={(event) => setHidden(event.target.checked)}
          aria-describedby={hiddenHintId}
        />
        Hidden<span className="sr-only"> ({unit.name})</span>
      </label>
      <div className="flex gap-1">
        <IconButton
          ref={renameButton}
          label={`Rename ${unit.name}`}
          onClick={() => setRenaming(true)}
        >
          <PencilIcon aria-hidden="true" />
        </IconButton>
        <IconButton
          label={`Delete ${unit.name}`}
          onClick={() => onDelete(unit)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}
