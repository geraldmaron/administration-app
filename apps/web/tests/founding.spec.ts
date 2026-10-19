import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, openFounding } from "./helpers";

// A campaign starts at every size: the title, all eight stages of the
// founding, the oath with a first-morning order, and the Brief it lands on.

test("a campaign is founded through every stage and lands on the Brief", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Office of the President" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "title");

  await openFounding(page);
  await page.getByLabel("Name on the oath").fill("Ada Whitfield");
  await page.getByRole("radio", { name: "Feminine" }).check();
  await expect(page.getByRole("img", { name: "Ada Whitfield, as drawn" })).toBeVisible();
  await page.getByLabel("Home state").selectOption({ label: "Ohio" });
  await expectNoHorizontalOverflow(page, "founding: the person");

  for (const stage of ["The record", "The politics", "The ticket", "The platform", "The White House", "The Cabinet", "The oath"]) {
    await page.getByRole("button", { name: `Next: ${stage}` }).click();
    await expect(page.getByRole("heading", { level: 2, name: stage, exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, `founding: ${stage}`);
    if (stage === "The platform") await page.getByRole("checkbox").first().check();
  }

  const take = page.getByRole("button", { name: "Take the oath" });
  await expect(take).toBeEnabled({ timeout: 60_000 });
  await expect(page.getByRole("figure").filter({ hasText: "The Senate" })).toBeVisible();
  const orders = page.getByRole("group", { name: "Orders to sign on the first morning" }).getByRole("checkbox");
  const signed = (await orders.count()) > 0;
  if (signed) await orders.first().check();
  await expectNoHorizontalOverflow(page, "founding: the oath");

  await take.click();
  await confirmReview(page);
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
  const receipt = page.getByRole("article", { name: "Sworn in as President, Ada Whitfield" });
  await expect(receipt).toBeVisible();
  if (signed) await expect(receipt.getByText("None", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "brief");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
  await expect(page.getByRole("main").getByText(/^January 20, 2029/).first()).toBeVisible();
});

test("the oath stays shut until the President has a name", async ({ page }) => {
  await openFounding(page);
  await page.getByRole("button", { name: "Skip to the oath" }).click();
  await expect(page.getByText("The oath needs your name.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Take the oath" })).toBeDisabled();
  await page.getByRole("button", { name: "Go to the person" }).click();
  await expect(page.getByLabel("Name on the oath")).toBeVisible();
});
