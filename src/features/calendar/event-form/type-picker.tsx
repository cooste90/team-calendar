"use client";

import { RadioGroup } from "radix-ui";
import { useId } from "react";
import { LabelledLeaveChip } from "@/components/leave-chip";
import { type LeaveType, leaveTypes } from "@/domain/leave-types";

type Props = { value: LeaveType; onChange: (type: LeaveType) => void; disabled: boolean };

// The 9 leave types as cards (design system §7, TypeRadioCard). It's a radio group, so
// Tab reaches the chosen one and the arrow keys move between them (accessibility §4).
export function TypePicker({ value, onChange, disabled }: Props) {
  const labelId = useId();
  return (
    <div>
      <div id={labelId} className="mb-2 font-semibold text-[0.8125rem]">
        Type
      </div>
      <RadioGroup.Root
        aria-labelledby={labelId}
        value={value}
        // Radix hands the value back as a plain string; it's always one of the types.
        onValueChange={(type) => onChange(type as LeaveType)}
        disabled={disabled}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {Object.values(leaveTypes).map((info) => (
          <RadioGroup.Item
            key={info.type}
            value={info.type}
            className="flex h-11 items-center rounded-xl border bg-surface px-2.5 text-left text-[0.8125rem] disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:shadow-[0_0_0_1px_var(--primary)] data-[state=unchecked]:hover:bg-surface-2 forced-colors:data-[state=checked]:outline forced-colors:data-[state=checked]:outline-[Highlight]"
          >
            <LabelledLeaveChip type={info.type} />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
