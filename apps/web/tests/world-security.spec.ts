import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { confirmReview, expectInThumbReach, expectNoHorizontalOverflow, importFixture } from "./helpers";

// The security desk and a combatant command on one fixture (forces behind a
// guarantee to Poland, an authorization against Iran voted, a written finding
// on Iran, a standing CIA tasking against Russia, an intent assessment of
// Russia): force clusters drawn on the world map, a command's area lit by
// pointing at it and set-detached on its own screen, then a posture set, a
// collection tasked, an assessment commissioned and a finding signed, each
// compare, authorize, receipt. The desk is a workspace with no map; every size
// in the config runs it.

const SCREENS = new URL("../../../docs/audits/2026-10-10-map-first/w7-screens/", import.meta.url);
const CAPTURED: Readonly<Record<string, string>> = { "mobile-390": "390x844", "desktop-1440": "1440x900" };

/** With E2E_SCREENS set, keeps the acceptance captures at the two composed sizes. */
async function capture(page: Page, info: TestInfo, name: string): Promise<void> {
  const size = CAPTURED[info.project.name];
  if (!process.env.E2E_SCREENS || !size) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}-${size}.png`, SCREENS)) });
}

async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
}

const receipt = (page: Page) => page.getByRole("region", { name: "Receipt" });

async function backToDesk(page: Page): Promise<void> {
  await receipt(page).getByRole("button", { name: "Back to the desk" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Security", exact: true })).toBeVisible();
}

async function openSecurity(page: Page): Promise<void> {
  await page.goto("/world/security");
  await expect(page.getByRole("heading", { level: 1, name: "Security" })).toBeVisible({ timeout: 60_000 });
}

test("security: the headline readings, the commands, and the desk's sections", async ({ page }, info) => {
  await importFixture(page, "security-desk");
  await openSecurity(page);
  await expect(page.getByRole("region", { name: "National security at a glance" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.getByRole("region", { name: "Military readiness", exact: true })).toBeAttached();
  await expect(page.getByRole("heading", { level: 2, name: "Commands", exact: true })).toBeAttached();
  const obligations = page.getByRole("region", { name: "Legal obligations" });
  await expect(obligations.getByRole("list", { name: "War Powers reports and clocks" })).toBeAttached();
  await expect(obligations.getByRole("list", { name: "Force authorizations before Congress" })).toBeAttached();
  await page.getByRole("tab", { name: "Forces", exact: true }).click();
  await expect(page.getByRole("region", { name: "Department of the Army" }).getByRole("table", { name: "What the Department of the Army fields, by asset" })).toBeAttached();
  await page.getByRole("tab", { name: /^Intelligence/ }).click();
  for (const name of ["Today's intelligence", "Collection", "Assessments"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await page.getByRole("tab", { name: /^Operations/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Operations", exact: true })).toBeAttached();
  await expect(page.getByRole("table", { name: /Open operations/ })).toBeAttached();
  await page.getByRole("tab", { name: "Theaters", exact: true }).click();
  const geographic = page.getByRole("list", { name: "Geographic commands" }).locator(":scope > li");
  await expect(geographic).toHaveCount(6);
  await expect(page.getByRole("list", { name: "Functional commands" }).locator(":scope > li")).toHaveCount(5);
  await expectNoHorizontalOverflow(page, "security");
  await capture(page, info, "security");
});

test("a command: its area set-detached, forces by zone and base, and its posture set", async ({ page }, info) => {
  await importFixture(page, "security-desk");
  await openSecurity(page);
  await page.getByRole("list", { name: "Geographic commands" }).getByRole("link", { name: "INDOPACOM" }).click();
  await page.waitForURL("**/world/security/command/CCMD-INDOPACOM");
  await expect(page.getByRole("heading", { level: 1, name: "INDOPACOM" })).toBeVisible();
  for (const name of ["Posture and command", "What you can do", "Forces by zone and base", "Its area"]) {
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
  }
  await expectNoHorizontalOverflow(page, "a command");
  await capture(page, info, "command");

  await page.getByRole("button", { name: "Set posture" }).click();
  const compare = page.getByRole("region", { name: "Compare against doing nothing" });
  await expect(compare.getByRole("radio", { name: /^Hold at routine/ })).toBeChecked();
  await expect(page.getByRole("button", { name: /^Order / })).toBeDisabled();
  await compare.getByRole("radio", { name: "Order surge", exact: true }).check();
  await expect(compare.getByText(/Military readiness −1\.2 pts a week/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "the posture comparison");
  await expectInThumbReach(page, page.getByRole("button", { name: "Order surge" }), "the posture verb");
  await capture(page, info, "command-posture");
  await page.getByRole("button", { name: "Order surge" }).click();
  await confirmReview(page);
  await settled(page);
  await expect(receipt(page).getByRole("article", { name: "INDOPACOM ordered to surge" })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "command-posture-receipt");
  await receipt(page).getByRole("button", { name: "Back to INDOPACOM" }).click();
  await expect(page.getByRole("region", { name: "Posture and command" })).toContainText("Surge");

  await page.getByRole("button", { name: "Relieve the commander" }).click();
  const relief = page.getByRole("region", { name: "Compare against doing nothing" });
  await expect(relief.getByText("Not available: a relief has to be given a reason.").first()).toBeVisible();
  await relief.getByRole("radio", { name: "Relieve the commander", exact: true }).check();
  await expect(page.getByRole("button", { name: "Relieve the commander" })).toBeDisabled();
  await page.getByRole("group", { name: "Reason for relief", exact: true }).getByRole("radio", { name: "Lost confidence in the commander's judgment.", exact: true }).check();
  await expect(page.getByRole("button", { name: "Relieve the commander" })).toBeEnabled();
});

test("the desk: task a collection, commission an assessment and sign a finding, each through its comparison to a receipt", async ({ page }, info) => {
  await importFixture(page, "security-desk");
  await openSecurity(page);
  await page.getByRole("tab", { name: /^Intelligence/ }).click();

  await page.getByRole("button", { name: "Task the community" }).click();
  await page.getByRole("group", { name: "What it is to answer", exact: true }).getByRole("radio", { name: /^External intentions and actions / }).check();
  const task = page.getByRole("region", { name: "Compare against doing nothing" });
  await expect(page.getByRole("button", { name: "Send the tasking" })).toBeDisabled();
  await task.getByRole("radio", { name: "Task CIA", exact: true }).check();
  await expect(task.getByText(/uses human sources to report on external actions/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "the tasking");
  await capture(page, info, "security-task");
  await page.getByRole("button", { name: "Send the tasking" }).click();
  await confirmReview(page);
  await settled(page);
  await expect(receipt(page).getByRole("article", { name: "CIA is tasked" })).toBeVisible({ timeout: 30_000 });
  await backToDesk(page);
  await expect(page.getByRole("region", { name: "Collection", exact: true }).getByRole("row").filter({ hasText: /^(CIA|NSA)/ })).toHaveCount(2);

  await page.getByRole("button", { name: "Commission an assessment" }).click();
  await page.getByLabel("About which government").selectOption({ label: "Iran" });
  const commission = page.getByRole("region", { name: "Compare against doing nothing" });
  await commission.getByRole("radio", { name: "Ask about capability", exact: true }).check();
  await expect(commission.getByText(/confidence/).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "the commission");
  await capture(page, info, "security-commission");
  await page.getByRole("button", { name: "Commission the assessment" }).click();
  await confirmReview(page);
  await settled(page);
  await expect(receipt(page).getByRole("article", { name: "Assessment commissioned: Iran, capability" })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "security-commission-receipt");
  await backToDesk(page);
  await expect(page.getByRole("region", { name: "Assessments", exact: true }).getByRole("listitem").filter({ hasText: /^Iran\s*Capability/ })).toBeVisible();

  await page.getByRole("tab", { name: /^Operations/ }).click();
  await page.getByRole("button", { name: "Sign a finding" }).click();
  await page.getByRole("group", { name: "Finding objective", exact: true }).getByRole("radio", { name: "Disrupt foreign military logistics.", exact: true }).check();
  const finding = page.getByRole("region", { name: "Compare against doing nothing" });
  await expect(finding.getByText(/Withholding prior notice requires a statement of the reasons/).first()).toBeVisible();
  await finding.getByRole("radio", { name: "Withhold prior notice", exact: true }).check();
  await expect(page.getByRole("button", { name: "Sign the finding" })).toBeDisabled();
  await finding.getByRole("radio", { name: "Brief the full committees", exact: true }).check();
  await expect(finding.getByText("Counsel will paper it").first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "the finding");
  await capture(page, info, "security-finding");
  await page.getByRole("button", { name: "Sign the finding" }).click();
  await confirmReview(page);
  await settled(page);
  await expect(receipt(page).getByRole("article", { name: /^Finding signed on / })).toBeVisible({ timeout: 30_000 });
  await capture(page, info, "security-finding-receipt");
  await receipt(page).getByRole("link", { name: "View record" }).click();
  await page.waitForURL("**/record/event/**");
});

test("collection preserves counsel boundaries and cannot issue a person tasking without verified jurisdiction", async ({ page }) => {
  await importFixture(page, "security-desk");
  await page.goto("/world/security?view=intelligence");
  await page.getByRole("button", { name: "Task the community" }).click();
  await page.getByLabel("Which element of the community").selectOption("IC-USCG");
  const targets = page.getByRole("group", { name: "What it is pointed at", exact: true });
  await targets.getByRole("radio", { name: /^A person in the United States/ }).check();
  await expect(page.getByText(/No person-level target with verified jurisdiction/)).toBeVisible();
  const compare = page.getByRole("region", { name: "Compare against doing nothing" });
  await compare.getByRole("radio", { name: "Task CG-2", exact: true }).check();
  await expect(page.getByRole("button", { name: "Send the tasking" })).toBeDisabled();
  await expect(page.getByLabel("Who or what")).toHaveCount(0);
  await targets.getByRole("radio", { name: /^A foreign person/ }).check();
  await expect(page.getByText(/Person-specific foreign collection is unavailable/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send the tasking" })).toBeDisabled();
  await targets.getByRole("radio", { name: /^American politics/ }).check();
  await expect(compare).toContainText("No element of the intelligence community may be pointed at United States political processes");
  await expect(compare).toContainText("refusal is kept forever");
});
