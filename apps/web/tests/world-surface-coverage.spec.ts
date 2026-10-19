import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

async function inspect(page: Page, info: TestInfo, path: string, title: string | RegExp, name: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: title, exact: typeof title === "string" })).toBeVisible();
  await expectNoHorizontalOverflow(page, name);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  const body = page.locator(".ui-surface__body").first();
  for (const [position, fraction] of [["middle", 0.5], ["end", 1]] as const) {
    const moved = await body.evaluate((element, part) => {
      const distance = element.scrollHeight - element.clientHeight;
      if (distance <= 1) return false;
      element.scrollTop = distance * part;
      return true;
    }, fraction);
    if (moved) await page.screenshot({ path: info.outputPath(`${name}-${position}.png`), fullPage: true });
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`World and every country dossier view render with context in ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "engagement-week");
    await inspect(page, info, "/world", "World", `world-${theme}`);
    for (const view of ["overview", "diplomacy", "economy", "security", "intelligence", "activity"]) {
      await inspect(page, info, `/world/nation/CAN?view=${view}`, "Canada", `country-${view}-${theme}`);
      const tabs = page.getByRole("tablist", { name: "Views of Canada", exact: true });
      await expect(tabs).toBeVisible();
      await expect(page.locator(".country-context")).toHaveCount(view === "overview" ? 1 : 0);
      if (view !== "overview") {
        await expect(page.locator(".country > .country-identity")).toHaveCount(1);
        await page.reload();
        await expect(page).toHaveURL(new RegExp(`view=${view}`));
        await expect(page.getByRole("tab", { selected: true })).toHaveAttribute("data-tab", view);
      }
    }
    await inspect(page, info, "/world/nation/NO-SUCH", "No such government", `country-missing-${theme}`);
    expect(errors).toEqual([]);
  });

  test(`Security views and command records render in ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "security-desk");
    for (const view of ["theaters", "forces", "intelligence", "operations"]) {
      await inspect(page, info, `/world/security?view=${view}`, "Security", `security-${view}-${theme}`);
    }
    await inspect(page, info, "/world/security?view=forces&service=NO-SUCH", "Security", `service-missing-${theme}`);
    await expect(page.getByText("No service by that name holds forces. Every service is shown instead.")).toBeVisible();
    await inspect(page, info, "/world/security/command/CCMD-INDOPACOM", "INDOPACOM", `command-${theme}`);
    await inspect(page, info, "/world/security/command/NO-SUCH", "Command", `command-missing-${theme}`);
    expect(errors).toEqual([]);
  });

  test(`foreign action configurations and unavailable targets render in ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "engagement-week");
    for (const [nation, option, goal] of [["PHL", "military-1", "force"], ["CHN", "tariff", "trade"], ["IRN", "covert-1", "covert"]]) {
      await inspect(page, info, `/world/nation/${nation}/act?goal=${goal}&option=${option}`, /^Act on /, `action-${goal}-${theme}`);
    }
    await inspect(page, info, "/world/nation/NO-SUCH/act", "No such government", `action-missing-${theme}`);
    expect(errors).toEqual([]);
  });

  test(`coalition selection survives the member action and return in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "engagement-week");
    await inspect(page, info, "/world/org/ORG-NATO", /NATO|North Atlantic/, `org-${theme}`);
    const member = page.getByLabel("The member", { exact: true });
    await member.selectOption("CAN");
    await expect(page).toHaveURL(/member=CAN/);
    await page.reload();
    await expect(member).toHaveValue("CAN");
    await page.getByRole("link", { name: "Act toward Canada", exact: true }).click();
    await expect(page).toHaveURL(/world\/nation\/CAN\/act/);
    await page.goBack();
    await expect(member).toHaveValue("CAN");
    await inspect(page, info, "/world/org/NO-SUCH", "No such body", `org-missing-${theme}`);
  });

  test(`treaty standing and pending status render in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "treaty-pending");
    const save = readFileSync(fileURLToPath(new URL("./.fixtures/treaty-pending.json", import.meta.url)), "utf8");
    const id = /treaty:trade:[A-Z]{3}:\d+/.exec(save)?.[0];
    expect(id).toBeTruthy();
    await inspect(page, info, `/world/treaty/${encodeURIComponent(id!)}`, /Agreement on Trade and Investment/, `treaty-pending-${theme}`);
    await inspect(page, info, "/world/treaty/NO-SUCH", "No such instrument", `treaty-missing-${theme}`);
  });

  test(`conflict parties, authority and observed record render in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await importFixture(page, "war-joined");
    const save = readFileSync(fileURLToPath(new URL("./.fixtures/war-joined.json", import.meta.url)), "utf8");
    const id = /war:RUS:UKR:\d+/.exec(save)?.[0];
    expect(id).toBeTruthy();
    await inspect(page, info, `/world/war/${encodeURIComponent(id!)}`, "Russia against Ukraine", `war-${theme}`);
    await inspect(page, info, "/world/war/NO-SUCH", "No such war", `war-missing-${theme}`);
  });
}
