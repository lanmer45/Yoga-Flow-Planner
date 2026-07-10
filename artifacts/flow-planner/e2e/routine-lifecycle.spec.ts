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

test("edit an existing routine and never silently fail to save", async ({ page }) => {
  const title = uniqueTitle();
  const description = "Original focus " + Math.random().toString(36).slice(2, 8);

  // --- Seed a routine to edit ---
  await page.goto("/builder");
  await expect(page.getByLabel("Flow Title")).toBeVisible();
  await page.getByLabel("Flow Title").fill(title);
  await page.getByLabel("Description (optional)").fill(description);

  await addPoseToSection(page, 0);
  await addPoseToSection(page, 1);
  await expect(page.getByText("Empty section. Tap to add a pose.")).toHaveCount(1);

  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/routines\/\d+$/);
  const routineId = page.url().match(/\/routines\/(\d+)$/)![1];

  // --- Open the routine in the Builder and confirm pre-fill ---
  await page.goto(`/builder/${routineId}`);
  await expect(page.getByLabel("Flow Title")).toHaveValue(title);
  await expect(page.getByLabel("Description (optional)")).toHaveValue(description);
  // Two sections were filled, one (Closing) was left empty on create.
  await expect(page.getByText("Empty section. Tap to add a pose.")).toHaveCount(1);

  // --- Edit title, description, and fill the empty section ---
  const newTitle = title + " EDITED";
  const newDescription = description + " (revised)";
  await page.getByLabel("Flow Title").fill(newTitle);
  await page.getByLabel("Description (optional)").fill(newDescription);
  await addPoseToSection(page, 2);
  await expect(page.getByText("Empty section. Tap to add a pose.")).toHaveCount(0);

  await page.getByRole("button", { name: "Save" }).click();

  // --- Assert changes are reflected on the detail page ---
  await page.waitForURL(new RegExp(`/routines/${routineId}$`));
  await expect(page.getByRole("heading", { name: newTitle })).toBeVisible();
  await expect(page.getByText(newDescription, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Centering", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flow", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closing", exact: true })).toBeVisible();

  // --- Assert changes are reflected in the Library list ---
  await page.goto("/");
  await expect(page.getByText(newTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  // --- Cleanup ---
  await page.goto(`/routines/${routineId}`);
  await page.locator("button.text-destructive").click();
  await expect(page.getByRole("alertdialog").getByText("Delete Flow?")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForURL(/\/flows$/);
  await expect(page.getByText(newTitle, { exact: true })).toHaveCount(0);
});

test("prompts before losing unsaved edits on browser back", async ({ page }) => {
  await page.goto("/flows");
  await page.goto("/builder");
  await expect(page.getByLabel("Flow Title")).toBeVisible();

  await page.getByLabel("Flow Title").fill(uniqueTitle());
  await page.waitForTimeout(200);

  let dialogCount = 0;
  page.once("dialog", (dialog) => {
    dialogCount++;
    dialog.dismiss().catch(() => {});
  });
  await page.goBack();
  await page.waitForTimeout(400);
  expect(dialogCount).toBe(1);
  await expect(page).toHaveURL(/\/builder$/);

  page.once("dialog", (dialog) => {
    dialogCount++;
    dialog.accept().catch(() => {});
  });
  await page.goBack();
  await page.waitForTimeout(400);
  expect(dialogCount).toBe(2);
  await expect(page).toHaveURL(/\/flows$/);
});
