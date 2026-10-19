import { expect, test } from "@playwright/test";
import { importFixture } from "./helpers";

test("legacy office links reveal their owning workspace without overriding an explicit view", async ({ page }) => {
  await importFixture(page, "washington-chairs");
  await page.goto("/washington/office/OFF-STATE-SEC#office-actions");
  await expect(page.getByRole("tab", { name: "Actions", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Actions on this chair", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Actions on this chair", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Leadership", exact: true }).click();
  await expect(page).toHaveURL(/view=leadership$/);
  await page.goBack();
  await expect(page).toHaveURL(/#office-actions$/);
  await expect(page.getByRole("heading", { name: "Actions on this chair", exact: true })).toBeVisible();
  for (const [hash, name] of [["office-leadership", "Leadership"], ["exec-record", "Record"], ["exec-agencies", "Organization"], ["exec-commands", "Organization"], ["exec-condition", "Operating picture"]] as const) {
    await page.goto(`/washington/office/OFF-STATE-SEC#${hash}`);
    await expect(page.getByRole("tab", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-selected", "true");
  }
  await page.goto("/washington/office/OFF-STATE-SEC#constructor");
  await expect(page.getByRole("tab", { name: "Operating picture", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goto("/washington/office/OFF-STATE-SEC?view=leadership#office-actions");
  await expect(page.getByRole("heading", { name: "Leadership assessment", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions on this chair", exact: true })).toHaveCount(0);
});

test("legacy person sections select network or career while explicit views win", async ({ page }) => {
  await importFixture(page, "member-outreach");
  const path = "/washington/person/PER-USA-congressional-leader-3054";
  await page.goto(`${path}#person-circle`);
  await expect(page.getByLabel("Relationship scope", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Relationship scope", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Career and counsel", exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(/#person-circle$/);
  await expect(page.getByLabel("Relationship scope", { exact: true })).toBeVisible();
  for (const hash of ["person-career", "person-counsel"]) {
    await page.goto(`${path}#${hash}`);
    await expect(page.getByRole("heading", { name: "Career", exact: true })).toBeVisible();
  }
  await page.goto(`${path}?view=overview#person-circle`);
  await expect(page.getByRole("heading", { name: "Assessed readings", exact: true })).toBeVisible();
  await expect(page.getByLabel("Relationship scope", { exact: true })).toHaveCount(0);
});
