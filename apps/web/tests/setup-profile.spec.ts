import { expect, test, type Locator } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow } from "./helpers";

/** Answers the open question in whichever of the four forms it takes: cards or a scale of radios, a split of ten shares, or a ranking. */
async function answer(questions: Locator, pick: number): Promise<void> {
  const ranks = questions.locator(".answer-rank__option");
  if ((await ranks.count()) > 0) {
    const again = questions.getByRole("button", { name: "Start the order again", exact: true });
    if (await again.isVisible()) await again.click();
    await ranks.nth(pick % 3).click();
    await ranks.nth((pick + 1) % 3).click();
    return;
  }
  const slider = questions.getByRole("slider");
  if ((await slider.count()) > 0) {
    await slider.fill(String([2, 8, 3][pick % 3]));
    return;
  }
  await questions.getByRole("radio").nth(pick % 3).check();
}

test("Short setup keeps identity, party, school and appointments on a compact path", async ({ page }) => {
  await page.goto("/founding");
  await page.getByRole("button", { name: "Choose Short setup", exact: true }).click();
  await page.getByLabel("Name on the oath").fill("Morgan Vale");
  await page.getByRole("group", { name: "Party", exact: true }).getByRole("radio", { name: "Independent", exact: true }).check();
  await page.getByRole("group", { name: "Governing style", exact: true }).getByRole("radio", { name: /^Diplomacy-first/ }).check();
  await page.getByRole("group", { name: "Alma mater", exact: true }).getByRole("radio", { name: "Harvard University", exact: true }).check();
  await expectNoHorizontalOverflow(page, "Short setup identity");
  for (const title of ["The ticket", "The Cabinet", "The oath"]) {
    await page.getByRole("button", { name: `Next: ${title}`, exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Take the oath", exact: true }).click();
  await confirmReview(page);
  await page.waitForURL("**/brief");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "President’s Brief", exact: true })).toBeVisible();
});

test("Long setup requires 20 answers, supports review, and reaches the same appointment journey", async ({ page }) => {
  await page.goto("/founding");
  await page.getByRole("button", { name: "Choose Long setup", exact: true }).click();
  await page.getByLabel("Name on the oath").fill("Alex Mercer");
  await page.getByRole("button", { name: "The oath", exact: true }).click();
  await expect(page.getByRole("button", { name: "Take the oath", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Complete your leadership profile", exact: true }).click();
  for (let index = 0; index < 20; index++) {
    await expect(page.getByText(new RegExp(`Question ${index + 1} of 20$`))).toBeVisible();
    const questions = page.getByRole("region", { name: "Leadership questionnaire", exact: true });
    await answer(questions, index);
    await expectNoHorizontalOverflow(page, `Question ${index + 1}`);
    await page.getByRole("button", { name: index < 19 ? "Next question" : "See what your answers add up to", exact: true }).click();
  }
  await expect(page.getByRole("heading", { level: 3, name: "What your answers add up to", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change your answers", exact: true }).click();
  await answer(page.getByRole("region", { name: "Leadership questionnaire", exact: true }), 1);
  await page.getByRole("button", { name: "The oath", exact: true }).click();
  await expect(page.getByRole("button", { name: "Take the oath", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Complete your leadership profile", exact: true }).click();
  for (let index = 0; index < 19; index++) await page.getByRole("button", { name: "Next question", exact: true }).click();
  await page.getByRole("button", { name: "See what your answers add up to", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your governing style", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: /^Independent / }).check();
  await page.getByRole("button", { name: "Next: The ticket", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "The ticket", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "The Cabinet", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "The Cabinet", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next: The oath", exact: true }).click();
  await page.getByRole("button", { name: "Take the oath", exact: true }).click();
  await confirmReview(page);
  await page.waitForURL("**/brief");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "President’s Brief", exact: true })).toBeVisible();
});
