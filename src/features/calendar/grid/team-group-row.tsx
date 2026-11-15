import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import { formatPeople } from "@/domain/format";
import type { GridGroup } from "@/domain/grid-model-types";

type Props = {
  group: GridGroup;
  rowGroupId: string; // the id of the rowgroup this button shows and hides
  onToggle: () => void;
};

// The heading row above a team's people: a button that collapses or expands the team.
// Collapsing is instant; only the chevron turns (design system §6).
export function TeamGroupRow({ group, rowGroupId, onToggle }: Props) {
  const people = formatPeople(group.memberCount);
  // e.g. "Service Design, 6 people, your team" (accessibility §3).
  let label = `${group.name}, ${people}`;
  if (group.isViewerTeam) label += ", your team";
  if (group.isUnassigned) label += ", visible to admins only";

  return (
    <div role="row" className="flex min-h-(--team-row-height) items-center border-t bg-surface-2">
      <div role="gridcell" className="sticky left-0 flex items-center px-1.5">
        <button
          type="button"
          aria-expanded={!group.collapsed}
          aria-controls={rowGroupId}
          aria-label={label}
          onClick={onToggle}
          className="flex items-center gap-2.5 rounded-md px-2 py-1 font-semibold text-[0.8125rem] tracking-[0.01em] hover:bg-surface"
        >
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-150",
              group.collapsed && "-rotate-90",
            )}
          />
          {/* The {" "} spaces don't show in a flex box, but they make the button's text
              "Operations 2 people", not "Operations2 people", so it matches the label
              (WCAG 2.5.3). */}
          <span>{group.name}</span>{" "}
          <span className="font-medium text-muted-foreground text-xs">{people}</span>{" "}
          {group.isViewerTeam && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-[0.6875rem] text-primary">
              Your team
            </span>
          )}
          {group.isUnassigned && (
            <span className="rounded-full bg-today px-2 py-0.5 font-semibold text-[0.6875rem] text-sunset">
              Visible to admins only
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
