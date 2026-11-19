import { ChevronDownIcon } from "lucide-react";
import { LabelledLeaveChip } from "@/components/leave-chip";
import {
  formatBookings,
  formatCount,
  formatDateWindow,
  formatRangeWithMonth,
} from "@/domain/format";
import { leaveTypes } from "@/domain/leave-types";
import { rangeOf } from "@/domain/slots";
import type { Tally, TallyWithBookings } from "@/domain/tallies";

// The Leave history tab (spec §7): the days taken of each counted type, then the past
// bookings behind each number. Every number comes from leaveSummary; nothing is counted here.
export function HistoryTab({ history }: { history: TallyWithBookings[] }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <dl className="grid gap-2.5 sm:grid-cols-2">
          {history.map((tally) => (
            <div key={tally.type} className="flex flex-col gap-0.5 rounded-xl border px-3.5 py-3">
              <dt className="font-semibold text-[0.8125rem]">{tallyTitle(tally)}</dt>
              <dd className="font-[650] text-base tabular-nums">{tallyNumbers(tally)}</dd>
              <dd className="text-muted-foreground text-xs tabular-nums">
                {formatDateWindow(tally.window)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">
          Flexi, sickness, other and working-from-home aren't tallied.
        </p>
      </section>

      {/* <details> opens and closes by itself, with no script; closed at first so the
          numbers above stay in view. */}
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold text-[0.8125rem]">Past bookings</h3>
        {history.map((tally) => (
          <details key={tally.type} className="group rounded-xl border">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
              <LabelledLeaveChip type={tally.type} />
              <span className="ml-auto text-muted-foreground tabular-nums">
                {formatBookings(tally.bookings.length)}
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            {tally.bookings.length === 0 ? (
              <p className="border-t px-3.5 py-2.5 text-muted-foreground">
                Nothing taken in this period.
              </p>
            ) : (
              <ul className="divide-y border-t">
                {tally.bookings.map(({ booking, days }) => (
                  <li key={booking.id} className="px-3.5 py-2">
                    <p className="tabular-nums">{formatRangeWithMonth(rangeOf(booking), days)}</p>
                    {booking.notes && (
                      <p className="truncate text-muted-foreground">{booking.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}

// "Annual leave · 2026" or "Special leave · last 12 months"
function tallyTitle(tally: Tally) {
  const info = leaveTypes[tally.type];
  if (info.tallyWindow === "calendarYear") {
    return `${info.label} · ${tally.window.from.slice(0, 4)}`;
  }
  return `${info.label} · last 12 months`;
}

// "12.5 days taken · 6 days booked" for annual leave and public holidays, "2 days" for
// the others.
function tallyNumbers(tally: Tally) {
  if (tally.booked === undefined) return formatCount(tally.taken);
  return `${formatCount(tally.taken)} taken · ${formatCount(tally.booked)} booked`;
}
