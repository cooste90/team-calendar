"use client";

import { formatPeople } from "@/domain/format";
import { deleteTeamAction } from "@/server/actions/delete-team";
import type { AdminTeam } from "@/server/queries/teams";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

type Props = {
  team: AdminTeam;
  onCancel: () => void;
  onDeleted: (message: string) => void;
  onCloseAutoFocus: (event: Event) => void;
};

// "Delete Finance Operations? Its 4 members will move to Unassigned." (spec §9). It
// always asks, even for an empty team.
export function DeleteTeamDialog({ team, onCancel, onDeleted, onCloseAutoFocus }: Props) {
  let message = `${team.name} deleted.`;
  if (team.memberCount > 0) {
    message += ` ${formatPeople(team.memberCount)} moved to Unassigned.`;
  }

  return (
    <ConfirmDeleteDialog
      title={`Delete ${team.name}?`}
      description={whatHappensToMembers(team.memberCount)}
      confirmLabel="Delete team"
      onConfirm={() => deleteTeamAction({ teamId: team.id })}
      onDeleted={() => onDeleted(message)}
      onCancel={onCancel}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  );
}

function whatHappensToMembers(memberCount: number) {
  if (memberCount === 0) return "It has no members.";
  if (memberCount === 1) return "Its 1 member will move to Unassigned.";
  return `Its ${memberCount} members will move to Unassigned.`;
}
