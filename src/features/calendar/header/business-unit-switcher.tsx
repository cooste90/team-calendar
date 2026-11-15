"use client";

import { NativeSelect } from "@/components/native-select";

type BusinessUnitOption = { slug: string; name: string; hidden: boolean };

// Only shown when there's more than one BU to choose from (spec §2.1).
export function BusinessUnitSwitcher({
  businessUnits,
  value,
  onChange,
}: {
  businessUnits: BusinessUnitOption[];
  value: string;
  onChange: (slug: string) => void;
}) {
  if (businessUnits.length <= 1) {
    return null;
  }
  return (
    <NativeSelect
      aria-label="Business unit"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="font-semibold"
    >
      {businessUnits.map((unit) => (
        <option key={unit.slug} value={unit.slug}>
          {unit.hidden ? `${unit.name} (hidden)` : unit.name}
        </option>
      ))}
    </NativeSelect>
  );
}
