import { test, expect } from "@playwright/test";

// Regression guard for the Flow Runner three-zone redesign: the pose cue is
// always shown in full (no More/Less toggle), the safety block (caution chip +
// Mod + Chair) is expanded by default, and the layout holds in both themes.
test("Flow Runner — Standing Side Bend readable in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // "Standing Strong (Energizing)" is routine 3.
  await page.goto("/run/3");

  const counter = page.getByText(/Pose 1 \/ \d+/);
  await expect(counter).toBeVisible();
  const total = Number((await counter.textContent())!.match(/Pose 1 \/ (\d+)/)![1]);

  // Walk forward until we land on Standing Side Bend.
  const heading = page.locator("h2").first();
  let found = false;
  for (let i = 0; i < total; i++) {
    const name = (await heading.textContent())?.trim() ?? "";
    if (name === "Standing Side Bend") { found = true; break; }
    await page.getByRole("button", { name: "Next pose" }).click();
    await page.waitForTimeout(120);
  }
  expect(found, "Standing Side Bend should exist in routine 3").toBe(true);

  // The More/Less cue toggle must be gone entirely.
  await expect(page.getByRole("button", { name: /^More$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Less$/ })).toHaveCount(0);

  // Cue is a plain (non-italic) paragraph at a legible size, always fully shown.
  // Exclude the Mod/Chair safety lines, which are also <p> elements.
  const cue = page.locator("p").filter({ hasNotText: /^(Mod —|Chair —)/ }).first();
  await expect(cue).toBeVisible();
  expect(await cue.evaluate((el) => getComputedStyle(el).fontStyle)).toBe("normal");
  expect(await cue.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);

  // Safety block fully visible without any tap: caution chip + Mod + Chair.
  await expect(page.getByText(/Caution ·/).first()).toBeVisible();
  await expect(page.getByText(/^Mod —/).first()).toBeVisible();
  await expect(page.getByText(/^Chair —/).first()).toBeVisible();

  // Timer is large (>= 32px).
  const timer = page.getByText(/^\d+:\d\d$/).first();
  await expect(timer).toBeVisible();
  expect(await timer.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(32);

  // Toggle to the other theme — the same content must stay visible (layout is
  // shared; only the --runner-* color tokens change).
  await page.getByTitle("Toggle theme").click();
  await page.waitForTimeout(200);
  await expect(cue).toBeVisible();
  await expect(page.getByText(/Caution ·/).first()).toBeVisible();
  await expect(page.getByText(/^Mod —/).first()).toBeVisible();
  await expect(page.getByText(/^Chair —/).first()).toBeVisible();
});
