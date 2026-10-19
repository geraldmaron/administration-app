import { expect, test } from "@playwright/test";
import { importFixture } from "./helpers";

type NodePosition = { readonly href: string; readonly left: string; readonly top: string };

test("a dense public graph expands without moving or overlapping people", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  await importFixture(page, "member-outreach");
  await page.goto("/washington/person/PER-USA-congressional-leader-3054?view=network");
  await page.getByLabel("Relationship scope", { exact: true }).selectOption("chamber:house");
  const graph = page.getByRole("group", { name: /circle:/ }).first();
  await expect(graph.getByText("Direct public ties")).toBeVisible();
  await expect(graph.getByText("Two-step public ties")).toBeVisible();

  const positions = async (): Promise<readonly NodePosition[]> => graph.locator(".tie-map__node").evaluateAll((nodes) =>
    nodes.map((node) => ({ href: (node as HTMLAnchorElement).href, left: (node as HTMLElement).style.left,
      top: (node as HTMLElement).style.top })));
  const expectClear = async () => {
    const geometry = await graph.locator(".tie-map__node, .tie-map__subject").evaluateAll((nodes) => {
      const boxes = nodes.map((node) => node.getBoundingClientRect());
      let overlaps = 0;
      for (let first = 0; first < boxes.length; first += 1) for (let second = first + 1; second < boxes.length; second += 1) {
        const a = boxes[first]!, b = boxes[second]!;
        const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (width * height > 1) overlaps += 1;
      }
      return { overlaps, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(geometry).toEqual({ overlaps: 0, overflow: 0 });
  };
  const captureGraph = async (name: string) => {
    const viewport = page.viewportSize()!;
    const capture = info.outputPath(`relationship-graph-${name}.png`);
    await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, 1400) });
    try {
      await graph.screenshot({ path: capture, animations: "disabled" });
      await info.attach(`relationship-graph-${name}`, { path: capture, contentType: "image/png" });
    } finally {
      await page.setViewportSize(viewport);
    }
  };

  const first = await positions();
  expect(first).toHaveLength(8);
  await expectClear();
  await captureGraph("initial");
  await page.getByRole("button", { name: "Show more connected people" }).click();
  const second = await positions();
  expect(second).toHaveLength(12);
  expect(second.slice(0, first.length)).toEqual(first);
  await expectClear();
  await page.getByRole("button", { name: "Show more connected people" }).click();
  const third = await positions();
  expect(third).toHaveLength(15);
  expect(third.slice(0, second.length)).toEqual(second);
  await expectClear();
  await expect(page.getByRole("button", { name: "Show more connected people" })).toHaveCount(0);
  await captureGraph("full");
  expect(errors).toEqual([]);
});
