import { expect, test } from "@playwright/test";
import { dayCell, futureWeek, openWeek } from "./grid-helpers";
import { signInAs } from "./sign-in";

// The security headers from next.config.ts (T36), and a walk through the main screens
// with the browser's Content Security Policy watching for anything it would block.

test("every page is sent with the security headers", async ({ request }) => {
  const response = await request.get("/sign-in");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("the main screens break no part of the Content Security Policy", async ({ page }) => {
  // Chrome reports each blocked script, style or request in the console.
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  const week = futureWeek(59);
  await signInAs(page, "Tom Okafor");
  await openWeek(page, week.sunday);
  await page.getByRole("button", { name: "Key" }).click();
  await page.keyboard.press("Escape");
  await dayCell(page, "Tom Okafor", week.tuesday).click();
  await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
  await page.keyboard.press("Escape");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  await page.getByRole("menuitem", { name: "This week" }).click();
  await download;

  await page.goto("/?profile=me");
  await expect(page.getByRole("dialog", { name: "My profile" })).toBeVisible();
  await page.goto("/?admin=teams");
  await expect(page.getByRole("dialog", { name: /^Admin · / })).toBeVisible();
  await page.goto("/accessibility");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(violations).toEqual([]);
});
