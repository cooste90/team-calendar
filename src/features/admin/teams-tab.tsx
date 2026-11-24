"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPeople } from "@/domain/format";
import { UNASSIGNED_GROUP_NAME } from "@/domain/teams";
import { teamNameSchema } from "@/lib/schemas/team";
import { createTeamAction } from "@/server/actions/create-team";
import { moveTeamAction } from "@/server/actions/move-team";
import type { AdminTeam, AdminTeams } from "@/server/queries/teams";
import { DeleteTeamDialog } from "./delete-team-dialog";
import { NewNameForm } from "./new-name-form";
import { type Direction, moveButtonId, TeamRow } from "./team-row";

type Props = {
  businessUnitId: string;
  data: AdminTeams;
  onAnnounce: (message: string) => void;
};

// The admin dialog's Teams tab (spec §1.4, §9): add a team, and rename, reorder and
// delete the ones there are. Unassigned is built in, so it's listed last and can't change.
export function TeamsTab({ businessUnitId, data, onAnnounce }: Props) {
  const { teams, unassignedCount } = data;
  const [moving, startMoving] = useTransition();
  const [deleting, setDeleting] = useState<AdminTeam | null>(null);
  const lastMove = useRef<{ teamId: string; direction: Direction } | null>(null);
  const focusNewTeamOnClose = useRef(false);
  const newTeamInput = useRef<HTMLInputElement>(null);
  const headingId = useId();

  // A move comes back from the server as a new list. Then focus goes back to the moved
  // team's button (React may have moved its row, which loses focus), and its new place
  // is read out. At the top Move up is disabled, so Move down takes focus instead (and
  // the other way round at the bottom).
  useEffect(() => {
    const move = lastMove.current;
    if (!move) return;
    lastMove.current = null;
    const index = teams.findIndex((team) => team.id === move.teamId);
    if (index === -1) return;

    let direction = move.direction;
    if (direction === "up" && index === 0) direction = "down";
    if (direction === "down" && index === teams.length - 1) direction = "up";
    document.getElementById(moveButtonId(move.teamId, direction))?.focus();
    onAnnounce(`${teams[index].name} moved to position ${index + 1} of ${teams.length}.`);
  }, [teams, onAnnounce]);

  function move(team: AdminTeam, direction: Direction) {
    // One move at a time. The buttons stay enabled meanwhile: disabling the button that
    // has focus would lose it.
    if (moving) return;
    lastMove.current = { teamId: team.id, direction };
    startMoving(async () => {
      const result = await moveTeamAction({ teamId: team.id, direction });
      if (!result.ok) {
        lastMove.current = null;
        toast.error(result.error.message);
        onAnnounce(result.error.message);
      }
    });
  }

  function handleDeleted(message: string) {
    focusNewTeamOnClose.current = true;
    setDeleting(null);
    onAnnounce(message);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* A new team goes at the end of the list. */}
      <NewNameForm
        label="New team"
        buttonLabel="Add team"
        schema={teamNameSchema}
        inputRef={newTeamInput}
        onSave={(name) => createTeamAction({ businessUnitId, name })}
        onAdded={(name) => onAnnounce(`${name} added at the end of the list.`)}
      />

      <section aria-labelledby={headingId} className="flex flex-col gap-2">
        <div>
          <h3 id={headingId} className="font-semibold text-[0.8125rem]">
            Teams
          </h3>
          <p className="text-muted-foreground text-xs">The calendar lists teams in this order.</p>
        </div>
        <div className="rounded-xl border px-3.5">
          {teams.length > 0 && (
            <ol className="border-b">
              {teams.map((team, index) => (
                <TeamRow
                  key={team.id}
                  team={team}
                  isFirst={index === 0}
                  isLast={index === teams.length - 1}
                  onMove={move}
                  onDelete={setDeleting}
                  onAnnounce={onAnnounce}
                />
              ))}
            </ol>
          )}
          <div className="flex flex-col py-2.5 text-muted-foreground">
            <span className="font-medium">
              {UNASSIGNED_GROUP_NAME} · {formatPeople(unassignedCount)}
            </span>
            <span className="text-xs">Built-in. New people land here.</span>
          </div>
        </div>
      </section>

      {/* Only there while it's open, so it starts fresh every time. */}
      {deleting && (
        <DeleteTeamDialog
          team={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={handleDeleted}
          onCloseAutoFocus={(event) => {
            // The deleted team's row has gone, Delete button and all, so focus goes to the
            // New team box. After Cancel, it goes back to the Delete button as usual.
            if (!focusNewTeamOnClose.current) return;
            focusNewTeamOnClose.current = false;
            event.preventDefault();
            newTeamInput.current?.focus();
          }}
        />
      )}
    </div>
  );
}
