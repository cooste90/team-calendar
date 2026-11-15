import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { MoreMenu } from "./more-menu";

it("on a narrow header, More › Key shows the leave types in a dialog", async () => {
  const user = userEvent.setup();
  render(<MoreMenu />);
  const moreButton = screen.getByRole("button", { name: "More" });
  await user.click(moreButton);
  await user.click(screen.getByRole("menuitem", { name: "Key" }));

  const dialog = screen.getByRole("dialog", { name: "Leave types" });
  expect(within(dialog).getByText("Annual leave")).toBeInTheDocument();

  // Closing it puts focus back on More, since the menu item has gone.
  await user.keyboard("{Escape}");
  await waitFor(() => expect(moreButton).toHaveFocus());
});
