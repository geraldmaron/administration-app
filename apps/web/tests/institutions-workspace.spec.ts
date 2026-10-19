import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`office workspace preserves actions and whole-assessment evidence · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await importFixture(page, "washington-chairs");
    await page.goto("/washington/office/OFF-STATE-SEC");
    await expect(page.getByRole("heading", { name: "Department performance", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, "office operating picture");
    await page.getByRole("tab", { name: "Leadership", exact: true }).click();
    await expect(page).toHaveURL(/view=leadership/);
    const tile = page.getByRole("button", { name: /^Competence:.*Open assessment evidence/ });
    await tile.click();
    await expect(page.getByRole("dialog", { name: /Competence · assessment evidence/ })).toBeVisible();
    const evidence = page.locator(".assessment-evidence");
    const widths = await evidence.evaluate((element) => ({ body: element.clientWidth, prose: element.querySelector("p")?.getBoundingClientRect().width ?? 0 }));
    expect(widths.prose).toBeGreaterThan(widths.body * 0.9);
    await page.screenshot({ path: info.outputPath(`assessment-evidence-${theme}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(tile).toBeFocused();
    await page.screenshot({ path: info.outputPath(`office-leadership-${theme}.png`), fullPage: true });
    await page.locator(".institutional-file__identity-link").click();
    await expect(page.getByRole("tab", { name: "Operating profile", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=leadership/);
    for (const view of ["Organization", "Actions", "Record"] as const) {
      await page.getByRole("tab", { name: new RegExp(`^${view}`) }).click();
      await expectNoHorizontalOverflow(page, `office ${view}`);
    }
    await page.goto("/washington/office/not-an-office");
    await expect(page.getByRole("heading", { name: "No such office", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`profile has ordinal assessments, public network context and career · ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "member-outreach");
    await page.goto("/washington/person/PER-USA-congressional-leader-3054");
    await expect(page.locator(".dossier__tags").getByText(/Democratic Party|Republican Party|Independent/, { exact: true })).toBeVisible();
    await expect(page.locator(".person-radar")).toHaveCount(0);
    await expect(page.getByRole("meter", { name: /^(Competence|Loyalty|Integrity|Charisma|Ambition)$/ })).toHaveCount(5);
    await page.screenshot({ path: info.outputPath(`person-overview-${theme}.png`), fullPage: true });
    await page.getByRole("tab", { name: /^Public network/ }).click();
    await page.getByLabel("Relationship scope", { exact: true }).selectOption("chamber:house");
    await page.getByRole("button", { name: "Show more connected people", exact: true }).click();
    await expect(page).toHaveURL(/count=12/);
    const url = page.url();
    await page.locator(".tie-map__node").first().click();
    await page.goBack();
    await expect(page).toHaveURL(url);
    await expect(page.getByLabel("Relationship scope", { exact: true })).toHaveValue("chamber:house");
    await expect(page.locator(".tie-map__node")).toHaveCount(12);
    await expectNoHorizontalOverflow(page, "profile network");
    await page.getByRole("tab", { name: "Career and counsel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Career", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, "profile career");
    await page.goto("/washington/person/not-a-person");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("No such person");
  });
}
