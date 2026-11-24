import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WeeklyPattern } from "@/domain/availability";
import { cancelPendingPatternAction } from "@/server/actions/cancel-pending-pattern";
import { updatePreferredNameAction } from "@/server/actions/update-preferred-name";
import { updateWorkingPatternAction } from "@/server/actions/update-working-pattern";
import type { ProfileData } from "@/server/queries/profile";
import { ProfileDialog } from "./profile-dialog";

vi.mock("@/server/actions/update-preferred-name", () => ({ updatePreferredNameAction: vi.fn() }));
vi.mock("@/server/actions/update-working-pattern", () => ({ updateWorkingPatternAction: vi.fn() }));
vi.mock("@/server/actions/cancel-pending-pattern", () => ({ cancelPendingPatternAction: vi.fn() }));

// Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const WEEKDAYS: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "OFF"];
const FRIDAYS_OFF: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "OFF", "OFF"];

const tom: ProfileData = {
  id: "tom",
  title: "My profile",
  isViewer: true,
  name: "Tom Okafor",
  initials: "TO",
  firstName: "Thomas",
  preferredName: "Tom",
  ssoName: "Thomas Okafor",
  email: "tom.okafor@example.org",
  employeeNumber: "E10442",
  businessUnitName: "West Operations",
  teamName: "Finance Operations",
  currentPattern: WEEKDAYS,
  pendingPattern: null,
  nextChangeDate: "2026-11-22",
};

const ok = { ok: true as const, data: undefined };

beforeEach(() => {
  vi.mocked(updatePreferredNameAction).mockReset().mockResolvedValue(ok);
  vi.mocked(updateWorkingPatternAction).mockReset().mockResolvedValue(ok);
  vi.mocked(cancelPendingPatternAction).mockReset().mockResolvedValue(ok);
});

function open(profile: ProfileData, searchParams: Record<string, string> = { profile: "me" }) {
  const urlUpdates: UrlUpdateEvent[] = [];
  const events = userEvent.setup();
  render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={(update) => urlUpdates.push(update)}
    >
      <ProfileDialog profile={profile} leave={{ history: [], upcoming: [] }} />
    </NuqsTestingAdapter>,
  );
  return { events, urlUpdates, dialog: screen.getByRole("dialog", { name: profile.title }) };
}

function day(name: string) {
  return screen.getByRole("radiogroup", { name });
}

describe("the profile dialog", () => {
  it("shows who it's for, with Details first", () => {
    const { dialog } = open(tom);
    expect(dialog).toHaveAccessibleDescription(/Tom Okafor.*West Operations · Finance Operations/);
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("E10442")).toHaveClass("font-mono");
  });

  it.each([
    ["history", "Leave history"],
    ["upcoming", "Upcoming leave"],
  ])("?tab=%s opens %s", (tab, name) => {
    open(tom, { profile: "me", tab });
    expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  });

  it("choosing a tab puts it in the URL, replacing the history entry", async () => {
    const { events, urlUpdates } = open(tom);
    await events.click(screen.getByRole("tab", { name: "Working pattern" }));
    expect(urlUpdates.at(-1)?.queryString).toBe("?profile=me&tab=pattern");
    expect(urlUpdates.at(-1)?.options.history).toBe("replace");
  });

  it("closing it takes the profile out of the URL", async () => {
    const { events, urlUpdates } = open(tom, { profile: "me", tab: "pattern", view: "week" });
    await events.keyboard("{Escape}");
    expect(urlUpdates.at(-1)?.queryString).toBe("?view=week");
  });
});

describe("the Details tab", () => {
  it("saves the preferred first name, and announces it", async () => {
    const { events, dialog } = open(tom);
    const input = screen.getByRole("textbox", { name: "Preferred first name (optional)" });
    expect(input).toHaveAccessibleDescription(/Shown on the calendar instead of Thomas/);

    await events.clear(input);
    await events.type(input, "Tommy");
    await events.click(screen.getByRole("button", { name: "Save" }));
    expect(updatePreferredNameAction).toHaveBeenCalledWith({
      userId: "tom",
      preferredName: "Tommy",
    });
    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent("Preferred first name saved."),
    );
  });

  it("an empty name clears it", async () => {
    const { events, dialog } = open(tom);
    await events.clear(screen.getByRole("textbox", { name: /Preferred first name/ }));
    await events.click(screen.getByRole("button", { name: "Save" }));
    expect(updatePreferredNameAction).toHaveBeenCalledWith({ userId: "tom", preferredName: "" });
    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent("Preferred first name cleared."),
    );
  });

  it.each([
    ["Tom2", "Preferred first name can only use letters, spaces, hyphens and apostrophes."],
    ["T".repeat(41), "Preferred first name can be up to 40 characters."],
  ])("%j isn't sent, and the field says why", async (name, message) => {
    const { events } = open(tom);
    const input = screen.getByRole("textbox", { name: /Preferred first name/ });
    await events.clear(input);
    await events.type(input, name);
    await events.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(input).toHaveAccessibleDescription(new RegExp(message));
    expect(updatePreferredNameAction).not.toHaveBeenCalled();
  });
});

describe("the Working pattern tab", () => {
  it("has a radio group for each day, Sunday first, showing the pattern", () => {
    open(tom, { profile: "me", tab: "pattern" });
    const groups = screen
      .getAllByRole("radiogroup")
      .map((group) => group.getAttribute("aria-label"));
    expect(groups).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
    expect(within(day("Sunday")).getByRole("radio", { name: "Not working" })).toBeChecked();
    expect(within(day("Monday")).getByRole("radio", { name: "Full day" })).toBeChecked();
  });

  it("saves a change, which applies from next Sunday", async () => {
    const { events, dialog } = open(tom, { profile: "me", tab: "pattern" });
    const save = screen.getByRole("button", { name: "Save — applies from Sunday 22 November" });
    expect(save).toBeDisabled(); // nothing has changed yet

    await events.click(within(day("Friday")).getByRole("radio", { name: "Not working" }));
    await events.click(save);
    expect(updateWorkingPatternAction).toHaveBeenCalledWith({
      userId: "tom",
      pattern: FRIDAYS_OFF,
    });
    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent(
        "Working pattern saved. It applies from Sunday 22 November.",
      ),
    );
  });

  it("a waiting change is what the editor shows, under a notice", () => {
    open({ ...tom, pendingPattern: FRIDAYS_OFF }, { profile: "me", tab: "pattern" });
    expect(screen.getByText("Your new pattern starts on Sunday 22 November.")).toBeInTheDocument();
    expect(within(day("Friday")).getByRole("radio", { name: "Not working" })).toBeChecked();
  });

  it("an admin's notice names the person", () => {
    const priya = { ...tom, isViewer: false, name: "Priya Shah", title: "Priya Shah's profile" };
    open({ ...priya, pendingPattern: FRIDAYS_OFF }, { person: "priya", tab: "pattern" });
    expect(
      screen.getByText("Priya Shah's new pattern starts on Sunday 22 November."),
    ).toBeInTheDocument();
  });

  it("Cancel pending change goes back to the current pattern", async () => {
    const { events, dialog } = open(
      { ...tom, pendingPattern: FRIDAYS_OFF },
      { profile: "me", tab: "pattern" },
    );
    await events.click(screen.getByRole("button", { name: "Cancel pending change" }));
    expect(cancelPendingPatternAction).toHaveBeenCalledWith({ userId: "tom" });
    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent("Pending change cancelled."),
    );
    expect(within(day("Friday")).getByRole("radio", { name: "Full day" })).toBeChecked();
  });

  it("shows the server's message when saving fails", async () => {
    vi.mocked(updateWorkingPatternAction).mockResolvedValue({
      ok: false,
      error: { code: "FORBIDDEN", message: "You can't change this person's working days." },
    });
    const { events } = open(tom, { profile: "me", tab: "pattern" });
    await events.click(within(day("Saturday")).getByRole("radio", { name: "Morning" }));
    await events.click(screen.getByRole("button", { name: /^Save/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can't change this person's working days.",
    );
  });
});

describe("accessibility", () => {
  it.each([["details"], ["pattern"]])("the %s tab has no axe violations", async (tab) => {
    const { dialog } = open({ ...tom, pendingPattern: FRIDAYS_OFF }, { profile: "me", tab });
    const results = await axe.run(dialog);
    expect(results.violations).toEqual([]);
  });
});
