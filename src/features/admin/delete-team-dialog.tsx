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
import { deleteTeamAction } from "@/server/actions/delete-team";
import type { AdminTeam } from "@/server/queries/teams";

type Props = {
  team: AdminTeam;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// "Delete Finance Operations? Its 4 members will move to Unassigned." (spec §9). It
// always asks, even for an empty team. The Teams tab only renders this while it's open.
export function DeleteTeamDialog({ team, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteTeamAction({ teamId: team.id });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      let message = `${team.name} deleted.`;
      if (team.memberCount > 0) {
        message += ` ${formatPeople(team.memberCount)} moved to Unassigned.`;
      }
      onDeleted(message);
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
          <AlertDialogTitle>Delete {team.name}?</AlertDialogTitle>
          <AlertDialogDescription>{whatHappensToMembers(team.memberCount)}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            Delete team
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function whatHappensToMembers(memberCount: number) {
  if (memberCount === 0) return "It has no members.";
  if (memberCount === 1) return "Its 1 member will move to Unassigned.";
  return `Its ${memberCount} members will move to Unassigned.`;
}
