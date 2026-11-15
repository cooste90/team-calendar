import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import type { View } from "@/domain/dates";
import { PeriodNav } from "./period-nav";

const TODAY = "2026-11-14";

function renderNav(view: View, anchor: string) {
  const onNavigate = vi.fn();
  const { container } = render(
    <PeriodNav view={view} anchor={anchor} today={TODAY} onNavigate={onNavigate} />,
  );
  return { onNavigate, container };
}

describe("PeriodNav", () => {
  it.each([
    { view: "week", anchor: "2026-11-15", button: "Previous week", goesTo: "2026-11-08" },
    { view: "week", anchor: "2026-11-15", button: "Next week", goesTo: "2026-11-22" },
    { view: "month", anchor: "2026-11-01", button: "Previous month", goesTo: "2026-10-01" },
    { view: "month", anchor: "2026-11-01", button: "Next month", goesTo: "2026-12-01" },
    { view: "week", anchor: "2026-11-15", button: "Today", goesTo: null },
  ] as const)("$button from $anchor ($view view) goes to $goesTo", async ({
    view,
    anchor,
    button,
    goesTo,
  }) => {
    const { onNavigate } = renderNav(view, anchor);
    await userEvent.click(screen.getByRole("button", { name: button }));
    expect(onNavigate).toHaveBeenCalledWith(goesTo);
  });

  it.each([
    { view: "week", select: "Month", option: "January", goesTo: "2025-12-28" }, // week of 1 Jan 2026
    { view: "week", select: "Year", option: "2027", goesTo: "2027-10-31" }, // week of 1 Nov 2027
    { view: "month", select: "Month", option: "January", goesTo: "2026-01-01" },
  ] as const)("choosing $option in the $select list ($view view) goes to $goesTo", async ({
    view,
    select,
    option,
    goesTo,
  }) => {
    const { onNavigate } = renderNav(view, "2026-11-15");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: select }), option);
    expect(onNavigate).toHaveBeenCalledWith(goesTo);
  });

  it("offers years from 5 before to 5 after the current year", () => {
    renderNav("week", "2026-11-15");
    const years = screen.getAllByRole("option").map((option) => option.textContent);
    expect(years.filter((text) => /^\d{4}$/.test(text ?? ""))).toEqual([
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
      "2031",
    ]);
  });

  it("shows the period's month and year, and has no accessibility violations", async () => {
    const { container } = renderNav("week", "2026-11-15");
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveValue("11");
    expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2026");
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
