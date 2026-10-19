import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { importFixture } from "./helpers";

type GraftEvidence = { readonly id: string; readonly person: string; readonly name: string; readonly description: string; readonly week: number };

function evidence(): GraftEvidence {
  const path = fileURLToPath(new URL("./.fixtures/cabinet-graft-opened.json", import.meta.url));
  const save = JSON.parse(readFileSync(path, "utf8"));
  const event = save.campaign.ledger.find((row: { causal?: { graft?: unknown } }) => row.causal?.graft);
  if (!event?.causal?.eventId || !event.causal.graft?.person || event.actor !== "world" || !Number.isInteger(event.turn)) {
    throw new Error("the graft fixture has no original world-actor event");
  }
  const person = event.causal.graft.person as string;
  const name = save.campaign.people[person]?.base?.name as string | undefined;
  if (!name) throw new Error("the graft fixture lost the responsible person");
  return { id: event.causal.eventId, person, name, description: event.description, week: event.turn - 1 };
}

async function verifySurface(page: Page, stage: "opened" | "reported", act: GraftEvidence): Promise<void> {
  const disclosed = stage === "reported";
  await importFixture(page, `cabinet-graft-${stage}`);
  await page.goto("/washington/oversight");
  await expect(page.getByRole("heading", { level: 1, name: "Oversight" })).toBeVisible();
  const inquiries = page.getByRole("region", { name: "Inquiries into your administration", exact: true });
  await expect(inquiries.getByText(/suspected irregularities in purchasing at the Department of Defense/i)).toBeVisible();
  await inquiries.getByRole("button", { name: /suspected irregularities in purchasing at the Department of Defense/i }).click();
  const inquiryRecord = page.getByRole("dialog", { name: /suspected irregularities in purchasing at the Department of Defense/i });
  await expect(inquiryRecord.getByText(disclosed ? "Reported" : "Opened, not public", { exact: true })).toBeVisible();
  await expect(inquiryRecord.getByText(act.name, { exact: false })).toHaveCount(disclosed ? 1 : 0);
  await page.screenshot({ path: test.info().outputPath(`oversight-${stage}.png`) });
  await page.keyboard.press("Escape");

  await page.goto("/washington/office/OFF-DEFENSE-SEC");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("tab", { name: /^Record/ }).click();
  await expect(page).toHaveURL(/\?view=record$/);
  const officeRecord = page.locator("#exec-record").locator("..");
  await expect(officeRecord).toBeVisible();
  const actLink = `a[href="/record/event/${encodeURIComponent(act.id)}"]`;
  await expect(officeRecord.locator(actLink)).toHaveCount(disclosed ? 1 : 0);

  await page.goto(`/washington/person/${encodeURIComponent(act.person)}`);
  await expect(page.getByRole("heading", { level: 1, name: act.name })).toBeVisible();
  await page.getByRole("tab", { name: "Career and counsel", exact: true }).click();
  await expect(page).toHaveURL(/\?view=career$/);
  const career = page.locator("#person-career").locator("..");
  await expect(career).toBeVisible();
  await expect(career.locator(actLink)).toHaveCount(disclosed ? 1 : 0);

  await page.goto("/record");
  await expect(page.getByRole("heading", { level: 1, name: "Record" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search the Record" }).fill(act.description);
  await expect(page.locator(".rec-row__link").filter({ hasText: act.description })).toHaveCount(disclosed ? 1 : 0);
  await page.goto(`/record/event/${encodeURIComponent(act.id)}`);
  if (disclosed) await expect(page.locator(".rec-detail")).toContainText(act.description);
  else {
    await expect(page.getByText("This administration's Record holds no such entry")).toBeVisible();
    await expect(page.locator(".rec-detail")).toHaveCount(0);
  }
  await page.screenshot({ path: test.info().outputPath(`record-${stage}.png`) });

  await page.goto(`/brief/digest?week=${act.week}`);
  await expect(page).toHaveURL(new RegExp(`/brief[?]view=history&week=${act.week}$`));
  await expect(page.getByRole("heading", { level: 1, name: /^(President’s )?Brief$/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Briefing history", exact: true })).toBeVisible();
  const acts = page.getByRole("region", { name: "What you did" });
  const world = page.getByRole("region", { name: "What the world did" });
  await expect(acts.getByText(act.description, { exact: true })).toHaveCount(disclosed ? 1 : 0);
  await expect(world.getByText(act.description, { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath(`digest-${stage}.png`) });
}

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus || page.isClosed()) return;
  await page.screenshot({ path: info.outputPath("failure.png") }).catch(() => undefined);
  await info.attach("body", { body: await page.locator("body").innerText().catch(() => "page unavailable"), contentType: "text/plain" });
});

test("concealed cabinet contract steering reaches the player only after the inspector's finding", async ({ page }) => {
  const act = evidence();
  await verifySurface(page, "opened", act);
  await verifySurface(page, "reported", act);
});
