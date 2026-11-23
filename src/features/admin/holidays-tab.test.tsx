import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/permissions";
import type { PublicHoliday } from "@/domain/public-holidays";
import { NavigationTransitionProvider } from "@/features/calendar/header/navigation-transition";
import { previewPublicHolidayChangeAction } from "@/server/actions/preview-public-holiday-change";
import { savePublicHolidayChangeAction } from "@/server/actions/save-public-holiday-change";
import { AdminDialog } from "./admin-dialog";

vi.mock("@/server/actions/preview-public-holiday-change", () => ({
  previewPublicHolidayChangeAction: vi.fn(),
}));
vi.mock("@/server/actions/save-public-holiday-change", () => ({
  savePublicHolidayChangeAction: vi.fn(),
}));

// Today is Monday 23 November 2026.
const TODAY = "2026-11-23";
const west = { id: "west", slug: "west-operations", name: "West Operations", hidden: false };
const tom: Actor = { id: "tom", role: "ADMIN", businessUnitId: "west", teamId: "finance" };

const holidays: PublicHoliday[] = [
  { id: "may-2025", name: "Early May bank holiday", date: "2025-05-05" },
  { id: "easter-2026", name: "Easter Monday", date: "2026-04-06" },
  { id: "christmas", name: "Christmas Day", date: "2026-12-25" },
  { id: "boxing", name: "Boxing Day", date: "2026-12-28" },
];

const impact = { people: 214, bookingsReplaced: 37 };

beforeEach(() => {
  vi.mocked(previewPublicHolidayChangeAction)
    .mockReset()
    .mockResolvedValue({ ok: true, data: impact });
  vi.mocked(savePublicHolidayChangeAction)
    .mockReset()
    .mockResolvedValue({ ok: true, data: impact });
});

function open() {
  const events = userEvent.setup();
  render(
    <NuqsTestingAdapter searchParams={{ admin: "holidays" }}>
      <NavigationTransitionProvider>
        <AdminDialog
          viewer={tom}
          businessUnit={west}
          businessUnits={[west]}
          teams={{ teams: [], unassignedCount: 0 }}
          users={[]}
          holidays={holidays}
          today={TODAY}
        />
      </NavigationTransitionProvider>
    </NuqsTestingAdapter>,
  );
  const dialog = screen.getByRole("dialog", { name: "Admin · West Operations" });
  return { events, dialog };
}

type Events = ReturnType<typeof userEvent.setup>;

async function typeName(events: Events, text: string) {
  const box = screen.getByRole("textbox", { name: "Name" });
  await events.clear(box);
  await events.type(box, text);
}

// Enter makes the date box read what was typed, as a keyboard user would.
async function typeDate(events: Events, text: string) {
  const box = screen.getByRole("textbox", { name: "Date" });
  await events.clear(box);
  await events.type(box, `${text}{Enter}`);
}

describe("the Public holidays tab", () => {
  it("lists upcoming holidays with Edit and Delete", () => {
    open();
    const upcoming = screen.getByRole("region", { name: "Upcoming" });
    const rows = within(upcoming).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Christmas DayFriday 25 December 2026",
      "Boxing DayMonday 28 December 2026",
    ]);
    expect(within(upcoming).getByRole("button", { name: "Edit Christmas Day" })).toBeVisible();
    expect(within(upcoming).getByRole("button", { name: "Delete Boxing Day" })).toBeVisible();
  });

  it("keeps past holidays folded away, newest year first, with nothing to change", async () => {
    const { events } = open();
    const summary = screen.getByText("Past public holidays (2)");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await events.click(summary);
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "2026",
      "2025",
    ]);
    expect(screen.queryByRole("button", { name: "Edit Easter Monday" })).toBeNull();
  });
});

describe("adding a public holiday", () => {
  it("shows the impact first, and only saves on confirm", async () => {
    const { events, dialog } = open();
    await events.click(screen.getByRole("button", { name: "Add public holiday" }));
    await typeName(events, "Founders' Day");
    await typeDate(events, "19/01/2027");
    await events.click(screen.getByRole("button", { name: "Continue" }));

    const add = screen.getByRole("dialog", { name: "Add public holiday" });
    expect(previewPublicHolidayChangeAction).toHaveBeenCalledWith({
      kind: "create",
      name: "Founders' Day",
      date: "2027-01-19",
    });
    expect(add).toHaveAccessibleDescription(
      "This applies to every business unit: 214 people will get this holiday. 37 existing bookings will be replaced (parental leave is kept).",
    );
    expect(savePublicHolidayChangeAction).not.toHaveBeenCalled();

    await events.click(within(add).getByRole("button", { name: "Add holiday" }));
    expect(savePublicHolidayChangeAction).toHaveBeenCalledWith({
      kind: "create",
      name: "Founders' Day",
      date: "2027-01-19",
    });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Founders' Day added for 214 people.",
    );
  });

  it.each([
    ["no name", "", "19/01/2027", "Enter a name."],
    ["no date", "Founders' Day", "", "Enter a date like 25/12/2026."],
    ["a past date", "Founders' Day", "20/11/2026", "Choose today or a later date."],
  ])("with %s, it says what's wrong and asks the server nothing", async (_case, name, date, message) => {
    const { events } = open();
    await events.click(screen.getByRole("button", { name: "Add public holiday" }));
    if (name) await typeName(events, name);
    if (date) await typeDate(events, date);
    await events.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(previewPublicHolidayChangeAction).not.toHaveBeenCalled();
  });

  it("shows the server's reason, e.g. a day that already has one", async () => {
    vi.mocked(previewPublicHolidayChangeAction).mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "There's already a public holiday on Friday 25 December 2026: Christmas Day.",
      },
    });
    const { events } = open();
    await events.click(screen.getByRole("button", { name: "Add public holiday" }));
    await typeName(events, "Another");
    await typeDate(events, "25/12/2026");
    await events.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("There's already a public holiday on");
  });
});

describe("editing a public holiday", () => {
  it("a new date warns that copies move", async () => {
    const { events } = open();
    await events.click(screen.getByRole("button", { name: "Edit Boxing Day" }));
    await typeDate(events, "29/12/2026");
    await events.click(screen.getByRole("button", { name: "Continue" }));
    expect(previewPublicHolidayChangeAction).toHaveBeenCalledWith({
      kind: "update",
      id: "boxing",
      name: "Boxing Day",
      date: "2026-12-29",
    });
    expect(screen.getByRole("dialog", { name: "Edit Boxing Day" })).toHaveAccessibleDescription(
      /214 people will have it moved to the new date/,
    );
  });

  it("a new name alone still asks first, without numbers", async () => {
    const { events, dialog } = open();
    await events.click(screen.getByRole("button", { name: "Edit Boxing Day" }));
    await typeName(events, "Boxing Day (substitute)");
    await events.click(screen.getByRole("button", { name: "Continue" }));
    const edit = screen.getByRole("dialog", { name: "Edit Boxing Day" });
    expect(edit).toHaveAccessibleDescription(
      "This applies to every business unit: the holiday is renamed on everyone's calendar.",
    );
    await events.click(within(edit).getByRole("button", { name: "Save changes" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent("Boxing Day (substitute) saved.");
  });

  it("Back returns to the form without saving", async () => {
    const { events } = open();
    await events.click(screen.getByRole("button", { name: "Edit Boxing Day" }));
    await typeName(events, "Boxing Day (substitute)");
    await events.click(screen.getByRole("button", { name: "Continue" }));
    await events.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Boxing Day (substitute)");
    expect(savePublicHolidayChangeAction).not.toHaveBeenCalled();
  });
});

describe("deleting a public holiday", () => {
  it("shows the impact once it's worked out, then deletes on confirm", async () => {
    const { events, dialog } = open();
    await events.click(screen.getByRole("button", { name: "Delete Christmas Day" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete Christmas Day?" });
    expect(await within(confirm).findByText(/214 people will lose this holiday/)).toBeVisible();
    expect(previewPublicHolidayChangeAction).toHaveBeenCalledWith({
      kind: "delete",
      id: "christmas",
    });

    await events.click(within(confirm).getByRole("button", { name: "Delete holiday" }));
    expect(savePublicHolidayChangeAction).toHaveBeenCalledWith({ kind: "delete", id: "christmas" });
    expect(within(dialog).getByRole("status")).toHaveTextContent("Christmas Day deleted.");
    expect(screen.getByRole("button", { name: "Add public holiday" })).toHaveFocus();
  });
});

it("has no axe violations, on the tab and in both dialogs", async () => {
  const { events, dialog } = open();
  expect((await axe.run(dialog)).violations).toEqual([]);

  await events.click(screen.getByRole("button", { name: "Add public holiday" }));
  const add = screen.getByRole("dialog", { name: "Add public holiday" });
  expect((await axe.run(add)).violations).toEqual([]);
  await events.click(within(add).getByRole("button", { name: "Cancel" }));

  await events.click(screen.getByRole("button", { name: "Delete Christmas Day" }));
  const confirm = screen.getByRole("alertdialog");
  await within(confirm).findByText(/will lose this holiday/);
  expect((await axe.run(confirm)).violations).toEqual([]);
});
