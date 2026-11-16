"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Option = { value: string; label: string };

// A row of buttons where exactly one is selected, e.g. Week | Month.
// `label` names the group for screen readers.
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      disabled={disabled}
      // Radix lets you click the selected item to clear it. Ignore that so one is always selected.
      onValueChange={(newValue) => {
        if (newValue) onValueChange(newValue);
      }}
      className="gap-0 rounded-xl border bg-surface-2 p-[3px]"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-7 rounded-[9px] px-3.5 text-muted-foreground hover:bg-transparent data-[state=on]:bg-surface data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_1px_var(--border)] forced-colors:data-[state=on]:outline forced-colors:data-[state=on]:outline-[Highlight]"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
