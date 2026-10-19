import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test(`security task preserves its context through Back, reload, cancel and review in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "security-desk");
    await page.goto("/world/security?view=intelligence");
    const trigger = page.getByRole("button", { name: "Task the community", exact: true });
    await trigger.click();
    await expect(page).toHaveURL(/view=intelligence.*action=task|action=task.*view=intelligence/);
    const task = page.getByRole("dialog", { name: "Intelligence collection", exact: true });
    await expect(task).toBeVisible();
    await page.goBack();
    await expect(task).toBeHidden();
    await expect(page.getByRole("tab", { name: /^Intelligence/ })).toHaveAttribute("aria-selected", "true");
    await trigger.click();
    await page.reload();
    await expect(task).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(task).toBeHidden();
    await expect(page).not.toHaveURL(/action=/);
    await trigger.click();
    await task.getByRole("region", { name: "Compare against doing nothing" }).getByRole("radio", { name: "Task CIA", exact: true }).check();
    await expectNoHorizontalOverflow(page, `security action ${theme}`);
    await page.screenshot({ path: info.outputPath(`security-task-${theme}.png`), fullPage: true });
    await task.getByRole("button", { name: "Send the tasking", exact: true }).click();
    await confirmReview(page);
    await expect(task.getByRole("article", { name: "CIA is tasked", exact: true })).toHaveCount(1);
    await task.getByRole("button", { name: "Back to the desk", exact: true }).click();
    await expect(task).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("region", { name: "Collection", exact: true })).toContainText("CIA");
  });

  test(`command review preserves the command dossier in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "security-desk");
    await page.goto("/world/security/command/CCMD-INDOPACOM");
    const trigger = page.getByRole("button", { name: "Set posture", exact: true });
    await trigger.click();
    await expect(page).toHaveURL(/action=posture/);
    const action = page.getByRole("dialog", { name: "INDOPACOM · Set posture", exact: true });
    await action.getByRole("radio", { name: "Order surge", exact: true }).check();
    await expectNoHorizontalOverflow(page, `command action ${theme}`);
    await page.screenshot({ path: info.outputPath(`command-posture-${theme}.png`), fullPage: true });
    await action.getByRole("button", { name: "Order surge", exact: true }).click();
    await confirmReview(page);
    await expect(action.getByRole("article", { name: "INDOPACOM ordered to surge", exact: true })).toHaveCount(1);
    await action.getByRole("button", { name: "Back to INDOPACOM", exact: true }).click();
    await expect(action).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("region", { name: "Posture and command", exact: true })).toContainText("Surge");
  });

  test(`trade sorting changes every category without losing selected goods in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "engagement-week");
    await page.goto("/world/nation/CHN?view=economy");
    const goods = page.getByRole("region", { name: "Goods traded with China", exact: true });
    const sort = goods.getByRole("combobox", { name: "Sort by", exact: true });
    await expect(sort).toBeVisible();
    await goods.getByRole("button", { name: /^Show all/ }).click();
    const names = () => goods.locator(".trade-category__identity > strong").allTextContents();
    await sort.selectOption("goods:ascending");
    const ascending = await names();
    expect(ascending.length).toBeGreaterThan(5);
    expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b)));
    await sort.selectOption("goods:descending");
    expect(await names()).toEqual([...ascending].reverse());
    await sort.selectOption("ranked:descending");
    const ranked = await names();
    await sort.selectOption("ranked:ascending");
    expect(await names()).toEqual([...ranked].reverse());
    const picked = goods.locator(".trade-category__pick").last();
    await picked.click();
    const selected = goods.getByRole("region", { name: /selected trade category/ });
    await expect(selected).toBeVisible();
    const heading = await selected.getByRole("heading").textContent();
    await sort.selectOption("imports:descending");
    await expect(selected.getByRole("heading")).toHaveText(heading!);
    await page.reload();
    await expect(selected.getByRole("heading")).toHaveText(heading!);
    await expectNoHorizontalOverflow(page, `trade goods ${theme}`);
    await page.screenshot({ path: info.outputPath(`trade-sorted-${theme}.png`), fullPage: true });
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`a joined war distinguishes an ally from an opponent in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "war-joined");
    await page.goto(`/world/war/${encodeURIComponent("war:RUS:UKR:9")}`);
    const join = page.getByRole("region", { name: "Compare entering this war and staying out", exact: true });
    const option = join.locator(".ui-choice__row").filter({ has: page.getByRole("radio", { name: "Join Ukraine", exact: true }) });
    const box = await option.boundingBox();
    if (!box) throw new Error("Join option has no visible bounds");
    await option.click({ position: { x: box.width - 12, y: box.height - 12 } });
    await expect(join.getByRole("radio", { name: "Join Ukraine", exact: true })).toBeChecked();
    await expectNoHorizontalOverflow(page, `war decision inset ${theme}`);
    await page.screenshot({ path: info.outputPath(`war-inset-${theme}.png`) });
    await join.getByRole("button", { name: "Send forces beside Ukraine", exact: true }).click();
    await confirmReview(page);
    await expect(page.getByRole("article", { name: "Join Ukraine: forces committed", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back to the war", exact: true }).click();
    await page.goto("/world/nation/RUS?view=economy");
    await expect(page.locator(".country > .country-identity .ui-valence-chip")).toHaveText("At war");
    await page.screenshot({ path: info.outputPath(`opponent-${theme}.png`) });
    await page.getByRole("button", { name: /alerts? in this file/ }).click();
    await expect(page.getByText("You are at war with Russia.", { exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("tab", { name: "Economy", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#country-file-alerts")).toBeFocused();
    await page.goto("/world/nation/UKR?view=economy");
    await expect(page.locator(".country > .country-identity .ui-valence-chip")).not.toHaveText("At war");
    await expectNoHorizontalOverflow(page, `joined ally ${theme}`);
    await page.screenshot({ path: info.outputPath(`ally-${theme}.png`) });
  });
}
