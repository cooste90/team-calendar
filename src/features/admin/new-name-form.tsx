"use client";

import { type FormEvent, type Ref, useId, useState, useTransition } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/server/authed-action";

type Props = {
  label: string; // "New team"
  buttonLabel: string; // "Add team"
  schema: z.ZodType<string>; // the name rules, shared with the server action
  inputRef: Ref<HTMLInputElement>; // the tab focuses it after a delete
  onSave: (name: string) => Promise<ActionResult<unknown>>; // runs the create action
  onAdded: (name: string) => void; // e.g. to read out "Legal added."
};

// The "New team" and "New business unit" forms at the top of their admin tabs (spec §9).
// The box empties once the new one is saved.
export function NewNameForm({ label, buttonLabel, schema, inputRef, onSave, onAdded }: Props) {
  const [name, setName] = useState("");
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
    startTransition(async () => {
      const result = await onSave(checked.data);
      // Updates after an await go in their own startTransition (see 04-code-style.md).
      startTransition(() => {
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setError(null);
        setName("");
        onAdded(checked.data);
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-[0.8125rem]">
        {label}
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
          {pending ? "Adding…" : buttonLabel}
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
