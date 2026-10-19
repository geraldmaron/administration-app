import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

test("the tasking desk locks an unavailable focus and records a compatible focus and note", async ({ page }, info) => {
  await importFixture(page, "security-desk");
  await page.goto("/world/security?view=intelligence");
  await page.getByRole("button", { name: "Task the community" }).click();
  const focus = page.getByRole("group", { name: "What it is to answer", exact: true });
  await focus.getByRole("radio", { name: /^Economic pressure / }).check();
  const compare = page.getByRole("region", { name: "Compare against doing nothing" });
  await compare.getByRole("radio", { name: "Task CIA", exact: true }).check();
  await expect(compare).toContainText("HUMINT cannot obtain economic pressure");
  await expect(page.getByRole("button", { name: "Send the tasking" })).toBeDisabled();

  await focus.getByRole("radio", { name: /^General reporting / }).check();
  await page.getByLabel("Optional recorded note").fill("Compare with diplomatic brief");
  await expect(compare).toContainText("external actions, stability");
  await expect(compare).toContainText("The note is recorded, not interpreted as a collection instruction.");
  await expect(page.getByRole("button", { name: "Send the tasking" })).toBeEnabled();
  await expectNoHorizontalOverflow(page, "typed collection focus");
  const buttonAppearance = await page.getByRole("button", { name: "Send the tasking" }).evaluate((button) => {
    const channels = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = (color: string) => {
      const [red, green, blue] = channels(color);
      return red! * 0.2126 + green! * 0.7152 + blue! * 0.0722;
    };
    const style = getComputedStyle(button);
    const ink = luminance(style.color);
    const ground = luminance(style.backgroundColor);
    return { contrast: (Math.max(ink, ground) + 0.05) / (Math.min(ink, ground) + 0.05), transitionDuration: style.transitionDuration };
  });
  expect(buttonAppearance.contrast).toBeGreaterThanOrEqual(4.5);
  expect(buttonAppearance.transitionDuration).toBe("0s");
  await page.screenshot({ path: info.outputPath(`collection-focus-${info.project.name}.png`) });
  await page.getByRole("button", { name: "Send the tasking" }).click();
  await confirmReview(page);
  await expect(page.getByRole("article", { name: "CIA is tasked" })).toBeVisible();
  await page.getByRole("button", { name: "Back to the desk" }).click();
  const collection = page.getByRole("heading", { name: "Collection", exact: true }).locator("..");
  await expect(collection).toContainText("Focus: General reporting.");
  await expect(collection).toContainText("Recorded note: Compare with diplomatic brief.");
});

test("an issued focused report shows its selected focus and recorded note", async ({ page }) => {
  await importFixture(page, "collection-intelligence");
  await page.goto("/world/security?view=intelligence");
  const reports = page.getByRole("region", { name: "Intelligence reports", exact: true });
  const russia = reports.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /^Russia\s*:/ }) });
  await expect(russia).toContainText("Focus: General reporting.");
  await expect(russia).toContainText("Recorded note: Compare this with the current diplomatic brief.");
  await expect(russia).not.toContainText("older tasking");
  const evidence = russia.getByRole("button", { name: "Sources, gaps and sharing", exact: true });
  await evidence.click();
  const inspector = page.getByRole("dialog", { name: "Russia: report limitations and sharing", exact: true });
  await expect(inspector).toBeVisible();
  await expect(inspector).not.toContainText("older tasking");
  await page.keyboard.press("Escape");
  await expect(inspector).toBeHidden();
  await expect(evidence).toBeFocused();
});
