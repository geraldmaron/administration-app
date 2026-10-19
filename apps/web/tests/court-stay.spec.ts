import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { clearToContinue, confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

type CourtSave = {
  orders: readonly { id: string; order: string; review?: { status: string } }[];
  pendingRules: readonly { id: string; status: string }[];
  judiciary: { proceedings?: readonly { id: string; subject: { kind: string; recordId?: string };
    lower?: { holding: string; enforcement: string }; stage: string;
    governmentReview?: string; stayApplication?: { status: string; decidedTurn?: number } }[] };
  cases?: Record<string, { status: string }>;
};

function fixture(name: string): CourtSave {
  const path = fileURLToPath(new URL(`./.fixtures/${name}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")).campaign;
}

function courtRecord(campaign: CourtSave) {
  const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order"
    && entry.lower?.holding === "struck-down");
  if (!proceeding?.subject.recordId) throw new Error("Fixture has no adverse executive-order lower judgment");
  return proceeding;
}

async function openCase(page: Page, name: string): Promise<void> {
  const campaign = fixture(name);
  const proceeding = courtRecord(campaign);
  await importFixture(page, name);
  await page.goto(`/washington/courts/case/${encodeURIComponent(proceeding.subject.recordId!)}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function capture(page: Page, info: TestInfo, name: string, focus?: Locator): Promise<void> {
  await expectNoHorizontalOverflow(page, name);
  const viewport = page.viewportSize();
  if (focus && viewport) {
    await page.setViewportSize({ width: viewport.width, height: 1400 });
    await focus.scrollIntoViewIfNeeded();
  }
  const path = info.outputPath(`${name}-${info.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: "image/png" });
  if (!focus) return;
  const detailPath = info.outputPath(`${name}-detail-${info.project.name}.png`);
  await focus.screenshot({ path: detailPath });
  await info.attach(`${name}-detail`, { path: detailPath, contentType: "image/png" });
  if (viewport) await page.setViewportSize(viewport);
}

const ACTIONS = [
  { label: "Ask for further review", receipt: "Further review requested", review: "seek" },
  { label: "Ask for review and a stay", receipt: "Review and a stay requested", review: "seek-with-stay" },
  { label: "Accept the lower judgment", receipt: "Lower judgment accepted", review: "accept" },
] as const;

test("an operative adverse lower judgment offers three executable responses", async ({ page }, info) => {
  const base = fixture("court-stay-review");
  const proceeding = courtRecord(base);
  expect(base.pendingRules.find((entry) => entry.id === proceeding.subject.recordId)?.status).toBe("in-effect");
  expect(proceeding.lower?.enforcement).toBe("in-force");
  expect(base.cases?.[`case:review:${proceeding.id}`]?.status).toBe("raised");

  for (const choice of ACTIONS) {
    await openCase(page, "court-stay-review");
    for (const option of ACTIONS) await expect(page.getByRole("button", { name: option.label, exact: true })).toBeVisible();
    await expect(page.getByText(/future operation is paused/i).first()).toBeVisible();
    await capture(page, info, `adverse-lower-${choice.review}`);
    await page.getByRole("button", { name: choice.label, exact: true }).click();
    await confirmReview(page);
    await expect(page.getByRole("heading", { level: 1, name: choice.receipt })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: choice.label, exact: true })).toHaveCount(0);
    if (choice.review === "seek-with-stay") {
      const stay = page.getByRole("heading", { name: "Review calendar and stay" }).locator("..");
      await expect(stay).toContainText("No decision on this stay request is recorded");
      await expect(stay).toContainText("Filing the request did not itself pause the lower judgment");
      await expect(stay).toContainText("future operation is currently suspended");
      await expect(stay).not.toContainText(/%|\b(draw|score|modeledGrantChance)\b/i);
    }
    await capture(page, info, `answered-${choice.review}`);
  }
});

test("the separate stay ruling and an unanswered deadline survive import and reload", async ({ page }, info) => {
  const pending = fixture("court-stay-pending");
  const granted = fixture("court-stay-granted");
  const denied = fixture("court-stay-denied");
  const defaulted = fixture("court-stay-defaulted");
  expect(courtRecord(pending).stayApplication?.status).toBe("pending");
  expect(courtRecord(granted).stayApplication).toMatchObject({ status: "granted", decidedTurn: expect.any(Number) });
  expect(courtRecord(denied).stayApplication).toMatchObject({ status: "denied", decidedTurn: expect.any(Number) });
  expect(courtRecord(defaulted).governmentReview).toBe("defaulted");

  for (const [name, decision, authority] of [
    ["court-stay-pending", "No decision on this stay request is recorded", "future operation is currently suspended"],
    ["court-stay-granted", "The court granted a stay", "currently has authority to operate"],
    ["court-stay-denied", "The court denied a stay", "future operation is currently suspended"],
  ] as const) {
    await openCase(page, name);
    const stay = page.getByRole("heading", { name: "Review calendar and stay" }).locator("..");
    await expect(stay).toContainText(decision);
    await expect(stay).toContainText(authority);
    await expect(stay).not.toContainText(/%|\b(draw|score|modeledGrantChance)\b/i);
    await capture(page, info, name, stay);
    await page.reload();
    await expect(stay).toContainText(decision);
  }

  await openCase(page, "court-stay-defaulted");
  await expect(page.getByRole("button", { name: "Ask for review and a stay" })).toHaveCount(0);
  await capture(page, info, "court-stay-defaulted");
  await page.goto("/brief");
  await expect(page.getByRole("heading", { name: /Lower court sets aside Tighten border controls/ })).toHaveCount(0);
  await clearToContinue(page);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("region", { name: "While time ran" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Lower court sets aside Tighten border controls/ })).toHaveCount(0);
});

test("a granted review appears on a dated term calendar with counsel's case record", async ({ page }, info) => {
  const campaign = fixture("court-term-calendar");
  const proceeding = courtRecord(campaign);
  expect(proceeding.stage).toBe("supreme-merits");
  await openCase(page, "court-term-calendar");
  const section = page.getByRole("heading", { name: "Review calendar and stay" }).locator("..");
  await expect(section).toContainText(/October \d{4} term/);
  await expect(section).toContainText(/opinion expected/i);
  await expect(section).toContainText(/Solicitor General's standing when review was considered was/i);
  await expect(section).not.toContainText(/%|\b(draw|modeledGrantChance|standingAdjustment)\b/i);
  await capture(page, info, "term-case", section);
  await page.goto("/washington/courts");
  const term = page.getByRole("region", { name: "The year ahead" });
  await expect(term).toContainText(/usual late-June opinion target/i);
  await expect(term.locator(".court-calendar__event[data-kind='argument'], .court-calendar__event[data-kind='opinion-target']").first()).toBeAttached();
  await expect(page.getByRole("region", { name: "The Supreme Court" })).toContainText(/Solicitor General standing/i);
  await capture(page, info, "term-courts", term);
});
