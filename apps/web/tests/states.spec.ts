import { expect, test, type Page } from "@playwright/test";
import { confirmReview, expectInThumbReach, expectMapDrawn, expectNoHorizontalOverflow, importFixture, openFromNav } from "./helpers";
import { selectChoice } from "./helpers";

// The Nation mode on a save with a wildfire burning in Colorado and the
// state's request for help open: the country ranked by state, a state chosen
// on the map, its dossier, a district detached inside it, and a locale act
// taken through compare, authorize and the receipt. Every size in the config
// runs it, so phone and desktop prove the same work.

/** Where the review captures go, when a run is asked for them; a normal run writes nothing. */
const SCREENS = process.env.STATE_SCREENS_DIR;
const CAPTURED_SIZES = new Set(["390x844", "1440x900"]);

async function capture(page: Page, name: string): Promise<void> {
  const size = page.viewportSize();
  const key = size ? `${size.width}x${size.height}` : "";
  if (!SCREENS || !CAPTURED_SIZES.has(key)) return;
  // Lets the camera land and the detach settle before the frame is kept.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENS}/state-${name}-${key}.png` });
}

async function openNation(page: Page): Promise<void> {
  await importFixture(page, "wildfire-colorado");
  await openFromNav(page, "/nation");
  await page.getByRole("tab", { name: "States", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function openColorado(page: Page): Promise<void> {
  await openNation(page);
  await page.getByRole("table", { name: /^All states/ }).getByRole("link", { name: "Colorado", exact: true }).click();
  await page.waitForURL("**/nation/state/CO**");
  await expect(page.getByRole("heading", { level: 1, name: "Colorado" })).toBeVisible();
}

test("the Nation sets every state on one axis for its lens, and a state chosen on the map opens its dossier", async ({ page }) => {
  await openNation(page);
  await expectMapDrawn(page, "nation");
  const layer = page.locator(".map-layer");
  await expect(layer).toHaveAttribute("data-lens", "approval");
  await expect(page.locator(".map-inset")).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 3, name: "Approval, settled this week" })).toBeVisible();
  await expect(page.getByRole("img", { name: /electors; 270 of 538 needed/ })).toHaveCount(0);
  const table = page.getByRole("table", { name: /^All states, with approval/ });
  await expect(page.getByText("51 of 51 states.")).toBeVisible();
  await expectNoHorizontalOverflow(page, "nation");
  // End-of-axis labels must stay inside the panel when a keyboard user reveals them.
  await page.getByRole("searchbox", { name: "Find a state or governor" }).fill("District");
  await table.getByRole("link", { name: "District of Columbia", exact: true }).focus();
  await expectNoHorizontalOverflow(page, "nation with end-of-axis tooltip");
  await page.getByRole("searchbox", { name: "Find a state or governor" }).fill("");
  await capture(page, "nation");

  await page.getByRole("tab", { name: "States" }).click();
  await expect(page.getByRole("region", { name: "What the states are living through" }).getByRole("link", { name: "Wildfire" })).toBeVisible();

  await selectChoice(page, "Color the map by", "Electoral call");
  await expect(page.getByRole("region", { name: "The states by electoral call" })).toBeVisible();
  await expect(layer).toHaveAttribute("data-lens", "call");
  await expect(page).toHaveURL(/lens=call/);
  await expect(page.getByRole("table", { name: /^All states, with electoral call/ })).toBeVisible();

  // The map's own list is its keyboard and screen-reader twin: choosing a state there lights it in the table, and its name opens it.
  await page.locator(".map-data__toggle").focus();
  await page.keyboard.press("Enter");
  const row = page.locator(".map-data").getByRole("button", { name: "Colorado", exact: true });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Clear Colorado from the map" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("table", { name: /^All states/ }).getByRole("link", { name: "Colorado", exact: true }).click();
  await page.waitForURL("**/nation/state/CO**");
  await expect(page.getByRole("heading", { level: 1, name: "Colorado" })).toBeVisible();
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", /.+/);
  await expect(page.locator(".map-mark--capitol")).toHaveAttribute("aria-label", /Colorado State Capitol, Denver/);
  await expect(page.locator(".map-mark--metro").first()).toBeAttached();
  await expect(page.locator(".map-inset")).toHaveCount(0);
});

test("a state's dossier reads its sections and detaches a district inside it", async ({ page }) => {
  await openColorado(page);
  await expect(page.getByRole("meter", { name: "Approval here" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Toward your administration" })).toBeVisible();
  const views = page.getByRole("tablist", { name: "Views of Colorado" });
  await expect(views.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  for (const view of ["People", "Economy", "Conditions", "Response", "Districts"]) {
    await views.getByRole("tab", { name: new RegExp(`^${view}`) }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await expectNoHorizontalOverflow(page, `state ${view}`);
  }
  await views.getByRole("tab", { name: /^Conditions/ }).click();
  await expect(page.getByRole("list", { name: "What the state has asked for" })).toBeVisible();
  await capture(page, "dossier");

  await views.getByRole("tab", { name: "Districts" }).click();
  await page.getByRole("link", { name: /^CO-0?1 · Denver/ }).click();
  await page.waitForURL(/\/nation\/state\/CO\?.*district=CO-01/);
  const district = page.getByRole("region", { name: "Denver", exact: true });
  await expect(district).toBeVisible();
  await expect(district.getByText("Democrat", { exact: true })).toBeVisible();
  await expect(page.locator(".district-line[aria-current='true']")).toHaveCount(1);
  await expectNoHorizontalOverflow(page, "district");
  await capture(page, "district");

  await district.getByRole("link", { name: "Close the district" }).click();
  await page.waitForURL((url) => url.pathname === "/nation/state/CO" && !url.search.includes("district="));
  await expect(page.getByRole("region", { name: "Denver", exact: true })).toHaveCount(0);
});

test("a locale act is compared against waiting, authorized once, and leaves a receipt and a Record entry", async ({ page }) => {
  await openColorado(page);
  const answer = page.getByRole("link", { name: "Answer the wildfire" });
  await expectInThumbReach(page, answer, "state");
  await answer.click();
  await page.waitForURL("**/nation/state/CO?act=wildfire");
  await expect(page.getByRole("heading", { level: 1, name: "Wildfire in Colorado" })).toBeVisible();
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "approval");

  const compare = page.getByRole("region", { name: "Compare the acts against waiting" });
  // The verb and its review are docked in the surface's foot, named for the comparison they authorize.
  const act = page.getByRole("group", { name: "Compare the acts against waiting" });
  await expect(compare.getByRole("radio", { name: /^Wait/ })).toBeChecked();
  await expect(act.getByRole("button", { name: "Choose an act" })).toBeDisabled();
  await expectInThumbReach(page, act.getByRole("button", { name: "Choose an act" }), "act desk at rest");
  // A locked column says so before it is picked.
  await expect(compare.getByText(/Not available: This needs a supported military-authority record/)).toBeVisible();
  await expect(compare.getByRole("radio", { name: "Federalize the Guard" })).toHaveAccessibleDescription(/This needs a supported military-authority record/);
  await compare.getByRole("radio", { name: "Federalize the Guard" }).check();
  await expect(act.getByText(/Not available: This needs a supported military-authority record/)).toBeVisible();
  await expect(act.getByRole("button", { name: "Federalize the Guard" })).toBeDisabled();
  await compare.getByRole("radio", { name: "Direct federal relief" }).check();
  const verb = act.getByRole("button", { name: "Send the relief" });
  await expect(verb).toBeEnabled();
  const cost = (await act.getByText(/^Direct federal relief for Colorado: \$[\d.]+[BM] now/).textContent())?.match(/\$[\d.]+[BM]/)?.[0];
  expect(cost, "the review states the price").toBeTruthy();
  await expectInThumbReach(page, verb, "act desk");
  await expectNoHorizontalOverflow(page, "act desk");
  await capture(page, "act");

  await verb.click();
  await confirmReview(page);
  const receipt = page.getByRole("article", { name: "Relief sent: Colorado" });
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(receipt.getByText(cost!, { exact: true })).toBeVisible();
  await expect(receipt.getByText("Answered. The state remembers being helped.")).toBeVisible();
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "delta");
  await expectNoHorizontalOverflow(page, "receipt");
  await capture(page, "receipt");

  await receipt.getByRole("link", { name: "Open the Record entry" }).click();
  await page.waitForURL(/\/record(\/event\/|\?entry=)/);
  await expect(page.getByRole("heading", { level: 3, name: "Readings before and after" })).toBeVisible();
});
