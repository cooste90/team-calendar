import { LabelledLeaveChip } from "@/components/leave-chip";
import { Badge } from "@/components/ui/badge";
import { formatMonthYear, formatRangeWithMonth } from "@/domain/format";
import { rangeOf } from "@/domain/slots";
import type { UpcomingMonth } from "@/domain/tallies";

// The Upcoming leave tab (spec §7): bookings from today on, under month headings. It's
// read-only on purpose: bookings are changed on the calendar, where clashes are visible.
export function UpcomingTab({ upcoming }: { upcoming: UpcomingMonth[] }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-xs">To change a booking, use the calendar.</p>
      {upcoming.length === 0 && <p className="text-muted-foreground">No upcoming leave.</p>}
      {upcoming.map(({ month, bookings }) => (
        <section key={month} className="flex flex-col gap-2">
          <h3 className="font-semibold text-[0.8125rem]">{formatMonthYear(month)}</h3>
          <ul className="divide-y rounded-xl border">
            {bookings.map(({ booking, days, ongoing }) => (
              <li key={booking.id} className="flex flex-col gap-1 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <LabelledLeaveChip type={booking.type} />
                  {ongoing && <Badge variant="secondary">Ongoing</Badge>}
                </div>
                <p className="tabular-nums">{formatRangeWithMonth(rangeOf(booking), days)}</p>
                {booking.notes && (
                  <p className="line-clamp-2 text-muted-foreground">{booking.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
