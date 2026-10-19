import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

// The Record, the press, the ending and the entry screens. A presidency that
// ran a whole term and lost its reelection is the fixture: its Record holds
// thousands of entries, its wire is full, and the campaign is over, so the
// ending and the legacy are reachable the way a player reaches them. Every
// size in the config runs it.

async function open(page: Page, path: string, heading: string | RegExp): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 60_000 });
}

async function openMoreFilters(page: Page): Promise<void> {
  await expect(page.getByRole("group", { name: "Domain, place and outcome" })).toBeVisible();
}

test("the Record: the count is visible, filters narrow it, and an entry opens with its terms and its readings", async ({ page }) => {
  await importFixture(page, "loses-reelection");
  await open(page, "/record", "Record");
  const count = page.locator(".rec-filters .rec-count");
  await expect(count).toHaveText(/^[\d,]+ entries$/);
  await expectNoHorizontalOverflow(page, "record");

  await openMoreFilters(page);
  const domain = page.getByLabel("Domain");
  const texts = await domain.locator("option").allTextContents();
  await domain.selectOption({ label: texts.find((text) => text.startsWith("Economy"))! });
  await expect(count).toHaveText(/^[\d,]+ of [\d,]+ entries match$/);
  await expect(page).toHaveURL(/domain=Economy/);

  await page.locator(".rec-row__link").first().click();
  await expect(page).toHaveURL(/entry=/);
  await expect(page.getByRole("heading", { level: 3, name: "Terms as recorded" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Readings before and after" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Related records" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "record entry");

  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    await page.getByRole("link", { name: "All entries" }).click();
    await expect(page.locator(".rec-rows")).toBeVisible();
  }
  await expect(page).toHaveURL(/domain=Economy/);
  await openMoreFilters(page);
  await expect(page.getByLabel("Domain")).toHaveValue("Economy");
});

test("the Record: searching by words narrows the list and a reload keeps the search", async ({ page }) => {
  await importFixture(page, "loses-reelection");
  await open(page, "/record", "Record");
  await page.getByRole("searchbox", { name: "Search the Record" }).fill("zeppelin");
  await expect(page.getByText("No entry matches those filters")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search the Record" })).toHaveValue("zeppelin");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".rec-rows")).toBeVisible();
});

test("the Record's other views are tabs that keep their place in the address", async ({ page }) => {
  await importFixture(page, "loses-reelection");
  await open(page, "/record", "Record");
  await page.getByRole("tab", { name: "Where the country stands" }).click();
  await expect(page).toHaveURL(/view=standing/);
  await expect(page.getByRole("heading", { level: 2, name: "Polarization" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Division against the 2020s level" })).toBeAttached();
  // A view change rewrites the address in place, so a reload lands on the same view.
  await page.reload();
  await expect(page.getByRole("tab", { name: "Where the country stands" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Acts and outcomes" }).click();
  await expect(page).not.toHaveURL(/view=standing/);
  await expect(page.getByRole("tab", { name: "Acts and outcomes" })).toHaveAttribute("aria-selected", "true");
});

test("the press: one page, a desk narrows the feed, and a story opens in the form of its kind", async ({ page }) => {
  await importFixture(page, "loses-reelection");
  await page.goto("/record/press");
  await expect(page).toHaveURL(/\/washington\/office\/press/);
  await expect(page.getByRole("heading", { level: 1, name: "Press" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Every story filed" })).toBeVisible();
  await expect(page.locator("#press-feed [role=status]")).toHaveText(/[\d,]+ stories filed/);
  await expectNoHorizontalOverflow(page, "press");

  await page.getByRole("tab", { name: "Desks and trends", exact: true }).click();
  await expect(page).toHaveURL(/view=analysis/);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Desks and trends", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.locator(".pr-desk a.pr-desk__name").first().click();
  await expect(page).toHaveURL(/outlet=/);
  await expect(page.locator("#press-feed [role=status]")).toHaveText(/ of [\d,]+ stories/);

  await page.locator(".pr-story a.ui-row-link").first().click();
  await expect(page.locator(".dispatch-page")).toBeVisible();
  await expect(page.locator(".dispatch-page .ui-tag").first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "dispatch");
  await page.goBack();
  await expect(page).toHaveURL(/outlet=/);
  await page.goto("/washington/office/press#press-respond");
  await expect(page.getByRole("tab", { name: /^Response/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#press-respond")).toBeVisible();
});

test("a story that is not in the files says so", async ({ page }) => {
  await importFixture(page, "loses-reelection");
  await open(page, "/record/press/dispatch/999999", "No such story");
});

test("the ending and the legacy: the outcome, the decisions that marked the term, and the readings against the oath", async ({ page }) => {
  await importFixture(page, "loses-reelection");
  await open(page, "/ending", "Defeated at the polls");
  await expect(page.getByRole("img", { name: /The Electoral College/ })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Share of the two-way popular vote" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Key decisions and consequences" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "The Congress the next President meets" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "ending");

  await page.getByRole("link", { name: "Read the legacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Legacy" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Inherited baseline and end state" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Readings at the oath and on the last day" })).toBeVisible();
  await page.getByRole("tab", { name: "Timeline" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Timeline of decisions" })).toBeVisible();
  await expect(page.locator("ol.rec-items > li").first()).toBeVisible();
  await expect(page.getByText(/ of \d+ marks on the term, in order/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "legacy");
});

test("the ending and the legacy say the term is still running while it runs", async ({ page }) => {
  await importFixture(page, "day-one-orders");
  await open(page, "/ending", "The presidency is in session");
  await open(page, "/legacy", "The presidency is in session");
});

test("the saves screen leads with the administration in play, and a discard names the save it would delete", async ({ page }) => {
  await importFixture(page, "day-one-orders");
  await open(page, "/administrations", "Your administrations");
  await expect(page.getByRole("heading", { level: 2, name: "Administration in play" })).toBeVisible();
  await page.locator(".save-card").first().getByRole("button", { name: "Discard" }).click();
  await expect(page.getByRole("group").filter({ hasText: "Discard “" })).toContainText("from this device?");
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByRole("group").filter({ hasText: "Discard “" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "administrations");
});

test("an address that is not a screen explains itself and offers a way back", async ({ page }) => {
  await page.goto("/no-such-screen");
  await expect(page.getByRole("heading", { level: 1, name: "This page doesn't exist" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("There is no screen at /no-such-screen")).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to (the start|the Brief)/ })).toBeVisible();
});
