"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/server/authed-action";

type Props = {
  currentName: string;
  schema: z.ZodType<string>; // the name rules, shared with the server action
  onSave: (name: string) => Promise<ActionResult<unknown>>; // runs the rename action
  onDone: (message: string | null) => void; // the message to read out, or null if cancelled
};

// A team's or business unit's row while it's being renamed. Enter saves; Esc or Cancel
// keeps the old name. data-renaming tells the admin dialog not to close on that Esc.
export function RenameForm({ currentName, schema, onSave, onDone }: Props) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const checked = schema.safeParse(name);
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    if (checked.data === currentName) {
      onDone(null);
      return;
    }
    startTransition(async () => {
      const result = await onSave(checked.data);
      // Updates after an await go in their own startTransition (see 04-code-style.md).
      startTransition(() => {
        if (result.ok) {
          onDone(`${currentName} renamed to ${checked.data}.`);
        } else {
          setError(result.error.message);
        }
      });
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
          aria-label={`New name for ${currentName}`}
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
