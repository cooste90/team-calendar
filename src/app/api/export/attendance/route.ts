import type { NextRequest } from "next/server";
import { z } from "zod";
import { canExport } from "@/domain/permissions";
import { renderAttendancePdf } from "@/features/export/pdf/render-attendance-pdf";
import { getAttendanceSheet } from "@/server/queries/attendance-sheet";
import { getBusinessUnitBySlug } from "@/server/queries/business-units";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

// The PDF library needs Node, not the edge runtime.
export const runtime = "nodejs";

const querySchema = z.object({
  bu: z.string().min(1).max(64), // a business unit's slug
  range: z.enum(["today", "this-week", "next-week"]),
});

// GET /api/export/attendance?bu=west-operations&range=this-week: the printed attendance
// sheet as a PDF download (spec §10), for admins of that BU. The proxy turns away requests
// with no session cookie; requireUser checks the session is real.
export async function GET(request: NextRequest) {
  const actor = await requireUser();
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) {
    return new Response("Choose a business unit and today, this week or next week.", {
      status: 400,
    });
  }
  // A BU they can't see comes back as their own, which isn't what they asked for.
  const businessUnit = await getBusinessUnitBySlug(actor, query.data.bu);
  if (businessUnit.slug !== query.data.bu || !canExport(actor, businessUnit.id)) {
    return new Response("You can't print this business unit's sheets.", { status: 403 });
  }

  const sheet = await getAttendanceSheet(actor, businessUnit, query.data.range, serverToday());
  const pdf = await renderAttendancePdf(sheet);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sheet.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
