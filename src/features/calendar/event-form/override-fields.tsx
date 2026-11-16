"use client";

import { SegmentedControl } from "@/components/segmented-control";
import type { WorkDay } from "@/domain/availability";
import type { CalendarDate } from "@/domain/dates";
import { formatShort } from "@/domain/format";

type Props = {
  date: CalendarDate;
  patternDay: WorkDay; // what the weekly pattern says, ignoring any day swap
  value: WorkDay | null; // the day swap to save, or null for none
  onChange: (value: WorkDay | null) => void;
  personName: string | null; // null when it's the viewer's own day
  disabled: boolean;
};

const WORKING = [
  { value: "FULL", label: "Full day" },
  { value: "AM", label: "Morning (AM)" },
  { value: "PM", label: "Afternoon (PM)" },
];

// A day swap for the clicked date (spec §4.2): "I'm working this day" on a day off, or
// "I'm not working this day" on a working day. An admin sees the person's name instead.
export function OverrideFields({ date, patternDay, value, onChange, personName, disabled }: Props) {
  const usuallyOff = patternDay === "OFF";
  const who = personName ? `${personName} is` : "I'm";
  const label = usuallyOff ? `${who} working this day` : `${who} not working this day`;

  return (
    <fieldset className="flex flex-col gap-2.5 rounded-xl border px-3.5 pt-1 pb-3">
      <legend className="px-1 font-semibold text-[0.8125rem]">
        Availability on {formatShort(date)}
      </legend>
      <label className="flex min-h-6 items-center gap-2.5">
        <input
          type="checkbox"
          checked={value !== null}
          onChange={(event) => {
            if (!event.target.checked) onChange(null);
            else onChange(usuallyOff ? "FULL" : "OFF");
          }}
          disabled={disabled}
          className="size-4 accent-primary-solid"
        />
        {label}
      </label>
      {usuallyOff && value !== null && (
        <SegmentedControl
          label="Working hours"
          options={WORKING}
          value={value}
          // The control hands back a plain string; it's always one of WORKING's values.
          onValueChange={(working) => onChange(working as WorkDay)}
          disabled={disabled}
        />
      )}
    </fieldset>
  );
}
