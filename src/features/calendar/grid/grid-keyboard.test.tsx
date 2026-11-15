import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PATTERN, DEFAULT_PATTERN_EFFECTIVE_FROM } from "@/domain/availability";
import { periodRange } from "@/domain/dates";
import type { CalendarData } from "@/server/queries/calendar";
import { useCalendarStore } from "../calendar-store";
import { CalendarGrid } from "./calendar-grid";
import { GridTestProviders } from "./grid-test-providers";

vi.mock("@/server/actions/set-team-collapsed", () => ({ setTeamCollapsed: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

beforeEach(() => {
  // The store lives as long as the test file, so start each test from scratch.
  useCalendarStore.setState({ focusedCell: null, shortcutsHelpOpen: false, announcement: "" });
});

const patterns = [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN }];

function person(id: string, firstName: string, surname: string, teamId: string) {
  return { id, firstName, preferredName: null, surname, teamId, patterns, overrides: [] };
}

// Rows in screen order: Ben and Priya (Operations, the viewer's team), Cat (Estates),
// Dan (Legal). Week of Sun 8 – Sat 14 November 2026; today is Thursday 12th.
const data: CalendarData = {
  businessUnitId: "west",
  range: { from: "2026-11-08", to: "2026-11-14" },
  today: "2026-11-12",
  teams: [
    { id: "ops", name: "Operations", sortOrder: 1 },
    { id: "estates", name: "Estates", sortOrder: 2 },
    { id: "legal", name: "Legal", sortOrder: 3 },
  ],
  people: [
    person("priya", "Priya", "Shah", "ops"),
    person("ben", "Ben", "Carter", "ops"),
    person("cat", "Cat", "Davies", "estates"),
    person("dan", "Dan", "Evans", "legal"),
  ],
  bookings: [],
  publicHolidays: [],
  viewer: {
    id: "priya",
    role: "USER",
    businessUnitId: "west",
    teamId: "ops",
    canSeeUnassigned: false,
  },
  collapsedTeamIds: [],
};

type Options = {
  gridData?: CalendarData;
  anchor?: string;
  personIds?: string[];
  onUrlUpdate?: (event: { searchParams: URLSearchParams }) => void;
};

function grid({ gridData = data, anchor = "2026-11-12", personIds = [], onUrlUpdate }: Options) {
  return (
    <GridTestProviders onUrlUpdate={onUrlUpdate}>
      <CalendarGrid
        data={gridData}
        view="week"
        period={periodRange("week", anchor)}
        filters={{ teamIds: [], personIds }}
      />
    </GridTestProviders>
  );
}

// A cell by person and date, e.g. cell("Priya Shah", "Thursday 12 November").
function cell(name: string, day: string) {
  return screen.getByRole("gridcell", { name: new RegExp(`^${day}, ${name}`) });
}

describe("the tab stop", () => {
  it("starts on the viewer's row, today, and is the only cell in the Tab order", () => {
    render(grid({}));
    const tabbable = screen.getAllByRole("gridcell").filter((item) => item.tabIndex === 0);
    expect(tabbable).toEqual([cell("Priya Shah", "Thursday 12 November")]);
  });

  it("moves to a cell that's clicked", async () => {
    const user = userEvent.setup();
    render(grid({}));
    await user.click(cell("Dan Evans", "Monday 9 November"));
    expect(cell("Dan Evans", "Monday 9 November")).toHaveAttribute("tabindex", "0");
    expect(cell("Priya Shah", "Thursday 12 November")).toHaveAttribute("tabindex", "-1");
  });
});

describe("keys", () => {
  it.each([
    ["→ moves to the next day", ["{ArrowRight}"], "Priya Shah", "Friday 13 November"],
    ["← moves to the previous day", ["{ArrowLeft}"], "Priya Shah", "Wednesday 11 November"],
    ["↑ moves to the previous person", ["{ArrowUp}"], "Ben Carter", "Thursday 12 November"],
    ["↓ crosses into the next team", ["{ArrowDown}"], "Cat Davies", "Thursday 12 November"],
    ["Home goes to the first day", ["{Home}"], "Priya Shah", "Sunday 8 November"],
    ["End goes to the last day", ["{End}"], "Priya Shah", "Saturday 14 November"],
    [
      "Ctrl+Home goes to the first cell",
      ["{Control>}{Home}{/Control}"],
      "Ben Carter",
      "Sunday 8 November",
    ],
    [
      "Ctrl+End goes to the last cell",
      ["{Control>}{End}{/Control}"],
      "Dan Evans",
      "Saturday 14 November",
    ],
    ["arrows stop at the edge", ["{End}", "{ArrowRight}"], "Priya Shah", "Saturday 14 November"],
  ])("%s", async (_rule, keys, name, day) => {
    const user = userEvent.setup();
    render(grid({}));
    cell("Priya Shah", "Thursday 12 November").focus();
    for (const key of keys) await user.keyboard(key);
    expect(cell(name, day)).toHaveFocus();
  });

  it("↓ skips the people in a collapsed team", async () => {
    const user = userEvent.setup();
    render(grid({ gridData: { ...data, collapsedTeamIds: ["estates"] } }));
    cell("Priya Shah", "Thursday 12 November").focus();
    await user.keyboard("{ArrowDown}");
    expect(cell("Dan Evans", "Thursday 12 November")).toHaveFocus();
  });

  it("↓ only visits the people a filter shows", async () => {
    const user = userEvent.setup();
    render(grid({ personIds: ["ben", "dan"] }));
    cell("Ben Carter", "Thursday 12 November").focus();
    await user.keyboard("{ArrowDown}");
    expect(cell("Dan Evans", "Thursday 12 November")).toHaveFocus();
  });

  it("Tab leaves the cell for the next team's button", async () => {
    const user = userEvent.setup();
    render(grid({}));
    cell("Priya Shah", "Thursday 12 November").focus();
    await user.tab();
    expect(screen.getByRole("button", { name: /^Estates/ })).toHaveFocus();
  });

  it("? opens the keyboard shortcuts", async () => {
    const user = userEvent.setup();
    render(grid({}));
    cell("Priya Shah", "Thursday 12 November").focus();
    await user.keyboard("?");
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });
});

describe("Page Down", () => {
  it("asks for the next week, then focuses the same person and weekday and says the week", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    const { rerender } = render(grid({ onUrlUpdate }));
    cell("Ben Carter", "Tuesday 10 November").focus();

    await user.keyboard("{PageDown}");
    expect(onUrlUpdate.mock.calls[0][0].searchParams.get("date")).toBe("2026-11-15");

    // The page renders again with the next week.
    rerender(grid({ onUrlUpdate, anchor: "2026-11-15" }));
    expect(cell("Ben Carter", "Tuesday 17 November")).toHaveFocus();
    expect(useCalendarStore.getState().announcement).toBe("Week of 15 to 21 November 2026");
  });
});

describe("focus isn't lost", () => {
  it("when a filter hides the focused person, focus goes to the viewer on the same day", () => {
    const { rerender } = render(grid({}));
    cell("Dan Evans", "Monday 9 November").focus();

    rerender(grid({ personIds: ["priya", "ben"] }));

    expect(cell("Priya Shah", "Monday 9 November")).toHaveFocus();
  });

  it("but focus that has moved on to something still there stays put", () => {
    const { rerender } = render(grid({}));
    cell("Dan Evans", "Monday 9 November").focus();
    screen.getByRole("button", { name: /^Operations/ }).focus();

    rerender(grid({ personIds: ["priya", "ben"] }));

    expect(screen.getByRole("button", { name: /^Operations/ })).toHaveFocus();
  });
});

describe("for an admin", () => {
  const admin = { ...data.viewer, role: "ADMIN" as const, canSeeUnassigned: true };

  it("← from the first day reaches the name link, and ↓ moves between names", async () => {
    const user = userEvent.setup();
    render(grid({ gridData: { ...data, viewer: admin } }));
    cell("Priya Shah", "Thursday 12 November").focus();

    await user.keyboard("{Home}{ArrowLeft}");
    expect(screen.getByRole("link", { name: "Priya Shah" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "Cat Davies" })).toHaveFocus();
  });

  it("names aren't in the Tab order, so Tab doesn't stop on every name", () => {
    render(grid({ gridData: { ...data, viewer: admin } }));
    const tabbable = screen.getAllByRole("link").filter((link) => link.tabIndex === 0);
    expect(tabbable).toHaveLength(0); // the one tab stop starts on a day cell
  });
});

it("has no accessibility violations", async () => {
  const { container } = render(grid({}));
  expect((await axe.run(container)).violations).toEqual([]);
});
