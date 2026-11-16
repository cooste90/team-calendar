"use client";

import { CalendarIcon } from "lucide-react";
import { type Ref, useId, useState } from "react";
import { enGB } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type CalendarDate, fromLocalDate, toLocalDate } from "@/domain/dates";
import { formatDateInput, parseDateText } from "@/domain/format";

type Props = {
  label: string; // "Start date" or "End date"
  value: CalendarDate | null;
  onChange: (date: CalendarDate | null) => void; // null when what's typed isn't a date
  min: CalendarDate; // the earliest date that can be chosen
  isDayOff: (date: CalendarDate) => boolean; // hatched in the calendar
  disabled: boolean;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
};

// A date you can type ("12/11/2026", "12 Nov 2026") or pick from a calendar, so keyboard
// users don't have to use the calendar (accessibility §4).
export function DatePickerField(props: Props) {
  const { label, value, onChange, min, isDayOff, disabled, error, inputRef } = props;
  const id = useId();
  const [open, setOpen] = useState(false);
  // What's being typed, until it's read. Otherwise the box shows the date itself.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? formatDateInput(value) : "");

  // Read what was typed once the person has finished: on leaving the box, or on Enter.
  // Something that isn't a date stays in the box, so it can be corrected.
  function readTypedDate() {
    if (draft === null) return;
    const date = parseDateText(draft);
    onChange(date);
    if (date) setDraft(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-[0.8125rem]">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          value={shown}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={readTypedDate}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault(); // don't submit the form with the old date
            readTypedDate();
          }}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className="h-10 pr-11 font-medium"
        />
        <span id={`${id}-hint`} className="sr-only">
          Type a date like 12/11/2026, or choose one from the calendar.
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={`Choose the ${label.toLowerCase()} from a calendar`}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            >
              <CalendarIcon aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={enGB}
              weekStartsOn={0} // weeks run Sunday to Saturday (spec §2.2)
              selected={value ? toLocalDate(value) : undefined}
              defaultMonth={toLocalDate(value ?? min)}
              onSelect={(day) => {
                if (!day) return;
                setDraft(null);
                onChange(fromLocalDate(day));
                setOpen(false);
              }}
              disabled={{ before: toLocalDate(min) }}
              modifiers={{ dayOff: (day) => isDayOff(fromLocalDate(day)) }}
              modifiersClassNames={{ dayOff: "bg-hatch" }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
