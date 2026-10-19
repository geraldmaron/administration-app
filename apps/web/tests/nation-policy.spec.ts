import { expect, test, type Locator, type Page } from "@playwright/test";
import { confirmReview, expectComparisonFits, expectNoHorizontalOverflow, foundQuickly, importFixture } from "./helpers";

// The domestic program and emergency powers: enact a stance, sign an order,
// declare an emergency and end it. Each is compared against doing nothing,
// authorized with its one verb, reviewed, and lands on a receipt.
// Every size in the config runs it, so phone and desktop prove the same acts.

/** Waits for every press in flight to settle, which is when its act has been saved. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

/** Picks the first column after the baseline that the comparison will authorize. */
async function pickAuthorizable(compare: Locator, verb: Locator): Promise<void> {
  const picks = compare.locator(".ui-compare__pick input");
  const count = await picks.count();
  for (let index = 1; index < count; index += 1) {
    await picks.nth(index).check();
    if (await verb.isEnabled()) return;
  }
  throw new Error("No column in the comparison could be authorized.");
}

/** Opens each domain in turn until one has a position that can be enacted, and enacts it. */
async function enactSomething(page: Page): Promise<void> {
  const picker = page.getByRole("combobox", { name: "Policy domain", exact: true });
  const compact = await picker.isVisible();
  const domains = page.getByRole("navigation", { name: "Policy domains" }).getByRole("link");
  const total = compact ? await picker.locator("option").count() : await domains.count();
  for (let index = 0; index < total; index += 1) {
    if (compact) await picker.selectOption({ index });
    else {
      await domains.nth(index).click();
      await expect(domains.nth(index)).toHaveAttribute("aria-current", "page");
    }
    const compare = page.getByRole("region", { name: "Compare the positions" });
    const verb = compare.getByRole("button", { name: "Enact this stance" });
    await expect(verb).toBeDisabled();
    const enabled = await pickAuthorizable(compare, verb).then(
      () => true,
      () => false,
    );
    if (!enabled) continue;
    await expect(compare.getByText(/^You will move .* policy from/)).toBeVisible();
    await verb.click();
    await confirmReview(page);
    return;
  }
  throw new Error("No domain had a position that could be enacted.");
}

test("enact a stance: the portfolio, the positions against keeping the one in force, and the receipt", async ({ page }) => {
  await foundQuickly(page, "Rosa Delgado");
  await page.goto("/nation/policy");
  await expect(page.getByRole("heading", { level: 1, name: "Policy" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Fiscal", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Orders" }).click();
  await expect(page.getByRole("heading", { level: 3, name: /^Executive orders/ })).toBeVisible();
  await page.getByRole("tab", { name: /^Proposals/ }).click();
  await expectNoHorizontalOverflow(page, "policy");

  const domainPicker = page.getByRole("combobox", { name: "Policy domain", exact: true });
  if (await domainPicker.isVisible()) await domainPicker.selectOption("defense");
  else await page.getByRole("navigation", { name: "Policy domains" }).getByRole("link", { name: /^Defense/ }).click();
  await page.waitForURL("**/nation/policy?domain=defense");
  await expect(page.getByRole("heading", { level: 2, name: "Defense", exact: true })).toBeVisible();
  const compare = page.getByRole("region", { name: "Compare the positions" });
  await expect(compare.getByRole("radio").first()).toBeChecked();
  await expect(compare.getByText(/^Keeping the program in force needs no signature/)).toBeVisible();
  await expectComparisonFits(page, compare, "policy positions", 1280);

  await enactSomething(page);
  const receipt = page.getByRole("article", { name: /^Enacted: / });
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 2, name: "What it moved" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "policy receipt");
  await settled(page);
  await receipt.getByRole("button", { name: "Back to the positions" }).click();
  await expect(page.getByRole("region", { name: "Compare the positions" })).toBeVisible();
});

test("sign an order from its own desk, against leaving it unsigned", async ({ page }) => {
  await importFixture(page, "hurricane-request");
  await page.goto("/nation/policy");
  await page.getByRole("tab", { name: "Orders" }).click();
  const orders = page.getByRole("region", { name: /^Executive orders/ });

  // Direct relief answers a governor's request, and cannot be signed until the disaster is declared and Congress has enacted recovery funds.
  await orders.getByRole("link", { name: "Direct relief to the affected regions" }).first().click();
  await page.waitForURL("**/nation/policy/order/order-relief-program");
  await expect(page.getByRole("heading", { level: 1, name: "Direct relief to the affected regions" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Sec. 6. Authority as modeled" })).toBeVisible();
  await expect(page.getByRole("meter", { name: /Chance it is challenged in court/ })).toBeVisible();
  const stafford = page.getByRole("region", { name: "Stafford declaration" });
  await expect(stafford.getByText("Governor requests awaiting a major-disaster declaration")).toBeVisible();
  await expectNoHorizontalOverflow(page, "order");
  await stafford.getByRole("button", { name: /^Declare major disaster in / }).click();
  await confirmReview(page);
  await expect(stafford.getByRole("button", { name: /^Declare major disaster in / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign the order" })).toBeDisabled();
  await page.getByRole("link", { name: "Back to policy" }).click();

  // An order that can be signed today: the same desk, the same comparison against leaving it unsigned.
  await page.getByRole("tab", { name: "Orders" }).click();
  await orders.getByRole("link", { name: "Turn federal purchasing to clean power" }).first().click();
  await page.waitForURL("**/nation/policy/order/**");
  await expect(page.getByRole("heading", { level: 1, name: "Turn federal purchasing to clean power" })).toBeVisible();
  await expect(page.getByRole("meter", { name: /Chance it is challenged in court/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "order");

  const compare = page.getByRole("region", { name: "Authorization" }).last();
  const verb = page.getByRole("button", { name: "Sign the order" });
  await expect(compare.getByRole("radio", { name: "Don't sign" })).toBeChecked();
  await expect(verb).toBeDisabled();
  await compare.getByRole("radio", { name: "Sign the order" }).check();
  await expect(verb).toBeEnabled();
  await verb.click();
  await confirmReview(page);

  const receipt = page.getByRole("article", { name: "Signed: Turn federal purchasing to clean power" });
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 2, name: "What it moved" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "order receipt");
  await settled(page);
  await page.getByRole("link", { name: "Back to policy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Policy" })).toBeVisible();
});

test("declare an emergency over a running condition, then end it", async ({ page }) => {
  await importFixture(page, "hurricane-request");
  await page.goto("/nation/emergency");
  await expect(page.getByRole("heading", { level: 1, name: "Emergency" })).toBeVisible();
  await expect(page.locator(".map-layer")).toHaveAttribute("data-lens", "conditions");
  await expect(page.getByRole("heading", { level: 2, name: /^Declarations and their status/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "emergency");

  // An incident is chosen first; its response names the scope a declaration could take.
  await page.getByRole("button", { name: /^Hurricane/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: /^Response: / })).toBeVisible();
  await page.getByRole("button", { name: "Declare an emergency" }).first().click();
  const declare = page.getByRole("region", { name: "Compare against doing nothing" });
  const declareVerb = declare.getByRole("button", { name: "Declare the emergency" });
  await expect(declare.getByRole("radio", { name: "Don't declare" })).toBeChecked();
  await expect(declareVerb).toBeDisabled();
  await expectComparisonFits(page, declare, "declare", 1280);
  await pickAuthorizable(declare, declareVerb);
  await expect(declare.getByText(/^You will declare a state of emergency/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "declare");
  await declareVerb.click();
  await confirmReview(page);

  const declared = page.getByRole("article", { name: /^Declared: a state of emergency/ });
  await expect(declared).toBeVisible({ timeout: 30_000 });
  await settled(page);
  await declared.getByRole("button", { name: "Back to the board" }).click();

  await expect(page.getByRole("meter", { name: /Until it lapses/ })).toBeVisible();
  await page.getByRole("button", { name: "End it" }).first().click();
  const end = page.getByRole("region", { name: "Compare against doing nothing" });
  await expect(end.getByRole("radio", { name: "Keep it standing" })).toBeChecked();
  await end.getByRole("radio", { name: "End it" }).check();
  await end.getByRole("button", { name: "End the emergency" }).click();
  await confirmReview(page);

  const ended = page.getByRole("article", { name: /^Ended: the emergency in / });
  await expect(ended).toBeVisible({ timeout: 30_000 });
  await expectNoHorizontalOverflow(page, "end receipt");
  await settled(page);
  await ended.getByRole("button", { name: "Back to the board" }).click();
  await expect(page.getByRole("meter", { name: /Until it lapses/ })).toHaveCount(0);
});
