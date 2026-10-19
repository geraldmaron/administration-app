import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

const AREA = "ocs-gulf-program-2029";

function fixture(name: string) {
  const path = fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")).campaign;
}

async function capture(page: Page, info: TestInfo, name: string, focus?: Locator): Promise<void> {
  const viewport = page.viewportSize();
  if (focus && viewport) {
    await page.setViewportSize({ width: viewport.width, height: 1400 });
    await focus.scrollIntoViewIfNeeded();
  }
  const path = info.outputPath(`${name}-${info.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: "image/png" });
  if (!focus) return;
  const detailPath = info.outputPath(`${name}-detail-${info.project.name}.png`);
  await focus.screenshot({ path: detailPath });
  await info.attach(`${name}-detail`, { path: detailPath, contentType: "image/png" });
  if (viewport) await page.setViewportSize(viewport);
}

test("a reviewed offshore sale shows its actual bids and fair-value gate before award", async ({ page }, testInfo) => {
  const campaign = fixture("executive-delivery-bid");
  const sale = campaign.offshoreLeaseSales.find((entry: { areaId: string }) => entry.areaId === AREA);
  expect(sale).toBeDefined();
  expect(sale.stage).toBe("decision");
  expect(sale.reviewObligationUsdMillions).toBe(5);
  expect(sale.environmentalCompletedTurn).toBeDefined();
  expect(sale.consultationCompletedTurn).toBeDefined();
  expect(sale.proposedNoticeTurn).toBeDefined();
  expect(sale.finalNoticeTurn).toBeDefined();
  expect(sale.saleHeldTurn).toBeDefined();
  expect(sale.fairValueReviewedTurn).toBeDefined();
  const qualified = sale.bids.filter((bid: { qualified: boolean; amountUsdMillions: number }) =>
    bid.qualified && bid.amountUsdMillions >= sale.modeledFairValueUsdMillions);
  expect(qualified.length).toBeGreaterThan(0);
  const accepted = qualified.sort((a: { amountUsdMillions: number }, b: { amountUsdMillions: number }) =>
    b.amountUsdMillions - a.amountUsdMillions)[0];
  const rule = campaign.pendingRules.find((entry: { id: string }) => entry.id === sale.planningRuleId);
  expect(rule?.status).toBe("in-effect");

  await importFixture(page, "executive-delivery-bid");
  await page.goto("/nation/policy/order/order-energy-leasing");
  await expect(page.getByRole("heading", { level: 1, name: "Plan an offshore lease sale" })).toBeVisible();
  const record = page.getByRole("region", { name: "Offshore sale follow-up" });
  await expect(record).toContainText("decision. Exploration: no permit.");
  await expect(record).toContainText(`${sale.tract.name}: $5 million obligated for review.`);
  await expect(record).toContainText(`The modeled minimum acceptable bid is $${sale.modeledFairValueUsdMillions} million.`);
  for (const bid of sale.bids) {
    await expect(record).toContainText(`${bid.bidder}: $${bid.amountUsdMillions} million;`);
  }
  await expect(record).toContainText("Exploration still requires a separate plan and review.");
  await expect(record.getByRole("button", { name: "Accept qualified bid" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "offshore reviewed bids");
  await capture(page, testInfo, "offshore-reviewed-bids", record);

  await record.getByRole("button", { name: "Accept qualified bid" }).click();
  await confirmReview(page);
  await expect(record).toContainText("awarded. Exploration: awaiting plan.");
  await expect(record).toContainText(`Lease bonus: $${accepted.amountUsdMillions} million due to the federal government.`);
  await expect(record).toContainText("This revenue does not add spending authority.");
  await expect(record.getByRole("button", { name: "Accept qualified bid" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "offshore awarded lease");
  await capture(page, testInfo, "offshore-awarded-lease", record);
});

test("a later sale record shows the separate permit and received federal bonus", async ({ page }, testInfo) => {
  const campaign = fixture("executive-delivery-permit");
  const sale = campaign.offshoreLeaseSales.find((entry: { areaId: string }) => entry.areaId === AREA);
  expect(sale).toMatchObject({ stage: "awarded", exploration: { status: "permitted" } });
  expect(sale.exploration.submittedTurn).toBeGreaterThan(sale.awardedTurn);
  expect(sale.exploration.resolvedTurn).toBeGreaterThan(sale.exploration.submittedTurn);
  expect(sale.bonusReceipt.receivedTurn).toBeDefined();
  expect(campaign.books[campaign.founding.nation].leaseBonusReceiptIds).toContain(sale.bonusReceipt.id);

  await importFixture(page, "executive-delivery-permit");
  await page.goto("/nation/policy/order/order-energy-leasing");
  const record = page.getByRole("region", { name: "Offshore sale follow-up" });
  await expect(record).toContainText("awarded. Exploration: permitted.");
  await expect(record).toContainText(`Lease bonus: $${sale.bonusReceipt.amountUsdMillions} million received by the federal government.`);
  await expect(record).toContainText("Separate site-specific environmental and technical review approved exploration.");
  await expectNoHorizontalOverflow(page, "offshore permitted exploration");
  await capture(page, testInfo, "offshore-permitted-exploration", record);
});

test("a funded federal clean-power contract shows cost, supply risk and measured delivery", async ({ page }, testInfo) => {
  const ready = fixture("executive-clean-power-ready");
  expect(ready.cleanPowerPurchases ?? []).toHaveLength(0);
  const rule = ready.pendingRules.find((entry: { order: string }) => entry.order === "order-clean-energy");
  expect(rule?.status).toBe("in-effect");

  await importFixture(page, "executive-clean-power-ready");
  await page.goto("/nation/policy/order/order-clean-energy");
  const delivery = page.getByRole("region", { name: "Federal clean-power delivery" });
  await expect(delivery).toContainText("700,000 MWh delivered over two years");
  await expect(delivery).toContainText("subject to renewable supply and a $94 million appropriation");
  await expect(delivery.getByRole("button", { name: "Award clean-power purchase" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "clean-power terms");
  await capture(page, testInfo, "clean-power-before-contract", delivery);

  await delivery.getByRole("button", { name: "Award clean-power purchase" }).click();
  await confirmReview(page);
  await expect(delivery).toContainText("contracted, 0 of 700,000 MWh delivered.");
  await expect(delivery).toContainText("$94 million obligated; $0.00 million in supplier payments recorded");
  await expect(delivery).toContainText("Weekly delivery depends on renewable supply.");
  await expect(delivery).toContainText("ending the order does not cancel the existing contract.");
  await expectNoHorizontalOverflow(page, "clean-power contracted");
  await capture(page, testInfo, "clean-power-contracted", delivery);

  const delivering = fixture("executive-clean-power-delivering");
  const purchase = delivering.cleanPowerPurchases?.[0];
  expect(purchase).toMatchObject({ status: "contracted", amountUsdMillions: 94,
    quantityMwh: 700_000, lastDeliveryTurn: delivering.turn - 1 });
  expect(purchase.deliveredMwh).toBeGreaterThan(0);
  expect(purchase.paidUsdMillions).toBeGreaterThan(0);
  expect(purchase.paymentTrackingStartMwh).toBe(0);
  await importFixture(page, "executive-clean-power-delivering");
  await page.goto("/nation/policy/order/order-clean-energy");
  const later = page.getByRole("region", { name: "Federal clean-power delivery" });
  await expect(later).toContainText(`contracted, ${purchase.deliveredMwh.toLocaleString("en-US")} of 700,000 MWh delivered.`);
  await expect(later).toContainText(`$${purchase.paidUsdMillions.toFixed(2)} million in supplier payments recorded`);
  await expectNoHorizontalOverflow(page, "clean-power first delivery");
  await capture(page, testInfo, "clean-power-first-delivery", later);
  await page.goto("/nation/budget?view=books");
  await expect(page.getByText(`Clean-power supplier payments recorded: $${purchase.paidUsdMillions.toFixed(2)} million cumulative.`)).toBeVisible();
  await expect(page.getByText(/These payments are covered by ordinary discretionary outlays above/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "clean-power fiscal memo");
  await capture(page, testInfo, "clean-power-fiscal-memo", page.locator(".budget-note").filter({ hasText: "Clean-power supplier payments recorded" }));

  const legacy = fixture("executive-clean-power-legacy-payment");
  const old = legacy.cleanPowerPurchases?.[0];
  expect(old.paymentTrackingStartMwh).toBe(purchase.deliveredMwh);
  expect(old.paidUsdMillions).toBeGreaterThan(0);
  expect(old.paidUsdMillions).toBeLessThan(2);
  await importFixture(page, "executive-clean-power-legacy-payment");
  await page.goto("/nation/policy/order/order-clean-energy");
  const oldRecord = page.getByRole("region", { name: "Federal clean-power delivery" });
  await expect(oldRecord).toContainText("Payments before tracking began are unknown.");
  await expect(oldRecord).toContainText(`$${old.paidUsdMillions.toFixed(2)} million in supplier payments recorded`);
  await expectNoHorizontalOverflow(page, "clean-power legacy payment");
  await capture(page, testInfo, "clean-power-legacy-payment", oldRecord);
  await page.goto("/nation/budget?view=books");
  await expect(page.getByText(`Clean-power supplier payments recorded: $${old.paidUsdMillions.toFixed(2)} million cumulative.`)).toBeVisible();
  await expect(page.getByText("Payments before tracking began are unknown.")).toBeVisible();
  await expectNoHorizontalOverflow(page, "clean-power legacy fiscal memo");
  await capture(page, testInfo, "clean-power-legacy-fiscal-memo", page.locator(".budget-note").filter({ hasText: "Clean-power supplier payments recorded" }));
});

test("a funded defense backlog names the priority supplier and keeps delayed obligations after rescission", async ({ page }, testInfo) => {
  const ready = fixture("executive-defense-ready");
  expect(ready.munitions.us["precision-fires"].onOrder.some((order: { count: number }) => order.count > 0)).toBe(true);
  expect(ready.player.budget.military).toBeGreaterThan(0);
  expect(ready.turn).toBeLessThanOrEqual(ready.congress.appropriation.throughTurn);
  await importFixture(page, "executive-defense-ready");
  await page.goto("/nation/policy/order/order-defense-production");
  await expect(page.getByRole("heading", { level: 1, name: "Put defense contracts first" })).toBeVisible();
  await expect(page.getByText("One existing federal precision-fires order at a modeled named supplier", { exact: true })).toBeVisible();
  const authorization = page.getByRole("region", { name: "Authorization" }).last();
  await authorization.getByRole("radio", { name: "Sign the order" }).check();
  await expect(page.getByRole("button", { name: "Sign the order" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "defense funded backlog");
  await capture(page, testInfo, "defense-funded-backlog", page.getByText("One existing federal precision-fires order at a modeled named supplier", { exact: true }));
  await page.getByRole("button", { name: "Sign the order" }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Defense priority contract" })).toContainText("Potomac Precision Works");

  const delivering = fixture("executive-defense-delivering");
  const contract = delivering.orders.find((record: { order: string }) => record.order === "order-defense-production")?.defenseContract;
  expect(contract).toMatchObject({ supplier: "Potomac Precision Works", munitionClass: "precision-fires", provenance: "planning value" });
  const remainder = delivering.munitions.us["precision-fires"].onOrder
    .find((order: { priorityContractId?: string }) => order.priorityContractId);
  expect(remainder.count).toBeGreaterThan(0);
  expect(remainder.count).toBeLessThan(contract.initialIndex);
  await importFixture(page, "executive-defense-delivering");
  await page.goto("/nation/policy/order/order-defense-production");
  const priority = page.getByRole("region", { name: "Defense priority contract" });
  await expect(priority).toContainText("Potomac Precision Works");
  await expect(priority).toContainText(`${Math.round(100 * (contract.initialIndex - remainder.count) / contract.initialIndex)}% of the contracted replenishment fulfilled`);
  await expect(priority).toContainText(`${Math.round(100 * remainder.count / contract.initialIndex)}% outstanding`);
  await expect(priority).toContainText("Priority is operating while legal authority stands");
  await expectNoHorizontalOverflow(page, "defense priority delivery");
  await capture(page, testInfo, "defense-priority-delivering", priority);

  const ended = fixture("executive-defense-ended");
  const endedRecord = ended.orders.find((record: { order: string }) => record.order === "order-defense-production");
  expect(endedRecord.rescindedTurn).toBeDefined();
  expect(ended.munitions.us["precision-fires"].onOrder.some((order: { priorityContractId?: string }) =>
    order.priorityContractId === endedRecord.id)).toBe(true);
  await importFixture(page, "executive-defense-ended");
  await page.goto("/nation/policy/order/order-defense-production");
  const endedPriority = page.getByRole("region", { name: "Defense priority contract" });
  await expect(endedPriority).toContainText("Priority has ended; the contracted backlog remains.");
  await expectNoHorizontalOverflow(page, "defense priority ended");
  await capture(page, testInfo, "defense-priority-ended", endedPriority);
});
