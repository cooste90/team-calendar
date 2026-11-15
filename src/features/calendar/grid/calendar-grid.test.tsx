import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PATTERN, DEFAULT_PATTERN_EFFECTIVE_FROM } from "@/domain/availability";
import { periodRange, type View } from "@/domain/dates";
import type { CalendarData } from "@/server/queries/calendar";
import { CalendarGrid } from "./calendar-grid";
import { GridTestProviders } from "./grid-test-providers";

// The grid saves team collapses with a server action, which can't run in a component
// test. (team-groups.test.tsx tests collapsing.)
vi.mock("@/server/actions/set-team-collapsed", () => ({ setTeamCollapsed: vi.fn() }));

// One team: Priya (the viewer) and Tom, who doesn't work on Wednesdays. Today is
// Thursday 12 November 2026, and Wednesday 11th is a public holiday.
const standard = [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN }];
const noWednesdays = [
  {
    effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM,
    pattern: ["OFF", "FULL", "FULL", "OFF", "FULL", "FULL", "OFF"] as typeof DEFAULT_PATTERN,
  },
];
const booking = {
  publicHolidayId: null,
  startHalf: "AM",
  endHalf: "PM",
} as const;

const data: CalendarData = {
  businessUnitId: "west",
  range: { from: "2026-11-08", to: "2026-11-14" },
  today: "2026-11-12",
  teams: [{ id: "ops", name: "Operations", sortOrder: 1 }],
  people: [
    {
      id: "priya",
      firstName: "Priya",
      preferredName: null,
      surname: "Shah",
      teamId: "ops",
      patterns: standard,
      overrides: [],
    },
    {
      id: "tom",
      firstName: "Tom",
      preferredName: null,
      surname: "Okafor",
      teamId: "ops",
      patterns: noWednesdays,
      overrides: [],
    },
  ],
  bookings: [
    // Started last week, so it's clipped at the start of this one.
    {
      ...booking,
      id: "b1",
      userId: "priya",
      type: "ANNUAL",
      startDate: "2026-11-05",
      endDate: "2026-11-09",
    },
    {
      ...booking,
      id: "b2",
      userId: "tom",
      type: "SICKNESS",
      startDate: "2026-11-09",
      endDate: "2026-11-09",
      endHalf: "AM",
    },
    {
      ...booking,
      id: "b3",
      userId: "priya",
      type: "WFH",
      startDate: "2026-11-10",
      startHalf: "PM",
      endDate: "2026-11-10",
    },
  ],
  publicHolidays: [{ id: "ph", date: "2026-11-11", name: "Test Holiday" }],
  viewer: {
    id: "priya",
    role: "USER",
    businessUnitId: "west",
    teamId: "ops",
    canSeeUnassigned: false,
  },
  collapsedTeamIds: [],
};

function renderGrid(view: View, anchor = "2026-11-12", gridData = data) {
  // The app's layouts provide these; the test needs its own.
  return render(
    <GridTestProviders>
      <CalendarGrid data={gridData} view={view} period={periodRange(view, anchor)} />
    </GridTestProviders>,
  );
}

// The bar's first track, from its grid-column ("4 / span 1" → 4).
function firstTrack(element: HTMLElement) {
  return Number(element.style.gridColumn.split("/")[0]);
}

describe("CalendarGrid", () => {
  it("shows a header for each day of the week, Sunday first, with today marked", () => {
    renderGrid("week");
    const days = screen.getAllByRole("columnheader").slice(1); // after "Team / person"

    expect(days).toHaveLength(7);
    expect(days[0]).toHaveAccessibleName("Sunday 8 November");
    expect(days[4]).toHaveAccessibleName("Thursday 12 November, today");
    expect(days[4]).toHaveAttribute("data-today");
  });

  it("shows every day of the month in month view", () => {
    renderGrid("month");
    expect(screen.getAllByRole("columnheader").slice(1)).toHaveLength(30);
  });

  it("puts a morning half bar in an even track and an afternoon one in an odd track", () => {
    renderGrid("week");
    const morning = screen.getByText("SK").closest("[data-half]") as HTMLElement;
    const afternoon = screen.getByText("WFH").closest("[data-half]") as HTMLElement;

    expect(firstTrack(morning) % 2).toBe(0);
    expect(firstTrack(afternoon) % 2).toBe(1);
  });

  it("gives a bar that started before the week a square start", () => {
    renderGrid("week");
    const bar = screen.getByText(/^AL/).parentElement as HTMLElement;
    expect(bar).toHaveAttribute("data-clipped-start");
    expect(bar).toHaveClass("rounded-l-none");
  });

  it("hatches a day the person doesn't work", () => {
    renderGrid("week");
    const tomsWednesday = screen.getByRole("gridcell", {
      name: /^Wednesday 11 November, Tom Okafor/,
    });
    expect(tomsWednesday).toHaveAttribute("data-availability", "OFF");
    expect(tomsWednesday).toHaveClass("bg-hatch");
  });

  it("keeps the hatching on a day off that is also today", () => {
    renderGrid("week", "2026-11-12", { ...data, today: "2026-11-11" });
    const tomsWednesday = screen.getByRole("gridcell", { name: /^Wednesday 11 November, Tom/ });
    expect(tomsWednesday).toHaveAttribute("data-today");
    expect(tomsWednesday).toHaveClass("bg-hatch", "bg-today");
  });

  it("marks today's cells and the viewer's own row", () => {
    renderGrid("week");
    const todayCells = screen
      .getAllByRole("gridcell")
      .filter((cell) => cell.hasAttribute("data-today"));
    expect(todayCells).toHaveLength(2);

    const priyasRow = screen.getByRole("rowheader", { name: /Priya Shah/ }).closest("[role=row]");
    expect(priyasRow).toHaveAttribute("data-viewer");
    expect(within(priyasRow as HTMLElement).getByText("You")).toBeInTheDocument();
  });

  it("shows a public holiday's name in its day header", () => {
    renderGrid("week");
    expect(screen.getByText("Test Holiday")).toBeInTheDocument();
  });

  it("has the grid's roles and no accessibility violations", async () => {
    const { container } = renderGrid("week");
    expect(
      screen.getByRole("grid", { name: "Team calendar, 8 – 14 November 2026" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(0);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});

describe("filters", () => {
  function renderFiltered(searchParams: Record<string, string>) {
    return render(
      <GridTestProviders searchParams={searchParams}>
        <CalendarGrid data={data} view="week" period={periodRange("week", "2026-11-12")} />
      </GridTestProviders>,
    );
  }

  it("shows only the chosen people", () => {
    renderFiltered({ people: "tom" });
    expect(screen.getByText("Tom Okafor")).toBeInTheDocument();
    expect(screen.queryByText("Priya Shah")).not.toBeInTheDocument();
  });

  it("says so when the filters match nobody, and Clear filters shows everyone again", async () => {
    renderFiltered({ teams: "a-team-from-another-bu" });
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByText("No one matches these filters.")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});
