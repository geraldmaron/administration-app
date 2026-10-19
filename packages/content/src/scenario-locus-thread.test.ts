import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, type Campaign, type ScenarioFamilyRun } from "@admin/engine";
import { worldCities, type CityId } from "@admin/world";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
import { castBound } from "./scenario-cast.js";
import { locusLocales, resolveLocus, storyPlace } from "./scenario-locus.js";
import { inactionPacket } from "./scenario-memory.js";
import { rememberReply } from "./scenario-reply-memory.js";
import type { ScenarioDef } from "./scenario.js";

const board = sealedCampaign("locus-thread-tests");
const home = board.founding.nation;
const FAMILY = "thread-under-test";
const FLAG = "approved-the-ten-year-holiday";

function scene(id: string, site: ScenarioDef["locus"]["site"], extra: Partial<ScenarioDef> = {}, locus: Partial<ScenarioDef["locus"]> = {}): ScenarioDef {
  return {
    ...plantHolidayScenario,
    id,
    once: false,
    conditions: [],
    ...extra,
    locus: { site, ground: "home", descriptor: "the mill yards along the river where the shift reads the notice", ...locus },
  };
}

const opener = scene("thread-opener", "coast", { family: { id: FAMILY, role: "opener" } });
const beat = scene("thread-beat", "interior", { family: { id: FAMILY, role: "beat" } });
const reader = scene("thread-reader", "border", { conditions: [{ kind: "flag", flag: FLAG, is: true }] });

/** The reply that sets FLAG committed and remembered, the way the Desk answers one. */
function committed(campaign: Campaign, def: ScenarioDef) {
  const cast = castBound(campaign, def, home);
  const option = cast.script.options.find((candidate) => candidate.id === "approve-ten")!;
  const result = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
  if (!result.ok) throw new Error(result.missingCapability);
  return rememberReply(campaign, result.packet, cast, option.id);
}

function answered(campaign: Campaign, def: ScenarioDef): Campaign {
  return apply(campaign, committed(campaign, def));
}

const port = worldCities.find((city) => city.nation === home && city.kind === "port" && city.state !== undefined && city.state !== "DC")!;
const portState = port.state!;
const withRun = (place: ScenarioFamilyRun["place"], closedTurn?: number): Campaign => ({
  ...board,
  scenarioFamilies: {
    [FAMILY]: {
      family: FAMILY,
      counterpart: home,
      openedTurn: 0,
      lastTurn: 0,
      beats: ["thread-opener"],
      ...(place ? { place } : {}),
      ...(closedTurn === undefined ? {} : { closedTurn, disposition: "held" as const }),
    },
  },
});

describe("a story's next scene returns to where the last one happened", () => {
  it("brings a family's later member back to the opener's state and town", () => {
    const after = answered(board, opener);
    const first = resolveLocus(board, opener, home)!;
    const next = resolveLocus(after, beat, home)!;
    expect(first.state).toBeDefined();
    expect(next.state).toBe(first.state);
    expect(after.scenarioFamilies[FAMILY]?.place).toEqual(storyPlace(first, home));
  });

  it("brings a scenario gated on a flag back to where the answer that set it happened", () => {
    const after = answered(board, scene("thread-setter", "coast"));
    const setter = resolveLocus(board, scene("thread-setter", "coast"), home)!;
    expect(after.flagPlaces?.[FLAG]).toEqual(storyPlace(setter, home));
    expect(resolveLocus(after, reader, home)!.state).toBe(setter.state);
  });

  it("keeps the earlier town when it is of the site's kind, and the state when it is not", () => {
    const placed = withRun({ state: portState, city: port.id as CityId });
    const coast = resolveLocus(placed, scene("thread-coast", "coast", { family: { id: FAMILY, role: "beat" } }), home)!;
    expect(coast.city).toBe(port.id);
    const border = resolveLocus(placed, scene("thread-border", "border", { family: { id: FAMILY, role: "close" } }), home)!;
    expect(border.state).toBe(portState);
  });

  it("never overrules an authored state, a capital site or a closed family", () => {
    const placed = withRun({ state: portState, city: port.id as CityId });
    expect(resolveLocus(placed, scene("thread-authored", "interior", { family: { id: FAMILY, role: "beat" } }, { state: "TX" }), home)!.state).toBe("TX");
    expect(resolveLocus(placed, scene("thread-capital", "capital", { family: { id: FAMILY, role: "beat" } }), home)!.state).toBeUndefined();
    const closed = withRun({ state: portState, city: port.id as CityId }, 3);
    const drawn = resolveLocus(board, beat, home)!;
    expect(resolveLocus(closed, beat, home)!.state).toBe(drawn.state);
  });

  it("drops a flag's place when the flag is next set by an answer in Washington", () => {
    const placed = answered(board, scene("thread-setter", "coast"));
    const again = answered(placed, scene("thread-setter-capital", "capital"));
    expect(again.flagPlaces?.[FLAG]).toBeUndefined();
  });

  it("keeps no place for a scene in Washington", () => {
    const after = answered(board, scene("thread-opener-capital", "capital", { family: { id: FAMILY, role: "opener" } }));
    expect(after.scenarioFamilies[FAMILY]?.place).toBeUndefined();
    expect(after.flagPlaces?.[FLAG]).toBeUndefined();
  });

  it("drops the family's place when the family closes", () => {
    const close = scene("thread-close", "interior", { family: { id: FAMILY, role: "close" } });
    const resolving = { ...close, replies: close.replies.map((reply) => ({ ...reply, resolves: "held" as const })) };
    const after = answered(answered(board, opener), resolving);
    expect(after.scenarioFamilies[FAMILY]?.closedTurn).toBeDefined();
    expect(after.scenarioFamilies[FAMILY]?.place).toBeUndefined();
  });
});

describe("the resolved place reaches the decision's effects and its Record entry", () => {
  const def = scene("thread-record", "coast", {}, {});
  const cast = castBound(board, def, home);

  it("stamps the state and city on the script the answer's provenance is built from", () => {
    expect(cast.locus?.state).toBeDefined();
    expect(cast.script.locales).toEqual(locusLocales(cast.locus));
    expect(committed(board, def).provenance?.locales).toEqual([cast.locus!.state, cast.locus!.city]);
    expect(answered(board, def).ledger.at(-1)?.causal?.locales).toEqual([cast.locus!.state, cast.locus!.city]);
  });

  it("stamps the same place on the week the decision was left unanswered", () => {
    expect(inactionPacket(board, cast).provenance?.locales).toEqual([cast.locus!.state, cast.locus!.city]);
  });

  it("lands the reply's state and city effects on the place the briefing was datelined", () => {
    const leaning = {
      ...def,
      replies: def.replies.map((reply) =>
        reply.commitment.kind === "position" ? { ...reply, commitment: { ...reply.commitment, gazetteer: { stateLean: 0.04, cityEmployment: 100 } } } : reply,
      ),
    } as ScenarioDef;
    const leaned = castBound(board, leaning, home);
    const resolved = leaned.script.options[0]!.commitment.kind === "position" ? leaned.script.options[0]!.commitment.resolved ?? [] : [];
    expect(resolved).toContainEqual(expect.objectContaining({ kind: "state", state: leaned.locus!.state }));
    expect(resolved).toContainEqual(expect.objectContaining({ kind: "city", city: leaned.locus!.city }));
  });

  it("names no locale for a decision taken in Washington", () => {
    const capital = castBound(board, scene("thread-capital-record", "capital"), home);
    expect(capital.script.locales).toBeUndefined();
  });
});
