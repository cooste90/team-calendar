"use client";

import { InfoIcon, XIcon } from "lucide-react";
import { startTransition, useOptimistic } from "react";
import { IconButton } from "@/components/icon-button";
import { dismissUnassignedBanner } from "@/server/actions/dismiss-unassigned-banner";

// Shown above the grid to someone who isn't in a team yet, so can't book (spec §1.4).
export function UnassignedBanner() {
  // Hidden at once on Dismiss. Once the cookie is saved, the page stops rendering it.
  const [hidden, hideOptimistically] = useOptimistic(false);
  if (hidden) return null;

  function dismiss() {
    startTransition(async () => {
      hideOptimistically(true);
      await dismissUnassignedBanner();
    });
  }

  return (
    <div className="mx-5 mb-3 flex items-center gap-3 rounded-xl bg-primary-soft py-2 pr-2 pl-3.5 text-sm">
      <InfoIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <p className="flex-1">An admin needs to add you to a team before you can book.</p>
      <IconButton size="icon-sm" label="Dismiss" onClick={dismiss}>
        <XIcon aria-hidden="true" />
      </IconButton>
    </div>
  );
}
