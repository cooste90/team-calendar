import { PDFParse } from "pdf-parse";
import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/domain/permissions";
import { renderAttendancePdf } from "@/features/export/pdf/render-attendance-pdf";
import { db } from "@/server/db";
import { getAttendanceSheet } from "@/server/queries/attendance-sheet";
import { getBusinessUnitBySlug } from "@/server/queries/business-units";
import { seedDatabase } from "../../prisma/seed/seed-database";
import { annualLeave, createPeople, insertRow } from "./helpers/people";

// Wednesday 12 June 2030: this week is Sunday 9 to Saturday 15 June.
const TODAY = "2030-06-12";

async function pdfText(pdf: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(pdf) });
  const result = await parser.getText();
  await parser.destroy();
  return { text: result.text, pages: result.total };
}

describe("the attendance sheet PDF (spec §10)", () => {
  let actors: Record<string, Actor> = {};

  beforeEach(async () => {
    actors = await createPeople();
    await insertRow(annualLeave("priya", "2030-06-10", "2030-06-11"));
  });

  async function westSheet(actor: Actor, range: "today" | "this-week") {
    const west = await getBusinessUnitBySlug(actor, "west");
    return getAttendanceSheet(actor, west, range, TODAY);
  }

  it("shows the BU, the seven days, the teams and people in order, and their codes", async () => {
    const sheet = await westSheet(actors.tom, "this-week");
    expect(sheet.filename).toBe("westcal-attendance-west-2030-06-09.pdf");
    const { text, pages } = await pdfText(await renderAttendancePdf(sheet));

    expect(pages).toBe(1);
    expect(text).toContain("Attendance check · West");
    expect(text).toContain("Week of Sunday 9 to Saturday 15 June 2030");
    for (const day of ["Sun 9", "Mon 10", "Tue 11", "Wed 12", "Thu 13", "Fri 14", "Sat 15"]) {
      expect(text).toContain(day);
    }
    // Ops (Ben, Priya, Tom by surname) comes before Legal (Dan): the admin order.
    // (Read after the day headers: "by Test tom" is in the sheet's header too.)
    const table = text.slice(text.indexOf("Sat 15"));
    const order = ["Ops (3)", "Test ben", "Test priya", "Test tom", "Legal (1)", "Test dan"];
    const positions = order.map((name) => table.indexOf(name));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(text).toContain("AL");
    expect(text).toContain("Page 1 of 1");
  });

  it("leaves Unassigned people out", async () => {
    const { text } = await pdfText(
      await renderAttendancePdf(await westSheet(actors.tom, "this-week")),
    );
    expect(text).not.toContain("Test newbie");
  });

  it("today's sheet names the day", async () => {
    const { text } = await pdfText(await renderAttendancePdf(await westSheet(actors.tom, "today")));
    expect(text).toContain("Attendance check · West · Wednesday 12 June 2030");
    expect(text).toContain("Test priya");
  });

  it("only admins of the BU and super admins can print it", async () => {
    await expect(westSheet(actors.priya, "this-week")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(westSheet(actors.grace, "this-week")).resolves.toMatchObject({
      businessUnitName: "West",
    });
  });
});

it("the default seed's West Operations prints its week on one A4 page", async () => {
  await seedDatabase({ size: "default", today: TODAY });
  const admin = await db.user.findFirstOrThrow({
    where: { role: "ADMIN", businessUnit: { slug: "west-operations" } },
  });
  const actor: Actor = {
    id: admin.id,
    role: "ADMIN",
    businessUnitId: admin.businessUnitId ?? "",
    teamId: admin.teamId,
  };
  const west = await getBusinessUnitBySlug(actor, "west-operations");
  const sheet = await getAttendanceSheet(actor, west, "this-week", TODAY);
  const { pages } = await pdfText(await renderAttendancePdf(sheet));
  expect(sheet.rows.filter((row) => row.kind === "person").length).toBeGreaterThan(45);
  expect(pages).toBe(1);
});
