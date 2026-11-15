import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";
import { useCalendarStore } from "../calendar-store";
import { ShortcutsHelpDialog } from "../shortcuts-help-dialog";
import { KeyPopover } from "./key-popover";

beforeEach(() => {
  useCalendarStore.setState({ shortcutsHelpOpen: false });
});

// Longer than the key's 300ms close delay.
const waitPastCloseDelay = () => new Promise((resolve) => setTimeout(resolve, 400));

// One userEvent instance per test, so it remembers where the pointer is between steps.
function renderKey() {
  const user = userEvent.setup();
  const { container } = render(
    <>
      <button type="button">Somewhere else</button>
      <KeyPopover />
      <button type="button">After the key</button>
      <ShortcutsHelpDialog />
    </>,
  );
  return {
    user,
    container,
    keyButton: screen.getByRole("button", { name: "Key" }),
    elsewhere: screen.getByRole("button", { name: "Somewhere else" }),
  };
}

const theKey = () => screen.queryByRole("heading", { name: "Leave types" });

describe("KeyPopover", () => {
  it("opens when the pointer rests on the Key button", async () => {
    const { user, keyButton } = renderKey();
    await user.hover(keyButton);
    expect(await screen.findByRole("heading", { name: "Leave types" })).toBeInTheDocument();
    expect(keyButton).toHaveAttribute("aria-expanded", "true");
  });

  it("stays open while the pointer is over it, and closes once the pointer leaves", async () => {
    const { user, keyButton, elsewhere } = renderKey();
    await user.hover(keyButton);
    await user.hover(await screen.findByText("Wellbeing day"));
    await waitPastCloseDelay();
    expect(theKey()).toBeInTheDocument();

    await user.hover(elsewhere);
    await waitFor(() => expect(theKey()).not.toBeInTheDocument());
  });

  it("opens on keyboard focus, and Esc closes it with focus still on the Key button", async () => {
    const { user, keyButton } = renderKey();
    await user.tab();
    await user.tab();
    expect(keyButton).toHaveFocus();
    expect(theKey()).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(theKey()).not.toBeInTheDocument();
    expect(keyButton).toHaveFocus();
  });

  it("Tab goes into the key, and Esc from there puts focus back on the Key button", async () => {
    const { user, keyButton } = renderKey();
    keyButton.focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Keyboard shortcuts" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(keyButton).toHaveFocus();
    expect(theKey()).not.toBeInTheDocument();
  });

  it("Tab past the end of the key moves on and closes it", async () => {
    const { user, keyButton } = renderKey();
    keyButton.focus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "After the key" })).toHaveFocus();
    expect(theKey()).not.toBeInTheDocument();
  });

  it("a click outside closes a pinned key", async () => {
    const { user, keyButton, elsewhere } = renderKey();
    await user.click(keyButton);
    await user.click(elsewhere);
    expect(theKey()).not.toBeInTheDocument();
  });

  it("a click pins it open until another click", async () => {
    const { user, keyButton, elsewhere } = renderKey();
    await user.click(keyButton);
    expect(theKey()).toBeInTheDocument();

    await user.hover(elsewhere);
    await waitPastCloseDelay();
    expect(theKey()).toBeInTheDocument();

    await user.click(keyButton);
    expect(theKey()).not.toBeInTheDocument();
  });

  it("lists the 9 leave types with their codes and names", async () => {
    const { user, keyButton } = renderKey();
    await user.click(keyButton);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "AL Annual leave",
      "FL Flexi leave",
      "SK Sickness",
      "SL Special leave",
      "PL Parental leave",
      "WBD Wellbeing day",
      "OT Other",
      "WFH Working from home",
      "PH Public holiday",
    ]);
  });

  it("Keyboard shortcuts opens the help, and closing it goes back to the Key button", async () => {
    const { user, keyButton } = renderKey();
    await user.click(keyButton);
    await user.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(keyButton).toHaveFocus());
  });

  it("has no accessibility violations while open", async () => {
    const { user, container, keyButton } = renderKey();
    await user.click(keyButton);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
