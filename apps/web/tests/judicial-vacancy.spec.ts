import { expect, test } from "@playwright/test";
import { confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

test("an ordinary vacancy opens a Supreme Court seat the President must pick for, and the name goes to the Senate", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await importFixture(page, "judicial-vacancy");
  await page.goto("/washington/courts?view=nominations");
  await expect(page.getByRole("heading", { level: 1, name: "Courts" })).toBeVisible();
  const seat = page.locator("li.appt-seat").filter({ hasText: /Supreme Court|Chief Justice/ }).first();
  await expect(seat).toBeVisible();
  // A life seat is never filled by default.
  await expect(seat.getByText("No nominee picked. A Supreme Court seat is never filled by default.")).toBeVisible();
  await seat.getByRole("button", { name: /Justice/ }).click();
  await seat.getByRole("radio").nth(1).check();
  await expect(seat.locator(".appt-seat__pick")).toBeVisible();
  // The picked name opens to every reason it was ranked on, its life tenure read from age.
  await expect(seat.getByText(/Could serve .*, judging by age\./).first()).toBeVisible();
  const review = page.getByRole("region", { name: /^Send the nominations for \d+ open seats?/ });
  await review.getByRole("radio", { name: /^Send (the nomination|\d+ nominations)$/ }).check();
  await expect(review.getByText(/goes into vetting today/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "ordinary judicial vacancy seat");
  await page.screenshot({ path: info.outputPath(`judicial-vacancy-${info.project.name}.png`), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: /^Send (the nomination|\d+ nominations)$/ }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Receipt" }).getByRole("article")).toBeVisible();
  await expect(page.getByText("In vetting, then the committee and the floor")).toBeVisible();
  expect(errors).toEqual([]);
});
