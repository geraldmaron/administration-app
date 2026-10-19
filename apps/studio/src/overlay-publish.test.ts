import { describe, expect, it } from "vitest";
import { worldDataset } from "@admin/world";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { planPublish } from "../overlay-publish.mjs";
// @ts-expect-error — same.
import { overlayPage } from "../overlay-view.mjs";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { nationEditorPage } from "../nation-page.mjs";
// @ts-expect-error — same.
import { valueAtPath } from "../overlay-model.mjs";

const usa = worldDataset.nations.find((nation) => String(nation.id) === "USA")!;
const fra = worldDataset.nations.find((nation) => String(nation.id) === "FRA")!;

let nextId = 0;
const edit = (recordId: string, fieldPath: string, newValue: unknown, baseValue?: unknown) => ({
  id: `edit-${nextId++}`,
  recordId,
  fieldPath,
  baseValue: baseValue === undefined ? valueAtPath(recordId === "USA" ? usa : fra, fieldPath) : baseValue,
  newValue,
  note: "",
  authorEmail: "editor@example.com",
});

describe("planning a publish", () => {
  it("passes an edit that is in range and current", () => {
    const plan = planPublish([edit("USA", "stats.economy.inflation", 0.05)]);
    expect(plan.applicable).toHaveLength(1);
    expect(plan.refused).toHaveLength(0);
  });

  it("refuses an edit whose base no longer matches source, naming both values", () => {
    const plan = planPublish([edit("USA", "doctrine.posture", "defensive", "isolationist")]);
    expect(plan.applicable).toHaveLength(0);
    expect(plan.refused[0].reason).toMatch(/source now reads "assertive"/);
  });

  it("refuses the whole nation's group when one edit breaks the schema", () => {
    // Publishing the valid half of a pair the author submitted together leaves
    // the dataset in a state nobody chose.
    const plan = planPublish([
      edit("USA", "stats.economy.inflation", 0.05),
      edit("USA", "stats.economy.debtToGdp", 99),
    ]);
    expect(plan.applicable).toHaveLength(0);
    expect(plan.refused).toHaveLength(2);
  });

  it("does not let one nation's bad edit block another nation's good one", () => {
    const plan = planPublish([
      edit("USA", "stats.economy.debtToGdp", 99),
      edit("FRA", "stats.economy.inflation", 0.03),
    ]);
    expect(plan.applicable.map((e: { recordId: string }) => e.recordId)).toEqual(["FRA"]);
  });

  it("refuses an edit for a nation that is not in the dataset", () => {
    const plan = planPublish([edit("USA", "doctrine.posture", "defensive")].map((e) => ({ ...e, recordId: "ZZZ" })));
    expect(plan.refused[0].reason).toMatch(/no nation "ZZZ"/);
  });
});

describe("the nation editor", () => {
  it("offers an input for a scalar nested three deep", () => {
    expect(nationEditorPage(usa, [], "seed")).toContain('name="stats.military.branchStrength.naval"');
  });

  it("offers no input for a derived or list field", () => {
    const form = nationEditorPage(usa, [], "seed");
    expect(form).not.toContain('name="bands.archetype"');
    expect(form).not.toContain('name="geo.neighbors"');
  });

  it("renders a boolean as a two-option select, not a text box", () => {
    expect(nationEditorPage(usa, [], "seed")).toMatch(/<select name="geo.coastline"/);
  });

  it("shows a pending value in the input and the source value beside it", () => {
    const form = nationEditorPage(usa, [edit("USA", "doctrine.posture", "defensive")], "seed");
    expect(form).toContain('value="defensive" selected');
    expect(form).toMatch(/source says <code>assertive<\/code>/);
  });
});

describe("what each role is shown on the overlay", () => {
  const pending = [edit("USA", "doctrine.posture", "defensive")];

  it("tells someone with no role that signing in is not the same as being granted one", () => {
    const page = overlayPage(pending, { enabled: true, role: null });
    expect(page).toContain("No dataset role");
  });

  it("offers no publish control to an editor, whose grant stops at proposing", () => {
    const page = overlayPage(pending, { enabled: true, role: "editor" });
    expect(page).not.toContain('action="/overlay/publish"');
    expect(page).toContain("awaiting an admin to publish");
  });

  it("offers the publish control to an admin", () => {
    const page = overlayPage(pending, { enabled: true, role: "admin" });
    expect(page).toContain('action="/overlay/publish"');
  });

  it("shows a viewer what is pending without a publish control", () => {
    const page = overlayPage(pending, { enabled: true, role: "viewer" });
    expect(page).toContain("doctrine.posture");
    expect(page).not.toContain('action="/overlay/publish"');
  });
});

describe("staleness is judged against source, not the imported dataset", () => {
  // The publisher rebuilds @admin/world but cannot replace the copy already
  // resident in its own process, so a second publish in one session judged
  // against the import is judged against pre-publish values.
  const SOURCE_AFTER_A_PUBLISH = `
export const USA_ID = "USA" as NationId;
const x = NationInput.parse({
  id: USA_ID,
  stats: { economy: { inflation: 0.055 } },
});
`;

  it("accepts an edit whose base matches what source now says", () => {
    const plan = planPublish(
      [edit("USA", "stats.economy.inflation", 0.04, 0.055)],
      SOURCE_AFTER_A_PUBLISH,
    );
    expect(plan.applicable).toHaveLength(1);
  });

  it("refuses an edit whose base matches only the stale import", () => {
    const plan = planPublish(
      [edit("USA", "stats.economy.inflation", 0.06, 0.04)],
      SOURCE_AFTER_A_PUBLISH,
    );
    expect(plan.applicable).toHaveLength(0);
    expect(plan.refused[0].reason).toMatch(/source now reads 0\.055/);
  });
});
