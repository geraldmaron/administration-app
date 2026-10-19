import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { loadSave, selectScandals } from "@admin/engine";
import { scenarioOccurrenceKey } from "@admin/content";
import { caseDetails, pendingConversations } from "@admin/player-core";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

const saved = (name: string) => loadSave(JSON.parse(readFileSync(new URL(`./.fixtures/${name}.json`, import.meta.url), "utf8")));

for (const theme of ["light", "dark"] as const) {
  test(`Brief inherent navigation and decision evidence · ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme });
    await importFixture(page, "decision-case-backed");
    const alert = page.locator("section.alert");
    const target = alert.locator(".alert__title a");
    const destination = await target.getAttribute("href");
    await expect(alert.getByRole("link", { name: "Open the decision", exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, "Brief inherent card");
    await page.screenshot({ path: info.outputPath(`brief-${theme}.png`), animations: "disabled" });
    const box = await alert.boundingBox();
    if (!box || !destination) throw new Error("Priority card is not available");
    await alert.click({ position: { x: box.width - 10, y: 10 } });
    await expect(page).toHaveURL(new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
    await page.goBack();
    await expect(target).toBeFocused();
    const campaign = saved("decision-case-backed");
    const cast = pendingConversations(campaign)[0];
    if (!cast) throw new Error("No preserved decision fixture");
    await page.goto(`/brief/decision/${encodeURIComponent(scenarioOccurrenceKey(cast))}`);
    await expect(page.getByRole("heading", { name: "Situation at a glance", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timing and uncertainty", exact: true })).toBeAttached();
    await expect.poll(() => page.getByRole("article", { name: "The briefing", exact: true }).locator("img").first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath(`decision-board-${theme}.png`), animations: "disabled", fullPage: true });
    const comparison = page.getByRole("region", { name: "Compare the answers", exact: true });
    const choice = comparison.locator('.ui-choice__row:not([data-baseline]):not([data-locked])').first();
    await choice.click({ position: { x: 16, y: 16 } });
    await expect(choice.getByRole("radio")).toBeChecked();
    const method = comparison.getByRole("button", { name: "Forecast method", exact: true });
    await method.click();
    const sheet = page.getByRole("dialog", { name: "Forecast source and confidence" });
    await expect(sheet).toContainText("not a probability interval");
    await page.keyboard.press("Escape");
    await expect(method).toBeFocused();
    await expectNoHorizontalOverflow(page, "decision evidence workspace");
    await page.screenshot({ path: info.outputPath(`decision-${theme}.png`), animations: "disabled", fullPage: true });
    expect(errors).toEqual([]);
  });

  test(`bill evidence, outreach, clocks and running allegations · ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme });
    await importFixture(page, "case-families");
    const campaign = saved("case-families");
    const bill = Object.values(campaign.bills).find((entry) => entry.status === "on-the-desk");
    if (!bill) throw new Error("No bill on the desk");
    await page.goto(`/washington/congress/bill/${encodeURIComponent(bill.id)}`);
    const evidence = page.getByRole("button", { name: "435 member assessments", exact: true });
    await evidence.click();
    const sheet = page.getByRole("dialog", { name: "House · public member evidence" });
    await expect(sheet).toContainText("No member has a recorded vote commitment");
    await expect(sheet.getByRole("link").first()).toHaveAttribute("href", /^\/washington\/person\//);
    await expectNoHorizontalOverflow(page, "House evidence inspector");
    await page.keyboard.press("Escape");
    await expect(evidence).toBeFocused();
    await page.getByLabel("Member to work", { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByLabel("Member to work", { exact: true })).toHaveAttribute("data-slot", "native-select");
    const outreach = page.getByRole("link", { name: "Speaker of the House", exact: true });
    await outreach.click();
    await expect(page).toHaveURL(/\/washington\/congress\/post\/.+\?bill=/);
    await expect(page.getByRole("region", { name: "The request", exact: true })).toContainText(bill.title);
    const holder = page.getByRole("region", { name: "Officeholder", exact: true }).getByRole("link");
    await holder.click();
    await expect(page).toHaveURL(/\/washington\/person\//);
    await page.goBack();
    await expect(holder).toBeFocused();
    await expect(page.getByRole("meter", { name: "Toward you" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "legislative outreach dossier");
    await page.screenshot({ path: info.outputPath(`outreach-${theme}.png`), animations: "disabled", fullPage: true });
    const obligation = caseDetails(campaign)[0];
    if (!obligation) throw new Error("No obligation in fixture");
    await page.goto(`/brief/clock/${encodeURIComponent(obligation.id)}`);
    await expect(page.getByRole("heading", { name: /What is owed/ })).toBeVisible();
    await expectNoHorizontalOverflow(page, "obligation dossier");
    await page.screenshot({ path: info.outputPath(`clock-${theme}.png`), animations: "disabled", fullPage: true });
    await importFixture(page, "scandal-live");
    const scandal = selectScandals(saved("scandal-live")).find((entry) => entry.stage !== "resolved");
    if (!scandal) throw new Error("No live story in fixture");
    await page.goto(`/brief/scandal/${encodeURIComponent(scandal.id)}`);
    await expect(page.getByRole("region", { name: "Timeline: where the story stands", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /What the papers print/ })).toBeAttached();
    await expect(page.getByRole("heading", { name: /What is established/ })).toBeAttached();
    await expectNoHorizontalOverflow(page, "allegations and known evidence");
    await page.screenshot({ path: info.outputPath(`scandal-${theme}.png`), animations: "disabled", fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("forecast observations expose the chart's actual paired runs", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "Bound expensive projection to one integrated desktop run; card/Sheet parity is covered separately.");
  await importFixture(page, "decision-case-backed");
  const cast = pendingConversations(saved("decision-case-backed"))[0];
  if (!cast) throw new Error("No preserved decision fixture");
  await page.goto(`/brief/decision/${encodeURIComponent(scenarioOccurrenceKey(cast))}`);
  const comparison = page.getByRole("region", { name: "Compare the answers", exact: true });
  const choice = comparison.locator('.ui-choice__row:not([data-baseline]):not([data-locked])').first();
  await choice.click({ position: { x: 16, y: 16 } });
  await comparison.getByRole("button", { name: "4 weeks", exact: true }).click();
  const data = comparison.getByRole("button", { name: "Data table", exact: true }).first();
  await expect(data).toBeVisible({ timeout: 90_000 });
  await data.click();
  const sheet = page.getByRole("dialog", { name: /projected observations/ });
  await expect(sheet).toContainText("forecast runs, not recorded history");
  await expect(sheet.getByRole("columnheader", { name: "Median", exact: true })).toHaveCount(2);
  await expect(sheet.locator("tbody tr")).toHaveCount(10);
  await expectNoHorizontalOverflow(page, "forecast observations inspector");
  await page.screenshot({ path: info.outputPath("forecast-observations.png"), animations: "disabled", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(data).toBeFocused();
});


test("unavailable decision, clock, story and metric retain a usable route home", async ({ page }) => {
  await importFixture(page, "case-families");
  for (const path of ["/brief/clock/not-recorded", "/brief/scandal/not-recorded", "/brief/metric/not-recorded", "/brief/decision/not-recorded"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The screen could not open" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Back to the Brief|Open the decision that is waiting/ })).toBeVisible();
    await expectNoHorizontalOverflow(page, path);
  }
});


test("statutory clock and predefined veto retain the actual objection on the Record", async ({ page }, info) => {
  await importFixture(page, "case-families");
  await page.goto("/brief/clock/bill-desk");
  await expect(page.getByRole("heading", { name: /What is owed/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "statutory bill clock");
  const bill = Object.values(saved("case-families").bills).find((entry) => entry.status === "on-the-desk");
  if (!bill) throw new Error("No enrolled bill in fixture");
  await page.goto(`/washington/congress/bill/${encodeURIComponent(bill.id)}`);
  await expect(page.getByRole("textbox", { name: "Your veto message", exact: true })).toHaveCount(0);
  const compare = page.getByRole("region", { name: "Compare signing and vetoing", exact: true });
  await compare.getByRole("radio", { name: "Veto it", exact: true }).check();
  const veto = compare.getByRole("button", { name: "Veto and return it", exact: true });
  await expect(veto).toBeDisabled();
  await page.getByLabel("Veto objection", { exact: true }).selectOption("policy");
  await expect(veto).toBeEnabled();
  await expectNoHorizontalOverflow(page, "predefined veto objection");
  await page.screenshot({ path: info.outputPath("veto-objection.png"), animations: "disabled", fullPage: true });
  await veto.click();
  await confirmReview(page);
  const receipt = page.getByRole("region", { name: "Receipt", exact: true });
  await expect(receipt.getByRole("article", { name: `Vetoed: ${bill.title}`, exact: true })).toBeVisible();
  await receipt.getByRole("link", { name: "View record", exact: true }).click();
  await expect(page).toHaveURL(/\/record\/event\//);
  await expect(page.getByText(`I return the ${bill.title} to Congress because I disagree with its policy approach.`, { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(`I return the ${bill.title} to Congress because I disagree with its policy approach.`, { exact: false }).first()).toBeVisible();
});
