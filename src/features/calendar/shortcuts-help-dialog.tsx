"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarStore } from "./calendar-store";

// Every keyboard shortcut (accessibility §3). The grid keys are handled in
// grid/use-grid-keyboard.ts, the Alt shortcuts in header/use-calendar-shortcuts.ts.
// T25 adds Enter, Space and Delete when cells get actions.
const SECTIONS = [
  {
    title: "In the calendar grid",
    shortcuts: [
      ["← →", "Previous or next day"],
      ["↑ ↓", "Previous or next person"],
      ["Home / End", "First or last day in the row"],
      ["Ctrl+Home / Ctrl+End", "First or last cell in the grid"],
      ["Page Up / Page Down", "Previous or next week or month"],
      ["?", "Show these shortcuts"],
    ],
  },
  {
    title: "Anywhere on the calendar",
    shortcuts: [
      ["Alt+T", "Go to today"],
      ["Alt+W / Alt+M", "Week or month view"],
      ["Alt+[ / Alt+]", "Previous or next week or month"],
    ],
  },
];

export function ShortcutsHelpDialog() {
  const open = useCalendarStore((store) => store.shortcutsHelpOpen);
  const setOpen = useCalendarStore((store) => store.setShortcutsHelpOpen);

  // On close, DialogContent puts focus back where it was (usually a grid cell).
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Tab moves into the grid; the arrow keys move inside it.
          </DialogDescription>
        </DialogHeader>
        {SECTIONS.map((section) => (
          <section key={section.title} className="grid gap-2">
            <h3 className="font-semibold">{section.title}</h3>
            <dl className="grid grid-cols-[11rem_1fr] gap-x-4 gap-y-1.5">
              {section.shortcuts.map(([keys, action]) => (
                <div key={keys} className="contents">
                  <dt>
                    <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                      {keys}
                    </kbd>
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
