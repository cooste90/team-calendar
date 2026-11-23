"use client";

import { type FormEvent, type Ref, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamNameSchema } from "@/lib/schemas/team";
import { createTeamAction } from "@/server/actions/create-team";

type Props = {
  businessUnitId: string;
  inputRef: Ref<HTMLInputElement>; // the Teams tab focuses it after a delete
  onAnnounce: (message: string) => void;
};

// The New team form (spec §9). The new team goes at the end of the list.
export function NewTeamForm({ businessUnitId, inputRef, onAnnounce }: Props) {
  const [name, setName] = useState("");
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
    startTransition(async () => {
      const result = await createTeamAction({ businessUnitId, name: checked.data });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setName("");
      onAnnounce(`${checked.data} added at the end of the list.`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-[0.8125rem]">
        New team
      </label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-9"
        />
        <Button type="submit" disabled={pending} className="h-9">
          {pending ? "Adding…" : "Add team"}
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
