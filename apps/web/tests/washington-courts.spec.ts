import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow } from "./helpers";

// The courts and oversight on one fixture (a ruling handed down, a second
// order before the bench, a seat open after a justice's death, an inspector
// general's audit at the Treasury, a covert finding with notice withheld):
// open the bench, a justice and a case; nominate to the open seat from its seat row and
// withdraw the name; issue a directive; file an inspector general's removal
// notice. Every act goes compare, authorize, receipt. Every size in the config
// runs it, so phone and desktop prove the same work.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w6-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };

/** With E2E_SCREENS set, keeps the acceptance captures at the two composed sizes. */
async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const size = CAPTURED[info.project.name];
  if (!process.env.E2E_SCREENS || !size) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}-${size}.png`, SCREENS)) });
}

async function importFixture(page: Page, name: string): Promise<void> {
  await page.goto("/administrations");
  await page.getByLabel("Import a save exported from this game").setInputFiles(fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url)));
  await page.waitForURL("**/brief", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Brief" })).toBeVisible();
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

async function intoView(page: Page, name: string): Promise<void> {
  await page.getByRole("heading", { level: 2, name, exact: true }).evaluate((element) => element.scrollIntoView({ block: "start" }));
}

test("the courts: the bench, a justice's file, a case, and a nomination sent and withdrawn", async ({ page }, info) => {
  await importFixture(page, "courts-and-oversight");
  await page.goto("/washington/courts");
  await expect(page.getByRole("heading", { level: 1, name: "Courts" })).toBeVisible({ timeout: 60_000 });
  for (const name of ["The Supreme Court", "The year ahead", "How the justices vote together"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.getByRole("tab", { name: /Bench/ })).toHaveAttribute("aria-selected", "true");
  const seats = page.getByRole("list", { name: "Justices, left to right" }).getByRole("listitem");
  await expect(seats).toHaveCount(9);
  await expectNoHorizontalOverflow(page, "courts");
  await capture(page, info, "courts");

  await seats.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/washington\/person\//);
  await expect(page.getByRole("heading", { level: 2, name: /Record on the bench/ })).toBeVisible();
  await expect(page.getByText(/No case has reached the bench since/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "a justice");
  await capture(page, info, "courts-judge");

  await page.goBack();
  await page.waitForURL("**/washington/courts**");
  await page.getByRole("tab", { name: /Docket/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Cases before the courts" })).toBeVisible();
  await page.getByRole("list", { name: "Pending cases" }).getByRole("link").first().click();
  await page.waitForURL("**/washington/courts/case/**");
  await expect(page.getByRole("heading", { level: 2, name: "The case" })).toBeVisible();
  for (const name of ["The pending question", "Procedural history"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expectNoHorizontalOverflow(page, "a case");
  await capture(page, info, "courts-case");

  await page.getByRole("link", { name: "Federal docket" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Courts" })).toBeVisible();
  await page.getByRole("tab", { name: /Nominations/ }).click();
  // A Supreme Court seat is the one seat row with nobody picked until the President picks.
  // It is the only open seat here, so it opens on arrival with leaving it open chosen.
  const seat = page.locator("li.appt-seat").filter({ hasText: /Justice/ }).first();
  await expect(seat.getByText("No nominee picked. A Supreme Court seat is never filled by default.")).toBeVisible();
  await expect(seat.getByRole("button", { name: /Justice/ })).toHaveAttribute("aria-expanded", "true");
  await expect(seat.getByRole("radio", { name: "Leave it open" })).toBeChecked();
  await seat.getByRole("radio").nth(1).check();
  const nominate = page.getByRole("region", { name: /^Send the nominations for \d+ open seats?/ });
  await nominate.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await expect(nominate.getByRole("radio", { name: "Leave them open" })).toBeChecked();
  const send = page.getByRole("button", { name: /^Send (the nomination|\d+ nominations)$/ });
  await expect(send).toBeDisabled();
  await nominate.getByRole("radio", { name: /^Send (the nomination|\d+ nominations)$/ }).check();
  await expect(nominate.getByText(/goes into vetting today/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "the court seats");
  await capture(page, info, "courts-nominate");
  await send.click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: /( nominated|nominations sent)$/ })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "courts-nominate-receipt");
  await receipt.getByRole("button", { name: "Back to appointments" }).click();

  const withdraw = page.getByRole("region", { name: /, for / });
  await withdraw.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await withdraw.getByRole("radio", { name: "Withdraw it", exact: true }).check();
  await expect(withdraw.getByText("International Standing −1.2 pts", { exact: true })).toBeVisible();
  await withdraw.getByRole("button", { name: "Withdraw the nomination" }).click();
  await confirmReview(page);
  await settled(page);
  await expect(page.getByRole("region", { name: "Receipt" }).getByRole("article", { name: /nomination withdrawn$/ })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "courts-withdraw-receipt");
  await page.getByRole("region", { name: "Receipt" }).getByRole("link", { name: "View record", exact: true }).click();
  await page.waitForURL("**/record/event/**");
});

test("oversight: an inquiry, a directive issued, and an inspector general's removal notice filed", async ({ page }, info) => {
  await importFixture(page, "courts-and-oversight");
  await page.goto("/washington/oversight");
  await expect(page.getByRole("heading", { level: 1, name: "Oversight" })).toBeVisible({ timeout: 60_000 });
  for (const name of ["Inquiries into your administration", "Notices owed to the committees"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expect(page.locator(".inquiry-board").getByText("Office of Inspector General, Department of the Treasury")).toBeVisible();
  await expectNoHorizontalOverflow(page, "oversight");
  await capture(page, info, "oversight");

  await page.getByRole("tab", { name: /Directives/ }).click();
  await intoView(page, "Issue a directive");
  await page.getByLabel("The body").selectOption("INST-FED");
  await page.getByRole("combobox", { name: "Directive subject", exact: true }).selectOption({ label: "Request a lower policy rate" });
  const directive = page.getByRole("region", { name: "Compare issuing the directive" });
  await directive.getByRole("radio", { name: "Issue it", exact: true }).check();
  await expect(page.locator('.statute-preview[data-status="refused"]')).toBeVisible();
  await expectNoHorizontalOverflow(page, "the directive composer");
  await directive.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "oversight-directive");
  await directive.getByRole("button", { name: "Issue the directive" }).click();
  await confirmReview(page);
  await settled(page);
  await expect(page.getByRole("region", { name: "Receipt" }).getByRole("article", { name: /^Directive to .*Federal Reserve/ })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "oversight-directive-receipt");

  await page.getByRole("tab", { name: /Inspectors/ }).click();
  await intoView(page, "Inspectors general");
  await page.getByRole("combobox", { name: "Inspector general", exact: true }).selectOption({ label: "Department of the Treasury" });
  const notice = page.getByRole("region", { name: "Compare filing a removal notice" });
  await notice.getByRole("radio", { name: "File notice of removal", exact: true }).check();
  await expect(notice.getByText("Not available: state your reasons first.").first()).toBeVisible();
  await page.getByRole("combobox", { name: "Stated reason", exact: true }).selectOption({ index: 1 });
  await expect(notice.getByRole("button", { name: "File the removal notice" })).toBeEnabled();
  await expect(notice.getByText(/Made public and marked obstructed/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "the removal notice");
  await notice.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "oversight-notice");
  await notice.getByRole("button", { name: "File the removal notice" }).click();
  await confirmReview(page);
  await settled(page);
  const receipt = page.getByRole("region", { name: "Receipt" }).getByRole("article", { name: /^Notice filed to remove the inspector general/ });
  await expect(receipt).toBeVisible({ timeout: 30_000 });
  await receipt.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, info, "oversight-notice-receipt");
  await expect(page.getByRole("list", { name: "Inspectors general" }).getByText(/Notice of removal filed/)).toBeVisible();
});
