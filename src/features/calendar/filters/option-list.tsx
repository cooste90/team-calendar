import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import type { FilterOption } from "@/domain/filter-options";

type Props = {
  id: string;
  label: string;
  options: FilterOption[]; // the ones matching the search
  selectedIds: string[];
  activeId: string | undefined; // the highlighted option
  optionId: (option: FilterOption) => string;
  onPick: (id: string) => void;
};

// The list of choices in a filter: a listbox where several can be ticked
// (aria-multiselectable), grouped under their team in the People filter.
export function OptionList({ id, label, options, selectedIds, activeId, optionId, onPick }: Props) {
  return (
    <div
      role="listbox"
      id={id}
      aria-label={label}
      aria-multiselectable="true"
      className="-mx-1 max-h-64 overflow-y-auto"
    >
      {groupByHeading(options).map((group) => (
        <OptionGroup key={group.heading ?? ""} heading={group.heading}>
          {group.options.map((option) => (
            <OptionRow
              key={option.id}
              id={optionId(option)}
              name={option.name}
              ticked={selectedIds.includes(option.id)}
              active={option.id === activeId}
              onClick={() => onPick(option.id)}
            />
          ))}
        </OptionGroup>
      ))}
      {options.length === 0 && <p className="px-2 py-1.5 text-muted-foreground">No matches</p>}
    </div>
  );
}

type OptionRowProps = {
  id: string;
  name: string;
  ticked: boolean;
  active: boolean;
  onClick: () => void;
};

// Options aren't focusable: focus stays in the search box, which points at the highlighted
// one (aria-activedescendant) and handles the keys. So clicking mustn't take focus either.
function OptionRow({ id, name, ticked, active, onClick }: OptionRowProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: see the comment above
    // biome-ignore lint/a11y/useFocusableInteractive: see the comment above
    <div
      id={id}
      role="option"
      aria-selected={ticked}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5",
        active && "bg-muted",
      )}
    >
      <CheckIcon aria-hidden="true" className={cn("size-4", !ticked && "invisible")} />
      {name}
    </div>
  );
}

// Options in a row share a heading (a team, in the People filter), so it's shown once.
function groupByHeading(options: FilterOption[]) {
  const groups: { heading: string | null; options: FilterOption[] }[] = [];
  for (const option of options) {
    const last = groups.at(-1);
    if (last && last.heading === option.group) {
      last.options.push(option);
    } else {
      groups.push({ heading: option.group, options: [option] });
    }
  }
  return groups;
}

function OptionGroup({ heading, children }: { heading: string | null; children: ReactNode }) {
  const headingId = useId();
  if (heading === null) return children;
  return (
    // A listbox may only hold options and groups of options, so this can't be a fieldset.
    // biome-ignore lint/a11y/useSemanticElements: see the comment above
    <div role="group" aria-labelledby={headingId}>
      <div id={headingId} className="px-2 pt-2 pb-1 font-medium text-muted-foreground text-xs">
        {heading}
      </div>
      {children}
    </div>
  );
}
