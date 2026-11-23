"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamNameSchema } from "@/lib/schemas/team";
import { renameTeamAction } from "@/server/actions/rename-team";
import type { AdminTeam } from "@/server/queries/teams";

type Props = {
  team: AdminTeam;
  onDone: (message: string | null) => void; // the message to read out, or null if cancelled
};

// A team's row while it's being renamed. Enter saves; Esc or Cancel keeps the old name.
// data-renaming tells the admin dialog not to close on that Esc.
export function RenameTeamForm({ team, onDone }: Props) {
  const [name, setName] = useState(team.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const checked = teamNameSchema.safeParse(name);
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    if (checked.data === team.name) {
      onDone(null);
      return;
    }
    startTransition(async () => {
      const result = await renameTeamAction({ teamId: team.id, name: checked.data });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onDone(`${team.name} renamed to ${checked.data}.`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-renaming className="flex flex-1 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {/* The person just chose Rename, so the box takes focus, ready to type over the
            old name. autoFocus focuses it as it appears, before the dialog's focus trap
            notices that the Rename button has gone and moves focus to the dialog. */}
        <Input
          autoFocus
          onFocus={(event) => event.target.select()}
          aria-label={`New name for ${team.name}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onDone(null);
          }}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-9 min-w-40 flex-1"
        />
        <Button type="submit" disabled={pending} className="h-9">
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" onClick={() => onDone(null)} className="h-9">
          Cancel
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
