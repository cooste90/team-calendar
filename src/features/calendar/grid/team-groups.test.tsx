import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_PATTERN, DEFAULT_PATTERN_EFFECTIVE_FROM } from "@/domain/availability";
import { periodRange } from "@/domain/dates";
import type { ActionResult } from "@/server/authed-action";
import type { CalendarData } from "@/server/queries/calendar";
import { CalendarGrid } from "./calendar-grid";

const setTeamCollapsed = vi.hoisted(() =>
  vi.fn(async (): Promise<ActionResult<undefined>> => ({ ok: true, data: undefined })),
);
vi.mock("@/server/actions/set-team-collapsed", () => ({ setTeamCollapsed }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("view=week&bu=west"),
}));

beforeEach(() => {
  setTeamCollapsed.mockClear();
  toast.error.mockClear();
});

const patterns = [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN }];

function person(id: string, firstName: string, surname: string, teamId: string | null) {
  return { id, firstName, preferredName: null, surname, teamId, patterns, overrides: [] };
}

// West has Operations (Priya, Ben), an empty Estates team, and Owen, who is Unassigned.
// The viewer is Priya, a regular user, unless a test says otherwise.
const data: CalendarData = {
  businessUnitId: "west",
  range: { from: "2026-11-08", to: "2026-11-14" },
  today: "2026-11-12",
  teams: [
    { id: "ops", name: "Operations", sortOrder: 1 },
    { id: "estates", name: "Estates", sortOrder: 2 },
  ],
  people: [
    person("priya", "Priya", "Shah", "ops"),
    person("ben", "Ben", "Carter", "ops"),
    person("owen", "Owen", "Hughes", null),
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

const admin: CalendarData["viewer"] = {
  id: "ben",
  role: "ADMIN",
  businessUnitId: "west",
  teamId: "ops",
  canSeeUnassigned: true,
};

function grid(gridData: CalendarData) {
  return (
    <TooltipProvider>
      <CalendarGrid
        data={gridData}
        view="week"
        period={periodRange("week", "2026-11-12")}
        filters={{ teamIds: [], personIds: [] }}
      />
    </TooltipProvider>
  );
}

function renderGrid(gridData: CalendarData = data) {
  return render(grid(gridData));
}

describe("team groups", () => {
  it("collapsing a team hides its people at once while it saves", async () => {
    let finishSaving = () => {};
    setTeamCollapsed.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSaving = () => resolve({ ok: true, data: undefined });
      }),
    );
    renderGrid();
    const button = screen.getByRole("button", { name: "Operations, 2 people, your team" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("rowheader", { name: "Priya Shah You" })).toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("rowheader", { name: /Priya Shah/ })).not.toBeInTheDocument();
    expect(setTeamCollapsed).toHaveBeenCalledWith({ groupId: "ops", collapsed: true });

    // Let the save finish, so React isn't left waiting on it in the next test.
    await act(async () => finishSaving());
  });

  it("once saved, the refreshed page keeps it collapsed", async () => {
    const { rerender } = renderGrid();
    const button = screen.getByRole("button", { name: /^Operations/ });
    fireEvent.click(button);
    await waitFor(() => expect(setTeamCollapsed).toHaveBeenCalled());

    // What refresh() brings back from the server after the save.
    rerender(grid({ ...data, collapsedTeamIds: ["ops"] }));

    await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "false"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("a team springs back, with a message, if saving fails", async () => {
    setTeamCollapsed.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Something went wrong. Please try again." },
    });
    renderGrid();
    const button = screen.getByRole("button", { name: /^Operations/ });

    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute("aria-expanded", "true"));
    expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });

  it("a team collapsed on the server starts collapsed", () => {
    renderGrid({ ...data, collapsedTeamIds: ["ops"] });
    const button = screen.getByRole("button", { name: /^Operations/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("rowheader")).toHaveLength(0);
  });

  it("each collapse button controls its own rowgroup", () => {
    renderGrid();
    const button = screen.getByRole("button", { name: /^Estates/ });
    const rowGroup = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(rowGroup).toHaveAttribute("role", "rowgroup");
    expect(rowGroup).toContainElement(button);
  });

  it("an empty team says so when it's expanded", () => {
    renderGrid();
    expect(screen.getByText("No one in this team yet")).toBeInTheDocument();
  });

  it("a regular user doesn't see the Unassigned group, and names aren't links", () => {
    renderGrid();
    expect(screen.queryByRole("button", { name: /^Unassigned/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Owen Hughes")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("an admin sees Unassigned last, and names link to profiles keeping the URL", () => {
    renderGrid({ ...data, viewer: admin });
    const groups = screen.getAllByRole("button", { expanded: true });
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      "Operations, 2 people, your team",
      "Estates, 0 people",
      "Unassigned, 1 person, visible to admins only",
    ]);
    expect(screen.getByRole("link", { name: "Owen Hughes" })).toHaveAttribute(
      "href",
      "/?view=week&bu=west&person=owen",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = renderGrid({ ...data, viewer: admin });
    expect((await axe.run(container)).violations).toEqual([]);
  });
});

describe("a business unit with no teams", () => {
  const noTeams: CalendarData = {
    ...data,
    teams: [],
    people: [person("owen", "Owen", "Hughes", null)],
  };

  it("tells a regular user, and doesn't show an empty grid", () => {
    renderGrid({ ...noTeams, viewer: { ...data.viewer, teamId: null } });
    expect(screen.getByText("This business unit doesn't have any teams yet.")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("gives an admin a link to Admin › Teams, and still shows the Unassigned people", () => {
    renderGrid({ ...noTeams, viewer: admin });
    expect(screen.getByRole("link", { name: "Admin › Teams" })).toHaveAttribute(
      "href",
      "/?view=week&bu=west&admin=teams",
    );
    const grid = screen.getByRole("grid");
    expect(within(grid).getByRole("link", { name: "Owen Hughes" })).toBeInTheDocument();
  });
});
