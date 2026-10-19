import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  for (const reload of [false, true]) {
    test(`tariff receipt returns to original country evidence after changed terms in ${theme}, reload ${reload}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await importFixture(page, "engagement-week");
      await page.goto("/world/nation/CHN?view=economy");
      const goods = page.getByRole("region", { name: "Goods traded with China", exact: true });
      await goods.locator(".trade-category__pick").first().click();
      const origin = new URL(page.url()).searchParams.get("sector");
      expect(origin).toBeTruthy();
      const selected = goods.getByRole("region", { name: /selected trade category/ });
      const title = await selected.getByRole("heading").textContent();
      const draft = selected.getByRole("link", { name: /^Draft tariff · / });
      await expect(draft).toBeVisible();
      const footer = page.getByRole("link", { name: "Act on China", exact: true });
      await expect(footer).toHaveAttribute("href", new RegExp(`returnView=economy&returnSector=${origin}`));
      await draft.click();
      await expect(page).toHaveURL(new RegExp(`returnView=economy&returnSector=${origin}`));
      const category = page.getByRole("combobox", { name: "Traded category", exact: true });
      await expect(category).toBeVisible();
      const next = await category.locator("option").evaluateAll((options, original) => {
        const option = options.find((node) => (node as HTMLOptionElement).value !== original);
        return option ? { value: (option as HTMLOptionElement).value, label: option.textContent! } : undefined;
      }, origin);
      expect(next).toBeTruthy();
      await category.selectOption(next!.value);
      await page.getByLabel(/^Additional rate:/).fill("12");
      if (reload) await page.reload();
      await expect(category).toHaveValue(next!.value);
      await expect(page).toHaveURL(new RegExp(`returnView=economy&returnSector=${origin}`));
      await page.getByRole("button", { name: "Impose the tariff", exact: true }).click();
      await confirmReview(page);
      const receipt = page.getByRole("article");
      await expect(receipt.getByRole("heading", { name: /imposed$/ })).toBeVisible();
      await expect(receipt.getByText(next!.label, { exact: true })).toBeVisible();
      const back = receipt.getByRole("link", { name: "Back to China", exact: true });
      await expect(back).toHaveAttribute("href", `/world/nation/CHN?view=economy&sector=${origin}`);
      await back.click();
      await expect(page).toHaveURL(new RegExp(`/world/nation/CHN\\?view=economy&sector=${origin}$`));
      await expect(page.getByRole("tab", { name: "Economy", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(selected.getByRole("heading")).toHaveText(title!);
      if (reload) await expect(page.getByRole("heading", { level: 1, name: "China", exact: true })).toBeFocused();
      else await expect(draft).toBeFocused();
      await expectNoHorizontalOverflow(page, `returned country evidence ${theme}`);
      await page.screenshot({ path: info.outputPath(`returned-evidence-${theme}.png`) });
    });
  }
}
