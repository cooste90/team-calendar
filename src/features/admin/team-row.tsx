"use client";

import { ArrowDownIcon, ArrowUpIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { IconButton } from "@/components/icon-button";
import { formatPeople } from "@/domain/format";
import { teamNameSchema } from "@/lib/schemas/team";
import { renameTeamAction } from "@/server/actions/rename-team";
import type { AdminTeam } from "@/server/queries/teams";
import { RenameForm } from "./rename-form";

export type Direction = "up" | "down";

type Props = {
  team: AdminTeam;
  isFirst: boolean;
  isLast: boolean;
  onMove: (team: AdminTeam, direction: Direction) => void;
  onDelete: (team: AdminTeam) => void;
  onAnnounce: (message: string) => void;
};

// The id of a team's Move up or Move down button, so the Teams tab can focus it again
// after the list comes back in its new order.
export function moveButtonId(teamId: string, direction: Direction) {
  return `move-${direction}-${teamId}`;
}

// One team in the Teams tab: its name and size, and Rename, Move up, Move down and
// Delete. Moving uses buttons, not dragging (WCAG 2.5.7).
export function TeamRow({ team, isFirst, isLast, onMove, onDelete, onAnnounce }: Props) {
  const [renaming, setRenaming] = useState(false);
  const renameButton = useRef<HTMLButtonElement>(null);

  function finishRenaming(message: string | null) {
    // flushSync puts the Rename button back on screen straight away, so it can take focus.
    flushSync(() => setRenaming(false));
    renameButton.current?.focus();
    if (message) onAnnounce(message);
  }

  if (renaming) {
    return (
      <li className="flex border-b py-2.5 last:border-b-0">
        <RenameForm
          currentName={team.name}
          schema={teamNameSchema}
          onSave={(name) => renameTeamAction({ teamId: team.id, name })}
          onDone={finishRenaming}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2.5 last:border-b-0">
      {/* basis-32: on a very narrow screen the buttons wrap under the name, rather than
          squeezing it until words break. */}
      <div className="flex min-w-0 flex-1 basis-32 flex-col">
        <span className="wrap-break-word font-medium">{team.name}</span>
        <span className="text-muted-foreground text-xs">{formatPeople(team.memberCount)}</span>
      </div>
      <div className="flex gap-1">
        <IconButton
          ref={renameButton}
          label={`Rename ${team.name}`}
          onClick={() => setRenaming(true)}
        >
          <PencilIcon aria-hidden="true" />
        </IconButton>
        <IconButton
          id={moveButtonId(team.id, "up")}
          label={`Move ${team.name} up`}
          disabled={isFirst}
          onClick={() => onMove(team, "up")}
        >
          <ArrowUpIcon aria-hidden="true" />
        </IconButton>
        <IconButton
          id={moveButtonId(team.id, "down")}
          label={`Move ${team.name} down`}
          disabled={isLast}
          onClick={() => onMove(team, "down")}
        >
          <ArrowDownIcon aria-hidden="true" />
        </IconButton>
        <IconButton
          label={`Delete ${team.name}`}
          onClick={() => onDelete(team)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}
