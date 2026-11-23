import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/permissions";
import { NavigationTransitionProvider } from "@/features/calendar/header/navigation-transition";
import { createTeamAction } from "@/server/actions/create-team";
import { deleteTeamAction } from "@/server/actions/delete-team";
import { moveTeamAction } from "@/server/actions/move-team";
import { renameTeamAction } from "@/server/actions/rename-team";
import type { AdminTeams } from "@/server/queries/teams";
import { AdminDialog } from "./admin-dialog";

vi.mock("@/server/actions/create-team", () => ({ createTeamAction: vi.fn() }));
vi.mock("@/server/actions/rename-team", () => ({ renameTeamAction: vi.fn() }));
vi.mock("@/server/actions/move-team", () => ({ moveTeamAction: vi.fn() }));
vi.mock("@/server/actions/delete-team", () => ({ deleteTeamAction: vi.fn() }));

const west = { id: "west", slug: "west-operations", name: "West Operations", hidden: false };
const north = { id: "north", slug: "north-finance", name: "North Finance", hidden: false };

const design = { id: "design", name: "Service Design", memberCount: 6 };
const finance = { id: "finance", name: "Finance Operations", memberCount: 4 };
const legal = { id: "legal", name: "Legal", memberCount: 1 };

const ok = { ok: true as const, data: undefined };

beforeEach(() => {
  vi.mocked(createTeamAction).mockReset().mockResolvedValue(ok);
  vi.mocked(renameTeamAction).mockReset().mockResolvedValue(ok);
  vi.mocked(moveTeamAction).mockReset().mockResolvedValue(ok);
  vi.mocked(deleteTeamAction).mockReset().mockResolvedValue(ok);
});

const tom: Actor = { id: "tom", role: "ADMIN", businessUnitId: "west", teamId: "finance" };

// The Users and Public holidays tabs have their own tests, so they have nothing here.
function dialogFor(teams: AdminTeams, businessUnits = [west]) {
  return (
    <NavigationTransitionProvider>
      <AdminDialog
        viewer={tom}
        businessUnit={west}
        businessUnits={businessUnits}
        teams={teams}
        users={[]}
        holidays={[]}
        today="2026-11-23"
      />
    </NavigationTransitionProvider>
  );
}

function open(teams: AdminTeams, businessUnits = [west]) {
  const urlUpdates: UrlUpdateEvent[] = [];
  const events = userEvent.setup();
  const { rerender } = render(dialogFor(teams, businessUnits), {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter
        searchParams={{ admin: "teams", view: "week" }}
        onUrlUpdate={(update) => urlUpdates.push(update)}
      >
        {children}
      </NuqsTestingAdapter>
    ),
  });
  const dialog = screen.getByRole("dialog", { name: "Admin · West Operations" });
  return { events, urlUpdates, dialog, rerender };
}

const threeTeams: AdminTeams = { teams: [design, finance, legal], unassignedCount: 2 };

describe("the admin dialog", () => {
  it("is for the BU on screen, with the Teams tab", () => {
    open(threeTeams);
    expect(screen.getByRole("tab", { name: "Teams" })).toHaveAttribute("aria-selected", "true");
  });

  it("choosing the Users tab puts it in the URL, replacing the history entry", async () => {
    const { events, urlUpdates } = open(threeTeams);
    await events.click(screen.getByRole("tab", { name: "Users" }));
    expect(urlUpdates.at(-1)?.queryString).toBe("?admin=users&view=week");
    expect(urlUpdates.at(-1)?.options.history).toBe("replace");
  });

  it("closing it takes admin out of the URL", async () => {
    const { events, urlUpdates } = open(threeTeams);
    await events.keyboard("{Escape}");
    expect(urlUpdates.at(-1)?.queryString).toBe("?view=week");
  });

  it("an admin of one BU gets no BU choice", () => {
    open(threeTeams);
    expect(screen.queryByRole("combobox", { name: "Business unit" })).toBeNull();
  });

  it("a super admin can switch which BU they manage, which clears the filters", async () => {
    const { events, urlUpdates } = open(threeTeams, [north, west]);
    await events.selectOptions(
      screen.getByRole("combobox", { name: "Business unit" }),
      "North Finance",
    );
    expect(urlUpdates.at(-1)?.queryString).toBe("?admin=teams&view=week&bu=north-finance");
  });
});

describe("the Teams tab", () => {
  it("lists the teams in order with their sizes, and Unassigned last, which can't change", () => {
    open(threeTeams);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Service Design6 people",
      "Finance Operations4 people",
      "Legal1 person",
    ]);
    expect(screen.getByText("Unassigned · 2 people")).toBeVisible();
    expect(screen.getByText("Built-in. New people land here.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Unassigned/ })).toBeNull();
  });

  it("the first team's Move up and the last team's Move down are disabled", () => {
    open(threeTeams);
    expect(screen.getByRole("button", { name: "Move Service Design up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Service Design down" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move Legal up" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move Legal down" })).toBeDisabled();
  });

  it("Move down moves the team, keeps focus on its button and announces its new place", async () => {
    const { events, dialog, rerender } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Move Service Design down" }));
    expect(moveTeamAction).toHaveBeenCalledWith({ teamId: "design", direction: "down" });

    // The server sends the list back in its new order.
    rerender(dialogFor({ teams: [finance, design, legal], unassignedCount: 2 }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Service Design moved to position 2 of 3.",
    );
    expect(screen.getByRole("button", { name: "Move Service Design down" })).toHaveFocus();
  });

  it("a team that reaches the top keeps focus on its Move down button", async () => {
    const { events, dialog, rerender } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Move Finance Operations up" }));
    rerender(dialogFor({ teams: [finance, design, legal], unassignedCount: 2 }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Finance Operations moved to position 1 of 3.",
    );
    expect(screen.getByRole("button", { name: "Move Finance Operations down" })).toHaveFocus();
  });

  it("adds a team, and shows the server's reason when the name is taken", async () => {
    const { events, dialog } = open(threeTeams);
    const input = screen.getByRole("textbox", { name: "New team" });
    await events.type(input, "Commercial");
    await events.click(screen.getByRole("button", { name: "Add team" }));
    expect(createTeamAction).toHaveBeenCalledWith({ businessUnitId: "west", name: "Commercial" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Commercial added at the end of the list.",
    );
    expect(input).toHaveValue("");

    vi.mocked(createTeamAction).mockResolvedValue({
      ok: false,
      error: { code: "VALIDATION", message: "There's already a team called Legal." },
    });
    await events.type(input, "legal{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("There's already a team called Legal.");
    expect(input).toHaveAccessibleDescription("There's already a team called Legal.");
  });

  it("an empty name isn't sent", async () => {
    const { events } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Add team" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a team name.");
    expect(createTeamAction).not.toHaveBeenCalled();
  });

  it("renames a team in its row, then focus goes back to Rename", async () => {
    const { events, dialog } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Rename Legal" }));
    const input = screen.getByRole("textbox", { name: "New name for Legal" });
    expect(input).toHaveFocus();

    await events.clear(input);
    await events.type(input, "Legal & Compliance{Enter}");
    expect(renameTeamAction).toHaveBeenCalledWith({ teamId: "legal", name: "Legal & Compliance" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Legal renamed to Legal & Compliance.",
    );
    expect(screen.getByRole("button", { name: "Rename Legal" })).toHaveFocus();
  });

  it("Esc cancels a rename without closing the dialog", async () => {
    const { events, dialog } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Rename Legal" }));
    await events.keyboard("{Escape}");
    expect(dialog).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "New name for Legal" })).toBeNull();
    expect(screen.getByRole("button", { name: "Rename Legal" })).toHaveFocus();
    expect(renameTeamAction).not.toHaveBeenCalled();
  });
});

describe("deleting a team", () => {
  it.each([
    ["Finance Operations", "Its 4 members will move to Unassigned."],
    ["Legal", "Its 1 member will move to Unassigned."],
  ])("asks first: Delete %s? %s", async (name, description) => {
    const { events } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: `Delete ${name}` }));
    const confirm = screen.getByRole("alertdialog", { name: `Delete ${name}?` });
    expect(confirm).toHaveAccessibleDescription(description);
  });

  it("asks first even when the team is empty", async () => {
    const { events } = open({ teams: [{ ...legal, memberCount: 0 }], unassignedCount: 0 });
    await events.click(screen.getByRole("button", { name: "Delete Legal" }));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription("It has no members.");
  });

  it("Cancel deletes nothing", async () => {
    const { events } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Delete Legal" }));
    await events.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(deleteTeamAction).not.toHaveBeenCalled();
  });

  it("Delete team deletes it and says where its members went", async () => {
    const { events, dialog } = open(threeTeams);
    await events.click(screen.getByRole("button", { name: "Delete Finance Operations" }));
    await events.click(screen.getByRole("button", { name: "Delete team" }));
    expect(deleteTeamAction).toHaveBeenCalledWith({ teamId: "finance" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Finance Operations deleted. 4 people moved to Unassigned.",
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("has no axe violations, with the confirmation open too", async () => {
    const { events, dialog } = open(threeTeams);
    expect((await axe.run(dialog)).violations).toEqual([]);
    await events.click(screen.getByRole("button", { name: "Delete Legal" }));
    expect((await axe.run(screen.getByRole("alertdialog"))).violations).toEqual([]);
  });
});
