"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ConflictDetail } from "@/domain/errors";

type Props = {
  conflicts: ConflictDetail[];
  onReplace: () => void;
  onChangeDates: () => void;
  pending: boolean;
};

// Shown when the save clashes with existing bookings (spec §5.5): what's already there,
// and the two ways forward. Focus moves here when it appears (accessibility §4).
export function ConflictAlert({ conflicts, onReplace, onChangeDates, pending }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="flex gap-3 rounded-xl border border-warning-border bg-warning-bg px-3.5 py-3 text-[0.8125rem] text-warning-fg"
    >
      <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-[1.125rem] flex-none" />
      <div>
        <p className="font-[650]">This clashes with an existing booking.</p>
        <ul>
          {conflicts.map((conflict) => (
            <li key={`${conflict.bookingId}-${conflict.startDate}`}>{conflict.message}</li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onReplace} disabled={pending}>
            Replace it
          </Button>
          <Button size="sm" variant="outline" onClick={onChangeDates} disabled={pending}>
            Change dates
          </Button>
        </div>
      </div>
    </div>
  );
}
