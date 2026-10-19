import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

const capture = async (page: import("@playwright/test").Page, name: string) => {
  if (!process.env.E2E_SCREENS) return;
  await page.screenshot({ path: fileURLToPath(new URL(`../../../docs/audits/2026-10-10-map-first/experience-screens/agenda-${name}-${page.viewportSize()!.width}.png`, import.meta.url)) });
};

test("legislative agenda: browse, review real funding, transmit, then find the bill on the floor", async ({ page }) => {
  await importFixture(page, "wildfire-colorado");
  await page.goto("/washington/congress");
  await expect(page.getByRole("heading", { level: 1, name: "Congress" })).toBeVisible({ timeout: 60_000 });
  const agenda = page.locator("section[aria-labelledby='congress-transmit']");
  const proposals = agenda.locator(".agenda-list");
  await expect(proposals.getByRole("button")).toHaveCount(4);
  await agenda.getByLabel("Policy area").selectOption("Healthcare");
  await expect(proposals.getByRole("button")).toHaveCount(2);
  await agenda.getByRole("heading", { level: 2, name: "Legislative agenda" }).evaluate((e) => e.scrollIntoView({ block: "start" }));
  await expectNoHorizontalOverflow(page, "Healthcare agenda");
  await capture(page, "browse");
  await proposals.getByRole("button", { name: /Affordable Coverage Act/ }).click();
  const review = page.getByRole("region", { name: "Review this proposal", exact: true });
  await expect(review.getByRole("radio")).toHaveCount(2);
  await expect(review.getByRole("button", { name: "Transmit the bill" })).toBeDisabled();
  await review.getByRole("radio", { name: "The Affordable Coverage Act", exact: true }).check();
  await expect(review.getByText(/Annual change runs for 4 years/)).toBeAttached();
  await expect(review.getByText(/a year in additional spending/)).toBeAttached();
  await expect(review.getByRole("button", { name: "Transmit the bill" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "Focused bill review");
  await capture(page, "review");
  await review.getByRole("button", { name: "Transmit the bill" }).click();
  await confirmReview(page);
  const receipt = page.getByRole("region", { name: "Receipt" });
  await expect(receipt.getByRole("article", { name: "The Affordable Coverage Act", exact: true })).toBeVisible({ timeout: 30_000 });
  await capture(page, "receipt");
  await receipt.getByRole("button", { name: "Back to the agenda", exact: true }).click();
  await expect(proposals.getByRole("button", { name: /Affordable Coverage Act/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Congress" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("tabpanel", { name: "Bills and agenda" }).getByRole("link", { name: "The Affordable Coverage Act", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The Affordable Coverage Act" })).toBeVisible();
  await expect(page.getByText(/In committee/).first()).toBeVisible();
});
