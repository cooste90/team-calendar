import { LabelledLeaveChip } from "@/components/leave-chip";
import { Button } from "@/components/ui/button";
import { leaveTypes } from "@/domain/leave-types";
import { HATCH } from "../grid/grid-cell";

// What the Key shows (spec §2.1, §3): the leave types, the hatching for days off and how
// half days are drawn. The header popover and the narrow header's dialog both use it.
export function KeyContent({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.8125rem]">
        {Object.values(leaveTypes).map((info) => (
          <li key={info.type}>
            <LabelledLeaveChip type={info.type} />
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2.5 text-muted-foreground text-xs">
        <span
          aria-hidden="true"
          className={`h-6 w-10 flex-none rounded-chip bg-surface-2 forced-colors:border ${HATCH.OFF}`}
        />
        Not a working day
      </p>
      <p className="text-muted-foreground text-xs">
        Half days: morning on the left, afternoon on the right
      </p>
      <Button
        variant="link"
        className="self-start justify-self-start px-0"
        onClick={onShowShortcuts}
      >
        Keyboard shortcuts
      </Button>
    </>
  );
}
