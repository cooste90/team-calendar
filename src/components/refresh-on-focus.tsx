"use client";

import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// Put once in the signed-in layout: reloads the page's data when you return to the tab.
export function RefreshOnFocus() {
  useRefreshOnFocus();
  return null;
}
