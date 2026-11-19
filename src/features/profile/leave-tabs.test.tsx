import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { availabilityLookup } from "@/domain/availability";
import type { Booking } from "@/domain/events";
import type { LeaveType } from "@/domain/leave-types";
import type { HalfDay } from "@/domain/slots";
import { leaveSummary } from "@/domain/tallies";
import { HistoryTab } from "./history-tab";
import { UpcomingTab } from "./upcoming-tab";

// Today is Thursday 19 November 2026. Priya works Mon–Fri (the default pattern). The
// numbers come from the real leaveSummary, so these tests prove the tabs show exactly
// what the domain worked out.
const TODAY = "2026-11-19";
const standardWeek = availabilityLookup([], []);

let nextId = 1;
function booking(
  type: LeaveType,
  start: [string, HalfDay],
  end: [string, HalfDay],
  notes?: string,
): Booking {
  return {
    id: `b${nextId++}`,
    userId: "priya",
    type,
    startDate: start[0],
    startHalf: start[1],
    endDate: end[0],
    endHalf: end[1],
    notes,
    publicHolidayId: null,
  };
}

const bookings = [
  // Mon 29 Dec 2025 to Fri 2 Jan 2026: only 1 and 2 January count this year.
  booking("ANNUAL", ["2025-12-29", "AM"], ["2026-01-02", "PM"]),
  booking("ANNUAL", ["2026-03-06", "AM"], ["2026-03-06", "AM"], "Dentist"), // a morning
  // Mon 21 Dec to Fri 1 Jan: 9 working days are left this year; 1 January is next year's.
  booking("ANNUAL", ["2026-12-21", "AM"], ["2027-01-01", "PM"]),
  // Wed 19 and Thu 20 Nov 2025. The rolling window starts on the Thursday, so only it counts.
  booking("SPECIAL", ["2025-11-19", "AM"], ["2025-11-20", "PM"]),
  booking("SPECIAL", ["2025-11-18", "AM"], ["2025-11-18", "PM"]), // the day before: left out
  booking("WELLBEING", ["2026-11-19", "PM"], ["2026-11-19", "PM"]), // this afternoon
  // Public holidays count from 1 January, so last Christmas is left out.
  booking("PUBLIC_HOLIDAY", ["2025-12-25", "AM"], ["2025-12-25", "PM"]),
  booking("PUBLIC_HOLIDAY", ["2026-08-31", "AM"], ["2026-08-31", "PM"]),
  booking("PUBLIC_HOLIDAY", ["2026-12-25", "AM"], ["2026-12-25", "PM"]), // still to come
  booking("SICKNESS", ["2026-11-16", "AM"], ["2026-11-20", "PM"], "Flu"), // not tallied
];

function renderHistory(list: Booking[]) {
  return render(<HistoryTab history={leaveSummary(list, standardWeek, TODAY).history} />);
}

function renderUpcoming(list: Booking[]) {
  return render(<UpcomingTab upcoming={leaveSummary(list, standardWeek, TODAY).upcoming} />);
}

// The words in a tally card after its title: the numbers, then the window's dates.
function card(title: string) {
  const term = screen.getByText(title);
  const definitions = within(term.parentElement as HTMLElement).getAllByRole("definition");
  return definitions.map((definition) => definition.textContent);
}

function bookingLines(typeLabel: string) {
  const section = screen.getByText(typeLabel).closest("details") as HTMLElement;
  return within(section)
    .queryAllByRole("listitem")
    .map((item) => item.textContent);
}

describe("the Leave history tab", () => {
  it.each([
    ["Annual leave · 2026", "2.5 days taken · 9 days booked", "1 Jan – 31 Dec 2026"],
    ["Special leave · last 12 months", "1 day", "20 Nov 2025 – 19 Nov 2026"],
    ["Parental leave · last 12 months", "0 days", "20 Nov 2025 – 19 Nov 2026"],
    ["Wellbeing day · last 12 months", "0.5 days", "20 Nov 2025 – 19 Nov 2026"],
    ["Public holiday · 2026", "1 day taken · 1 day booked", "1 Jan – 31 Dec 2026"],
  ])("the %s card says %s, for %s", (title, numbers, window) => {
    renderHistory(bookings);
    expect(card(title)).toEqual([numbers, window]);
  });

  it("says which types aren't tallied", () => {
    renderHistory(bookings);
    expect(
      screen.getByText("Flexi, sickness, other and working-from-home aren't tallied."),
    ).toBeInTheDocument();
  });

  it("lists the past bookings behind each number, newest first, with their days and notes", () => {
    renderHistory(bookings);
    expect(bookingLines("Annual leave")).toEqual([
      "Fri 6 Mar, morning · 0.5 daysDentist",
      "Mon 29 Dec – Fri 2 Jan · 5 days",
    ]);
    expect(bookingLines("Special leave")).toEqual(["Wed 19 – Thu 20 Nov · 2 days"]);
    expect(bookingLines("Public holiday")).toEqual(["Mon 31 Aug · 1 day"]);
  });

  it("a type with nothing taken says so", () => {
    renderHistory(bookings);
    const parental = screen.getByText("Parental leave").closest("details") as HTMLElement;
    expect(parental).toHaveTextContent("0 bookings");
    expect(parental).toHaveTextContent("Nothing taken in this period.");
  });

  it("with no bookings at all, every card shows 0 days", () => {
    renderHistory([]);
    expect(card("Annual leave · 2026")).toEqual([
      "0 days taken · 0 days booked",
      "1 Jan – 31 Dec 2026",
    ]);
    expect(screen.getAllByText("Nothing taken in this period.")).toHaveLength(5);
  });
});

describe("the Upcoming leave tab", () => {
  it("lists leave from today on under month headings; leave that has started is marked Ongoing", () => {
    renderUpcoming(bookings);
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "November 2026",
      "December 2026",
    ]);
    const [november, december] = screen.getAllByRole("list");
    const [sickness, wellbeing] = within(november).getAllByRole("listitem");
    expect(sickness).toHaveTextContent("Sickness");
    expect(sickness).toHaveTextContent("Mon 16 – Fri 20 Nov · 5 days");
    expect(sickness).toHaveTextContent("Flu");
    expect(within(sickness).getByText("Ongoing")).toBeInTheDocument();
    expect(wellbeing).toHaveTextContent("Thu 19 Nov, afternoon · 0.5 days");
    expect(within(wellbeing).queryByText("Ongoing")).toBeNull();
    const [annual, christmas] = within(december).getAllByRole("listitem");
    expect(annual).toHaveTextContent("Mon 21 Dec – Fri 1 Jan · 10 days");
    expect(christmas).toHaveTextContent("Fri 25 Dec · 1 day");
  });

  it("is read-only: no buttons, and a hint to use the calendar", () => {
    renderUpcoming(bookings);
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.getByText("To change a booking, use the calendar.")).toBeInTheDocument();
  });

  it("says so when there's nothing coming up", () => {
    renderUpcoming([]);
    expect(screen.getByText("No upcoming leave.")).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  it.each([
    ["Leave history", renderHistory],
    ["Upcoming leave", renderUpcoming],
  ])("the %s tab has no axe violations", async (_name, renderTab) => {
    const { container } = renderTab(bookings);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
