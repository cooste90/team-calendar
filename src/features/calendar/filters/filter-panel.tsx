"use client";

import { type KeyboardEvent, type Ref, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FilterOption } from "@/domain/filter-options";
import { ChosenChips } from "./chosen-chips";
import { OptionList } from "./option-list";

type Props = {
  label: string; // "Teams" or "People"
  options: FilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onDone: () => void;
  // The popover or dialog focuses the search box when it opens. (autoFocus isn't enough
  // in the More menu's dialogs: the closing menu would take focus back.)
  searchRef: Ref<HTMLInputElement>;
};

// What's inside a filter (accessibility §2): the chosen ones as chips, a search box, and
// the list to choose from. The search box is a combobox: typing narrows the list, ↑↓ move
// through it and Enter ticks or unticks. Space types a space, because names have spaces.
export function FilterPanel({ label, options, selectedIds, onChange, onDone, searchRef }: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const listId = useId();
  const optionId = (option: FilterOption) => `${listId}-${option.id}`;

  const selected = options.filter((option) => selectedIds.includes(option.id));
  const search = query.trim().toLocaleLowerCase("en-GB");
  const matching = options.filter((option) =>
    option.name.toLocaleLowerCase("en-GB").includes(search),
  );
  // The highlighted option, or the first match once the search changes.
  const active = matching.find((option) => option.id === activeId) ?? matching[0];

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function moveTo(option: FilterOption | undefined) {
    if (!option) return;
    setActiveId(option.id);
    document.getElementById(optionId(option))?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(event: KeyboardEvent) {
    const index = active ? matching.indexOf(active) : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveTo(matching[index + 1]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(matching[index - 1]);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      toggle(active.id);
    }
  }

  return (
    <div className="grid gap-3">
      <ChosenChips label={label} chosen={selected} onRemove={toggle} />
      <Input
        ref={searchRef}
        type="search"
        role="combobox"
        aria-label={`Search ${label.toLowerCase()}`}
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active ? optionId(active) : undefined}
        placeholder="Search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-9"
      />
      <OptionList
        id={listId}
        label={label}
        options={matching}
        selectedIds={selectedIds}
        activeId={active?.id}
        optionId={optionId}
        onPick={(id) => {
          setActiveId(id);
          toggle(id);
        }}
      />
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => onChange([])}>
          Clear
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
