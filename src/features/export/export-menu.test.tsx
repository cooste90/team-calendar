import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAttendancePdf } from "./download-attendance-pdf";
import { ExportMenu } from "./export-menu";

vi.mock("sonner", () => ({
  toast: { loading: vi.fn(() => "toast-1"), success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// A fake server answer, e.g. the PDF, or a refusal.
function serverAnswers(response: Response) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("the Export PDF menu", () => {
  it("offers today, this week and next week, and downloads the one chosen", async () => {
    const fetch = serverAnswers(new Response("%PDF"));
    const user = userEvent.setup();
    render(<ExportMenu businessUnitSlug="west-operations" />);

    await user.click(screen.getByRole("button", { name: "Export PDF" }));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Today",
      "This week",
      "Next week",
    ]);
    await user.click(screen.getByRole("menuitem", { name: "This week" }));
    expect(fetch).toHaveBeenCalledWith("/api/export/attendance?bu=west-operations&range=this-week");
  });
});

describe("downloadAttendancePdf", () => {
  it("says it's preparing, saves the file under the server's name, then says it's done", async () => {
    serverAnswers(
      new Response("%PDF", {
        headers: {
          "Content-Disposition": 'attachment; filename="westcal-attendance-west-2026-11-22.pdf"',
        },
      }),
    );
    // Instead of saving, note the name the file would be saved under.
    let savedAs = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedAs = this.download;
    });

    await downloadAttendancePdf("west", "this-week");
    expect(toast.loading).toHaveBeenCalledWith("Preparing PDF…");
    expect(savedAs).toBe("westcal-attendance-west-2026-11-22.pdf");
    expect(toast.success).toHaveBeenCalledWith("PDF downloaded.", { id: "toast-1" });
  });

  it("says so when the server refuses", async () => {
    serverAnswers(new Response("No", { status: 403 }));
    await downloadAttendancePdf("west", "today");
    expect(toast.error).toHaveBeenCalledWith("The PDF couldn't be made. Please try again.", {
      id: "toast-1",
    });
  });
});
