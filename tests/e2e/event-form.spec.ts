import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

// The booking form, opened from the design system gallery with made-up data until the
// grid opens it (T25).
const url = "/dev/design-system";

for (const theme of ["light", "dark"] as const) {
  test(`the booking form has no accessibility violations (${theme})`, async ({ page }) => {
    await page.goto(url);
    await page.getByRole("button", { name: "Add event (today)" }).click();
    await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Edit event (started)" }).click();
    await expect(page.getByRole("dialog", { name: "Edit event" })).toBeVisible();
    await expectNoA11yViolations(page, { theme });
  });
}

test("the arrow keys choose a leave type", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Add event (today)" }).click();
  await page.getByRole("radio", { name: "AL Annual leave" }).focus();
  // Radix picks the type the arrow lands on while the key is still held, which a person's
  // key press always is. keyboard.press() lets go too quickly, so hold it until it's picked.
  await page.keyboard.down("ArrowRight");
  await expect(page.getByRole("radio", { name: "FL Flexi leave" })).toBeChecked();
  await page.keyboard.up("ArrowRight");
});

test("on a phone-sized screen it fills the screen and the buttons stay in view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(url);
  await page.getByRole("button", { name: "Add event (today)" }).click();
  const dialog = page.getByRole("dialog", { name: "Add event" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeInViewport();
  // Once its zoom-in animation has finished, it's the full width of the screen.
  await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(320);
  await expectNoA11yViolations(page, { theme: "light" });
});
