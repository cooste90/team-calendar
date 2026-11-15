import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type LeaveType, leaveTypes } from "@/domain/leave-types";

const chipClassName =
  "inline-grid h-6 min-w-10 flex-none place-items-center rounded-chip px-1.5 font-bold text-[0.6875rem] tracking-[0.02em] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] forced-colors:border forced-colors:border-[CanvasText]";

// A small coloured badge with the leave code (e.g. "AL"). Colour is never the only
// cue: the code is always visible, screen readers hear the full name, and hovering
// shows it in a tooltip.
export function LeaveChip({ type }: { type: LeaveType }) {
  const info = leaveTypes[type];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(chipClassName, info.className)}>
          <span aria-hidden="true">{info.code}</span>
          <span className="sr-only">{info.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{info.label}</TooltipContent>
    </Tooltip>
  );
}

// The chip with its name written beside it, as in the Key. The name is already on
// screen, so there's no tooltip, and screen readers hear "AL Annual leave" once.
export function LabelledLeaveChip({ type }: { type: LeaveType }) {
  const info = leaveTypes[type];

  return (
    <span className="flex items-center gap-2">
      <span className={cn(chipClassName, info.className)}>{info.code}</span> {info.label}
    </span>
  );
}
