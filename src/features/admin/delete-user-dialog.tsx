"use client";

import { useId, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { deleteUserAction } from "@/server/actions/delete-user";
import type { AdminUser } from "@/server/queries/users";

type Props = {
  user: AdminUser;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// Deleting someone can't be undone (spec §9), so the admin types the person's surname
// first. Case and spaces at the ends don't matter. The Users tab only renders this while
// it's open.
export function DeleteUserDialog({ user, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();
  const matches = typed.trim().toLowerCase() === user.surname.toLowerCase();

  function confirm() {
    startTransition(async () => {
      const result = await deleteUserAction({ userId: user.id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onDeleted(`${user.name} deleted.`);
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
          <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes them and all their bookings (past and future). If they sign in
            again, they'll start as a new user.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches || pending} onClick={confirm}>
            Delete {user.name}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
