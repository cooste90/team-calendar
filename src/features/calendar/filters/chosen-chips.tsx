import { XIcon } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import type { FilterOption } from "@/domain/filter-options";

type Props = { label: string; chosen: FilterOption[]; onRemove: (id: string) => void };

// The chosen teams or people at the top of a filter, each with a "Remove {name}" button.
export function ChosenChips({ label, chosen, onRemove }: Props) {
  if (chosen.length === 0) return null;
  return (
    <ul aria-label={`Chosen ${label.toLowerCase()}`} className="flex flex-wrap gap-1.5">
      {chosen.map((option) => (
        <li
          key={option.id}
          className="flex items-center gap-0.5 rounded-full bg-surface-2 py-0.5 pr-0.5 pl-2.5 text-xs"
        >
          {option.name}
          <IconButton
            size="icon-xs"
            className="rounded-full"
            label={`Remove ${option.name}`}
            onClick={() => onRemove(option.id)}
          >
            <XIcon aria-hidden="true" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
