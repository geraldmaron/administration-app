import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { loadSave } from "@admin/engine";
import { importFixture, expectNoHorizontalOverflow } from "./helpers";

test("members are searchable and recorded votes retain named people through reload", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await importFixture(page, "congress-members");
  await page.goto("/washington/congress?view=members");
  await expect(page.getByRole("heading", { name: "Voting members", exact: true })).toBeVisible();
  await expect(page.getByText("535 matching seats", { exact: true })).toBeVisible();
  await page.getByLabel("Chamber", { exact: true }).selectOption("senate");
  await expect(page.getByText("100 matching seats", { exact: true })).toBeVisible();
  await page.getByLabel("Find a member", { exact: true }).fill("Wyoming");
  await expect(page.getByText("2 matching seats", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "filtered members");
  await page.getByLabel("Find a member", { exact: true }).fill("");
  const roster = page.locator('[aria-labelledby="congress-members"]');
  const picker = roster.locator(".ui-sort-picker select");
  if (await picker.isVisible()) await picker.selectOption("state:descending");
  else {
    await roster.getByRole("button", { name: /^State/ }).click();
    await roster.getByRole("button", { name: /^State/ }).click();
  }
  await expect(roster.locator("th[aria-sort='descending']")).toHaveCount(1);
  await expect(roster.locator("tbody tr").first()).toContainText("Wyoming");
  await expect(page.getByText(/^1–20 of 100 members$/)).toBeVisible();
  await page.screenshot({ path: `tests/.results/congress-members-${info.project.name}.png`, animations: "disabled" });
  // The save used by the import tells the journey which real floor vote occurred.
  const campaign = loadSave(JSON.parse(readFileSync(new URL("./.fixtures/congress-members.json", import.meta.url), "utf8")));
  const bill = Object.values(campaign.bills).find((entry) => entry.passage.some((vote) => vote.recordedTurn !== undefined && vote.rollCall?.length));
  expect(bill).toBeDefined();
  if (!bill) throw new Error("Fixture has no recorded floor vote.");
  await page.goto(`/washington/congress/bill/${encodeURIComponent(bill.id)}`);
  const heading = page.getByRole("heading", { name: "Recorded roll calls", exact: true });
  await expect(heading).toBeVisible();
  const passage = page.locator(".hill-roll-detail").filter({ has: page.getByRole("heading", { name: /passage$/ }) }).first();
  await expect(passage).toBeVisible();
  await expect(passage.getByText("Recorded member vote", { exact: true })).toBeVisible();
  await expect(page.getByText("Yea", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "recorded members");
  await page.screenshot({ path: `tests/.results/congress-roll-call-${info.project.name}.png`, animations: "disabled" });
  await page.reload();
  await expect(heading).toBeVisible();
  expect(errors).toEqual([]);
});
