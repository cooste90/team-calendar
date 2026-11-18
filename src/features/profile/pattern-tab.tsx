"use client";

import { type FormEvent, useState, useTransition } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import type { WorkDay } from "@/domain/availability";
import { formatWeekdayDayMonth, LONG_DAYS } from "@/domain/format";
import { HATCH } from "@/features/calendar/grid/grid-cell";
import { cancelPendingPatternAction } from "@/server/actions/cancel-pending-pattern";
import { updateWorkingPatternAction } from "@/server/actions/update-working-pattern";
import type { ProfileData } from "@/server/queries/profile";

type Props = { profile: ProfileData; onSaved: (message: string) => void };

const OPTIONS = [
  { value: "FULL", label: "Full day" },
  { value: "AM", label: "Morning" },
  { value: "PM", label: "Afternoon" },
  { value: "OFF", label: "Not working" },
];

// The Working pattern tab (spec §4.1): a row per day. A change starts next Sunday. If one
// is already waiting, the editor shows it, so saving again changes it rather than
// quietly dropping it.
export function PatternTab({ profile, onSaved }: Props) {
  const shown = profile.pendingPattern ?? profile.currentPattern;
  const [draft, setDraft] = useState(shown);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startDate = formatWeekdayDayMonth(profile.nextChangeDate);
  const changed = draft.join() !== shown.join();
  const whose = profile.isViewer ? "Your" : `${profile.name}'s`;

  function setDay(index: number, workDay: WorkDay) {
    setDraft(draft.map((day, i) => (i === index ? workDay : day)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateWorkingPatternAction({ userId: profile.id, pattern: draft });
      if (!result.ok) {
        setProblem(result.error.message);
        return;
      }
      setProblem(null);
      onSaved(`Working pattern saved. It applies from ${startDate}.`);
    });
  }

  function cancelPendingChange() {
    startTransition(async () => {
      const result = await cancelPendingPatternAction({ userId: profile.id });
      if (!result.ok) {
        setProblem(result.error.message);
        return;
      }
      setProblem(null);
      setDraft(profile.currentPattern);
      onSaved("Pending change cancelled.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {profile.pendingPattern && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[0.8125rem]">
          <p>
            {whose} new pattern starts on {startDate}.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={cancelPendingChange}
          >
            Cancel pending change
          </Button>
        </div>
      )}
      {problem && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 px-3 py-2 text-destructive text-sm"
        >
          {problem}
        </p>
      )}
      <div className="flex flex-col divide-y rounded-xl border">
        {draft.map((workDay, index) => (
          <div
            key={LONG_DAYS[index]}
            className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3.5 py-2.5"
          >
            {/* The day name and its preview stay together; on a narrow screen the buttons
                go underneath. */}
            <div className="flex items-center gap-2.5">
              <span className="w-20 font-medium">{LONG_DAYS[index]}</span>
              {/* The day as the grid would show it: a hatched half isn't worked. The
                  radios already say this, so screen readers skip it. */}
              <span
                aria-hidden="true"
                className={["h-7 w-9 rounded-chip border", HATCH[workDay]].join(" ")}
              />
            </div>
            <SegmentedControl
              label={LONG_DAYS[index]}
              options={OPTIONS}
              value={workDay}
              // The control hands back a plain string; it's always one of OPTIONS' values.
              onValueChange={(value) => setDay(index, value as WorkDay)}
              disabled={pending}
            />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={pending || !changed} className="self-end">
        {pending ? "Saving…" : `Save — applies from ${startDate}`}
      </Button>
    </form>
  );
}
