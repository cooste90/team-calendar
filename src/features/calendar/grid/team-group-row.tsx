import type { GridGroup } from "@/domain/grid-model-types";

// The heading row above a team's people. T17 turns the name into a collapse button.
export function TeamGroupRow({ group }: { group: GridGroup }) {
  const people = group.memberCount === 1 ? "1 person" : `${group.memberCount} people`;
  return (
    <div role="row" className="flex min-h-10 items-center border-t bg-surface-2">
      <div
        role="gridcell"
        className="sticky left-0 flex items-center gap-2.5 px-3.5 font-semibold text-[0.8125rem] tracking-[0.01em]"
      >
        <span>{group.name}</span>
        <span className="font-medium text-muted-foreground text-xs">{people}</span>
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
      </div>
    </div>
  );
}
