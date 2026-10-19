import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectInThumbReach, expectNoHorizontalOverflow } from "./helpers";
import { selectChoice } from "./helpers";

// The World mode: the world ranked for a lens with its watchlist, a
// government's file with its ties drawn on the map and the President's forces
// inside it, and the act workspace taken from objective to receipt for a
// meeting, a tariff, a force and an operation called off. Every size in the
// config runs it, so phone and desktop prove the same work.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w7-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };

/** With E2E_SCREENS set, keeps the acceptance captures at the two composed sizes. */
async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const size = CAPTURED[info.project.name];
  if (!process.env.E2E_SCREENS || !size) return;
  await page.waitForTimeout(1200);
  await page.screenshot({ path: fileURLToPath(new URL(`world-${name}-${size}.png`, SCREENS)) });
}

async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url)));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
}

async function openWorld(page: Page, fixture: string): Promise<void> {
  await importFixture(page, fixture);
  await page.goto("/world");
  await expect(page.getByRole("heading", { level: 1, name: "World" })).toBeVisible({ timeout: 60_000 });
}

async function openAct(page: Page, nation: string, name: string): Promise<void> {
  await page.goto(`/world/nation/${nation}/act`);
  await expect(page.getByRole("heading", { level: 1, name: `Act on ${name}` })).toBeVisible({ timeout: 60_000 });
}

/** The adaptive objective and action drawer preserve the same choices at every size. */
async function pickAct(page: Page, goal: string, family: string, act: RegExp): Promise<void> {
  await selectChoice(page, "Objective", new RegExp(`^${goal} ·`));
  const change = page.getByRole("button", { name: "Compare actions", exact: true });
  if (await change.isVisible()) await change.click();
  await page.getByRole("group", { name: family, exact: true }).getByRole("radio", { name: act }).check();
  const back = page.getByRole("button", { name: "Return to plan", exact: true });
  if (await back.isVisible()) await back.click();
}

test("the World reads as an overview: six readings, the wars, and every government sortable and linked", async ({ page }, info) => {
  await openWorld(page, "engagement-week");
  const kpis = page.getByRole("region", { name: "The world at a glance" });
  await expect(kpis.getByRole("listitem")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "National security", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recent developments" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "world overview");
  await capture(page, info, "home");

  const governments = page.getByRole("region", { name: "Governments", exact: true });
  const rows = governments.locator("tbody tr");
  await expect(rows).toHaveCount(20);
  await governments.getByRole("button", { name: "Next page" }).click();
  await expect(governments.locator(".ui-collection__count")).toContainText("21–40 of");
  // A stacked table hides its headers; the sort picker stands in for them there.
  const picker = governments.locator(".ui-sort-picker select");
  if (await picker.isVisible()) {
    const option = await picker.locator("option", { hasText: /^Government,/ }).first().getAttribute("value");
    await picker.selectOption(`${option?.split(":")[0]}:ascending`);
  } else {
    await governments.getByRole("button", { name: /^Government/ }).click();
  }
  await expect(governments.getByRole("columnheader", { name: /^Government/ })).toHaveAttribute("aria-sort", "ascending");
  await expectNoHorizontalOverflow(page, "world directory");

  await page.getByLabel("Find a government").fill("mexi");
  await expect(rows).toHaveCount(1);
  await governments.getByRole("link", { name: "Mexico" }).click();
  await page.waitForURL("**/world/nation/MEX");
  await expect(page.getByRole("heading", { level: 1, name: "Mexico" })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Find a government")).toHaveValue("mexi");
});

test("International Standing lives on the World, and its old address lands there", async ({ page }) => {
  await openWorld(page, "engagement-week");
  await page.goto("/brief/metric/standing");
  await page.waitForURL("**/world");
  const standing = page.getByRole("region", { name: "International Standing" });
  await expect(standing.getByRole("img", { name: /International Standing by week/ }).or(standing.getByText(/readings, from/))).toBeVisible();
  await expect(standing.getByRole("heading", { name: "What moved it" })).toBeVisible();
});

test("the watchlist names the wars on the board, with the intensity of each", async ({ page }) => {
  await openWorld(page, "opening-world");
  const wars = page.getByRole("region", { name: /^Active conflicts/ }).getByRole("list", { name: "Wars" });
  await expect(wars.getByRole("listitem")).toHaveCount(2);
  await expect(wars.getByRole("meter").first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "world at war");
});

test("a government's file detaches the country, draws its ties and reads every section", async ({ page }, info) => {
  await openWorld(page, "engagement-week");
  await page.getByLabel("Find a government").fill("Japan");
  await page.getByRole("region", { name: "Governments", exact: true }).getByRole("link", { name: "Japan", exact: true }).click();
  await page.waitForURL("**/world/nation/JPN");
  await expect(page.getByRole("heading", { level: 1, name: "Japan" })).toBeVisible();
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", /./);
  await expect(page.getByRole("region", { name: "Relationship now" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Your read of them" })).toBeVisible();
  await expect(page.getByText(/Their view of you/).or(page.getByRole("meter", { name: "Their view of you" })).first()).toBeVisible();
  const views = page.getByRole("tablist", { name: "Views of Japan" });
  for (const view of ["Overview", "Diplomacy", "Economy", "Security", "Intel", "Activity"]) {
    await expect(views.getByRole("tab", { name: new RegExp(`^${view}`) })).toBeVisible();
  }
  await expect(page.getByRole("tabpanel", { name: "Overview" }).getByRole("heading", { level: 3, name: "Economy" })).toBeVisible();
  await views.getByRole("tab", { name: /^Economy/ }).click();
  const goods = page.getByRole("region", { name: "Goods traded with Japan", exact: true });
  await expect(goods.getByRole("list").first()).toBeVisible();
  const firstCategory = goods.locator(".trade-category__pick").first();
  await firstCategory.click();
  await expect(firstCategory).toHaveAttribute("aria-pressed", "true");
  await expect(goods.getByRole("region", { name: /selected trade category/ })).toBeVisible();
  await expect(page).toHaveURL(/sector=/);
  await views.getByRole("tab", { name: /^Security/ }).click();
  await expect(page.getByRole("list", { name: "US forces in Japan" }).or(page.getByRole("heading", { name: "US forces in Japan" }))).toBeVisible();
  await expect(page.locator(".presence-list li").first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "country");
  await capture(page, info, "country");
  await views.getByRole("tab", { name: /^Economy/ }).click();
  await capture(page, info, "country-economy");
});

test("a meeting is compared against doing nothing, authorized once, and leaves a receipt", async ({ page }, info) => {
  await openWorld(page, "engagement-week");
  await page.goto("/world/nation/CAN");
  const open = page.getByRole("link", { name: "Act on Canada" }).last();
  await expectInThumbReach(page, open, "country");
  await open.click();
  await page.waitForURL("**/world/nation/CAN/act");
  await expect(page.getByRole("heading", { level: 1, name: "Act on Canada" })).toBeVisible();
  await expect(page.getByText("Choose an act to see what it would do beside doing nothing.")).toBeVisible();
  await capture(page, info, "act-objective");

  await pickAct(page, "Build ties", "Meet them", /^Phone call/);
  const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
  await expect(compare).toBeVisible();
  await expect(compare.getByRole("radio", { name: /^Do nothing/ })).not.toBeChecked();
  await expect(compare.getByRole("radio", { name: /^Phone call/ })).toBeChecked();
  await expect(compare.getByText(/Would they accept/).first()).toBeVisible();
  for (const row of ["When", "The relationship if they accept", "If they decline"]) {
    await expect(compare.getByRole("term").filter({ hasText: row }).first()).toBeVisible();
  }
  const verb = page.getByRole("button", { name: "Place the call" });
  await expect(verb).toBeEnabled();
  await expectInThumbReach(page, verb, "act");
  await capture(page, info, "act-compare");

  await compare.getByRole("radio", { name: /^Do nothing/ }).check();
  await expect(verb).toBeDisabled();
  await expect(page.getByText(/Doing nothing leaves Canada where it stands/)).toBeVisible();
  await compare.getByRole("radio", { name: /^Phone call/ }).check();
  await verb.click();
  await confirmReview(page);
  const receipt = page.getByRole("article");
  await expect(receipt.getByRole("heading", { name: /^Phone call: (accepted|declined)$/ })).toBeVisible({ timeout: 30_000 });
  await expect(receipt.getByText("It is on your Record.")).toBeVisible();
  await expect(receipt.getByRole("link", { name: "Open the Record entry" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Where the relationship stands" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "receipt");
  await capture(page, info, "act-receipt");
});

test("a tariff is priced beside leaving the schedule alone, imposed, then lifted from the file", async ({ page }, info) => {
  await openWorld(page, "tariff-applied");
  await openAct(page, "CHN", "China");
  await pickAct(page, "Trade", "Tax their goods", /^Tariff on one kind of goods/);
  await expect(page.getByRole("combobox", { name: "Traded category" })).toBeVisible();
  await page.getByLabel(/^Additional rate:/).fill("15");
  const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
  await expect(compare.getByText(/15% on .* from China/)).toBeVisible();
  await expect(page.getByText(/Chance they hit back/).first()).toBeVisible();
  await expect(compare.getByRole("term").filter({ hasText: "Prices at home" }).first()).toBeVisible();
  await expect(compare.getByRole("term").filter({ hasText: "Revenue" }).first()).toBeVisible();
  await capture(page, info, "act-tariff");
  await page.getByRole("button", { name: "Impose the tariff" }).click();
  await confirmReview(page);
  await expect(page.getByRole("article").getByRole("heading", { name: /imposed$/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("article").getByText(/a year coming in/)).toBeVisible();

  await page.goto("/world/nation/CHN?view=diplomacy");
  await expect(page.getByRole("heading", { level: 1, name: "China" })).toBeVisible();
  const measures = page.getByRole("list", { name: "Measures in force" });
  await expect(measures.getByRole("listitem")).toHaveCount(2);
  await measures.getByRole("link", { name: "Lift it" }).first().click();
  await page.waitForURL(/\/act\?manage=/);
  const lift = page.getByRole("region", { name: "Compare ending it against leaving it" });
  await expect(lift.getByRole("radio", { name: /^Leave it in place/ })).toBeVisible();
  await page.getByRole("button", { name: "Lift the measure" }).click();
  await confirmReview(page);
  await expect(page.getByRole("article").getByRole("heading", { name: "Measure lifted" })).toBeVisible({ timeout: 30_000 });
});

test("a force is sized, compared and ordered, then called off while it is still being prepared", async ({ page }, info) => {
  await openWorld(page, "opening-world");
  await openAct(page, "CAN", "Canada");
  await pickAct(page, "Force", "Military force", /^Forward Deploy/);
  await expect(page.getByRole("slider", { name: /^What it sends:/ })).toBeVisible();
  const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
  for (const row of ["What it sends", "Who stands with you", "Who reacts", "If it goes wrong", "Escalation"]) {
    await expect(compare.getByRole("term").filter({ hasText: row }).first()).toBeVisible();
  }
  await capture(page, info, "act-force");
  await page.getByRole("button", { name: "Order the force" }).click();
  await confirmReview(page);
  const receipt = page.getByRole("article");
  await expect(receipt.getByRole("heading", { name: /ordered$/ })).toBeVisible({ timeout: 30_000 });
  await expect(receipt.getByText(/First results in about/)).toBeVisible();

  await openAct(page, "CAN", "Canada");
  const underway = page.getByRole("region", { name: "Already under way" });
  await expect(underway.getByRole("listitem")).toHaveCount(1);
  await underway.getByRole("link", { name: "Call it off" }).click();
  await page.waitForURL(/\/act\?manage=/);
  await page.getByRole("button", { name: "Call off the operation" }).click();
  await confirmReview(page);
  await expect(page.getByRole("article").getByRole("heading", { name: "Operation called off" })).toBeVisible({ timeout: 30_000 });
});

test("current instrument choices remain reachable and compare against doing nothing", async ({ page }) => {
  await openWorld(page, "engagement-week");
  const ladder: readonly (readonly [string, string, readonly string[]])[] = [
    ["Pressure", "Diplomatic pressure", ["Private Warning", "Public Statement", "Recall Ambassador", "Coalition Pressure", "Sever Relations"]],
    ["Trade", "Economic measures", ["Trade Advisory"]],
    ["Pressure", "Economic measures", ["Targeted Sanctions", "Asset Freeze", "Full Embargo"]],
    ["Covert", "Covert action", ["Surveillance", "Influence Operation", "Sabotage", "Proxy Support", "Covert Regime Action"]],
    ["Force", "Military force", ["Exercises", "Forward Deploy", "Blockade", "Limited Strike", "Expeditionary Invasion"]],
    ["Build ties", "Help them", ["Relief Shipment", "Development Grant", "Stabilization Package", "Arms Transfer", "Security Guarantee"]],
  ];
  await openAct(page, "MEX", "Mexico");
  for (const [goal, family, rungs] of ladder) {
    for (const rung of rungs) {
      await pickAct(page, goal, family, new RegExp(`^${rung}`));
      const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
      await expect(compare.getByRole("radio", { name: /^Do nothing/ }), rung).toBeVisible();
      await expect(compare.getByText(/Chance it works/).first(), rung).toBeVisible();
      await expect(page.getByRole("button", { name: /^(Take the diplomatic step|Order the measure|Authorize the operation|Order the force|Send the help)$/ }), rung).toBeEnabled();
    }
  }
});

test("treaties and a request to Congress are on the same workspace", async ({ page }) => {
  await openWorld(page, "treaty-pending");
  await openAct(page, "JPN", "Japan");
  await pickAct(page, "Build ties", "Put it in writing", /^Agreement on Trade and Investment/);
  const compare = page.getByRole("region", { name: "Compare the act against doing nothing" });
  await expect(compare.getByRole("term").filter({ hasText: "The Senate" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign the treaty" })).toBeVisible();
  await pickAct(page, "Force", "Ask Congress first", /^Ask Congress to authorize force/);
  await expect(page.getByRole("button", { name: "Ask Congress" })).toBeVisible();
});


test("country attention keeps its overview in history for keyboard return", async ({ page }) => {
  await importFixture(page, "war-joined");
  await page.goto("/world/nation/RUS");
  const priority = page.locator(".country-priority__open").first();
  await expect(priority).toBeVisible();
  await priority.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/view=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/world\/nation\/RUS\/?$/);
  await expect(priority).toBeVisible();
  await expect(priority).toBeFocused();
  await expectNoHorizontalOverflow(page, "country attention return");
});
