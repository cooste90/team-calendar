import type { GridGroup } from "@/domain/grid-model-types";
import type { CellPosition } from "@/domain/grid-navigation";
import { PersonRow } from "./person-row";
import { TeamGroupRow } from "./team-group-row";

type Props = {
  group: GridGroup;
  template: string;
  compact: boolean;
  canOpenProfiles: boolean;
  tabStop: CellPosition | null;
  onToggle: () => void;
};

// One team: its collapse button row, then its people, or a note when it has none.
export function TeamGroup({ group, template, compact, canOpenProfiles, tabStop, onToggle }: Props) {
  const id = `team-group-${group.id}`;
  const showEmptyNote = !group.collapsed && group.memberCount === 0 && !group.isUnassigned;

  // content-visibility lets the browser skip drawing teams that are off-screen. It then
  // needs their real height (row heights live in globals.css). A guess would let a big
  // team's hidden rows overlap the next team.
  const teamRows = showEmptyNote ? 2 : 1;
  const height = `calc(${teamRows} * var(--team-row-height) + ${group.rows.length} * var(--person-row-height))`;

  return (
    <div
      role="rowgroup"
      id={id}
      style={{ containIntrinsicSize: `auto ${height}` }}
      className="[content-visibility:auto]"
    >
      <TeamGroupRow group={group} rowGroupId={id} onToggle={onToggle} />
      {showEmptyNote && (
        <div
          role="row"
          className="flex min-h-(--team-row-height) items-center border-border-soft border-t"
        >
          <div role="gridcell" className="sticky left-0 px-3.5 text-muted-foreground text-sm">
            No one in this team yet
          </div>
        </div>
      )}
      {group.rows.map((row) => (
        <PersonRow
          key={row.personId}
          row={row}
          template={template}
          compact={compact}
          canOpenProfile={canOpenProfiles}
          tabStopColumn={tabStop?.personId === row.personId ? tabStop.column : null}
        />
      ))}
    </div>
  );
}
