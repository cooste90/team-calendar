import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/permissions";
import { NavigationTransitionProvider } from "@/features/calendar/header/navigation-transition";
import { deleteUserAction } from "@/server/actions/delete-user";
import { moveUserToBusinessUnitAction } from "@/server/actions/move-user-to-business-unit";
import { moveUserToTeamAction } from "@/server/actions/move-user-to-team";
import type { AdminTeams } from "@/server/queries/teams";
import type { AdminUser } from "@/server/queries/users";
import { AdminDialog } from "./admin-dialog";

vi.mock("@/server/actions/move-user-to-team", () => ({ moveUserToTeamAction: vi.fn() }));
vi.mock("@/server/actions/delete-user", () => ({ deleteUserAction: vi.fn() }));
vi.mock("@/server/actions/move-user-to-business-unit", () => ({
  moveUserToBusinessUnitAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("view=week&admin=users"),
}));

const west = { id: "west", slug: "west-operations", name: "West Operations", hidden: false };
const north = { id: "north", slug: "north-finance", name: "North Finance", hidden: false };

const teams: AdminTeams = {
  teams: [
    { id: "design", name: "Service Design", memberCount: 1 },
    { id: "finance", name: "Finance Operations", memberCount: 1 },
  ],
  unassignedCount: 1,
};

function person(fields: Partial<AdminUser> & Pick<AdminUser, "id" | "name" | "surname">) {
  return {
    ssoName: null,
    initials: fields.name.charAt(0) + fields.surname.charAt(0),
    email: `${fields.id}@example.org`,
    employeeNumber: `E${fields.id.length}0001`,
    role: "USER" as const,
    teamId: null,
    ...fields,
  };
}

const owen = person({ id: "owen", name: "Owen Hughes", surname: "Hughes" });
const priya = person({ id: "priya", name: "Priya Shah", surname: "Shah", teamId: "design" });
const tom = person({
  id: "tom",
  name: "Tom Okafor",
  ssoName: "Thomas Okafor",
  surname: "Okafor",
  role: "ADMIN",
  teamId: "finance",
  employeeNumber: "E10442",
});
const users = [owen, tom, priya]; // by surname, as the server sends them

const tomActor: Actor = { id: "tom", role: "ADMIN", businessUnitId: "west", teamId: "finance" };
const grace: Actor = { id: "grace", role: "SUPER_ADMIN", businessUnitId: "west", teamId: null };

const ok = { ok: true as const, data: undefined };

beforeEach(() => {
  vi.mocked(moveUserToTeamAction).mockReset().mockResolvedValue(ok);
  vi.mocked(deleteUserAction).mockReset().mockResolvedValue(ok);
  vi.mocked(moveUserToBusinessUnitAction).mockReset().mockResolvedValue(ok);
});

function dialogFor(viewer: Actor, people: AdminUser[]) {
  return (
    <NavigationTransitionProvider>
      <AdminDialog
        viewer={viewer}
        businessUnit={west}
        businessUnits={viewer.role === "SUPER_ADMIN" ? [north, west] : [west]}
        teams={teams}
        users={people}
        holidays={[]}
        allBusinessUnits={null}
        today="2026-11-23"
      />
    </NavigationTransitionProvider>
  );
}

function open(viewer = tomActor) {
  const events = userEvent.setup();
  const { rerender } = render(dialogFor(viewer, users), {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter searchParams={{ admin: "users" }}>{children}</NuqsTestingAdapter>
    ),
  });
  const dialog = screen.getByRole("dialog", { name: "Admin · West Operations" });
  return { events, dialog, rerender };
}

async function openMenu(events: ReturnType<typeof userEvent.setup>, name: string) {
  await events.click(screen.getByRole("button", { name: `More for ${name}` }));
  return screen.getByRole("menu");
}

describe("the Users tab", () => {
  it("has a section per team in admin order, then Unassigned, each with a count", () => {
    open();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Service Design · 1 person",
      "Finance Operations · 1 person",
      "Unassigned · 1 person",
    ]);
  });

  it("shows who each person is, with the SSO name when a preferred name is set", () => {
    open();
    const row = screen.getByText("Tom Okafor").closest("li") as HTMLElement;
    expect(within(row).getByText("(Thomas Okafor)")).toBeVisible();
    expect(within(row).getByText("Admin")).toBeVisible();
    expect(within(row).getByText("E10442")).toHaveClass("font-mono");
  });

  it("the Team select lists the BU's teams but never Unassigned", () => {
    open();
    const select = screen.getByRole("combobox", { name: "Team for Priya Shah" });
    const options = within(select).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Service Design",
      "Finance Operations",
    ]);
  });

  it("someone unassigned shows Choose team…, which can't be chosen again", () => {
    open();
    const select = screen.getByRole("combobox", { name: "Team for Owen Hughes" });
    expect(select).toHaveDisplayValue("Choose team…");
    expect(within(select).getByRole("option", { name: "Choose team…" })).toBeDisabled();
  });

  it("choosing a team moves them at once, announces it and keeps focus on their select", async () => {
    const { events, dialog, rerender } = open();
    await events.selectOptions(
      screen.getByRole("combobox", { name: "Team for Owen Hughes" }),
      "Finance Operations",
    );
    expect(moveUserToTeamAction).toHaveBeenCalledWith({ userId: "owen", teamId: "finance" });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Owen Hughes moved to Finance Operations.",
    );

    // The server sends the list back with Owen in Finance Operations.
    rerender(dialogFor(tomActor, [{ ...owen, teamId: "finance" }, tom, priya]));
    expect(screen.getByRole("combobox", { name: "Team for Owen Hughes" })).toHaveFocus();
  });

  it.each([
    ["a name", "priya", ["Priya Shah"]],
    ["a name from SSO", "thomas", ["Tom Okafor"]],
    ["an email", "OWEN@EXAMPLE", ["Owen Hughes"]],
    ["an employee number", "E10442", ["Tom Okafor"]],
  ])("searching by %s filters the list", async (_by, search, names) => {
    const { events } = open();
    await events.type(screen.getByRole("searchbox", { name: "Search people" }), search);
    // Each row has one Team select, labelled with the person's name.
    const selects = screen.getAllByRole("combobox", { name: /^Team for / });
    expect(selects.map((select) => select.getAttribute("aria-label"))).toEqual(
      names.map((name) => `Team for ${name}`),
    );
  });

  it("says so when nobody matches", async () => {
    const { events } = open();
    await events.type(screen.getByRole("searchbox", { name: "Search people" }), "zzz");
    expect(screen.getByText("No one matches “zzz”.")).toBeVisible();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});

describe("the ⋯ menu", () => {
  it("Open profile links to their profile, in place of the admin dialog", async () => {
    const { events } = open();
    const menu = await openMenu(events, "Priya Shah");
    expect(within(menu).getByRole("menuitem", { name: "Open profile" })).toHaveAttribute(
      "href",
      "/?view=week&person=priya",
    );
  });

  it("you can't delete yourself", async () => {
    const { events } = open();
    const menu = await openMenu(events, "Tom Okafor");
    expect(
      within(menu).getByRole("menuitem", { name: "You can't delete yourself" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("only a super admin can move someone to another BU", async () => {
    const { events } = open();
    const menu = await openMenu(events, "Priya Shah");
    expect(within(menu).queryByRole("menuitem", { name: "Move to business unit…" })).toBeNull();
  });
});

describe("deleting someone", () => {
  it("is only possible once their surname is typed, ignoring case and spaces", async () => {
    const { events, dialog } = open();
    await events.click(
      within(await openMenu(events, "Priya Shah")).getByRole("menuitem", { name: "Delete…" }),
    );
    const confirm = screen.getByRole("alertdialog", { name: "Delete Priya Shah?" });
    expect(confirm).toHaveAccessibleDescription(
      "This permanently removes them and all their bookings (past and future). If they sign in again, they'll start as a new user.",
    );
    const button = within(confirm).getByRole("button", { name: "Delete Priya Shah" });
    const input = within(confirm).getByRole("textbox", {
      name: "Type their surname, Shah, to confirm",
    });

    await events.type(input, "Sha");
    expect(button).toBeDisabled();
    await events.type(input, "H ");
    expect(button).toBeEnabled();

    await events.click(button);
    expect(deleteUserAction).toHaveBeenCalledWith({ userId: "priya" });
    expect(within(dialog).getByRole("status")).toHaveTextContent("Priya Shah deleted.");
    expect(screen.getByRole("searchbox", { name: "Search people" })).toHaveFocus();
  });

  it("Cancel deletes nothing and puts focus back on the ⋯ button", async () => {
    const { events } = open();
    await events.click(
      within(await openMenu(events, "Priya Shah")).getByRole("menuitem", { name: "Delete…" }),
    );
    await events.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteUserAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "More for Priya Shah" })).toHaveFocus();
  });
});

describe("moving someone to another BU", () => {
  it("a super admin picks the BU, and is told they start in Unassigned", async () => {
    const { events, dialog } = open(grace);
    const menu = await openMenu(events, "Priya Shah");
    await events.click(within(menu).getByRole("menuitem", { name: "Move to business unit…" }));
    const move = screen.getByRole("dialog", { name: "Move Priya Shah to another business unit" });
    expect(move).toHaveAccessibleDescription(
      "They'll keep their bookings and start in Unassigned.",
    );
    const button = within(move).getByRole("button", { name: "Move" });
    expect(button).toBeDisabled();

    await events.selectOptions(
      within(move).getByRole("combobox", { name: "Business unit" }),
      "North Finance",
    );
    await events.click(button);
    expect(moveUserToBusinessUnitAction).toHaveBeenCalledWith({
      userId: "priya",
      businessUnitId: "north",
    });
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Priya Shah moved to North Finance, in its Unassigned group.",
    );
  });
});

it("has no axe violations, with the delete confirmation open too", async () => {
  const { events, dialog } = open();
  expect((await axe.run(dialog)).violations).toEqual([]);
  await events.click(
    within(await openMenu(events, "Priya Shah")).getByRole("menuitem", { name: "Delete…" }),
  );
  expect((await axe.run(screen.getByRole("alertdialog"))).violations).toEqual([]);
});
