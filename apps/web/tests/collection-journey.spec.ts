import { expect, test } from "@playwright/test";
import { clearToContinue, confirmReview, expectNoHorizontalOverflow, importFixture } from "./helpers";

test("task, receive a sourced report, and share its finding with two allies through the player", async ({ page }, info) => {
  test.setTimeout(240_000);
  await importFixture(page, "collection-journey");
  await page.goto("/world/security?view=intelligence");
  await expect(page.getByRole("region", { name: "Intelligence reports", exact: true }))
    .toContainText("No reports have been filed.");
  const publicGraph = async () => {
    await page.goto("/washington/person/PER-USA-congressional-leader-1");
    const graph = page.getByRole("group", { name: /circle:/ }).first();
    await expect(graph).toBeVisible();
    return graph.locator(".tie-map__node").evaluateAll((nodes) => nodes.map((node) => ({
      href: (node as HTMLAnchorElement).getAttribute("href"),
      left: (node as HTMLElement).style.left,
      top: (node as HTMLElement).style.top,
    })));
  };
  const publicBefore = await publicGraph();
  expect(publicBefore.length).toBeGreaterThan(0);
  await page.goto("/world/security?view=intelligence");
  await page.getByRole("button", { name: "Task the community" }).click();
  await page.getByLabel("Which element of the community").selectOption("IC-NGA");
  await page.getByLabel("Which government").selectOption({ label: "Argentina" });
  await page.getByRole("group", { name: "What it is to answer", exact: true })
    .getByRole("radio", { name: /^Forces and readiness / }).check();
  await page.getByLabel("Optional recorded note").fill("Compare the observed posture with current commitments");
  await page.getByRole("region", { name: "Compare against doing nothing" })
    .getByRole("radio", { name: "Task NGA", exact: true }).check();
  await expect(page.getByRole("button", { name: "Send the tasking" })).toBeEnabled();
  await page.getByRole("button", { name: "Send the tasking" }).click();
  await confirmReview(page);
  await expect(page.getByRole("region", { name: "Receipt" })).toContainText("NGA is tasked");
  await page.getByRole("button", { name: "Back to the desk" }).click();

  const issued = () => page.getByRole("region", { name: "Intelligence reports", exact: true })
    .getByRole("listitem").filter({ has: page.getByRole("heading", { name: /^Argentina\s*: Findings obtained/ }) });
  // Collection files in the engine's weekly phase. Continue may stop for a
  // decision first, so clear held work through the player's own controls.
  for (let advance = 0; advance < 3 && await issued().count() === 0; advance += 1) {
    await clearToContinue(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("region", { name: "While time ran" })).toBeVisible({ timeout: 60_000 });
    await page.waitForFunction(() => document.querySelector("[aria-busy='true']") === null);
    await page.goto("/world/security?view=intelligence");
  }
  const report = issued();
  await expect(report).toHaveCount(1);
  await expect(report).toContainText("Focus: Forces and readiness.");
  await expect(report).toContainText("Recorded note: Compare the observed posture with current commitments.");
  await expect(report).toContainText("Military readiness appears");
  await expect(report).toContainText("Source: current force readiness estimate.");
  const collection = page.getByRole("region", { name: "Collection", exact: true });
  await expect(collection).toContainText("Source confidence: high");
  await expect(collection).not.toContainText("How far it firms up a judgment");
  // The classified collection observation stays on the security desk. Normal
  // country reading, place search and public-person graph do not gain facts or
  // new nodes from a private report.
  await page.goto("/world/nation/ARG?view=intelligence");
  await expect(page.getByRole("heading", { level: 1, name: "Argentina" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("Military readiness appears low.");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("combobox", { name: "Search places and terms" }).fill("Military readiness appears low");
  await expect(page.getByRole("option", { name: /Military readiness appears low/ })).toHaveCount(0);
  expect(await publicGraph()).toEqual(publicBefore);
  await page.goto("/world/security?view=intelligence");
  await expectNoHorizontalOverflow(page, "issued collection report");
  await page.screenshot({ path: info.outputPath(`collection-journey-report-${info.project.name}.png`), fullPage: true });
  await report.screenshot({ path: info.outputPath(`collection-journey-report-card-${info.project.name}.png`) });

  for (const recipient of ["Canada", "Germany"]) {
    await report.getByRole("button", { name: "Review sharing" }).click();
    await page.getByLabel("Recipient government").selectOption({ label: recipient });
    await page.getByRole("region", { name: "Compare against doing nothing" })
      .getByRole("radio", { name: "Share this report" }).check();
    await page.getByRole("checkbox").first().check();
    await expect(page.getByRole("button", { name: "Send this report" })).toBeEnabled();
    await page.getByRole("button", { name: "Send this report" }).click();
    await confirmReview(page);
    await expect(page.getByRole("region", { name: "Receipt" })).toContainText(`Intelligence shared with ${recipient}`);
    await page.getByRole("button", { name: "Back to the desk" }).click();
  }
  await page.reload();
  await expect(report).toContainText("Source: current force readiness estimate.");
  await report.getByRole("button", { name: "Sources, gaps and sharing", exact: true }).click();
  const inspector = page.getByRole("dialog", { name: "Argentina: report limitations and sharing", exact: true });
  await expect(inspector).toContainText("Shared 1 finding with Canada");
  await expect(inspector).toContainText("Shared 1 finding with Germany");
  await expectNoHorizontalOverflow(page, "two retained collection disclosures");
  await page.screenshot({ path: info.outputPath(`collection-journey-shared-${info.project.name}.png`), fullPage: true });
  await inspector.screenshot({ path: info.outputPath(`collection-journey-shared-card-${info.project.name}.png`) });
  const germany = inspector.getByText("Shared 1 finding with Germany", { exact: false });
  await germany.scrollIntoViewIfNeeded();
  await expect(germany).toBeInViewport();
  await page.screenshot({ path: info.outputPath(`collection-journey-shared-lower-${info.project.name}.png`) });
});
