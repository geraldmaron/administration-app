import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { loadSave } from "@admin/engine";
import { confirmReview, importFixture, expectNoHorizontalOverflow, clearToContinue } from "./helpers";

test("ordinary member outreach authorizes a real request and graph scopes preserve public evidence", async ({ page }, info) => {
  await importFixture(page, "member-outreach");
  const campaign = loadSave(JSON.parse(readFileSync(new URL("./.fixtures/member-outreach.json", import.meta.url), "utf8")));
  const member = campaign.congress.members!.find((entry) => !campaign.congress.leadership.some((leader) => leader.person === entry.person))!;
  await page.goto(`/washington/person/${encodeURIComponent(member.person)}`);
  await expect(page.getByRole("heading", { name: "Legislative outreach", exact: true })).toBeVisible();
  await expect(page.getByText(/Representative, House|Senator, Senate/, { exact: true })).toBeVisible();
  await page.getByLabel("Relationship scope", { exact: true }).selectOption("chamber:senate");
  await expect(page.getByText("Actual elected voting seats.", { exact: false })).toBeVisible();
  const graph = page.getByRole("group", { name: /circle:/ }).first();
  await graph.scrollIntoViewIfNeeded();
  await expect(graph).toBeVisible();
  const senators = new Set(campaign.congress.members!.filter((entry) => entry.chamber === "senate").map((entry) => entry.person));
  const displayed = await graph.locator("a[href*='/washington/person/']").evaluateAll((links) => links.map((link) => decodeURIComponent((link as HTMLAnchorElement).pathname.split("/").at(-1) ?? "")));
  expect(displayed.length).toBeGreaterThan(0);
  expect(displayed.every((id) => senators.has(id as typeof member.person))).toBe(true);
  await expect(page.getByText("100 officials are in this public scope.")).toBeVisible();
  await graph.screenshot({ path: `/private/tmp/member-relationship-scope-${info.project.name}.png`, animations: "disabled" });
  await page.getByLabel("Relationship scope", { exact: true }).selectOption("immediate");
  const outreach = page.locator("section").filter({ has: page.getByRole("heading", { name: "Legislative outreach", exact: true }) });
  // A direct call records no person-to-person edge (the engine drops from === to), so the arrows the issue scope draws need a broker's route.
  await outreach.getByLabel("Route", { exact: true }).selectOption({ index: 1 });
  await outreach.getByRole("radio", { name: "Authorize a broker's coalition effort", exact: true }).check();
  await outreach.getByRole("button", { name: "Authorize outreach", exact: true }).click();
  await confirmReview(page);
  await expect(page.getByRole("heading", { level: 1, name: `Outreach to ${campaign.people[member.person]!.base.name}`, exact: true })).toBeVisible();
  await page.reload();
  // A broker's coalition effort takes both daily outreach slots, so the slot refusal names the lock before the pending-request one does.
  await expect(page.getByText(/A request to this member is already awaiting an answer\.|Today's presidential outreach time is already allocated\./).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Authorize outreach", exact: true })).toBeDisabled();
  await expectNoHorizontalOverflow(page, "ordinary member dossier and outreach");
  for (let day = 0; day < 5; day += 1) {
    await clearToContinue(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "While time ran" })).toBeVisible({ timeout: 60_000 });
    await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
    if (await page.getByText(/participants accepted issue-specific dialogue/).first().isVisible().catch(() => false)) break;
  }
  await page.goto(`/washington/person/${encodeURIComponent(member.person)}`);
  await expect(page.getByText(/participants accepted issue-specific dialogue/).first()).toBeVisible();
  const issueBill = Object.values(campaign.bills).find((bill) => bill.status === "in-progress")!;
  await page.getByLabel("Relationship scope", { exact: true }).selectOption(`issue:${issueBill.id}`);
  const issueGraph = page.getByRole("group", { name: /circle:/ }).first();
  await expect(issueGraph.locator(".tie-map__line[marker-end]").first()).toBeVisible();
  await expect(issueGraph.locator(".tie-map__line[stroke-dasharray]")).toHaveCount(0);
  await expect(page.getByText(/Recorded issue dialogue on /).first()).toBeVisible();
  await page.getByText(/participants accepted issue-specific dialogue/).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/private/tmp/member-outreach-response-${info.project.name}.png`, animations: "disabled" });
});
