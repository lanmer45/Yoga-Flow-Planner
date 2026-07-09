import { test, expect, type Page } from "@playwright/test";

function uniqueTitle() {
  return "E2E Flow " + Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function addPoseToSection(page: Page, sectionIndex: number) {
  const addButtons = page.getByRole("button", { name: "Add Pose" });
  await addButtons.nth(sectionIndex).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Pose Bank")).toBeVisible();

  const firstPoseCard = sheet.locator(".cursor-pointer.bg-card").first();
  await firstPoseCard.click();

  await expect(page.getByText("Pose Bank")).toHaveCount(0);
}

test("create, save, run, and delete a routine end-to-end", async ({ page }) => {
  const title = uniqueTitle();

  await page.goto("/builder");
  await expect(page.getByLabel("Flow Title")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Centering", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flow", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closing", exact: true })).toBeVisible();

  await page.getByLabel("Flow Title").fill(title);

  await addPoseToSection(page, 0);
  await addPoseToSection(page, 1);
  await addPoseToSection(page, 2);

  await expect(page.getByText("Empty section. Tap to add a pose.")).toHaveCount(0);

  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForURL(/\/routines\/\d+$/);
  const detailUrl = page.url();
  const routineId = detailUrl.match(/\/routines\/(\d+)$/)![1];
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.goto(`/run/${routineId}`);
  const poseHeading = page.locator("h2").first();
  await expect(poseHeading).toBeVisible();
  const firstPoseName = (await poseHeading.textContent())?.trim();
  await expect(page.getByText(/Pose 1 of \d+/)).toBeVisible();

  const controls = page.locator("div.flex.items-center.justify-center.gap-8");
  const playPause = controls.locator("button").nth(1);
  const skipForward = controls.locator("button").nth(2);

  await playPause.click();
  await page.waitForTimeout(1500);
  await playPause.click();

  await expect(page.getByText(/Pose 1 of \d+/)).toBeVisible();
  await skipForward.click();
  await expect(page.getByText(/Pose 2 of \d+/)).toBeVisible();
  expect(firstPoseName).toBeTruthy();

  await page.goto(`/routines/${routineId}`);
  await page.locator("button.text-destructive").click();
  await expect(page.getByRole("alertdialog").getByText("Delete Flow?")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();

  await page.waitForURL(/\/$|\/$/);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});
