"use client";

import { type FormEvent, type Ref, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessUnitNameSchema } from "@/lib/schemas/business-unit";
import { createBusinessUnitAction } from "@/server/actions/create-business-unit";

type Props = {
  inputRef: Ref<HTMLInputElement>; // the Business units tab focuses it after a delete
  onAnnounce: (message: string) => void;
};

// The New business unit form (spec §9). It starts with no teams and nobody in it.
export function NewBusinessUnitForm({ inputRef, onAnnounce }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const checked = businessUnitNameSchema.safeParse(name);
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      const result = await createBusinessUnitAction({ name: checked.data });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setName("");
      onAnnounce(`${checked.data} added.`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-[0.8125rem]">
        New business unit
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
          {pending ? "Adding…" : "Add business unit"}
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
