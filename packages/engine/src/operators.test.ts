import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset, type NationId } from "@admin/world";
import { createRngStreams, makeCampaignSeed, replay } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import {
  MAX_OPERATORS,
  MAX_NEW_OPERATORS_PER_TURN,
  MAX_OPERATORS_PER_HOST,
  OPERATOR_KINDS,
  OPERATOR_PROFILES,
  crisisFor,
  cyberVictim,
  cyberVictimWeights,
  emergingOperators,
  operatorActRate,
  operatorActTerms,
  operatorPhase,
  operatorPressure,
} from "./operators.js";
import { defaultLeaderDraft } from "./leader.js";
import { advanceTurn, noopPhase } from "./turn-loop.js";
import { selectFeed, selectNation, type Campaign } from "./state.js";

const seed = makeCampaignSeed("operator-seed");

function foundedCampaign(): Campaign {
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((n) => n.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0]!.id]),
  );
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test Chancellor",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...defaultLeaderDraft(), name: "Test Leader" },
  };
  return sealFounding(seed, worldDataset, choices);
}

function runTurns(campaign: Campaign, count: number): Campaign {
  let working = campaign;
  for (let i = 0; i < count; i++) working = advanceTurn(working, { simulate: operatorPhase, select: noopPhase });
  return working;
}

describe("non-state operators", () => {
  it("offers no diplomatic answer to any of its crises", () => {
    for (const kind of OPERATOR_KINDS) {
      expect(OPERATOR_PROFILES[kind].answerableWith, `${kind}`).not.toContain("diplomatic");
      expect(OPERATOR_PROFILES[kind].answerableWith.length).toBeGreaterThan(0);
    }
  });

  it("takes root where the host's own numbers invite it", () => {
    const campaign = foundedCampaign();
    const after = runTurns(campaign, 10);
    expect(after.operators.length).toBeGreaterThan(0);

    for (const operator of after.operators) {
      const host = selectNation(after, operator.nationality!)!;
      const nation = { ...host.base, stats: host.stats, traits: host.traits };
      // Nothing takes root in a nation whose numbers do not support it.
      expect(operatorPressure(operator.kind as never, nation), `${operator.id}`).toBeGreaterThan(0.3);
    }
  });

  it("correlates with the stats the ticket names, not with size or luck", () => {
    const campaign = foundedCampaign();
    const nations = Object.values(campaign.nations).map((r) => ({ ...r.base, stats: r.stats, traits: r.traits }));

    const worst = [...nations].sort(
      (a, b) => operatorPressure("cartel", b) - operatorPressure("cartel", a),
    )[0]!;
    const best = [...nations].sort(
      (a, b) => operatorPressure("cartel", a) - operatorPressure("cartel", b),
    )[0]!;

    // Corruption, crime and thin border control are what a trafficking
    // network feeds on — the most exposed nation must be worse on them.
    const exposure = (n: typeof worst) =>
      n.stats.security.corruptionIndex + n.stats.security.crimeIndex + (1 - n.stats.security.borderControl);
    expect(exposure(worst)).toBeGreaterThan(exposure(best));
    expect(operatorPressure("insurgency", worst)).not.toBe(operatorPressure("cartel", worst));
  });

  it("presses NPC hosts, not only the player", () => {
    const campaign = foundedCampaign();
    const after = runTurns(campaign, 12);
    const hosts = new Set(after.operators.map((op) => op.nationality));
    const npcHosts = [...hosts].filter((h) => h !== campaign.founding.nation);
    expect(npcHosts.length).toBeGreaterThan(0);
  });

  it("lets the world accrete rather than arrive all at once", () => {
    const campaign = foundedCampaign();
    const streams = createRngStreams(seed);
    expect(emergingOperators(campaign, streams).length).toBeLessThanOrEqual(MAX_NEW_OPERATORS_PER_TURN);
  });

  it("stays inside its caps however long it runs", () => {
    const after = runTurns(foundedCampaign(), 30);
    expect(after.operators.length).toBeLessThanOrEqual(MAX_OPERATORS);
    for (const host of new Set(after.operators.map((op) => op.nationality))) {
      expect(after.operators.filter((op) => op.nationality === host).length).toBeLessThanOrEqual(MAX_OPERATORS_PER_HOST);
    }
  });

  it("makes its host measurably worse at resisting the next one", () => {
    const campaign = foundedCampaign();
    const after = runTurns(campaign, 15);
    const changed = Object.keys(after.nations).some((id) => {
      const before = campaign.nations[id as never]!.stats;
      const now = after.nations[id as never]!.stats;
      return JSON.stringify(before) !== JSON.stringify(now);
    });
    expect(changed).toBe(true);
  });

  it("tells the player about it in fiction, and names no counterparty to call", () => {
    const after = runTurns(foundedCampaign(), 10);
    const operatorItems = selectFeed(after).filter((item) => item.kind === "operator");
    expect(operatorItems.length).toBeGreaterThan(0);
    for (const item of operatorItems) {
      expect(item.headline.trim().length).toBeGreaterThan(0);
      expect(item.target).toBeDefined();
    }
  });

  it("describes a live operator's crisis on demand", () => {
    const after = runTurns(foundedCampaign(), 10);
    const operator = after.operators[0]!;
    const crisis = crisisFor(after, operator)!;
    expect(crisis.host).toBe(operator.nationality);
    expect(crisis.answerableWith).not.toContain("diplomatic");
    expect(crisis.headline).toContain(selectNation(after, crisis.host)!.base.identity.name);
  });

  it("is deterministic under replay", () => {
    const campaign = foundedCampaign();
    const [first, second] = replay(seed, () => runTurns(campaign, 8));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const [a, b] = replay(seed, (streams) => emergingOperators(campaign, streams));
    expect(a).toEqual(b);
  });

  it("draws per host, so adding a nation does not change what happens elsewhere", () => {
    const campaign = foundedCampaign();
    const streams = () => createRngStreams(seed);
    const full = emergingOperators(campaign, streams());

    const someHost = Object.keys(campaign.nations).sort()[1]!;
    const trimmed: Campaign = {
      ...campaign,
      nations: Object.fromEntries(Object.entries(campaign.nations).filter(([id]) => id !== someHost)),
    };
    const withoutOne = emergingOperators(trimmed, streams());

    const unaffected = full.filter((op) => op.nationality !== someHost).map((op) => op.id);
    // Everything that is not about the removed nation happens exactly as
    // before, up to the global cap that decides how many fit.
    expect(withoutOne.map((op) => op.id).slice(0, unaffected.length)).toEqual(unaffected.slice(0, withoutOne.length));
  });

  // Argentina's authored inflation is past a hundred percent. Held to a share,
  // one bite from a market actor wrote a hundred percent over it: the ratio of
  // debt to output then moved nearly two tenths in a year for no reason in its books.
  it("lets a market actor push inflation past a hundred percent up, never down to it", () => {
    const founded = foundedCampaign();
    const host = "ARG" as NationId;
    const runtime = founded.nations[host]!;
    const planted: Campaign = {
      ...founded,
      nations: { ...founded.nations, [host]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, inflation: 1.5 } } } },
      operators: [{ id: "op:market-actor:ARG:0", kind: "market-actor", nationality: host }],
    };
    const written = Array.from({ length: 40 }, (_, turn) => operatorPhase({ ...planted, turn }))
      .flatMap((packets) => packets.flatMap((packet) => packet.effects))
      .flatMap((effect) => (effect.kind === "nationStat" && effect.nation === host ? [effect.setStats?.economy?.inflation] : []))
      .filter((value): value is number => value !== undefined);
    expect(written.length).toBeGreaterThan(0);
    for (const value of written) {
      expect(value).toBeGreaterThan(1.5);
      expect(value).toBeLessThanOrEqual(1.51);
    }
  });
});

// An operator's weekly act is a hazard: its rate comes from what its host gives
// it to feed on, and the reason is stamped on the act when it fires.
describe("the operator's act rate", () => {
  function hostWith(campaign: Campaign, host: NationId, insurgencyPressure: number, regimeStability: number): Campaign {
    const runtime = campaign.nations[host]!;
    const stats = {
      ...runtime.stats,
      security: { ...runtime.stats.security, insurgencyPressure },
      politics: { ...runtime.stats.politics, regimeStability },
    };
    return { ...campaign, nations: { ...campaign.nations, [host]: { ...runtime, stats } } };
  }

  const campaign = foundedCampaign();
  const host = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation) as NationId;
  const operator = { id: `op:insurgency:${host}:1`, kind: "insurgency", nationality: host };

  it("presses more often from a host under more pressure, and less under a firmer regime", () => {
    const calm = operatorActRate(operatorActTerms(hostWith(campaign, host, 0.1, 0.5), operator));
    const troubled = operatorActRate(operatorActTerms(hostWith(campaign, host, 0.9, 0.5), operator));
    const firm = operatorActRate(operatorActTerms(hostWith(campaign, host, 0.9, 0.95), operator));
    expect(troubled).toBeGreaterThan(calm);
    expect(firm).toBeLessThan(troubled);
  });

  it("is never certain and never zero", () => {
    for (const pressure of [0, 1]) {
      const rate = operatorActRate(operatorActTerms(hostWith(campaign, host, pressure, 1 - pressure), operator));
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1);
    }
  });

  it("stamps the hazard's terms on every act that fires, and never touches the United States from abroad", () => {
    const pressed: Campaign = { ...hostWith(campaign, host, 1, 0.1), operators: [operator] };
    const packets = Array.from({ length: 20 }, (_, turn) => operatorPhase({ ...pressed, turn: pressed.turn + turn })).flat();
    const acts = packets.filter((packet) => packet.provenance?.decision?.question === "operator-hazard");
    expect(acts.length).toBeGreaterThan(0);
    for (const act of acts) {
      expect(act.provenance!.decision!.terms.map((term) => term.key)).toEqual(["host-pressure", "destabilized", "regime-survival"]);
      expect(act.effects.some((effect) => effect.kind === "metric")).toBe(false);
    }
  });
});

describe("who an intrusion crew breaks into", () => {
  const campaign = foundedCampaign();
  const us = campaign.founding.nation;

  it("reaches the United States from abroad, weighted by output and hostility", () => {
    const host = "RUS" as NationId;
    const weights = cyberVictimWeights(campaign, host);
    const usWeight = weights.find((entry) => entry.nation === us)!.weight;
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    expect(usWeight / total).toBeGreaterThan(0.1);
    const victims = Array.from({ length: 200 }, (_, step) => cyberVictim(campaign, host, (step + 0.5) / 200));
    expect(victims).toContain(us);
  });

  it("files the outage against the victim and the stability cost only when the victim is the United States", () => {
    const host = "RUS" as NationId;
    const crew = { id: "op:cyber-crew:RUS:0", kind: "cyber-crew", nationality: host };
    const packets = Array.from({ length: 60 }, (_, turn) => operatorPhase({ ...campaign, operators: [crew], turn: campaign.turn + turn })).flat();
    const acts = packets.filter((packet) => packet.provenance?.decision?.question === "operator-hazard");
    expect(acts.length).toBeGreaterThan(0);
    for (const act of acts) {
      const outage = act.effects.find((effect) => effect.kind === "impactEvent");
      const victim = outage && outage.kind === "impactEvent" ? outage.event.spec.nation : undefined;
      expect(victim).toBeDefined();
      expect(act.effects.some((effect) => effect.kind === "metric")).toBe(victim === us);
    }
  });

  it("lowers the victim's counterintelligence, not the host's, when the crew breaks into another country", () => {
    const host = "RUS" as NationId;
    const crew = { id: "op:cyber-crew:RUS:0", kind: "cyber-crew", nationality: host };
    const packets = Array.from({ length: 60 }, (_, turn) => operatorPhase({ ...campaign, operators: [crew], turn: campaign.turn + turn })).flat();
    const abroad = packets.flatMap((packet) => {
      const outage = packet.effects.find((effect) => effect.kind === "impactEvent");
      const victim = outage && outage.kind === "impactEvent" ? outage.event.spec.nation : undefined;
      return victim && victim !== host ? [{ packet, victim }] : [];
    });
    expect(abroad.length).toBeGreaterThan(0);
    for (const { packet, victim } of abroad) {
      const hit = packet.effects.flatMap((effect) => (effect.kind === "nationStat" ? [effect.nation] : []));
      expect(hit).toEqual([victim]);
    }
  });
});

describe("where operators take root", () => {
  it("does not fill the world's slots from the front of the alphabet", () => {
    let working = foundedCampaign();
    for (let turn = 0; turn < 40; turn += 1) working = advanceTurn(working, { simulate: operatorPhase, select: noopPhase });
    const hosts = [...new Set(working.operators.map((op) => op.nationality as string))].sort();
    expect(hosts.some((host) => host >= "M")).toBe(true);
  });
});
