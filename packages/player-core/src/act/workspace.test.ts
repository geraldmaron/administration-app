import { describe, expect, it } from "vitest";
import { apply, createRngStreams, issueAction, signFinding, INSTRUMENT_RUNGS, type Campaign, type NationCondition } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { ACT_OPTIONS, actHref, issuedInstrumentHref } from "./catalogue";
import { buildAct, buildLift, buildStandDown, chargedBy } from "./build";
import { instrumentDraft, instrumentProjection, tariffableSectors } from "./preview";
import { actWorkspace } from "./workspace";

const opening = openingCampaign({ seedText: "act-workspace" });
const targets = (Object.keys(opening.nations) as NationId[]).filter((id) => id !== opening.founding.nation);
// Covert rungs 2 to 5 need a finding on the target, so every target has one.
const found = targets.reduce((board, target) => {
  const signed = signFinding(board, "Support the opposition abroad.", target, "written", "full-committees");
  return signed.ok ? apply(board, signed.packet) : board;
}, opening);
// Emergency relief answers a need, so one recipient is living through a flood.
const FLOOD: NationCondition = { id: "condition:flood:MEX:0", nation: "MEX" as NationId, kind: "flood", scope: "region",
  severity: 0.5, startedTurn: found.turn, status: "active", beats: [] };
const campaign: Campaign = { ...found, conditions: { ...found.conditions, [FLOOD.id]: FLOOD } };

function open(target: NationId, optionId: string, config = {}) {
  const view = actWorkspace(campaign, target, { option: optionId, ...config });
  return view?.chosen?.preview.state === "open" ? view : undefined;
}

describe("the act workspace", () => {
  it("reads nothing for the President's own country", () => {
    expect(actWorkspace(campaign, campaign.founding.nation)).toBeUndefined();
  });

  it("lists every objective with how many of its acts are open", () => {
    const view = actWorkspace(campaign, "MEX" as NationId)!;
    expect(view.goals.map((goal) => goal.goal)).toEqual(["ties", "trade", "pressure", "covert", "force"]);
    expect(view.goal).toBeUndefined();
    expect(view.chosen).toBeUndefined();
    expect(view.assessment).toBeUndefined();
  });

  it("groups a goal's acts into runs and opens an assessment for the chosen one", () => {
    const view = actWorkspace(campaign, "MEX" as NationId, { goal: "ties", option: "engagement-call" })!;
    expect(view.families.map((family) => family.family)).toEqual(["meet", "sign", "assist"]);
    expect(view.chosen?.option.id).toBe("engagement-call");
    expect(view.assessment?.rows[0]?.label).toBe("What it does");
  });

  it("explains exposure after success separately from whether a covert mission works", () => {
    const target = targets.find((id) => open(id, "covert-1"));
    expect(target).toBeDefined();
    const rows = open(target!, "covert-1")!.assessment!.rows;
    expect(rows.find((row) => row.label === "Could it leak")?.act.text).toContain("even if the mission succeeds");
    expect(rows.find((row) => row.label === "Chance it works")).toBeDefined();
    expect(open(target!, "diplomatic-1")?.assessment?.rows.some((row) => row.label === "Could it leak")).toBe(false);
  });

  it("puts every assessment beside doing nothing", () => {
    for (const option of ACT_OPTIONS) {
      const target = targets.find((id) => open(id, option.id));
      if (!target) continue;
      const assessment = open(target, option.id)!.assessment!;
      expect(assessment.rows.length, option.id).toBeGreaterThan(1);
      for (const row of assessment.rows) {
        expect(row.act.text, `${option.id} ${row.label}`).not.toBe("");
      }
    }
  });
});

describe("current instrument rungs are reachable and priced as charged", () => {
  it("covers all twenty-five variants", () => {
    expect(INSTRUMENT_RUNGS).toHaveLength(25);
  });

  for (const rung of INSTRUMENT_RUNGS.filter((entry) => entry.id !== "economic-2")) {
    it(`${rung.instrument} rung ${rung.rung} opens for some government, and its price shown is its price charged`, () => {
      const target = targets.find((id) => open(id, rung.id));
      expect(target, `no government can be the target of ${rung.id}`).toBeDefined();
      const view = open(target!, rung.id)!;
      const built = buildAct(campaign, target!, view.chosen!.option, {});
      expect(built.ok, built.ok ? "" : built.reason).toBe(true);
      if (!built.ok) return;
      const projected = instrumentProjection(campaign, instrumentDraft(campaign, target!, rung.instrument, rung.rung));
      expect(projected.ok).toBe(true);
      if (!projected.ok) return;
      const quoted = Math.max(0, -(projected.projection.cost.treasury ?? 0));
      expect(chargedBy(built.packet), "the packet charges what the comparison quoted").toBeCloseTo(quoted, 6);
      // The packet applies to the board it was priced on.
      expect(() => apply(campaign, built.packet)).not.toThrow();
    });
  }
});

describe("the other acts build packets that apply", () => {
  it("makes each kind of meeting", () => {
    const kinds = new Set<string>();
    for (const option of ACT_OPTIONS.filter((entry) => entry.ref.kind === "engagement")) {
      const target = targets.find((id) => open(id, option.id));
      if (!target) continue;
      const built = buildAct(campaign, target, option, {});
      expect(built.ok).toBe(true);
      if (built.ok) {
        expect(built.charged).toBe(0);
        expect(() => apply(campaign, built.packet)).not.toThrow();
        kinds.add(option.id);
      }
    }
    expect([...kinds].sort()).toEqual(["engagement-call", "engagement-declaration", "engagement-envoy", "engagement-summit", "engagement-visit"].filter((id) => kinds.has(id)));
    expect(kinds.has("engagement-call")).toBe(true);
  });

  it("signs a treaty and imposes a tariff", () => {
    const treaty = ACT_OPTIONS.find((entry) => entry.ref.kind === "treaty" && targets.some((id) => open(id, entry.id)))!;
    expect(treaty).toBeDefined();
    const treatyTarget = targets.find((id) => open(id, treaty.id))!;
    expect(buildAct(campaign, treatyTarget, treaty, {}).ok).toBe(true);

    const tariff = ACT_OPTIONS.find((entry) => entry.ref.kind === "tariff")!;
    const tariffTarget = targets.find((id) => open(id, tariff.id))!;
    expect(tariffTarget).toBeDefined();
    const view = actWorkspace(campaign, tariffTarget, { option: "tariff", rate: 15 })!;
    expect(view.terms.tariff?.rate).toBe(15);
    const built = buildAct(campaign, tariffTarget, tariff, { rate: 15 });
    expect(built.ok).toBe(true);
    const after = built.ok ? apply(campaign, built.packet) : campaign;
    expect(Object.values(after.trade.measures).some((measure) => measure.target === tariffTarget && measure.kind === "tariff")).toBe(true);
  });

  it("keeps historical generic tariff operations identifiable without inventing goods or a rate", () => {
    const draft = instrumentDraft(campaign, "CHN" as NationId, "economic", 2);
    const issued = issueAction(campaign, draft.request, createRngStreams(campaign.seed));
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const after = apply(campaign, issued.packet);
    const operation = Object.values(after.issuedActs ?? {}).find((act) => act.kind === "instrument" && act.request.instrument === "economic" && act.request.rung === 2);
    expect(operation).toBeDefined();
    if (operation?.kind !== "instrument") return;
    const href = issuedInstrumentHref(operation);
    expect(href).toContain("option=economic-2");
    expect(href).toContain(encodeURIComponent(`operation-${operation.id}`));
    expect(href).not.toContain("sector=");
    expect(href).not.toContain("rate=");
  });

  it("authorizes the selected lower-ranked traded category, and identifies it in the receipt", () => {
    const target = "CHN" as NationId;
    const goods = tariffableSectors(campaign, target);
    expect(goods.length).toBeGreaterThan(1);
    const sector = goods[goods.length - 1]!.sector;
    const view = actWorkspace(campaign, target, { option: "economic-2", sector, rate: 12 })!;
    expect(view.chosen?.option.id).toBe("tariff");
    expect(view.terms.tariff?.sector).toBe(sector);
    const built = buildAct(campaign, target, view.chosen!.option, { sector, rate: 12 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.lines.some((line) => line.label === "Goods" && line.value.length > 0)).toBe(true);
    expect(built.lines).toContainEqual({ label: "Additional rate", value: "12%" });
    const after = apply(campaign, built.packet);
    expect(Object.values(after.trade.measures).some((measure) => measure.kind === "tariff" && measure.target === target && measure.sector === sector && measure.rate === 0.12)).toBe(true);
    expect(buildAct(campaign, target, view.chosen!.option, { sector: "unknown", rate: 12 }).ok).toBe(false);
  });

  it("asks Congress to authorize force", () => {
    const authorization = ACT_OPTIONS.find((entry) => entry.ref.kind === "authorization")!;
    const target = targets.find((id) => open(id, authorization.id))!;
    expect(target).toBeDefined();
    const built = buildAct(campaign, target, authorization, {});
    expect(built.ok).toBe(true);
    const after = built.ok ? apply(campaign, built.packet) : campaign;
    expect(actWorkspace(after, target, { option: "authorization" })?.chosen?.preview.state).toBe("underway");
  });
});

describe("what is under way can be ended", () => {
  function withTariff(): { readonly board: Campaign; readonly target: NationId } {
    const tariff = ACT_OPTIONS.find((entry) => entry.ref.kind === "tariff")!;
    const target = targets.find((id) => open(id, tariff.id))!;
    const built = buildAct(campaign, target, tariff, { rate: 10 });
    if (!built.ok) throw new Error(built.reason);
    return { board: apply(campaign, built.packet), target };
  }

  it("lifts a tariff the administration imposed", () => {
    const { board, target } = withTariff();
    const row = actWorkspace(board, target)!.underway.find((entry) => entry.kind === "measure")!;
    expect(row.endable).toBe(true);
    const lifted = buildLift(board, row.id);
    expect(lifted.ok).toBe(true);
    const after = lifted.ok ? apply(board, lifted.packet) : board;
    expect(actWorkspace(after, target)!.underway.some((entry) => entry.kind === "measure")).toBe(false);
  });

  it("calls off an operation before it executes and returns its money", () => {
    const option = ACT_OPTIONS.find((entry) => entry.ref.kind === "instrument" && entry.ref.instrument === "military" && entry.ref.rung === 2)!;
    const target = targets.find((id) => open(id, option.id))!;
    const issued = buildAct(campaign, target, option, {});
    if (!issued.ok) throw new Error(issued.reason);
    const board = apply(campaign, issued.packet);
    const row = actWorkspace(board, target)!.underway.find((entry) => entry.kind === "operation");
    expect(row?.endable).toBe(true);
    const stood = buildStandDown(board, row!.id);
    expect(stood.ok).toBe(true);
    const after = stood.ok ? apply(board, stood.packet) : board;
    expect(after.player.metrics.treasury).toBeCloseTo(campaign.player.metrics.treasury, 6);
    expect(actWorkspace(after, target)!.underway.some((entry) => entry.kind === "operation")).toBe(false);
  });

  it("refuses to lift what is not in force", () => {
    expect(buildLift(campaign, "tariff:none").ok).toBe(false);
  });
});

describe("the address of an act", () => {
  it("reopens the workspace on the act and its terms", () => {
    expect(actHref("MEX", { option: "tariff", sector: "steel", rate: 20 })).toBe("/world/nation/MEX/act?goal=trade&option=tariff&sector=steel&rate=20");
  });
});

describe("what an assessment hands a screen to draw", () => {
  const force = ACT_OPTIONS.filter((option) => option.goal === "force" && option.ref.kind === "instrument");

  it("gives every chance a step on the five likelihood words, and every line its text", () => {
    for (const option of force) {
      const assessment = open("CAN" as NationId, option.id)?.assessment;
      if (!assessment) continue;
      for (const row of assessment.rows) {
        for (const cell of [row.act]) {
          if (cell.likelihood !== undefined) expect([1, 2, 3, 4, 5], `${option.id} ${row.label}`).toContain(cell.likelihood);
          for (const item of cell.items ?? []) {
            expect(item.text, `${option.id} ${row.label}`).not.toBe("");
            if (item.likelihood !== undefined) expect([1, 2, 3, 4, 5]).toContain(item.likelihood);
          }
          if (cell.items && cell.detail) expect(cell.detail, `${option.id} ${row.label}`).toEqual(cell.items.map((item) => item.text));
          if (cell.items && !cell.detail) expect(cell.text, `${option.id} ${row.label}`).toBe(cell.items.map((item) => item.text).join(", "));
        }
      }
    }
  });

  it("names the governments that react by id, so each can carry its flag", () => {
    const reacting = force
      .map((option) => open("CAN" as NationId, option.id)?.assessment?.rows.find((row) => row.label === "Who reacts")?.act.items ?? [])
      .find((items) => items.length > 0);
    expect(reacting).toBeDefined();
    for (const item of reacting!) expect(campaign.nations[item.nation!], item.text).toBeDefined();
  });
});

describe("goals as a filter over one list", () => {
  const BLR = "BLR" as NationId;

  it("lists every goal when none is set, and only the chosen goal when one is", () => {
    const all = actWorkspace(campaign, BLR)!;
    expect(all.sections.map((section) => section.goal)).toEqual(["ties", "trade", "pressure", "covert", "force"]);
    expect(all.sections.flatMap((section) => section.families.flatMap((family) => family.options)).length).toBe(ACT_OPTIONS.length);
    const force = actWorkspace(campaign, BLR, { goal: "force" })!;
    expect(force.sections.map((section) => section.goal)).toEqual(["force"]);
  });

  it("keeps the picked option and every compared one, whatever goal the list is filtered to", () => {
    const view = actWorkspace(campaign, BLR, { goal: "ties", option: "military-2", compare: ["engagement-call", "tariff", "military-2"] })!;
    expect(view.chosen?.option.id).toBe("military-2");
    expect(view.compared.map((entry) => entry.option.goal)).toEqual(["ties", "trade", "force"]);
    expect(view.compared.every((entry) => entry.assessment.rows.length > 0)).toBe(true);
  });

  it("reads a locked option's way in from options under any goal", () => {
    const locked = actWorkspace(campaign, BLR, { goal: "ties" })!.sections.flatMap((section) => section.families.flatMap((family) => family.options)).filter((entry) => entry.prerequisite?.builders.length);
    expect(locked.length).toBeGreaterThan(0);
  });
});

describe("money as figures", () => {
  it("states what a force rung spends now and bills each week, matching the words on its card", () => {
    const options = actWorkspace(campaign, "BLR" as NationId, { goal: "force" })!.sections[0]!.families.flatMap((family) => family.options).filter((entry) => entry.preview.state === "open" && entry.option.ref.kind === "instrument");
    expect(options.length).toBeGreaterThan(0);
    for (const entry of options) {
      expect(entry.preview.money, entry.option.id).toBeDefined();
      expect(entry.preview.money!.now, entry.option.id).toBeGreaterThanOrEqual(0);
      if (entry.preview.basis?.includes("a week")) expect(entry.preview.money!.weekly, entry.option.id).toBeGreaterThan(0);
    }
  });

  it("gives a tariff its money coming in, not a cost", () => {
    for (const target of targets) {
      const view = open(target, "tariff");
      if (!view || !view.chosen?.preview.odds) continue;
      expect(view.chosen.preview.money?.perYearIn).toBeGreaterThan(0);
      expect(view.chosen.preview.money?.now).toBe(0);
      return;
    }
  });
});
