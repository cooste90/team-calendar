import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import type { FilterOption } from "@/domain/filter-options";
import { GridTestProviders } from "../grid/grid-test-providers";
import { CalendarFilters } from "./calendar-filters";

const teamOptions: FilterOption[] = [
  { id: "ops", name: "Operations", group: null },
  { id: "legal", name: "Legal", group: null },
  { id: "estates", name: "Estates", group: null },
];

const personOptions: FilterOption[] = [
  { id: "ben", name: "Ben Carter", group: "Operations" },
  { id: "priya", name: "Priya Shah", group: "Operations" },
  { id: "dan", name: "Dan Evans", group: "Legal" },
];

// searchParams is the URL to start from; onUrlUpdate reports each change to it.
function renderFilters(searchParams?: Record<string, string>) {
  const user = userEvent.setup();
  const onUrlUpdate = vi.fn();
  const { container } = render(
    <GridTestProviders searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <CalendarFilters teamOptions={teamOptions} personOptions={personOptions} />
    </GridTestProviders>,
  );
  const lastUrl = () => onUrlUpdate.mock.lastCall?.[0].queryString;
  return { user, container, lastUrl };
}

// The text of each option or chip inside an element (the whole page if none is given).
function texts(role: "option" | "listitem", inside: HTMLElement = document.body) {
  return within(inside)
    .getAllByRole(role)
    .map((element) => element.textContent);
}

describe("the filters", () => {
  it.each([
    [{}, "Teams"],
    [{ teams: "ops,legal" }, "Teams, 2 selected"],
  ])("with %j in the URL the button is called %s", (searchParams, name) => {
    renderFilters(searchParams);
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("ticking a team adds it to the URL", async () => {
    const { user, lastUrl } = renderFilters();
    await user.click(screen.getByRole("button", { name: "Teams" }));
    await user.click(screen.getByRole("option", { name: "Legal" }));
    expect(screen.getByRole("option", { name: "Legal" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(lastUrl()).toBe("?teams=legal"));
  });

  it("typing narrows the list, and the search box has focus when it opens", async () => {
    const { user } = renderFilters();
    await user.click(screen.getByRole("button", { name: "Teams" }));
    expect(screen.getByRole("combobox", { name: "Search teams" })).toHaveFocus();
    await user.keyboard("es");
    expect(texts("option")).toEqual(["Estates"]);
  });

  it("↓ moves to the next option and Enter ticks it", async () => {
    const { user, lastUrl } = renderFilters();
    await user.click(screen.getByRole("button", { name: "Teams" }));
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(lastUrl()).toBe("?teams=legal"));
  });

  it("a chip's Remove button unticks it", async () => {
    const { user, lastUrl } = renderFilters({ teams: "ops,legal" });
    await user.click(screen.getByRole("button", { name: "Teams, 2 selected" }));
    const chips = screen.getByRole("list", { name: "Chosen teams" });
    expect(texts("listitem", chips)).toEqual(["Operations", "Legal"]);
    await user.click(screen.getByRole("button", { name: "Remove Legal" }));
    await waitFor(() => expect(lastUrl()).toBe("?teams=ops"));
  });

  it("Clear unticks them all, and Done closes it with focus back on the button", async () => {
    const { user, lastUrl } = renderFilters({ teams: "ops,legal" });
    await user.click(screen.getByRole("button", { name: "Teams, 2 selected" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(lastUrl()).toBe(""));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teams" })).toHaveFocus();
  });

  it("Esc closes it with focus back on the button", async () => {
    const { user } = renderFilters();
    await user.click(screen.getByRole("button", { name: "People" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "People" })).toHaveFocus();
  });

  it("lists people under their team", async () => {
    const { user } = renderFilters();
    await user.click(screen.getByRole("button", { name: "People" }));
    const legal = screen.getByRole("group", { name: "Legal" });
    expect(texts("option", legal)).toEqual(["Dan Evans"]);
  });

  it("has no accessibility violations while open", async () => {
    const { user, container } = renderFilters({ people: "ben" });
    await user.click(screen.getByRole("button", { name: "People, 1 selected" }));
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
