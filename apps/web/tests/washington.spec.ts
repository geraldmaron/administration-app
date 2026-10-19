import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, openFromNav } from "./helpers";

// Washington: the executive tree over the office pins, an office framed at its
// headquarters, a successor appointed from the shortlist (compared against
// leaving the chair, authorized, and receipted), a resignation answered, and a
// person's dossier. Every size in the config runs it.

async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  const path = fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url));
  await page.getByLabel("Import a save exported from this game").setInputFiles(path);
  await page.waitForURL("**/brief", { timeout: 60_000 });
}

async function openWashington(page: Page): Promise<void> {
  await expect(page.getByRole("navigation", { name: "Main" }).locator("a[href='/washington'], a[href^='/washington#']").first()).toBeAttached({ timeout: 60_000 });
  await openFromNav(page, "/washington");
  await expect(page.getByRole("heading", { level: 1, name: "Executive" })).toBeVisible();
}

/** A department's own tile, not one of the agencies listed inside it. */
const department = (state: string) => `section[aria-label='The departments'] li.office-row${state}`;

/** Opens the department whose chair an acting deputy holds: the one the fixture emptied. */
async function openActingOffice(page: Page): Promise<void> {
  await page.locator(`${department("[data-staffing='acting']")} .office-row__pick`).first().click();
  await page.locator(".office-inspector:visible").getByRole("link", { name: "Open office" }).click();
  await page.waitForURL("**/washington/office/**");
}

test("the Executive page lays out the chairs by group, and filters to what needs you", async ({ page }) => {
  await importFixture(page, "washington-chairs");
  await openWashington(page);
  await expect(page.getByRole("heading", { level: 3, name: /^The departments/ })).toBeVisible();
  await expect(page.locator(".office-row[data-staffing='acting']").first()).toBeVisible();
  await expect(page.locator(".office-row[data-alert='true']").first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "washington");

  const all = await page.locator(".office-row").count();
  const filter = page.getByRole("button", { name: /^Only chairs that need you/ });
  await expect(filter).toHaveAttribute("aria-pressed", "false");
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.locator(".office-row").count()).toBeLessThan(all);
  await expect(page.locator(".office-row[data-staffing='acting']").first()).toBeVisible();
});

test("an office opens at its headquarters, and a successor is nominated from the shared seat row with a receipt", async ({ page }) => {
  await importFixture(page, "washington-chairs");
  await openWashington(page);
  await openActingOffice(page);
  await expect(page.getByText(/^Headquarters:/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Department performance" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "office");

  await page.getByRole("tab", { name: "Actions", exact: true }).click();
  await page.getByRole("button", { name: "Compare the candidates" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Fill the chair: / })).toBeVisible();
  // The office's one seat opens on arrival, its recommended name picked against leaving it open.
  const seat = page.locator("li.appt-seat").first();
  await expect(seat.getByRole("radio", { name: "Leave it open" })).toBeVisible();
  await expect(seat.getByText("Recommended").first()).toBeVisible();
  await expect(seat.getByText(/best fits for the seat, of \d+ people its rules allow/)).toBeVisible();
  const send = page.getByRole("button", { name: "Send the nomination", exact: true });
  await expect(send).toBeDisabled();
  await expectNoHorizontalOverflow(page, "appointment seat");

  await page.getByRole("region", { name: /^Send the nominations for 1 open seat/ }).getByRole("radio", { name: "Send the nomination" }).check();
  await expect(send).toBeEnabled();
  await send.click();
  await confirmReview(page);

  const receipt = page.getByRole("article", { name: /nominated$/ });
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("In vetting, then the committee and the floor")).toBeVisible();
  await expectNoHorizontalOverflow(page, "receipt");
  await receipt.getByRole("link", { name: "View record" }).click();
  await page.waitForURL("**/record/event/**");
});

test("the appointments desk sends a changed Treasury name, a chosen Chief Justice and the circuit default together", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await importFixture(page, "appointments-desk");
  await page.goto("/washington/oversight?view=appointments");
  await expect(page.getByRole("heading", { level: 2, name: "Appointments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cabinet (1)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Courts (2)" })).toBeVisible();
  await expect(page.getByText("No nominee picked. A Supreme Court seat is never filled by default.")).toBeVisible();
  await expectNoHorizontalOverflow(page, "appointments desk");
  await page.screenshot({ path: info.outputPath(`appointments-desk-${info.project.name}.png`), fullPage: true, animations: "disabled" });

  // Treasury: open the seat and send the second name instead of the recommended one.
  const treasury = page.locator("li#seat-OFF-TREASURY-SEC");
  await treasury.getByRole("button", { name: /Secretary of the Treasury/ }).click();
  await expect(treasury.getByText("Who could be sent for Secretary of the Treasury")).toBeVisible();
  await treasury.getByRole("radio").nth(2).check();
  await expectNoHorizontalOverflow(page, "treasury candidates");
  // The Chief Justice: nothing is picked until the President picks.
  const chief = page.locator("li#seat-OFF-SCOTUS-SEAT-1");
  await chief.getByRole("button", { name: /Chief Justice of the United States/ }).click();
  await chief.getByRole("radio").nth(1).check();
  await page.screenshot({ path: info.outputPath(`appointments-desk-picked-${info.project.name}.png`), fullPage: true, animations: "disabled" });

  await page.getByRole("region", { name: /^Send the nominations for 3 open seats/ }).getByRole("radio", { name: "Send 3 nominations" }).check();
  await page.getByRole("button", { name: "Send 3 nominations", exact: true }).click();
  const review = page.locator('[role="dialog"].review[data-state="open"]');
  await expect(review.getByText("Secretary of the Treasury")).toBeVisible();
  await expect(review.getByText("Chief Justice of the United States")).toBeVisible();
  await expect(review.getByText(/Judge of the District of Columbia Circuit/)).toBeVisible();
  await confirmReview(page);
  await expect(page.getByRole("article", { name: "3 nominations sent" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Back to appointments" }).click();
  await expect(page.getByText("Every seat the Senate confirms is filled or has a name before it.")).toBeVisible();

  await page.goto("/washington/courts?view=nominations");
  await expect(page.getByRole("heading", { name: "Before the Senate (2)" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a vacancy on the Brief opens its one seat, and the name goes up from there", async ({ page }) => {
  await importFixture(page, "appointments-desk");
  await page.getByRole("link", { name: "One cabinet seat is empty" }).first().click();
  await page.waitForURL(/\/washington\/oversight\?.*seat=OFF-TREASURY-SEC/);
  await expect(page.getByText("Showing one seat.")).toBeVisible();
  await expect(page.getByText("Who could be sent for Secretary of the Treasury")).toBeVisible();
  await expect(page.locator("li.appt-seat")).toHaveCount(1);
  await expectNoHorizontalOverflow(page, "one seat");
  await page.getByRole("region", { name: /^Send the nominations for 1 open seat/ }).getByRole("radio", { name: "Send the nomination" }).check();
  await page.getByRole("button", { name: "Send the nomination", exact: true }).click();
  await confirmReview(page);
  await expect(page.getByRole("article", { name: /nominated$/ })).toBeVisible({ timeout: 30_000 });
});

test("a Secretary's offer to resign is answered from their office, against leaving it standing", async ({ page }) => {
  await importFixture(page, "washington-chairs");
  await openWashington(page);
  // The fixture holds a proposal from State and an Education offer to resign; the offer is the alert this journey answers.
  await page.locator(`${department("[data-alert='true']")} .office-row__pick`, { hasText: "Education" }).first().click();
  await page.locator(".office-inspector:visible").getByRole("link", { name: "Open office" }).click();
  await page.waitForURL("**/washington/office/**");
  await page.getByRole("tab", { name: "Actions", exact: true }).click();
  const offer = page.getByRole("article", { name: /offer to resign/ });
  await expect(offer).toBeVisible();
  const compare = offer.getByRole("region", { name: "Compare the answers" });
  await expect(compare.getByRole("radio", { name: "Leave it standing" })).toBeChecked();
  await compare.getByRole("radio", { name: "Ask them to stay" }).check();
  await compare.getByRole("button", { name: "Ask them to stay" }).click();
  await confirmReview(page);
  await expect(page.getByRole("article", { name: /asked to stay/ })).toBeVisible({ timeout: 30_000 });
});

test("a person's dossier shows their five readings as bands, their career and the lever over their chair", async ({ page }) => {
  await importFixture(page, "washington-chairs");
  await openWashington(page);
  await page.locator(`${department("[data-staffing='confirmed']")} .office-row__pick`).first().click();
  await page.locator(".office-inspector:visible .office-inspector__identity a").click();
  await page.waitForURL("**/washington/person/**");
  await expect(page.getByRole("heading", { level: 2, name: "Assessed readings" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Assessed qualities" })).toBeAttached();
  const dismiss = page.getByRole("region", { name: "Compare dismissing them against keeping them" });
  await expect(dismiss.getByRole("radio", { name: /^Keep / })).toBeChecked();
  await expect(dismiss.getByRole("button", { name: /^Dismiss / })).toBeDisabled();
  const readings = page.getByRole("region", { name: "Assessed qualities", exact: true });
  await expect(readings.getByRole("meter", { name: /^(Competence|Loyalty|Integrity|Charisma|Ambition)$/ })).toHaveCount(5);
  const values = await readings.getByRole("meter").allInnerTexts();
  expect(values.length).toBeGreaterThanOrEqual(5);
  for (const value of values) expect(value).not.toMatch(/\d+%/);
  await page.getByRole("tab", { name: "Career and counsel", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Career" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "person");
});
