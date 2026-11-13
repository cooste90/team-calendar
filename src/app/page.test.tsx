import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, it } from "vitest";
import Home from "./page";

it("shows the WestCal heading with no accessibility violations", async () => {
  const { container } = render(<Home />);

  expect(screen.getByRole("heading", { name: "WestCal" })).toBeInTheDocument();
  expect((await axe.run(container)).violations).toEqual([]);
});
