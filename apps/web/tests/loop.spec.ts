import { expect, test, type Page } from "@playwright/test";
import { clearToContinue, confirmReview, expectInThumbReach, expectNoHorizontalOverflow, foundQuickly, importFixture, openFromNav } from "./helpers";

// The first playable: found, read the Brief, open a decision, compare it
// against leaving it unanswered, authorize an answer, read the receipt and
// the Record entry it wrote, and run the clock to the next stop. Every size
// in the config runs it, so phone and desktop prove the same loop.

const continueButton = (page: Page) => page.getByRole("button", { name: "Continue", exact: true });

/** Runs the clock until a decision is waiting, putting off the rows that hold it, as a player would. */
async function reachDecision(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const open = page.getByRole("link", { name: "Open the decision" });
    if (await open.isVisible().catch(() => false)) return;
    if (await continueButton(page).isEnabled()) {
      await continueButton(page).click();
      await expect(page.getByRole("heading", { level: 2, name: "While time ran" })).toBeVisible({ timeout: 60_000 });
      continue;
    }
    await page.locator(".queue__row", { hasText: "Holds time" }).getByRole("button", { name: "Put off" }).first().click();
    await confirmReview(page);
    await settled(page);
  }
  throw new Error("No decision reached the desk in sixteen moves of the clock.");
}

/** Waits for every press in flight to settle, which is when its act has been saved. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

/** Picks the first answer the comparison will authorize. */
async function pickAnAnswer(page: Page): Promise<void> {
  const verb = page.getByRole("button", { name: /^(Give this answer|Start preparing)$/ });
  const picks = page.locator(".ui-compare__pick input");
  const count = await picks.count();
  for (let index = 1; index < count; index += 1) {
    await picks.nth(index).check();
    if (await verb.isEnabled()) return;
  }
  throw new Error("No answer in the comparison could be authorized.");
}

test("the loop: Brief, decision, compare, authorize, receipt, Record, and Continue to the next stop", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await expectNoHorizontalOverflow(page, "brief");
  await expect(page.getByRole("region", { name: "President’s Brief", exact: true })).toBeVisible();
  await reachDecision(page);
  await expect(continueButton(page)).toBeDisabled();

  await page.getByRole("link", { name: "Open the decision" }).click();
  await page.waitForURL("**/brief/decision/**");
  const walkthrough = page.getByRole("dialog", { name: "The memo says what waiting costs" });
  await expect(walkthrough).toBeVisible();
  await walkthrough.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("dialog", { name: "Compare, then authorize" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const compare = page.getByRole("region", { name: "Compare the answers" });
  // The verb and its review are docked in the surface's foot, named for the comparison.
  const act = page.getByRole("group", { name: "Compare the answers" });
  await expect(compare.getByRole("radio", { name: /Leave it unanswered/ })).toBeChecked();
  await expect(act.getByRole("button", { name: /^(Give this answer|Start preparing)$/ })).toBeDisabled();
  await expect(act.getByText(/Leaving it unanswered costs what the first row shows|already charged this week/)).toBeVisible();
  await expectInThumbReach(page, act.getByRole("button"), "decision, opened");
  await expect(page.getByRole("region", { name: "Without answering" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "decision");

  await pickAnAnswer(page);
  await expect(act.getByText(/^You will say:/)).toBeVisible();
  await page.getByRole("region", { name: "Without answering" }).evaluate((element) => element.scrollIntoView({ block: "end" }));
  await expectInThumbReach(page, act.getByRole("button"), "decision, scrolled to its end");
  await page.getByRole("button", { name: /^(Give this answer|Start preparing)$/ }).click();
  await confirmReview(page);

  const receipt = page.getByRole("article", { name: /^Answered: / });
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 2, name: "What it moved" })).toBeVisible();
  await expect(page.getByRole("region", { name: "What it moved" }).getByRole("meter").first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "receipt");

  await receipt.getByRole("link", { name: "Open the Record entry" }).click();
  await page.waitForURL("**/record/event/**");
  await expect(page.getByRole("heading", { level: 3, name: "Readings before and after" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: /What it answered to/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "record entry");

  // From 64em (1024px) the entry opens beside the Record's own list; narrower, it opens alone. The nav returns to the whole Record at either size.
  if ((page.viewportSize()?.width ?? 0) >= 1024) await expect(page.getByRole("list", { name: /entries, newest first/ })).toBeVisible();
  await openFromNav(page, "/record");
  await expect(page.getByRole("list", { name: /entries, newest first/ })).toBeVisible();

  await clearToContinue(page);
  await continueButton(page).click();
  await page.waitForURL("**/brief");
  const ran = page.getByRole("region", { name: "While time ran" });
  await expect(ran).toBeVisible({ timeout: 60_000 });
  await expect(ran.getByText(/^Time moved .* It stopped (because|at|for)/)).toBeVisible();
  await ran.getByRole("link", { name: "Read what moved and what the wire filed" }).click();
  await page.waitForURL("**/brief/digest");
  await expect(page.getByRole("heading", { level: 2, name: /^The last run: / })).toBeVisible();
  await page.getByRole("button", { name: "Done reading" }).click();
  await page.waitForURL("**/brief");
  await expect(page.getByRole("region", { name: "While time ran" })).toHaveCount(0);
});

test("a decision left unanswered is charged its silence and recorded as left", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await reachDecision(page);
  await page.getByRole("link", { name: "Open the decision" }).click();
  await page.waitForURL("**/brief/decision/**");
  await page.getByRole("button", { name: "Turn off guidance" }).click();
  const without = page.getByRole("region", { name: "Without answering" });
  await without.getByRole("button", { name: "Leave it unanswered" }).click();
  await confirmReview(page);
  await expect(page.getByRole("article", { name: "Left unanswered" })).toBeVisible({ timeout: 30_000 });
});

test("approval is read on the Nation screen, built from its six judgments", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await page.goto("/brief/metric/approval");
  await expect(page).toHaveURL(/\/nation\?view=opinion$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nation" })).toBeVisible();
  await expect(page.getByText("Approval, settled this week").first()).toBeVisible();
  await expect(page.locator(".elec-judgment")).toHaveCount(6);
  await expectNoHorizontalOverflow(page, "nation");
});

test("a reading's old address lands on the screen that owns it", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  const homes = [
    ["treasury", /\/nation\/budget\?view=authority$/, "budget"],
    ["stability", /\/nation\/emergency$/, "emergency"],
    ["inflation", /\/nation\/economy\?measure=inflation$/, "economy"],
    ["crude", /\/nation\/economy\?view=markets&measure=crude$/, "economy markets"],
  ] as const;
  for (const [id, url, name] of homes) {
    await page.goto(`/brief/metric/${id}`);
    await expect(page).toHaveURL(url);
    await expectNoHorizontalOverflow(page, name);
  }
});

test("a running story is answered from its own screen, against staying silent", async ({ page }) => {
  await importFixture(page, "scandal-live");
  await page.locator(".queue__title a[href^='/brief/scandal/']").first().click();
  await page.waitForURL("**/brief/scandal/**");
  const compare = page.getByRole("region", { name: "Compare the answers" });
  const verb = page.getByRole("group", { name: "Compare the answers" }).getByRole("button", { name: "Give this answer" });
  await expect(compare.getByRole("radio", { name: /Stay silent/ })).toBeChecked();
  await expectInThumbReach(page, verb, "scandal, opened");
  await compare.evaluate((element) => element.scrollIntoView({ block: "end" }));
  await expectInThumbReach(page, verb, "scandal, at its answers");
  await compare.getByRole("radio", { name: "Come clean" }).check();
  await verb.click();
  await confirmReview(page);
  await expect(page.getByRole("article", { name: "Answered: Come clean" })).toBeVisible({ timeout: 30_000 });
  await expectNoHorizontalOverflow(page, "scandal");
});

test("a case on its clock screen takes the answers its contract allows", async ({ page }) => {
  await importFixture(page, "case-families");
  await page.locator(".queue__title a[href^='/brief/clock/case']").first().click();
  await page.waitForURL("**/brief/clock/**");
  await expect(page.getByRole("heading", { level: 2, name: "If it is not answered" })).toBeVisible();
  const tray = page.getByRole("region", { name: "Your answer" }).getByRole("button");
  await expect(tray.first()).toBeVisible();
  await tray.first().click();
  await confirmReview(page);
  await expect(page.getByRole("article")).toBeVisible({ timeout: 30_000 });
  await expectNoHorizontalOverflow(page, "case");
});
