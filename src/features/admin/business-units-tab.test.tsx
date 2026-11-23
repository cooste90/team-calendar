import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/permissions";
import { NavigationTransitionProvider } from "@/features/calendar/header/navigation-transition";
import { createBusinessUnitAction } from "@/server/actions/create-business-unit";
import { deleteBusinessUnitAction } from "@/server/actions/delete-business-unit";
import { renameBusinessUnitAction } from "@/server/actions/rename-business-unit";
import { setBusinessUnitHiddenAction } from "@/server/actions/set-business-unit-hidden";
import type { AdminBusinessUnit } from "@/server/queries/business-units";
import { AdminDialog } from "./admin-dialog";

vi.mock("@/server/actions/create-business-unit", () => ({ createBusinessUnitAction: vi.fn() }));
vi.mock("@/server/actions/rename-business-unit", () => ({ renameBusinessUnitAction: vi.fn() }));
vi.mock("@/server/actions/set-business-unit-hidden", () => ({
  setBusinessUnitHiddenAction: vi.fn(),
}));
vi.mock("@/server/actions/delete-business-unit", () => ({ deleteBusinessUnitAction: vi.fn() }));

const west = { id: "west", slug: "west-operations", name: "West Operations", hidden: false };
const grace: Actor = { id: "grace", role: "SUPER_ADMIN", businessUnitId: "west", teamId: null };
const tom: Actor = { id: "tom", role: "ADMIN", businessUnitId: "west", teamId: "finance" };

const units: AdminBusinessUnit[] = [
  { id: "corporate", name: "Corporate Services", hidden: true, peopleCount: 70, teamCount: 8 },
  { id: "south", name: "South Health", hidden: false, peopleCount: 0, teamCount: 3 },
  { id: "west", name: "West Operations", hidden: false, peopleCount: 50, teamCount: 7 },
];

const ok = { ok: true as const, data: undefined };

beforeEach(() => {
  vi.mocked(createBusinessUnitAction).mockReset().mockResolvedValue(ok);
  vi.mocked(renameBusinessUnitAction).mockReset().mockResolvedValue(ok);
  vi.mocked(setBusinessUnitHiddenAction).mockReset().mockResolvedValue(ok);
  vi.mocked(deleteBusinessUnitAction).mockReset().mockResolvedValue(ok);
});

// A super admin gets every BU; anyone else gets null (no Business units tab).
function open(viewer: Actor, allBusinessUnits: AdminBusinessUnit[] | null) {
  const events = userEvent.setup();
  render(
    <NuqsTestingAdapter searchParams={{ admin: "units" }}>
      <NavigationTransitionProvider>
        <AdminDialog
          viewer={viewer}
          businessUnit={west}
          businessUnits={[west]}
          teams={{ teams: [], unassignedCount: 0 }}
          users={[]}
          holidays={[]}
          allBusinessUnits={allBusinessUnits}
          today="2026-11-23"
        />
      </NavigationTransitionProvider>
    </NuqsTestingAdapter>,
  );
  const dialog = screen.getByRole("dialog", { name: "Admin · West Operations" });
  return { events, dialog };
}

describe("the Business units tab", () => {
  it("is only there for super admins; an admin asking for it gets Teams", () => {
    open(tom, null);
    expect(screen.queryByRole("tab", { name: "Business units" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Teams" })).toHaveAttribute("aria-selected", "true");
  });

  it("lists every BU with its people and teams, and whether it's hidden", () => {
    open(grace, units);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("span")?.textContent)).toEqual([
      "Corporate Services",
      "South Health",
      "West Operations",
    ]);
    expect(screen.getByText("70 people · 8 teams")).toBeVisible();
    const hidden = screen.getByRole("checkbox", { name: "Hidden (Corporate Services)" });
    expect(hidden).toBeChecked();
    expect(hidden).toHaveAccessibleDescription(
      "Hidden units are only visible to their own members.",
    );
  });

  it("ticking Hidden saves it straight away", async () => {
    const { events, dialog } = open(grace, units);
    await events.click(screen.getByRole("checkbox", { name: "Hidden (South Health)" }));
    expect(setBusinessUnitHiddenAction).toHaveBeenCalledWith({ id: "south", hidden: true });
    expect(within(dialog).getByRole("status")).toHaveTextContent("South Health is now hidden.");
  });

  it("adds a BU", async () => {
    const { events, dialog } = open(grace, units);
    await events.type(
      screen.getByRole("textbox", { name: "New business unit" }),
      "East Infrastructure",
    );
    await events.click(screen.getByRole("button", { name: "Add business unit" }));
    expect(createBusinessUnitAction).toHaveBeenCalledWith({ name: "East Infrastructure" });
    expect(within(dialog).getByRole("status")).toHaveTextContent("East Infrastructure added.");
  });

  it("renames a BU in its row", async () => {
    const { events } = open(grace, units);
    await events.click(screen.getByRole("button", { name: "Rename South Health" }));
    const input = screen.getByRole("textbox", { name: "New name for South Health" });
    await events.clear(input);
    await events.type(input, "South Health & Care{Enter}");
    expect(renameBusinessUnitAction).toHaveBeenCalledWith({
      id: "south",
      name: "South Health & Care",
    });
  });
});

describe("deleting a business unit", () => {
  it("an empty one asks first, says its empty teams go too, then deletes", async () => {
    const { events, dialog } = open(grace, units);
    await events.click(screen.getByRole("button", { name: "Delete South Health" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete South Health?" });
    expect(confirm).toHaveAccessibleDescription(
      "It has no people, and its 3 empty teams go with it.",
    );
    await events.click(within(confirm).getByRole("button", { name: "Delete business unit" }));
    expect(deleteBusinessUnitAction).toHaveBeenCalledWith({ id: "south" });
    expect(within(dialog).getByRole("status")).toHaveTextContent("South Health deleted.");
    expect(screen.getByRole("textbox", { name: "New business unit" })).toHaveFocus();
  });

  it("one with people says to move them first, and offers no Delete", async () => {
    const { events } = open(grace, units);
    await events.click(screen.getByRole("button", { name: "Delete West Operations" }));
    const confirm = screen.getByRole("alertdialog", {
      name: "West Operations can't be deleted yet",
    });
    expect(confirm).toHaveAccessibleDescription("Move or delete its 50 people first.");
    expect(within(confirm).queryByRole("button", { name: /Delete/ })).toBeNull();
    await events.click(within(confirm).getByRole("button", { name: "OK" }));
    expect(deleteBusinessUnitAction).not.toHaveBeenCalled();
  });
});

it("has no axe violations, with the delete confirmation open too", async () => {
  const { events, dialog } = open(grace, units);
  expect((await axe.run(dialog)).violations).toEqual([]);
  await events.click(screen.getByRole("button", { name: "Delete South Health" }));
  expect((await axe.run(screen.getByRole("alertdialog"))).violations).toEqual([]);
});
