"use client";

import { type ReactNode, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FilterOption } from "@/domain/filter-options";
import { formatFilterName } from "@/domain/format";
import { FilterPanel } from "./filter-panel";

type Props = {
  label: string; // "Teams" or "People"
  icon: ReactNode;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

// A header filter (spec §2.4): a button that opens the filter in a popover. Esc closes
// it and puts focus back on the button.
export function FilterBuilder({ label, icon, options, selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={formatFilterName(label, selectedIds.length)}>
          {icon}
          <FilterLabel label={label} count={selectedIds.length} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={label}
        className="w-80 p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <FilterPanel
          label={label}
          options={options}
          selectedIds={selectedIds}
          onChange={onChange}
          onDone={() => setOpen(false)}
          searchRef={searchRef}
        />
      </PopoverContent>
    </Popover>
  );
}

// "Teams", plus a count badge when some are chosen. Give the button or menu item
// aria-label={formatFilterName(label, count)}, so screen readers hear "Teams, 2 selected".
export function FilterLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      {count > 0 && (
        <>
          {/* A real space, so the visible text "Teams 2" matches the name (WCAG 2.5.3). */}{" "}
          <Badge>{count}</Badge>
        </>
      )}
    </>
  );
}
