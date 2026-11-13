// The fixed list of leave types (spec §3) and how each one is shown and counted.
// This is the only place this information lives. Colours are the CSS tokens
// --leave-<code>-bg / --leave-<code>-fg in src/app/globals.css.

// Must match the LeaveType enum in prisma/schema.prisma.
export type LeaveType =
  | "ANNUAL"
  | "FLEXI"
  | "SICKNESS"
  | "SPECIAL"
  | "PARENTAL"
  | "WELLBEING"
  | "OTHER"
  | "WFH"
  | "PUBLIC_HOLIDAY";

// How a type is counted in a person's leave history. null means it isn't counted.
export type TallyWindow = "calendarYear" | "rolling12Months" | null;

export type LeaveTypeInfo = {
  type: LeaveType;
  code: string;
  label: string;
  tallyWindow: TallyWindow;
  // Tailwind classes for the fill and the code text. Written out in full so
  // Tailwind can find them when it scans the source.
  className: string;
};

// In display order (legend, type picker, PDF key).
export const leaveTypes: Record<LeaveType, LeaveTypeInfo> = {
  ANNUAL: {
    type: "ANNUAL",
    code: "AL",
    label: "Annual leave",
    tallyWindow: "calendarYear",
    className: "bg-leave-al text-leave-al-fg",
  },
  FLEXI: {
    type: "FLEXI",
    code: "FL",
    label: "Flexi leave",
    tallyWindow: null,
    className: "bg-leave-fl text-leave-fl-fg",
  },
  SICKNESS: {
    type: "SICKNESS",
    code: "SK",
    label: "Sickness",
    tallyWindow: null,
    className: "bg-leave-sk text-leave-sk-fg",
  },
  SPECIAL: {
    type: "SPECIAL",
    code: "SL",
    label: "Special leave",
    tallyWindow: "rolling12Months",
    className: "bg-leave-sl text-leave-sl-fg",
  },
  PARENTAL: {
    type: "PARENTAL",
    code: "PL",
    label: "Parental leave",
    tallyWindow: "rolling12Months",
    className: "bg-leave-pl text-leave-pl-fg",
  },
  WELLBEING: {
    type: "WELLBEING",
    code: "WBD",
    label: "Wellbeing day",
    tallyWindow: "rolling12Months",
    className: "bg-leave-wbd text-leave-wbd-fg",
  },
  OTHER: {
    type: "OTHER",
    code: "OT",
    label: "Other",
    tallyWindow: null,
    className: "bg-leave-ot text-leave-ot-fg",
  },
  WFH: {
    type: "WFH",
    code: "WFH",
    label: "Working from home",
    tallyWindow: null,
    className: "bg-leave-wfh text-leave-wfh-fg",
  },
  PUBLIC_HOLIDAY: {
    type: "PUBLIC_HOLIDAY",
    code: "PH",
    label: "Public holiday",
    tallyWindow: "rolling12Months",
    className: "bg-leave-ph text-leave-ph-fg",
  },
};
