"use client";

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { NOTES_MAX_LENGTH } from "@/domain/events";

type Props = {
  value: string;
  onChange: (notes: string) => void;
  disabled: boolean;
  error?: string;
};

// Optional notes, up to 500 characters. The counter is only read out once 80% of the
// limit is reached, so it doesn't talk over every key press (accessibility §4).
export function NotesField({ value, onChange, disabled, error }: Props) {
  const id = useId();
  const nearLimit = value.length >= NOTES_MAX_LENGTH * 0.8;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-[0.8125rem]">
        Notes <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={NOTES_MAX_LENGTH}
        disabled={disabled}
        placeholder="Anything your team should know"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="min-h-21 resize-y"
      />
      <div className="flex justify-between gap-3 text-muted-foreground text-xs">
        <span id={`${id}-hint`}>Everyone in the business unit can see notes.</span>
        <span aria-hidden="true">
          {value.length} / {NOTES_MAX_LENGTH}
        </span>
        <span aria-live="polite" className="sr-only">
          {nearLimit ? `${NOTES_MAX_LENGTH - value.length} characters left` : ""}
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
