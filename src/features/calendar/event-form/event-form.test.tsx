import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PATTERN,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
  type WeeklyPattern,
} from "@/domain/availability";
import type { ConflictDetail } from "@/domain/errors";
import { createBookingAction } from "@/server/actions/create-booking";
import { setAvailabilityOverrideAction } from "@/server/actions/set-availability-override";
import { updateBookingAction } from "@/server/actions/update-booking";
import type { CalendarData } from "@/server/queries/calendar";
import { type EventDialogTarget, useCalendarStore } from "../calendar-store";
import { EventFormDialog } from "./event-form-dialog";

vi.mock("@/server/actions/create-booking", () => ({ createBookingAction: vi.fn() }));
vi.mock("@/server/actions/update-booking", () => ({ updateBookingAction: vi.fn() }));
vi.mock("@/server/actions/set-availability-override", () => ({
  setAvailabilityOverrideAction: vi.fn(),
}));
vi.mock("@/server/actions/delete-booking", () => ({ deleteBookingAction: vi.fn() }));
vi.mock("@/server/actions/restore-booking", () => ({ restoreBookingAction: vi.fn() }));
vi.mock("@/server/actions/trim-booking", () => ({ trimBookingAction: vi.fn() }));

beforeEach(() => {
  vi.mocked(createBookingAction)
    .mockReset()
    .mockResolvedValue({ ok: true, data: { id: "new", count: 1 } });
  vi.mocked(updateBookingAction).mockReset().mockResolvedValue({ ok: true, data: undefined });
  vi.mocked(setAvailabilityOverrideAction)
    .mockReset()
    .mockResolvedValue({ ok: true, data: undefined });
});

// Today is Thursday 12 November 2026. Priya (the viewer) works Mon–Fri. Tom, in her
// team, works only Thursdays and Fridays. Wendy works Wednesday mornings only.
const TODAY = "2026-11-12";
const pattern = (days: WeeklyPattern) => [
  { effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: days },
];
const person = (id: string, firstName: string, surname: string, days = DEFAULT_PATTERN) => ({
  id,
  firstName,
  preferredName: null,
  surname,
  teamId: "ops",
  patterns: pattern(days),
  overrides: [],
});

const data: CalendarData = {
  businessUnitId: "west",
  range: { from: "2026-11-08", to: "2026-11-14" },
  today: TODAY,
  teams: [{ id: "ops", name: "Service Design", sortOrder: 1 }],
  people: [
    person("priya", "Priya", "Shah"),
    person("tom", "Tom", "Okafor", ["OFF", "OFF", "OFF", "OFF", "FULL", "FULL", "OFF"]),
    person("wendy", "Wendy", "Ade", ["OFF", "FULL", "FULL", "AM", "FULL", "FULL", "OFF"]),
  ],
  bookings: [
    {
      // Started on Tuesday, so it's ongoing.
      id: "ongoing",
      userId: "priya",
      type: "ANNUAL",
      startDate: "2026-11-10",
      startHalf: "AM",
      endDate: "2026-11-13",
      endHalf: "PM",
      notes: "Back Monday",
      publicHolidayId: null,
      audit: {
        createdBy: "Priya Shah",
        createdAt: "3 Nov 2026, 09:14",
        updatedBy: null,
        updatedAt: "10 Nov 2026, 16:02",
      },
    },
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

const admin = { ...data.viewer, id: "tom-admin", role: "ADMIN" as const };

function open(target: EventDialogTarget, gridData = data) {
  const user = userEvent.setup();
  useCalendarStore.setState({ eventDialog: target });
  const { container } = render(<EventFormDialog data={gridData} />);
  return { user, container, dialog: screen.getByRole("dialog") };
}

const field = (name: string) => screen.getByRole("textbox", { name });
const summary = () => screen.getByRole("status", { name: "Day count" });

// Types a date into a date field and presses Enter, as a keyboard user would.
async function typeDate(user: ReturnType<typeof userEvent.setup>, name: string, text: string) {
  await user.clear(field(name));
  await user.type(field(name), `${text}{Enter}`);
}

describe("a new booking", () => {
  it("is annual leave for the whole clicked day", () => {
    const { dialog } = open({ mode: "create", subjectId: "priya", date: "2026-11-16" });
    expect(within(dialog).getByRole("heading", { name: "Add event" })).toBeInTheDocument();
    expect(screen.getByText("For Priya Shah · Service Design")).toBeInTheDocument();
    expect(field("Start date")).toHaveValue("Mon 16 Nov 2026");
    expect(field("End date")).toHaveValue("Mon 16 Nov 2026");
    expect(screen.getByRole("radio", { name: "AL Annual leave" })).toBeChecked();
    expect(summary()).toHaveTextContent("Mon 16 Nov · 1 day");
  });

  it("moves the end with the start when the start goes past it", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-16" });
    await typeDate(user, "Start date", "18/11/2026");
    expect(field("End date")).toHaveValue("Wed 18 Nov 2026");
  });

  it("asks for Duration on one day, and First day / Last day over several", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-16" });
    expect(screen.getByRole("radiogroup", { name: "Duration" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "First day" })).not.toBeInTheDocument();

    await typeDate(user, "End date", "18 Nov 2026");
    expect(screen.queryByRole("radiogroup", { name: "Duration" })).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "First day" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Last day" })).toBeInTheDocument();
  });

  it.each([
    // The spec's examples (§5.2).
    ["tom", "2026-11-19", "24/11/2026", "Thu 19 – Tue 24 · 2 days", /not working days/],
    [
      "wendy",
      "2026-11-16",
      "20/11/2026",
      "Mon 16 – Fri 20 · 4.5 days",
      /Wed 18 is a morning-only day/,
    ],
  ])("counts %s's working days live: %s to %s → %s", async (subjectId, date, end, expected, hint) => {
    const { user } = open({ mode: "create", subjectId, date }, { ...data, viewer: admin });
    await typeDate(user, "End date", end);
    expect(summary()).toHaveTextContent(expected);
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it("an afternoon first day shows in the summary", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-16" });
    await typeDate(user, "End date", "18/11/2026");
    await user.click(screen.getByRole("radio", { name: "Afternoon only" }));
    expect(summary()).toHaveTextContent("Mon 16 PM – Wed 18 · 2.5 days");
  });
});

describe("the earliest start", () => {
  it.each([
    [
      "a USER can't start before today",
      data.viewer,
      "11/11/2026",
      "The earliest start you can choose is Thu 12 Nov",
    ],
    [
      "an ADMIN can't start more than 7 days back",
      admin,
      "04/11/2026",
      "The earliest start you can choose is Thu 5 Nov",
    ],
  ])("%s", async (_rule, viewer, start, message) => {
    const { user } = open({ mode: "create", subjectId: "priya", date: TODAY }, { ...data, viewer });
    await typeDate(user, "Start date", start);
    await user.click(screen.getByRole("button", { name: "Add event" }));
    expect(field("Start date")).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(createBookingAction).not.toHaveBeenCalled();
  });

  it("an ADMIN can start 7 days back", async () => {
    const { user } = open(
      { mode: "create", subjectId: "priya", date: TODAY },
      { ...data, viewer: admin },
    );
    await typeDate(user, "Start date", "05/11/2026");
    await user.click(screen.getByRole("button", { name: "Add event" }));
    await waitFor(() => expect(createBookingAction).toHaveBeenCalled());
  });
});

describe("editing a booking that has started", () => {
  it("keeps its type and start, says why, and offers Delete remaining days", () => {
    const { dialog } = open({ mode: "edit", bookingId: "ongoing" });
    expect(within(dialog).getByRole("heading", { name: "Edit event" })).toBeInTheDocument();
    expect(
      screen.getByText("Started in the past — only the end date and notes can change."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "AL Annual leave" })).toBeDisabled();
    expect(field("Start date")).toBeDisabled();
    expect(field("End date")).toBeEnabled();
    expect(screen.getByRole("textbox", { name: /Notes/ })).toHaveValue("Back Monday");
    expect(screen.getByRole("button", { name: "Delete remaining days" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByText("Created by Priya Shah · 3 Nov 2026, 09:14")).toBeInTheDocument();
    expect(
      screen.getByText("Last changed by a deleted user · 10 Nov 2026, 16:02"),
    ).toBeInTheDocument();
  });

  it("saves a later end", async () => {
    const { user } = open({ mode: "edit", bookingId: "ongoing" });
    await typeDate(user, "End date", "16/11/2026");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateBookingAction).toHaveBeenCalledWith({
        id: "ongoing",
        booking: expect.objectContaining({ endDate: "2026-11-16", startDate: "2026-11-10" }),
        replace: false,
      }),
    );
  });
});

describe("a clash", () => {
  const clash: ConflictDetail = {
    bookingId: "wfh",
    type: "WFH",
    startDate: "2026-11-13",
    startHalf: "AM",
    endDate: "2026-11-13",
    endHalf: "PM",
    message: "You already have Working from home on Fri 13 Nov (full day).",
  };

  // The first save clashes; a second one (Replace) goes through.
  beforeEach(() => {
    vi.mocked(createBookingAction).mockResolvedValueOnce({
      ok: false,
      error: { code: "CONFLICT", message: "This clashes…", conflicts: [clash] },
    });
  });

  it("shows what's there, keeps the form, and Replace sends it again with replace", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-13" });
    await user.type(screen.getByRole("textbox", { name: /Notes/ }), "Dentist");
    await user.click(screen.getByRole("button", { name: "Add event" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(clash.message);
    expect(alert).toHaveFocus();
    expect(screen.getByRole("textbox", { name: /Notes/ })).toHaveValue("Dentist");

    // The alert and its buttons arrive together, ready to use.
    const replace = screen.getByRole("button", { name: "Replace it" });
    expect(replace).toBeEnabled();
    await user.click(replace);
    await waitFor(() =>
      expect(createBookingAction).toHaveBeenLastCalledWith({
        booking: expect.objectContaining({ notes: "Dentist", startDate: "2026-11-13" }),
        replace: true,
      }),
    );
  });

  it("Change dates puts focus on the start date", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-13" });
    await user.click(screen.getByRole("button", { name: "Add event" }));
    const changeDates = await screen.findByRole("button", { name: "Change dates" });
    await user.click(changeDates);
    expect(field("Start date")).toHaveFocus();
  });
});

describe("day swaps", () => {
  it("on your own day off you can say you're working, and save just that", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-14" }); // Saturday
    await user.click(screen.getByRole("checkbox", { name: "I'm working this day" }));
    const workingHours = screen.getByRole("radiogroup", { name: "Working hours" });
    await user.click(within(workingHours).getByRole("radio", { name: "Morning (AM)" }));
    expect(summary()).toHaveTextContent("Sat 14 Nov · 0.5 days"); // the morning now counts
    await user.click(screen.getByRole("button", { name: "Save availability only" }));

    await waitFor(() =>
      expect(setAvailabilityOverrideAction).toHaveBeenCalledWith({
        userId: "priya",
        date: "2026-11-14",
        value: "AM",
      }),
    );
    expect(createBookingAction).not.toHaveBeenCalled();
  });

  it("an admin sees the person's name, on a working day", () => {
    open({ mode: "create", subjectId: "tom", date: "2026-11-19" }, { ...data, viewer: admin });
    expect(
      screen.getByRole("checkbox", { name: "Tom Okafor is not working this day" }),
    ).toBeInTheDocument();
  });

  it("a teammate can book for you but can't change your working days", () => {
    open({ mode: "create", subjectId: "tom", date: "2026-11-19" });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("aren't offered when editing", () => {
    open({ mode: "edit", bookingId: "ongoing" });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("keyboard and accessibility", () => {
  // In a real browser the arrow also selects the type it lands on (checked in the e2e
  // test); this fake browser doesn't run that part of Radix, so Space selects it here.
  it("the arrow keys move between leave types, and Space chooses one", async () => {
    const { user } = open({ mode: "create", subjectId: "priya", date: "2026-11-16" });
    screen.getByRole("radio", { name: "AL Annual leave" }).focus();
    await user.keyboard("{ArrowRight}");
    const flexi = screen.getByRole("radio", { name: "FL Flexi leave" });
    expect(flexi).toHaveFocus();
    await user.keyboard(" ");
    expect(flexi).toBeChecked();
  });

  it.each([
    ["adding", { mode: "create", subjectId: "priya", date: "2026-11-14" }],
    ["editing", { mode: "edit", bookingId: "ongoing" }],
  ] as const)("has no accessibility violations when %s", async (_what, target) => {
    const { dialog } = open(target);
    expect((await axe.run(dialog)).violations).toEqual([]);
  });
});
