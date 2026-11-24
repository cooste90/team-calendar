import { expect, test } from "@playwright/test";

// Against a production build (playwright.production.config.ts). None of these requests
// need the database.

test.describe("the dev-only pages don't exist in production", () => {
  for (const path of ["/dev-sign-in", "/dev/design-system"]) {
    test(`${path} is not found`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
    });
  }

  test("the dev sign-in endpoint is not found", async ({ request, baseURL }) => {
    const response = await request.post("/api/auth/dev-sign-in", {
      data: {},
      headers: { origin: baseURL ?? "" },
    });
    expect(response.status()).toBe(404);
  });
});

test("a production page runs without breaking the Content Security Policy", async ({ page }) => {
  // Chrome reports each blocked script, style or request in the console.
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  // "load" waits for every script, Next's inline ones included, so any that were
  // blocked have been reported by then.
  await page.goto("/accessibility", { waitUntil: "load" });
  await expect(page.getByRole("link", { name: "Go to the calendar" })).toBeVisible();
  expect(violations).toEqual([]);
});

test("production pages are sent with HSTS, and the policy doesn't allow eval", async ({
  request,
}) => {
  const response = await request.get("/accessibility");
  const headers = response.headers();
  expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  expect(headers["content-security-policy"]).toContain("script-src 'self' 'unsafe-inline'");
  expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
});
