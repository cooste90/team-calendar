"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { preferredNameSchema } from "@/lib/schemas/profile";
import { updatePreferredNameAction } from "@/server/actions/update-preferred-name";
import type { ProfileData } from "@/server/queries/profile";

type Props = { profile: ProfileData; onSaved: (message: string) => void };

// The Details tab (spec §7): the preferred first name, which they can change, and the
// details from SSO, which they can't.
export function DetailsTab({ profile, onSaved }: Props) {
  const [name, setName] = useState(profile.preferredName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const checked = preferredNameSchema.safeParse(name);
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      const result = await updatePreferredNameAction({ userId: profile.id, preferredName: name });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setError(null);
      onSaved(checked.data ? "Preferred first name saved." : "Preferred first name cleared.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
        <label htmlFor={id} className="font-semibold text-[0.8125rem]">
          Preferred first name <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <div className="flex gap-2">
          <Input
            id={id}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
            className="h-9"
          />
          <Button type="submit" disabled={pending} className="h-9">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          Shown on the calendar instead of {profile.firstName}. Leave it empty to use{" "}
          {profile.firstName}.
        </p>
        {error && (
          <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </form>

      <section aria-labelledby={`${id}-directory`} className="flex flex-col gap-3">
        <div>
          <h3 id={`${id}-directory`} className="font-semibold text-[0.8125rem]">
            From the directory
          </h3>
          <p className="text-muted-foreground text-xs">Managed by your organisation's directory.</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border px-3.5 py-3">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{profile.ssoName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{profile.email}</dd>
          <dt className="text-muted-foreground">Employee number</dt>
          <dd className="font-mono">{profile.employeeNumber}</dd>
        </dl>
      </section>
    </div>
  );
}
