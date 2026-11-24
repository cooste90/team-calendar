import { expect, type Page, test } from "@playwright/test";
import { addLeave, dayCell, futureWeek, leaveBars, openWeek } from "../grid-helpers";
import { signInAs } from "../sign-in";

// How the app copes with people's display settings (accessibility §1, §5): reduced
// motion, Windows High Contrast, zoom, wider text spacing, and target sizes.

// WCAG 2.5.8: a target under 24×24px passes if a 24px circle on its centre doesn't touch
// any other target (or another small target's circle). Links inside a sentence are
// exempt. Returns a description of each target that fails.
function smallTargets(page: Page) {
  return page.evaluate(() => {
    const selector =
      "a[href], button, input, select, textarea, [role=button], [role=gridcell][tabindex], [role=option], [role=menuitem], [role=menuitemradio], [role=radio], [role=tab]";

    // Something a pointer can actually hit. Radix's hidden form inputs have
    // pointer-events: none, so they don't count.
    function isTarget(element: HTMLElement) {
      if (!element.checkVisibility() || element.closest(".sr-only")) return false;
      if (getComputedStyle(element).pointerEvents === "none") return false;
      const linkInSentence = element.tagName === "A" && element.closest("p");
      return !linkInSentence;
    }

    // A checkbox inside its <label>: clicking the words ticks it too, so the whole label
    // is the target (as WCAG's Understanding 2.5.8 counts it).
    function targetBox(element: HTMLElement) {
      const label = (element as HTMLInputElement).labels?.[0];
      return (label?.contains(element) ? label : element).getBoundingClientRect();
    }

    // 23.5, not 24: boxes sized in rem can come out a fraction of a pixel short.
    const isSmall = (box: DOMRect) => box.width < 23.5 || box.height < 23.5;
    const centre = (box: DOMRect) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    // How far a point is from a box (0 when it's inside).
    const distance = (point: { x: number; y: number }, box: DOMRect) =>
      Math.hypot(
        Math.max(box.left - point.x, 0, point.x - box.right),
        Math.max(box.top - point.y, 0, point.y - box.bottom),
      );

    const targets = [...document.querySelectorAll<HTMLElement>(selector)]
      .filter(isTarget)
      .map((element) => ({ element, box: targetBox(element) }));

    function isCrowded(target: (typeof targets)[number]) {
      const point = centre(target.box);
      return targets.some((other) => {
        // Itself, or a target inside it (or the other way round), isn't a neighbour.
        if (other.element.contains(target.element) || target.element.contains(other.element)) {
          return false;
        }
        if (isSmall(other.box)) {
          const otherPoint = centre(other.box);
          return Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y) < 24;
        }
        return distance(point, other.box) < 12;
      });
    }

    return targets
      .filter((target) => isSmall(target.box) && isCrowded(target))
      .map(({ element, box }) => {
        const name = element.getAttribute("aria-label") ?? element.textContent?.trim();
        return `${element.tagName} "${name}" ${box.width.toFixed(1)}×${box.height.toFixed(1)}`;
      });
  });
}

// Text that's cut off: wider or taller than its box, with the overflow hidden and no
// "…" to show it on purpose.
function clippedText(page: Page) {
  return page.evaluate(() => {
    const selector =
      "button, label, p, h1, h2, h3, [role=tab], [role=menuitem], [role=option], [role=columnheader], [role=rowheader]";
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => element.checkVisibility() && !element.closest(".sr-only"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const hidesOverflow = style.overflowX !== "visible" || style.overflowY !== "visible";
        const tooBig =
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1;
        return hidesOverflow && tooBig && style.textOverflow !== "ellipsis";
      })
      .map((element) => `${element.tagName} "${element.textContent?.trim().slice(0, 40)}"`);
  });
}

// WCAG 1.4.12's text spacing, forced on everything.
const TEXT_SPACING = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`;

test("with reduced motion, nothing is still animating after booking, popovers and dialogs", async ({
  page,
}) => {
  const week = futureWeek(54);
  const running = () => page.evaluate(() => document.getAnimations().length);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);

  await page.getByRole("radio", { name: "Month" }).click(); // the grid's fade-in
  await expect.poll(running).toBe(0);
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.tuesday, week.wednesday); // the bar's grow
  await expect.poll(running).toBe(0);
  await page.getByRole("button", { name: "Key" }).click(); // a popover
  await expect.poll(running).toBe(0);
  await page.keyboard.press("Escape");
  await leaveBars(page, "Priya Shah").click(); // the booking's details
  await expect.poll(running).toBe(0);
});

test("in Windows High Contrast, the grid, booking form and popovers are drawn with system colours", async ({
  page,
}, testInfo) => {
  const week = futureWeek(55);
  await page.emulateMedia({ forcedColors: "active" });
  await signInAs(page, "Priya Shah");
  await openWeek(page, week.sunday);
  await addLeave(page, "Priya Shah", week.tuesday, week.wednesday);

  const shot = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot(), contentType: "image/png" });
  await shot("forced-colours-grid");
  await dayCell(page, "Priya Shah", week.thursday).click();
  await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
  await shot("forced-colours-booking-form");
  await page.keyboard.press("Escape");
  await leaveBars(page, "Priya Shah").click();
  await shot("forced-colours-booking-details");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Key" }).click();
  await shot("forced-colours-key");

  // Bars keep a visible border, so they don't vanish into the background.
  await expect(page.locator("[data-booking]").first()).toHaveCSS("border-top-style", "solid");
});

// 1280×800 at 200% and 400% zoom.
for (const size of [
  { width: 640, height: 400 },
  { width: 320, height: 256 },
]) {
  test(`at ${size.width}×${size.height} the page doesn't scroll sideways and every header action is reachable`, async ({
    page,
  }) => {
    await signInAs(page, "Tom Okafor");
    await page.setViewportSize(size);
    await page.goto("/?view=month");
    await expect(page.getByRole("grid")).toBeVisible();

    // Only the grid may scroll sideways, inside its own box.
    const widths = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      window: document.documentElement.clientWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.window);

    // Every header control fits across the screen (scrolling down to it is fine).
    const header = page.getByRole("banner");
    for (const control of await header.locator("button, select, a[href]").all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(size.width);
    }
    // The ones that don't fit are in More, Key and Export included.
    await header.getByRole("button", { name: "More" }).click();
    const more = page.getByRole("menu");
    await expect(more.getByRole("menuitem", { name: /^Key/ })).toBeVisible();
    await expect(more.getByRole("menuitem", { name: /Export PDF: this week/ })).toBeVisible();
  });
}

test("with WCAG text spacing, no labels, buttons or headings are cut off", async ({ page }) => {
  const week = futureWeek(56);
  await signInAs(page, "Tom Okafor");
  const screens = [
    { url: `/?view=week&date=${week.sunday}`, shows: page.getByRole("grid") },
    { url: "/?profile=me", shows: page.getByRole("dialog", { name: "My profile" }) },
    { url: "/?admin=teams", shows: page.getByRole("dialog", { name: /^Admin · / }) },
  ];
  for (const { url, shows } of screens) {
    await page.goto(url);
    await expect(shows).toBeVisible();
    await page.addStyleTag({ content: TEXT_SPACING });
    expect(await clippedText(page), url).toEqual([]);
  }

  // And the booking form, opened from the week.
  await openWeek(page, week.sunday);
  await page.addStyleTag({ content: TEXT_SPACING });
  await dayCell(page, "Tom Okafor", week.tuesday).click();
  await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
  expect(await clippedText(page)).toEqual([]);
});

test("every target is at least 24×24px, or has room around it", async ({ page }) => {
  const week = futureWeek(57);
  await signInAs(page, "Tom Okafor");
  const screens = [
    { url: `/?view=week&date=${week.sunday}`, shows: page.getByRole("grid") },
    { url: "/?view=month", shows: page.getByRole("grid") },
    { url: "/?admin=users", shows: page.getByRole("dialog", { name: /^Admin · / }) },
  ];
  for (const { url, shows } of screens) {
    await page.goto(url);
    await expect(shows).toBeVisible();
    expect(await smallTargets(page), url).toEqual([]);
  }

  // The booking form and an open filter, from the week.
  await openWeek(page, week.sunday);
  await dayCell(page, "Tom Okafor", week.tuesday).click();
  await expect(page.getByRole("dialog", { name: "Add event" })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "People", exact: true }).click();
  await page.getByRole("listbox", { name: "People" }).getByRole("option").first().click();
  expect(await smallTargets(page)).toEqual([]);
});
