import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PATTERN, DEFAULT_PATTERN_EFFECTIVE_FROM } from "@/domain/availability";
import { periodRange } from "@/domain/dates";
import { deleteBookingAction } from "@/server/actions/delete-booking";
import { restoreBookingAction } from "@/server/actions/restore-booking";
import type { CalendarData } from "@/server/queries/calendar";
import { useCalendarStore } from "../calendar-store";
import { CalendarGrid } from "./calendar-grid";
import { GridTestProviders } from "./grid-test-providers";

// Server actions can't run in a component test.
vi.mock("@/server/actions/set-team-collapsed", () => ({ setTeamCollapsed: vi.fn() }));
vi.mock("@/server/actions/create-booking", () => ({ createBookingAction: vi.fn() }));
vi.mock("@/server/actions/update-booking", () => ({ updateBookingAction: vi.fn() }));
vi.mock("@/server/actions/set-availability-override", () => ({
  setAvailabilityOverrideAction: vi.fn(),
}));
vi.mock("@/server/actions/delete-booking", () => ({ deleteBookingAction: vi.fn() }));
vi.mock("@/server/actions/restore-booking", () => ({ restoreBookingAction: vi.fn() }));
vi.mock("@/server/actions/trim-booking", () => ({ trimBookingAction: vi.fn() }));
vi.mock("@/server/actions/remove-booking-day", () => ({ removeBookingDayAction: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

// Today is Thursday 12 November 2026. Priya (the viewer, a USER) and Tom are in
// Operations; Sam is in Design. Everyone works Monday to Friday.
const TODAY = "2026-11-12";
const patterns = [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN }];
const person = (id: string, firstName: string, surname: string, teamId: string | null) => ({
  id,
  firstName,
  preferredName: null,
  surname,
  teamId,
  patterns,
  overrides: [],
});
const audit = {
  createdBy: "Priya Shah",
  createdAt: "2 Nov 2026, 09:00",
  updatedBy: "Tom Okafor",
  updatedAt: "3 Nov 2026, 10:30",
};
const booking = (id: string, userId: string, startDate: string, endDate: string) => ({
  id,
  userId,
  type: "ANNUAL" as const,
  startDate,
  startHalf: "AM" as const,
  endDate,
  endHalf: "PM" as const,
  publicHolidayId: null,
  audit,
});

const data: CalendarData = {
  businessUnitId: "west",
  range: { from: "2026-11-08", to: "2026-11-21" },
  today: TODAY,
  teams: [
    { id: "ops", name: "Operations", sortOrder: 1 },
    { id: "design", name: "Design", sortOrder: 2 },
  ],
  people: [
    person("priya", "Priya", "Shah", "ops"),
    person("tom", "Tom", "Okafor", "ops"),
    person("sam", "Sam", "Lee", "design"),
  ],
  bookings: [
    // Priya: annual leave Mon 16 – Wed 18 Nov, and working from home on Friday morning.
    { ...booking("p-leave", "priya", "2026-11-16", "2026-11-18"), notes: "Off to Lisbon" },
    { ...booking("p-wfh", "priya", "2026-11-13", "2026-11-13"), type: "WFH", endHalf: "AM" },
    // Tom: sick since Tuesday, until Friday, so it has started.
    { ...booking("t-sick", "tom", "2026-11-10", "2026-11-13"), type: "SICKNESS" },
    // Sam, in another team: annual leave on Friday.
    booking("s-leave", "sam", "2026-11-13", "2026-11-13"),
  ],
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

beforeEach(() => {
  toast.mockClear();
  toast.error.mockClear();
  vi.mocked(deleteBookingAction).mockReset();
  vi.mocked(restoreBookingAction).mockReset();
  useCalendarStore.setState({
    focusedCell: null,
    gridPopover: null,
    eventDialog: null,
    deleteConfirmId: null,
    lastCreatedId: null,
    announcement: "",
  });
});

function renderGrid(anchor = TODAY, gridData = data) {
  const user = userEvent.setup();
  const result = render(
    <GridTestProviders>
      <CalendarGrid data={gridData} view="week" period={periodRange("week", anchor)} />
    </GridTestProviders>,
  );
  return { user, ...result };
}

const cell = (name: RegExp) => screen.getByRole("gridcell", { name });
const bar = (container: HTMLElement, bookingId: string) =>
  container.querySelector(`[data-booking="${bookingId}"]`) as HTMLElement;

// Clicks a bar as if over one day's cell: a real browser finds that cell under the
// pointer, which happy-dom can't, so the test says which cell it is.
async function clickBar(
  user: ReturnType<typeof userEvent.setup>,
  barElement: HTMLElement,
  day: HTMLElement,
) {
  document.elementsFromPoint = () => [barElement, day];
  await user.click(barElement);
}

describe("clicking or pressing Enter on a cell", () => {
  it("opens Add event on an empty day you can book", async () => {
    const { user } = renderGrid();
    await user.click(cell(/^Thursday 12 November, Priya Shah/));

    expect(await screen.findByRole("dialog", { name: "Add event" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Start date" })).toHaveValue("Thu 12 Nov 2026");
  });

  it("doesn't open Add event on a day in the past", async () => {
    const { user } = renderGrid();
    await user.click(cell(/^Wednesday 11 November, Priya Shah/));

    expect(screen.getByRole("dialog", { name: "Wed 11 Nov, Priya Shah" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Add event" })).not.toBeInTheDocument();
  });

  it("opens the cell menu on a day with a booking, offering the free half", async () => {
    const { user } = renderGrid();
    cell(/^Friday 13 November, Priya Shah/).focus();
    await user.keyboard("{Enter}");

    const menu = screen.getByRole("dialog", { name: "Fri 13 Nov, Priya Shah" });
    expect(within(menu).getByText("Working from home")).toBeInTheDocument();
    expect(within(menu).getByText("Fri 13 Nov, morning · 0.5 days")).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "View Working from home" }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "Edit Working from home" }),
    ).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Add to afternoon" })).toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: "Add to morning" })).not.toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "Set availability for this day" }),
    ).toBeInTheDocument();
  });

  it("Add to afternoon opens the form for the afternoon of that day", async () => {
    const { user } = renderGrid();
    await user.click(cell(/^Friday 13 November, Priya Shah/));
    await user.click(screen.getByRole("button", { name: "Add to afternoon" }));

    expect(await screen.findByRole("dialog", { name: "Add event" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Afternoon (PM)" })).toBeChecked();
  });

  it("shows only View on another team's day", async () => {
    const { user } = renderGrid();
    await user.click(cell(/^Friday 13 November, Sam Lee/));

    const menu = screen.getByRole("dialog", { name: "Fri 13 Nov, Sam Lee" });
    expect(within(menu).getByRole("button", { name: "View Annual leave" })).toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: /^Edit/ })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: /^Add to/ })).not.toBeInTheDocument();
  });

  it("an unassigned person can't add anything, even on an empty day", async () => {
    const unassigned = { ...data, viewer: { ...data.viewer, teamId: null } };
    const { user } = renderGrid(TODAY, unassigned);
    await user.click(cell(/^Thursday 12 November, Priya Shah/));

    const menu = screen.getByRole("dialog", { name: "Thu 12 Nov, Priya Shah" });
    expect(within(menu).getByText("Nothing booked.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Add event" })).not.toBeInTheDocument();
  });

  it("Esc closes the menu and puts focus back on the cell", async () => {
    const { user } = renderGrid();
    const friday = cell(/^Friday 13 November, Priya Shah/);
    friday.focus();
    await user.keyboard(" ");
    expect(screen.getByRole("dialog", { name: "Fri 13 Nov, Priya Shah" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(friday).toHaveFocus());
  });
});

describe("a booking's details", () => {
  it("shows its dates, count, notes and history, and View swaps the menu for them", async () => {
    const { user } = renderGrid("2026-11-16");
    await user.click(cell(/^Tuesday 17 November, Priya Shah/));
    await user.click(screen.getByRole("button", { name: "View Annual leave" }));

    const details = screen.getByRole("dialog", { name: "Annual leave, Priya Shah" });
    expect(within(details).getByText("Priya Shah · Mon 16 – Wed 18 · 3 days")).toBeInTheDocument();
    expect(within(details).getByText("Off to Lisbon")).toBeInTheDocument();
    expect(
      within(details).getByText("Created by Priya Shah · 2 Nov 2026, 09:00"),
    ).toBeInTheDocument();
    expect(
      within(details).getByText("Last changed by Tom Okafor · 3 Nov 2026, 10:30"),
    ).toBeInTheDocument();
    // Focus moved into the details.
    expect(details).toContainElement(document.activeElement as HTMLElement);
  });

  it("offers Edit, Delete and Remove this day on your own future booking", async () => {
    const { user, container } = renderGrid("2026-11-16");
    await clickBar(user, bar(container, "p-leave"), cell(/^Tuesday 17 November, Priya Shah/));

    const details = screen.getByRole("dialog", { name: "Annual leave, Priya Shah" });
    const buttons = within(details)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(buttons).toEqual(["Edit", "Delete", "Remove this day (Tue 17 Nov)"]);
  });

  it("offers Delete remaining days on a teammate's booking that has started", async () => {
    const { user, container } = renderGrid();
    await clickBar(user, bar(container, "t-sick"), cell(/^Friday 13 November, Tom Okafor/));

    const details = screen.getByRole("dialog", { name: "Sickness, Tom Okafor" });
    const buttons = within(details)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(buttons).toEqual(["Edit", "Remove this day (Fri 13 Nov)", "Delete remaining days"]);
  });

  it("offers nothing to change on another team's booking", async () => {
    const { user, container } = renderGrid();
    await clickBar(user, bar(container, "s-leave"), cell(/^Friday 13 November, Sam Lee/));

    const details = screen.getByRole("dialog", { name: "Annual leave, Sam Lee" });
    expect(within(details).queryByRole("button")).not.toBeInTheDocument();
  });

  it("has no accessibility violations with the menu or the details open", async () => {
    const { user } = renderGrid();
    await user.click(cell(/^Friday 13 November, Priya Shah/));
    expect((await axe.run(document.body)).violations).toEqual([]);

    await user.click(screen.getByRole("button", { name: "View Working from home" }));
    expect((await axe.run(document.body)).violations).toEqual([]);
  });
});

describe("deleting", () => {
  it("deletes a single day at once, then offers Undo for 8 seconds", async () => {
    const deleted = { booking: data.bookings[1], publicHolidayId: null };
    vi.mocked(deleteBookingAction).mockResolvedValue({ ok: true, data: deleted });
    vi.mocked(restoreBookingAction).mockResolvedValue({ ok: true, data: { id: "p-wfh-2" } });
    const { user, container } = renderGrid();
    await clickBar(user, bar(container, "p-wfh"), cell(/^Friday 13 November, Priya Shah/));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteBookingAction).toHaveBeenCalledWith({ id: "p-wfh" });
    expect(useCalendarStore.getState().announcement).toBe("Booking deleted. Undo available.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const [message, options] = toast.mock.calls[0];
    expect(message).toBe("Booking deleted");
    expect(options.duration).toBe(8000);

    // Undo sends the deleted booking back, and it grows into place again.
    await act(() => options.action.onClick());
    expect(restoreBookingAction).toHaveBeenCalledWith(deleted);
    expect(useCalendarStore.getState().lastCreatedId).toBe("p-wfh-2");
  });

  it("shows the server's message when a delete fails", async () => {
    vi.mocked(deleteBookingAction).mockResolvedValue({
      ok: false,
      error: { code: "PAST_LOCKED", message: "Past bookings can't be deleted." },
    });
    const { user, container } = renderGrid();
    await clickBar(user, bar(container, "p-wfh"), cell(/^Friday 13 November, Priya Shah/));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(toast.error).toHaveBeenCalledWith("Past bookings can't be deleted.");
    expect(toast).not.toHaveBeenCalled();
  });

  it("asks first for a booking over several days; Delete on the keyboard does the same", async () => {
    const deleted = { booking: data.bookings[0], publicHolidayId: null };
    vi.mocked(deleteBookingAction).mockResolvedValue({ ok: true, data: deleted });
    const { user } = renderGrid("2026-11-16");
    const tuesday = cell(/^Tuesday 17 November, Priya Shah/);
    tuesday.focus();
    await user.keyboard("{Delete}");

    const confirm = screen.getByRole("alertdialog", {
      name: "Delete Annual leave, Mon 16 – Wed 18 Nov (3 days)?",
    });
    // Just the dialog: happy-dom misreads the page that a modal hides (the e2e test checks
    // the whole page in a real browser).
    expect((await axe.run(confirm)).violations).toEqual([]);
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(deleteBookingAction).toHaveBeenCalledWith({ id: "p-leave" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await waitFor(() => expect(tuesday).toHaveFocus());
  });

  it("Delete does nothing on a day whose only booking can't be deleted", async () => {
    const { user } = renderGrid();
    cell(/^Friday 13 November, Tom Okafor/).focus();
    await user.keyboard("{Delete}");

    expect(deleteBookingAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("the grow animation", () => {
  it("a new booking's bar grows once, then the class comes off", () => {
    useCalendarStore.setState({ lastCreatedId: "p-wfh" });
    const { container } = renderGrid();
    const wfh = bar(container, "p-wfh");
    expect(wfh).toHaveClass("animate-grow");
    expect(bar(container, "s-leave")).not.toHaveClass("animate-grow");

    fireEvent.animationEnd(wfh);
    expect(wfh).not.toHaveClass("animate-grow");
    expect(useCalendarStore.getState().lastCreatedId).toBeNull();
  });
});
