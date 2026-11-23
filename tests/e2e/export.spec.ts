import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

// The attendance sheet PDF (spec §10).

test("an admin exports this week's attendance sheet as a PDF", async ({ page }) => {
  await signInAs(page, "Tom Okafor");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "This week" }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toMatch(
    /^westcal-attendance-west-operations-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  const stream = await download.createReadStream();
  let size = 0;
  for await (const chunk of stream) size += chunk.length;
  expect(size).toBeGreaterThan(10_000);
  await expect(page.getByText("PDF downloaded.")).toBeVisible();
});

test("a regular user has no Export PDF, and the server refuses them", async ({ page }) => {
  await signInAs(page, "Priya Shah");
  await expect(page.getByRole("button", { name: "Export PDF" })).toHaveCount(0);
  const response = await page.request.get(
    "/api/export/attendance?bu=west-operations&range=this-week",
  );
  expect(response.status()).toBe(403);
});
