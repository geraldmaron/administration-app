import { describe, expect, it } from "vitest";
import { METRICS, metricsOf, statLeafPaths, worldDataset } from "@admin/world";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { editableFieldsOf, nationEditorPage, nationProfilePage } from "../nation-page.mjs";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { nationsIndexPage } from "../nations-view.mjs";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { metricsPage } from "../metrics-view.mjs";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { forcesPage } from "../forces-view.mjs";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { scalarLeafPaths } from "../overlay-model.mjs";

const usa = worldDataset.nations.find((nation) => String(nation.id) === "USA")!;
const indonesia = worldDataset.nations.find((nation) => String(nation.id) === "IDN")!;

describe("the nation profile", () => {
  const html: string = nationProfilePage(usa, usa, "studio-preview", []);

  it("prints every statistic the schema defines, by its registry label and definition", () => {
    for (const metric of metricsOf("stats")) {
      if (metric.path.startsWith("military.orderOfBattle.")) continue;
      expect(html, metric.recordPath).toContain(`id="${metric.recordPath}"`);
      expect(html, metric.recordPath).toContain(metric.description.slice(0, 40).replace(/&/g, "&amp;"));
    }
  });

  it("lists no person on the country, because the cast is generated per campaign and never stored", () => {
    expect(html).not.toContain("<h2>Cast</h2>");
    expect(html).not.toMatch(/<th>Name<\/th><th>Seats<\/th>/);
    expect(html).toContain("People are not stored on a nation");
  });

  it("prints the order of battle by catalog label with the id beside it", () => {
    expect(html).toContain("Brigade combat teams");
    expect(html).toContain("<code>army.brigade-combat-team</code>");
    expect(html).toContain("Carrier strike groups");
  });

  it("marks bands as derived and stats as authored", () => {
    expect(html).toContain('id="bands.powerTier"');
    const bandsRow = html.slice(html.indexOf('id="bands.powerTier"'), html.indexOf('id="bands.wealthTier"'));
    expect(bandsRow).toContain("prov-derived");
    const gdpRow = html.slice(html.indexOf('id="stats.economy.gdp"'), html.indexOf('id="stats.economy.gdpPerCapita"'));
    expect(gdpRow).toContain("prov-authored");
    expect(gdpRow).toContain("$");
  });

  it("says what the ends of a scale mean under a graded reading", () => {
    const row = html.slice(html.indexOf('id="stats.security.corruptionIndex"'), html.indexOf('id="stats.security.insurgencyPressure"'));
    expect(row).toContain("clean");
    expect(row).toContain("captured");
  });

  it("explains an absent order of battle rather than hiding the section", () => {
    const npc: string = nationProfilePage(indonesia, indonesia, "studio-preview", []);
    expect(npc).toContain("No order of battle authored");
  });
});

describe("the nation editor", () => {
  const html: string = nationEditorPage(usa, [], "studio-preview");

  it("offers exactly the authored scalars the overlay can write, and nothing derived", () => {
    const offered = editableFieldsOf(usa);
    expect([...offered].sort()).toEqual(scalarLeafPaths(usa).filter((path: string) => METRICS.find((m) => m.recordPath === path)?.editable).sort());
    expect(offered).toContain("stats.economy.inflation");
    expect(offered).toContain("doctrine.posture");
    expect(offered).not.toContain("bands.powerTier");
    expect(offered).not.toContain("stats.demography.growthRate");
    expect(offered).not.toContain("id");
  });

  it("types each input from the schema: bounds on a number, a closed list for an enum", () => {
    expect(html).toContain('name="stats.economy.inflation" id="stats.economy.inflation" value="');
    expect(html).toMatch(/name="stats\.economy\.inflation"[^>]*min="-0\.1" max="2"/);
    expect(html).toMatch(/<select name="doctrine\.posture"[^>]*>[\s\S]*<option value="expansionist"/);
    expect(html).toMatch(/name="stats\.military\.arsenal\.warheads"[^>]*step="1"/);
  });

  it("shows a pending value beside what source says", () => {
    const withPending: string = nationEditorPage(usa, [{ recordId: "USA", fieldPath: "stats.economy.inflation", baseValue: usa.stats.economy.inflation, newValue: 0.09 }], "studio-preview");
    expect(withPending).toContain("pending — source says");
    expect(withPending).toContain('name="stats.economy.inflation" id="stats.economy.inflation" value="0.09"');
  });
});

describe("the nations index", () => {
  it("lists every nation with its tiers and formatted mass, and filters by region", () => {
    const html: string = nationsIndexPage("studio-preview", new URLSearchParams(), new Map([["USA", 2]]));
    expect(html).toContain("United States");
    expect(html).toContain("2 pending");
    expect(html).toContain("$");
    const filtered: string = nationsIndexPage("studio-preview", new URLSearchParams({ region: "region-east-asia" }), new Map());
    expect(filtered).toContain("China");
    expect(filtered).not.toContain(">United States<");
  });

  it("carries no inline posture form: posture is edited through the typed editor and the overlay", () => {
    const html: string = nationsIndexPage("studio-preview", new URLSearchParams(), new Map());
    expect(html).not.toContain('action="/nations/posture"');
  });
});

describe("the metrics catalog", () => {
  it("lists every registry entry with its type, bounds and provenance", () => {
    const html: string = metricsPage(new URLSearchParams());
    for (const metric of METRICS) expect(html, metric.recordPath).toContain(`id="${metric.recordPath}"`);
    expect(html).toContain("-0.1 to 2");
    expect(html).toContain("AAA · AA · A");
    expect(html).toContain("prov-runtime");
  });

  it("lists the campaign's own player metrics beside the dataset's, so the catalog is the whole system", () => {
    const html: string = metricsPage(new URLSearchParams());
    expect(html).toContain('id="campaign.approval"');
    expect(html).toContain("Campaign metrics");
  });

  it("filters to the fields still owed a reader", () => {
    const html: string = metricsPage(new URLSearchParams({ owed: "1" }));
    expect(html).toContain("industrialMobilization");
    expect(html).not.toContain('id="stats.economy.gdp"');
  });

  it("covers every stat leaf the unit registry covers", () => {
    const html: string = metricsPage(new URLSearchParams({ surface: "stats" }));
    for (const path of statLeafPaths()) expect(html, path).toContain(`id="stats.${path}"`);
  });
});

describe("the forces page", () => {
  it("shows the catalog and every authored order of battle with the validator's verdict", () => {
    const html: string = forcesPage(new URLSearchParams());
    expect(html).toContain('id="army.brigade-combat-team"');
    expect(html).toContain("United States");
    expect(html).toContain("China");
    expect(html).toContain(">valid<");
    expect(html).not.toContain("Validator findings");
  });

  it("focuses one nation on request", () => {
    const html: string = forcesPage(new URLSearchParams({ nation: "IDN" }));
    expect(html).toContain("carries no order of battle");
  });
});
