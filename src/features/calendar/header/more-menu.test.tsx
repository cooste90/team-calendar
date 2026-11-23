import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { downloadAttendancePdf } from "@/features/export/download-attendance-pdf";
import { GridTestProviders } from "../grid/grid-test-providers";
import { MoreMenu } from "./more-menu";

vi.mock("@/features/export/download-attendance-pdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/export/download-attendance-pdf")>()),
  downloadAttendancePdf: vi.fn(),
}));

const teamOptions = [{ id: "legal", name: "Legal", group: null }];

// exportSlug is the BU an admin can export; null for everyone else.
function renderMenu(exportSlug: string | null = null) {
  const user = userEvent.setup();
  render(
    <GridTestProviders searchParams={{ teams: "legal" }}>
      <MoreMenu teamOptions={teamOptions} personOptions={[]} exportSlug={exportSlug} />
    </GridTestProviders>,
  );
  return { user, moreButton: screen.getByRole("button", { name: "More" }) };
}

describe("Export PDF in the More menu", () => {
  it("isn't there for someone who can't export", async () => {
    const { user, moreButton } = renderMenu(null);
    await user.click(moreButton);
    expect(screen.queryByRole("menuitem", { name: /Export PDF/ })).toBeNull();
  });

  it("downloads the chosen sheet for the BU on screen", async () => {
    const { user, moreButton } = renderMenu("west-operations");
    await user.click(moreButton);
    await user.click(screen.getByRole("menuitem", { name: "Export PDF: next week" }));
    expect(downloadAttendancePdf).toHaveBeenCalledWith("west-operations", "next-week");
  });
});

describe("the More menu on a narrow header", () => {
  it("More › Key shows the leave types in a dialog, and closing it goes back to More", async () => {
    const { user, moreButton } = renderMenu();
    await user.click(moreButton);
    await user.click(screen.getByRole("menuitem", { name: "Key" }));

    const dialog = screen.getByRole("dialog", { name: "Leave types" });
    expect(within(dialog).getByText("Annual leave")).toBeInTheDocument();

    // The menu item that opened it has gone, so focus goes back to More.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(moreButton).toHaveFocus());
  });

  it("More › Teams opens the team filter in a dialog, with focus in its search box", async () => {
    const { user, moreButton } = renderMenu();
    await user.click(moreButton);
    await user.click(screen.getByRole("menuitem", { name: "Teams, 1 selected" }));

    const dialog = screen.getByRole("dialog", { name: "Teams" });
    expect(within(dialog).getByRole("combobox", { name: "Search teams" })).toHaveFocus();
    expect(within(dialog).getByRole("option", { name: "Legal" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
