import { toast } from "sonner";
import type { SheetRange } from "@/domain/attendance-sheet";

// The choices in the header's Export PDF menu, and in More on a narrow screen.
export const EXPORT_RANGES: { range: SheetRange; label: string }[] = [
  { range: "today", label: "Today" },
  { range: "this-week", label: "This week" },
  { range: "next-week", label: "Next week" },
];

// Fetches the attendance sheet and saves it, with a toast while it's being made (spec §10).
// A plain link couldn't show "Preparing PDF…" or say when it failed.
export async function downloadAttendancePdf(businessUnitSlug: string, range: SheetRange) {
  const toastId = toast.loading("Preparing PDF…");
  const query = new URLSearchParams({ bu: businessUnitSlug, range });
  const response = await fetch(`/api/export/attendance?${query}`);
  if (!response.ok) {
    toast.error("The PDF couldn't be made. Please try again.", { id: toastId });
    return;
  }
  // The server names the file, e.g. westcal-attendance-west-operations-2026-11-08.pdf.
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="(.+)"/.exec(disposition)?.[1] ?? "westcal-attendance.pdf";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(await response.blob());
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("PDF downloaded.", { id: toastId });
}
