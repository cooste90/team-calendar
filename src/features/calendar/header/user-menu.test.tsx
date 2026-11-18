import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "@/server/actions/sign-out";
import type { UserMenuDetails } from "@/server/queries/user-menu";
import { UserMenu } from "./user-menu";

vi.mock("@/server/actions/sign-out", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("view=week&bu=west"),
}));

const priya: UserMenuDetails = {
  name: "Priya Shah",
  initials: "PS",
  email: "priya.shah@example.org",
  details: "West Operations · Service Design",
  canOpenAdmin: false,
};
const tom: UserMenuDetails = {
  name: "Tom Okafor",
  initials: "TO",
  email: "tom.okafor@example.org",
  details: "West Operations · Operations · Admin",
  canOpenAdmin: true,
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

async function openMenu(user: UserMenuDetails) {
  const events = userEvent.setup();
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UserMenu user={user} />
    </ThemeProvider>,
  );
  const trigger = screen.getByRole("button", {
    name: `User menu for ${user.name}, ${user.initials}`,
  });
  await events.click(trigger);
  return { events, trigger, menu: screen.getByRole("menu") };
}

describe("the user menu", () => {
  it("shows who you are: name, email, BU, team and role", async () => {
    const { trigger, menu } = await openMenu(tom);
    expect(trigger).toHaveTextContent("TO");
    expect(menu).toHaveTextContent("Tom Okafor");
    expect(menu).toHaveTextContent("tom.okafor@example.org");
    expect(menu).toHaveTextContent("West Operations · Operations · Admin");
  });

  it.each([
    { who: "a USER", user: priya, items: ["My profile", "Sign out"] },
    { who: "an ADMIN", user: tom, items: ["My profile", "Admin", "Sign out"] },
  ])("Admin is only offered to admins ($who)", async ({ user, items }) => {
    await openMenu(user);
    const names = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(names).toEqual(items);
  });

  it("the theme is a menuitemradio group that shows the current theme", async () => {
    await openMenu(priya);
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    const options = screen.getAllByRole("menuitemradio");
    expect(options.map((option) => option.textContent)).toEqual(["Light", "Dark", "System"]);
    expect(screen.getByRole("menuitemradio", { name: "System" })).toBeChecked();
  });

  it("choosing Dark switches the theme and remembers it on this device", async () => {
    const { events, trigger } = await openMenu(priya);
    await events.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    await events.click(trigger);
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeChecked();
  });

  it.each([
    { item: "My profile", user: priya, href: "/?view=week&bu=west&profile=me" },
    { item: "Admin", user: tom, href: "/?view=week&bu=west&admin=teams" },
  ])("$item links to its dialog, keeping the calendar's URL", async ({ item, user, href }) => {
    await openMenu(user);
    expect(screen.getByRole("menuitem", { name: item })).toHaveAttribute("href", href);
  });

  it("Sign out calls the sign-out action", async () => {
    const { events } = await openMenu(priya);
    await events.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("the keyboard opens it, arrows move through it and Esc closes it", async () => {
    const { events, trigger } = await openMenu(priya);
    await events.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    // Opening from the keyboard puts focus on the first item.
    await events.keyboard("{Enter}");
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toHaveFocus();
    await events.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveFocus();
  });

  it("has no accessibility violations when open", async () => {
    const { menu } = await openMenu(tom);
    const results = await axe.run(menu);
    expect(results.violations).toEqual([]);
  });
});
