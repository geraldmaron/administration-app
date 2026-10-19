import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, importFixture } from "./helpers";

test("fact-backed labor, housing and surveillance claims survive docket navigation and save reload", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await importFixture(page, "judicial-breadth");
  await page.goto("/washington/courts?view=docket");
  const rulings = page.getByRole("table", { name: "Rulings", exact: true });

  await rulings.getByRole("link", { name: "Secretary of Labor v. covered private employer" }).click();
  await expect(page.getByText("Overtime owed, final")).toBeVisible();
  await expect(page.getByText(/\$60 in liquidated damages recovered for this worker/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "labor court file");
  await page.getByRole("link", { name: "Back to the docket" }).click();

  await rulings.getByRole("link", { name: "Rental applicant v. housing provider named in HUD complaint" }).click();
  await expect(page.getByText("Housing violation proved, final")).toBeVisible();
  await expect(page.getByText(/respondent's reconsideration of this applicant/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "housing court file");
  await page.getByRole("link", { name: "Back to the docket" }).click();

  await rulings.getByRole("link", { name: "Family visa applicant v. Department of State" }).click();
  await expect(page.getByText(/Visa application record: visa:/)).toBeVisible();
  await expect(page.getByText(/Reviewability is contested/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "immigration court file");
  await page.getByRole("link", { name: "Back to the docket" }).click();

  await rulings.getByRole("link", { name: "Aggrieved U.S. person v. federal surveillance officials" }).click();
  await expect(page.getByText("Damages awarded, final")).toBeVisible();
  await expect(page.getByText(/court did not order deletion/)).toBeVisible();
  await expect(page.getByText(/without consent, a FISA order, or another statutory exception/)).toBeVisible();
  await expectNoHorizontalOverflow(page, "surveillance court file");
  await page.screenshot({ path: `tests/.results/judicial-breadth-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  const caseUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(caseUrl);
  await expect(page.getByText("Damages awarded, final")).toBeVisible();
  expect(errors).toEqual([]);
});
