"use client";

import { useId, useState, useTransition } from "react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { moveUserToBusinessUnitAction } from "@/server/actions/move-user-to-business-unit";
import type { AdminUser } from "@/server/queries/users";
import type { BusinessUnitOption } from "./admin-dialog";

type Props = {
  user: AdminUser;
  businessUnits: BusinessUnitOption[]; // every BU but the one they're in
  onCancel: () => void;
  onMoved: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// Super admins only (spec §1.3): move someone to another BU. They keep their bookings
// and start in its Unassigned group, so its admins can put them in a team. The Users tab
// only renders this while it's open.
export function MoveBusinessUnitDialog({
  user,
  businessUnits,
  onCancel,
  onMoved,
  onCloseAutoFocus,
}: Props) {
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function move() {
    const target = businessUnits.find((unit) => unit.id === businessUnitId);
    if (!target) return;
    startTransition(async () => {
      const result = await moveUserToBusinessUnitAction({
        userId: user.id,
        businessUnitId: target.id,
      });
      // Updates after an await go in their own startTransition (see 04-code-style.md).
      startTransition(() => {
        if (result.ok) {
          onMoved(`${user.name} moved to ${target.name}, in its Unassigned group.`);
        } else {
          setError(result.error.message);
        }
      });
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {user.name} to another business unit</DialogTitle>
          <DialogDescription>
            They'll keep their bookings and start in Unassigned.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className="font-semibold text-[0.8125rem]">
            Business unit
          </label>
          <NativeSelect
            id={id}
            value={businessUnitId}
            onChange={(event) => setBusinessUnitId(event.target.value)}
            className="w-full"
          >
            <option value="" disabled>
              Choose business unit…
            </option>
            {businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.hidden ? `${unit.name} (hidden)` : unit.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={businessUnitId === "" || pending} onClick={move}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
