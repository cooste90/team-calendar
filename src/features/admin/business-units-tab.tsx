"use client";

import { useId, useRef, useState } from "react";
import { businessUnitNameSchema } from "@/lib/schemas/business-unit";
import { createBusinessUnitAction } from "@/server/actions/create-business-unit";
import type { AdminBusinessUnit } from "@/server/queries/business-units";
import { BusinessUnitRow } from "./business-unit-row";
import { DeleteBusinessUnitDialog } from "./delete-business-unit-dialog";
import { NewNameForm } from "./new-name-form";

type Props = {
  units: AdminBusinessUnit[]; // by name, hidden ones included
  onAnnounce: (message: string) => void;
};

// The admin dialog's Business units tab (spec §1.3, §9), for super admins only: add a BU,
// and rename, hide and delete the ones there are.
export function BusinessUnitsTab({ units, onAnnounce }: Props) {
  const [deleting, setDeleting] = useState<AdminBusinessUnit | null>(null);
  const focusNewOnClose = useRef(false);
  const newInput = useRef<HTMLInputElement>(null);
  const id = useId();

  function handleDeleted(message: string) {
    focusNewOnClose.current = true;
    setDeleting(null);
    onAnnounce(message);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* A new BU starts with no teams and nobody in it. */}
      <NewNameForm
        label="New business unit"
        buttonLabel="Add business unit"
        schema={businessUnitNameSchema}
        inputRef={newInput}
        onSave={(name) => createBusinessUnitAction({ name })}
        onAdded={(name) => onAnnounce(`${name} added.`)}
      />

      <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-2">
        <div>
          <h3 id={`${id}-heading`} className="font-semibold text-[0.8125rem]">
            Business units
          </h3>
          <p id={`${id}-hidden`} className="text-muted-foreground text-xs">
            Hidden units are only visible to their own members.
          </p>
        </div>
        <ul className="rounded-xl border px-3.5">
          {units.map((unit) => (
            <BusinessUnitRow
              key={unit.id}
              unit={unit}
              hiddenHintId={`${id}-hidden`}
              onDelete={setDeleting}
              onAnnounce={onAnnounce}
            />
          ))}
        </ul>
      </section>

      {/* Only there while it's open, so it starts fresh every time. */}
      {deleting && (
        <DeleteBusinessUnitDialog
          unit={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={handleDeleted}
          onCloseAutoFocus={(event) => {
            // The deleted BU's row has gone, Delete button and all, so focus goes to the
            // New business unit box. After Cancel, it goes back to the Delete button.
            if (!focusNewOnClose.current) return;
            focusNewOnClose.current = false;
            event.preventDefault();
            newInput.current?.focus();
          }}
        />
      )}
    </div>
  );
}
