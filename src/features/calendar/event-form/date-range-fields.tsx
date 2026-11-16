"use client";

import { ClockIcon } from "lucide-react";
import type { Ref } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import type { AvailabilityLookup } from "@/domain/availability";
import { countWorkingDays, describeExcludedDays } from "@/domain/counting";
import type { CalendarDate } from "@/domain/dates";
import type { FormDays } from "@/domain/events";
import { formatRangeSummary } from "@/domain/format";
import { DatePickerField } from "./date-picker-field";
import { chosenRange, type FormValues, isOneDay, withStartDate } from "./form-values";

type Props = {
  values: FormValues;
  onChange: (values: FormValues) => void;
  minDate: CalendarDate;
  lookup: AvailabilityLookup; // the person's working days, for hatching and the count
  startLocked: boolean; // a booking that has started keeps its start (spec §5.4)
  disabled: boolean;
  errors: { startDate?: string; endDate?: string };
  startInputRef: Ref<HTMLInputElement>;
};

type Option = { value: string; label: string };

const DURATION = [
  { value: "FULL", label: "Full day" },
  { value: "AM", label: "Morning (AM)" },
  { value: "PM", label: "Afternoon (PM)" },
];
const FIRST_DAY = [
  { value: "FULL", label: "Full day" },
  { value: "PM", label: "Afternoon only" },
];
const LAST_DAY = [
  { value: "FULL", label: "Full day" },
  { value: "AM", label: "Morning only" },
];

// Start and end dates, which halves, and the live day count under them (spec §5.5).
export function DateRangeFields(props: Props) {
  const { values, onChange, minDate, lookup, startLocked, disabled, errors } = props;
  const startDisabled = disabled || startLocked;
  const isDayOff = (date: CalendarDate) => lookup(date) === "OFF";
  // The controls hand back plain strings; each is always one of its own options.
  const setDays = (days: Partial<Record<keyof FormDays, string>>) =>
    onChange({ ...values, days: { ...values.days, ...days } as FormDays });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="grid gap-3 sm:grid-cols-2">
          <DatePickerField
            label="Start date"
            value={values.startDate}
            onChange={(date) => onChange(withStartDate(values, date))}
            min={minDate}
            isDayOff={isDayOff}
            disabled={startDisabled}
            error={errors.startDate}
            inputRef={props.startInputRef}
          />
          <DatePickerField
            label="End date"
            value={values.endDate}
            onChange={(date) => onChange({ ...values, endDate: date })}
            min={values.startDate ?? minDate}
            isDayOff={isDayOff}
            disabled={disabled}
            error={errors.endDate}
          />
        </div>
        <RangeSummary values={values} lookup={lookup} />
      </div>

      {isOneDay(values) ? (
        <HalfDayChoice
          label="Duration"
          options={DURATION}
          value={values.days.duration}
          onChange={(duration) => setDays({ duration })}
          disabled={startDisabled}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <HalfDayChoice
            label="First day"
            options={FIRST_DAY}
            value={values.days.firstDay}
            onChange={(firstDay) => setDays({ firstDay })}
            disabled={startDisabled}
          />
          <HalfDayChoice
            label="Last day"
            options={LAST_DAY}
            value={values.days.lastDay}
            onChange={(lastDay) => setDays({ lastDay })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

type HalfDayChoiceProps = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

// A heading and a segmented control filling the width. The control carries the same
// name for screen readers, so the heading is hidden from them.
function HalfDayChoice({ label, options, value, onChange, disabled }: HalfDayChoiceProps) {
  return (
    <div className="flex flex-col gap-2 [&_[role=radiogroup]]:w-full [&_button]:flex-1">
      <div aria-hidden="true" className="font-semibold text-[0.8125rem]">
        {label}
      </div>
      <SegmentedControl
        label={label}
        options={options}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

// "Thu 12 PM – Tue 17 Nov · 3.5 days", with a note on days that weren't counted. It's an
// <output>, a polite live region, so screen readers hear the new count as dates change.
function RangeSummary({ values, lookup }: { values: FormValues; lookup: AvailabilityLookup }) {
  const range = chosenRange(values);
  return (
    <output
      aria-label="Day count"
      className="mt-2.5 flex min-h-11 items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5 text-[0.8125rem]"
    >
      {range && (
        <>
          <ClockIcon aria-hidden="true" className="size-[1.125rem] flex-none text-primary" />
          <span>
            <span className="block font-[650]">
              {formatRangeSummary(range, countWorkingDays(range, lookup))}
            </span>
            <span className="block text-muted-foreground text-xs">
              {describeExcludedDays(range, lookup)}
            </span>
          </span>
        </>
      )}
    </output>
  );
}
