"use client";

import { useEffect } from "react";

type Shortcuts = {
  today: () => void;
  week: () => void;
  month: () => void;
  previous: () => void;
  next: () => void;
};

// Alt+T today, Alt+W / Alt+M week or month view, Alt+[ and Alt+] previous and next.
// Every shortcut needs Alt, so typing a single character can never set one off. That
// meets WCAG 2.1.4 (character key shortcuts) without a settings screen to turn them off.
export function useCalendarShortcuts(shortcuts: Shortcuts) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      // event.code names the key itself ("KeyT"). event.key won't do: on a Mac, Alt+T
      // types "†".
      switch (event.code) {
        case "KeyT":
          shortcuts.today();
          break;
        case "KeyW":
          shortcuts.week();
          break;
        case "KeyM":
          shortcuts.month();
          break;
        case "BracketLeft":
          shortcuts.previous();
          break;
        case "BracketRight":
          shortcuts.next();
          break;
        default:
          return;
      }
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
