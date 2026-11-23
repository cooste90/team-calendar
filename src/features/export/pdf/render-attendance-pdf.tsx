// Turns an attendance sheet into the PDF file's bytes: the week layout for a week, the
// one-column-of-status layout for today.
import "server-only";
import "./fonts";
import { renderToBuffer } from "@react-pdf/renderer";
import type { AttendanceSheet } from "@/server/queries/attendance-sheet";
import { TodaySheet } from "./today-sheet";
import { WeekSheet } from "./week-sheet";

export function renderAttendancePdf(sheet: AttendanceSheet): Promise<Buffer> {
  if (sheet.range === "today") return renderToBuffer(<TodaySheet sheet={sheet} />);
  return renderToBuffer(<WeekSheet sheet={sheet} />);
}
