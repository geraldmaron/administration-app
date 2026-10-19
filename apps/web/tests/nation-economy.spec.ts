import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectComparisonFits, expectNoHorizontalOverflow } from "./helpers";

// The economy (on the Gulf oil shock, where every lever is live) and the
// budget (twelve weeks in): read the readings and the markets, switch the
// economy lens, compare a market lever against waiting, authorize it and read
// its receipt; draft a book, read its live projection, and request the
// appropriation against keeping the book in force. Every size in the config
// runs it, so phone and desktop prove the same work.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w5-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };

/** With E2E_SCREENS set, keeps the acceptance captures at the two composed sizes. */
async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const size = CAPTURED[info.project.name];
  if (!process.env.E2E_SCREENS || !size) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}-${size}.png`, SCREENS)) });
}

/** Opens a fixture save the way a player imports one, landing on the Brief. */
async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url)));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

async function scrollTo(page: Page, heading: string): Promise<void> {
  await page.getByRole("heading", { level: 2, name: heading, exact: true }).evaluate((element) => element.scrollIntoView({ block: "start" }));
}

test("the economy: readings, markets, a ranking, and a lever compared against waiting, authorized and received", async ({ page }, info) => {
  await importFixture(page, "gulf-oil-shock");
  await page.goto("/nation/economy");
  await expect(page.getByRole("heading", { level: 1, name: "Economy" })).toBeVisible({ timeout: 60_000 });
  // Jobs, prices and output by state are a ranked table here; no map is drawn on this screen.
  await expect(page.locator(".map-layer")).toHaveCount(0);
  for (const name of ["Leading measures", "The business cycle", "What is moving them", "What households pay", "By state"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("figure", { name: /^Unemployment, 2017/ })).toBeAttached();
  await expectNoHorizontalOverflow(page, "economy");
  await capture(page, info, "economy");

  await expect(page.getByRole("figure", { name: /^Unemployment, 2017/ })).toBeVisible();
  await expect(page.locator(".economic-comparison .sc__line[data-tone='played']")).toHaveCount(1);


  // The states are ranked by the column the President picks.
  const states = page.getByRole("table", { name: /^States ranked by unemployment/ });
  await expect(states).toBeAttached();
  await page.getByRole("button", { name: "Output, a year" }).first().evaluate((button) => (button as HTMLElement).click());
  await expect(page.getByRole("table", { name: /^States ranked by output/ })).toBeAttached();

  const views = page.getByRole("tablist", { name: "Views of the economy" });
  await views.getByRole("tab", { name: "Markets" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Rates and equities", exact: true })).toBeAttached();
  await expect(page.getByRole("heading", { level: 2, name: "Across the commodity board", exact: true })).toBeAttached();
  await expect(page.getByRole("table", { name: "Coming and recent releases" }).getByText("Coming", { exact: true })).toHaveCount(4);
  await capture(page, info, "economy-markets");

  await views.getByRole("tab", { name: "Trade" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Goods trade balance", exact: true })).toBeAttached();

  await views.getByRole("tab", { name: "Market levers" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Your levers on the markets", exact: true })).toBeAttached();
  const compare = page.getByRole("region", { name: "Authorization" });
  await compare.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(compare.getByRole("radio", { name: "Wait" })).toBeChecked();
  await expect(compare.getByText(/Waiting needs no signature/)).toBeVisible();
  const picks = compare.locator(".ui-compare__pick input");
  const count = await picks.count();
  expect(count).toBe(5);
  await expectComparisonFits(page, compare, "economy levers", 1440);
  let verbName = "";
  for (let index = 1; index < count && !verbName; index += 1) {
    await picks.nth(index).check();
    const verb = compare.getByRole("button", { name: /^(Press the Fed|Order the drawdown|Issue the waiver)$/ });
    if (await verb.isEnabled()) verbName = (await verb.textContent()) ?? "";
  }
  expect(verbName, "no lever could be authorized").not.toBe("");
  await expect(compare.getByText(/It goes on the Record, and its cost is charged now\./)).toBeVisible();
  await expectNoHorizontalOverflow(page, "economy levers");
  await capture(page, info, "economy-levers");

  await compare.getByRole("button", { name: verbName }).click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article")).toBeVisible({ timeout: 30_000 });
  await receipt.getByRole("article").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expectNoHorizontalOverflow(page, "economy receipt");
  await capture(page, info, "economy-receipt");

  await receipt.getByRole("link", { name: "View record" }).click();
  await page.waitForURL(/\/record(\/event\/|\?entry=)/);
  await expect(page.getByRole("heading", { level: 3, name: "Readings before and after" })).toBeVisible();
});

test("the budget: the books, a drafted book with its live projection, and an appropriation requested against keeping the book", async ({ page }, info) => {
  await importFixture(page, "week-12");
  await page.goto("/nation/budget");
  await expect(page.getByRole("heading", { level: 1, name: "Budget" })).toBeVisible({ timeout: 60_000 });
  // The budget draws no map; the books are the picture.
  await expect(page.locator(".map-layer")).toHaveCount(0);
  await expect(page.getByRole("img", { name: /^Funding left: \d+ of 52 weeks/ })).toBeVisible();
  for (const name of ["Allocation by line", "Material tradeoffs"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("heading", { level: 3, name: "Authorization", exact: true })).toBeAttached();
  const views = page.getByRole("tablist", { name: "Views of the budget" });
  await views.getByRole("tab", { name: "Federal books" }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible();
  await views.getByRole("tab", { name: "Budget proposal" }).click();
  await expectNoHorizontalOverflow(page, "budget");
  await capture(page, info, "budget");

  const compare = page.getByRole("region", { name: "Authorization" }).last();
  // The verb and its review are docked in the surface's foot, named for the comparison they authorize.
  const act = page.getByRole("group", { name: "Authorization" });
  await compare.getByRole("radio", { name: "Submit your proposal" }).check();
  await expect(act.locator(".ui-compare__review")).toContainText(/move at least one line/);
  await expect(act.getByRole("button", { name: "Submit budget proposal" })).toBeDisabled();

  const defense = page.getByRole("slider", { name: "Defense establishment" });
  await defense.focus();
  for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator(".alloc[data-moved='true']")).toHaveCount(1);
  // The moved line is read chamber by chamber against the votes it needs.
  const response = page.getByRole("region", { name: /^Congressional response/ });
  const defenseVote = response.getByRole("listitem").filter({ hasText: "Defense establishment" });
  await expect(defenseVote.locator(".budget-vote__chamber").nth(0)).toContainText(/House.*218.*votes to pass/);
  await expect(defenseVote.locator(".budget-vote__chamber").nth(1)).toContainText(/Senate.*51.*votes to pass.*60 to end debate/);
  await scrollTo(page, "Material tradeoffs");
  await capture(page, info, "budget-draft");

  await compare.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await compare.getByRole("radio", { name: "Submit your proposal" }).check();
  const verb = act.getByRole("button", { name: "Submit budget proposal" });
  await expect(verb).toBeEnabled();
  await expect(act.getByText(/Congress votes each changed line\./)).toBeVisible();
  await expectNoHorizontalOverflow(page, "budget request");
  await capture(page, info, "budget-request");

  await verb.click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  const article = receipt.getByRole("article", { name: /^Appropriation requested and (passed|refused)$/ });
  await expect(article).toBeVisible({ timeout: 30_000 });
  // A refused request is receipted as refused, never checked off as done.
  const refused = /refused$/.test((await article.getByRole("heading", { level: 3 }).textContent()) ?? "");
  await expect(article).toHaveAttribute("data-outcome", refused ? "refused" : "done");
  await expect(article.locator(".ui-receipt__mark")).toHaveAttribute("data-glyph", refused ? "reject" : "approve");
  await expect(receipt.getByText("Funded through")).toBeVisible();
  await receipt.getByRole("article").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expectNoHorizontalOverflow(page, "budget receipt");
  await capture(page, info, "budget-receipt");

  await receipt.getByRole("link", { name: "View record" }).click();
  await page.waitForURL(/\/record(\/event\/|\?entry=)/);
  await expect(page.getByRole("heading", { level: 3, name: "Readings before and after" })).toBeVisible();
});
