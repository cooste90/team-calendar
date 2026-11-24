"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { deleteUserAction } from "@/server/actions/delete-user";
import type { AdminUser } from "@/server/queries/users";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

type Props = {
  user: AdminUser;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// Deleting someone can't be undone (spec §9), so the admin types the person's surname
// first. Case and spaces at the ends don't matter.
export function DeleteUserDialog({ user, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  const [typed, setTyped] = useState("");
  const id = useId();
  const matches = typed.trim().toLowerCase() === user.surname.toLowerCase();

  return (
    <ConfirmDeleteDialog
      title={`Delete ${user.name}?`}
      description="This permanently removes them and all their bookings (past and future). If they sign in again, they'll start as a new user."
      confirmLabel={`Delete ${user.name}`}
      canConfirm={matches}
      onConfirm={() => deleteUserAction({ userId: user.id })}
      onDeleted={() => onDeleted(`${user.name} deleted.`)}
      onCancel={onCancel}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="font-semibold text-[0.8125rem]">
          Type their surname, {user.surname}, to confirm
        </label>
        <Input
          id={id}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className="h-9"
        />
      </div>
    </ConfirmDeleteDialog>
  );
}
