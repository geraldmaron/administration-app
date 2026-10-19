import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

test("a circuit vacancy is a seat row on the Courts nominations tab, recommended and sent through the Senate pipeline", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await importFixture(page, "circuit-vacancy");
  await page.goto("/washington/courts?view=nominations");
  await expect(page.getByRole("heading", { name: /^Courts \(\d+\)$/ })).toBeVisible();
  const seat = page.locator("li.appt-seat").filter({ hasText: /Judge of the .* Circuit/ }).first();
  await expect(seat).toBeVisible();
  await expect(seat.locator(".appt-seat__pick")).toBeVisible();
  await expectNoHorizontalOverflow(page, "circuit seat row");
  await page.screenshot({ path: info.outputPath(`circuit-vacancy-${info.project.name}.png`), fullPage: true, animations: "disabled" });

  await seat.getByRole("button", { name: /Judge of the .* Circuit/ }).click();
  await expect(seat.getByRole("radio", { name: "Leave it open" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "circuit candidates");
  const review = page.getByRole("region", { name: /^Send the nominations for \d+ open seats?/ });
  await review.getByRole("radio", { name: /^Send (the nomination|\d+ nominations)$/ }).check();
  await page.getByRole("button", { name: /^Send (the nomination|\d+ nominations)$/ }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Receipt" })).toBeVisible();
  expect(errors).toEqual([]);
});
