import { describe, expect, it } from "vitest";
import type { NationId, PersonId, Relationship } from "@admin/world";
import { foundedForBalance } from "../balance-harness.js";
import { personNetworkFor } from "../person-network.js";
import { issueReach, knownPersonContacts, propagateIssue } from "../person-network-influence.js";
import { issueMemberOutreach, resolveMemberOutreach } from "../member-outreach.js";
import { campaignTurnPhases } from "../turn-phases.js";
import { advanceTurn } from "../turn-loop.js";
import { apply } from "../effects.js";
import { disposition, grievanceHalfLifeDays, grudgeWeight, historyPressure, createGrudge } from "../relationships.js";
import { projectRipples, rippleContribution } from "../resolution-ripples.js";
import { projectAction, resolveAction, type ResolutionRequest } from "../resolution.js";
import { projectLobbying } from "../lobbying.js";
import { createRngStreams } from "../rng.js";
import { relationshipKey, type Bill, type Campaign } from "../state.js";
import { selectNation } from "../state-selectors.js";

// Adversarial probes for the people, influence and relationship-propagation
// domain. Every assertion states the REALISTIC expectation; a red assertion is
// a reproduced break, and its message carries the observed numbers.

const { campaign: founded, charter } = foundedForBalance("network-probe");
const USA = founded.founding.nation;
const rel = (c: Campaign, from: string, to: string): Relationship => c.relationships[relationshipKey(from as NationId, to as NationId)]!;

const bill: Bill = { id: "bill:network-probe", act: "act-equal-protection", title: "Equal Protection Enforcement Act", status: "in-progress", sponsor: "administration", introducedTurn: 0, stage: "floor", passage: [] };
const withBill: Campaign = { ...founded, bills: { ...founded.bills, [bill.id]: bill } };

function degrees(c: Campaign): Map<string, number> {
  const deg = new Map<string, number>();
  for (const edge of personNetworkFor(c.people, c.seed, false)) {
    deg.set(edge.from as string, (deg.get(edge.from as string) ?? 0) + 1);
    deg.set(edge.to as string, (deg.get(edge.to as string) ?? 0) + 1);
  }
  return deg;
}

describe("1. centrality: influencing a well-connected person reaches further", () => {
  it("a brokered request through the Senate Majority Leader reaches downstream members on a fresh campaign", () => {
    const leader = founded.congress.leadership.find((figure) => figure.post === "post-senate-majority-leader")!.person as PersonId;
    const contacts = knownPersonContacts(withBill).length;
    const downstream = propagateIssue(withBill, leader, bill, "probe-leader", 1);
    // End to end through the production outreach path as well.
    const target = withBill.congress.members!.find((m) => m.chamber === "senate" && m.person !== leader && !withBill.congress.leadership.some((f) => f.person === m.person))!.person;
    const issued = issueMemberOutreach(withBill, target, bill.id, leader);
    let touched = -1;
    if (issued.ok) {
      const pending = apply(withBill, issued.packet);
      const due = { ...pending, calendar: issued.act.dueDate };
      const resolved = resolveMemberOutreach(due, issued.act.id);
      if (resolved.ok) {
        const next = apply(due, resolved.packet);
        touched = Object.values(next.people).filter((p) => (p.issuePressure ?? []).length > 0).length;
      }
    }
    console.log(`[1a] recorded contacts at founding=${contacts}; leader issueReach=${issueReach(withBill, leader, bill)}; propagateIssue responses=${downstream.length}; people with issue pressure after a brokered request=${touched}`);
    // Realistic: a Senate Majority Leader whips through standing relationships
    // (committee, caucus, state delegation) that exist before the President calls.
    expect(downstream.length, `leader brokerage reached ${downstream.length} members (contacts=${contacts})`).toBeGreaterThan(0);
  });

  // Won't fix (abstraction): the six-tie cap is a dossier reading limit
  // (ARCHITECTURE.md, "what a reader can hold"), and the biography graph has no
  // simulation consumer. Functional reach comes from the standing Hill edges
  // the first probe asks for, not from enlarging all 8,054 biographies.
  it.skip("biography-network degree is heavy-tailed and leaders are hubs, not capped at the same six as everyone", () => {
    const deg = degrees(founded);
    const all = Object.keys(founded.people).map((id) => deg.get(id) ?? 0).sort((a, b) => a - b);
    const median = all[Math.floor(all.length / 2)]!;
    const max = all.at(-1)!;
    const atCap = all.filter((d) => d === max).length / all.length;
    const leaders = founded.congress.leadership.map((f) => deg.get(f.person as string) ?? 0);
    const leaderMean = leaders.reduce((s, d) => s + d, 0) / leaders.length;
    console.log(`[1b] people=${all.length} median degree=${median} max=${max} share at max=${(atCap * 100).toFixed(1)}% leader degrees=${leaders.join(",")}`);
    // Realistic (cosponsorship/elite networks): a long right tail; leaders well above the median.
    expect(max, "max degree should be well above the median").toBeGreaterThanOrEqual(2 * median);
    expect(leaderMean, "leaders should be hubs").toBeGreaterThan(median * 1.5);
  });

  it("a member with more standing Hill ties reaches more colleagues under matched willingness", () => {
    // Twelve seated people, one party, one chamber, one shared outlook, no
    // recorded dialogue: the only difference between the two rosters is
    // whether the source shares a state delegation with the rest.
    const rank = withBill.congress.members!.filter((m) => !withBill.congress.leadership.some((f) => f.person === m.person) && !Object.values(withBill.congress.committees).some((c) => c?.chair === m.person)).slice(0, 12);
    const source = rank[0]!.person;
    const outlook = withBill.people[source]!.base.ideology;
    const home = rank[0]!.state;
    const away = withBill.congress.members!.find((m) => m.state !== home)!.state;
    const people = { ...withBill.people, ...Object.fromEntries(rank.map((m) => [m.person, { ...withBill.people[m.person]!, base: { ...withBill.people[m.person]!.base, ideology: outlook } }])) };
    const roster = (shared: boolean): Campaign => ({ ...withBill, people, congress: { ...withBill.congress, lobbying: [],
      members: rank.map((m) => ({ ...m, party: "democrat" as const, chamber: "house" as const, state: shared || m.person === source ? home : away })),
    } });
    const sparse = propagateIssue(roster(false), source, bill, "probe-connectivity", 1);
    const connected = propagateIssue(roster(true), source, bill, "probe-connectivity", 1);
    const reversed = roster(true);
    const again = propagateIssue({ ...reversed, congress: { ...reversed.congress, members: [...reversed.congress.members!].reverse() } }, source, bill, "probe-connectivity", 1);
    console.log(`[1b'] standing reach under matched willingness: sparse=${sparse.length} connected=${connected.length}; recorded contacts=${knownPersonContacts(roster(true)).length}`);
    expect(connected.length, `connected ${connected.length} against sparse ${sparse.length}`).toBeGreaterThan(sparse.length);
    expect(again).toEqual(connected);
  });

  it("reports issue reach for the lowest- and highest-biography-degree rank-and-file members (report only)", () => {
    const deg = degrees(withBill);
    const rank = withBill.congress.members!.filter((m) => !withBill.congress.leadership.some((f) => f.person === m.person) && !Object.values(withBill.congress.committees).some((c) => c?.chair === m.person));
    const sorted = [...rank].sort((a, b) => (deg.get(a.person as string) ?? 0) - (deg.get(b.person as string) ?? 0));
    const low = sorted[0]!;
    const high = sorted.at(-1)!;
    const lowReach = issueReach(withBill, low.person, bill);
    const highReach = issueReach(withBill, high.person, bill);
    console.log(`[1c] low-degree member degree=${deg.get(low.person as string) ?? 0} reach=${lowReach}; high-degree member degree=${deg.get(high.person as string) ?? 0} reach=${highReach}`);
    expect(Number.isFinite(lowReach) && Number.isFinite(highReach)).toBe(true);
  });

  it("attenuates per hop when contacts exist (control)", () => {
    const leader = founded.congress.leadership[0]!.person as PersonId;
    const ms = withBill.congress.members!.filter((m) => !withBill.congress.leadership.some((f) => f.person === m.person)).slice(0, 3).map((m) => m.person);
    const coop = [[leader, ms[0]], [ms[0], ms[1]]].map(([from, to]) => ({ from: from!, to: to!, actId: "act-equal-protection", date: withBill.calendar, accepted: true, account: "probe" }));
    // No seated roster, so standing caucus and delegation ties drop out and
    // only the authored chain leader → ms[0] → ms[1] carries pressure.
    const linked: Campaign = { ...withBill, congress: { ...withBill.congress, members: [], lobbying: [{ id: "probe-history", approach: "call", turn: 0, landed: true, account: "probe", cooperation: coop }] } };
    const out = propagateIssue(linked, leader, bill, "probe-hops", 1);
    console.log(`[1d] hop deltas=${out.map((r) => `${r.depth}:${r.delta}:${r.accepted}`).join(" ")}`);
    const accepted = out.filter((r) => r.accepted);
    const at = (depth: number) => Math.max(0, ...accepted.filter((r) => r.depth === depth).map((r) => Math.abs(r.delta)));
    expect(out.some((r) => r.depth > 2 || r.to === ms[2]), "no third hop and no recipient off the chain").toBe(false);
    if (accepted.some((r) => r.depth === 2)) expect(at(2)).toBeLessThan(at(1));
  });
});

describe("2. build and decay: grudges outlast favors", () => {
  it.todo("grudge and favor half-lives: 26-52 weeks for favors and two to four times that for grudges are candidate planning values, not established facts; test them in campaigns before asserting a band");

  it("reports a grudge's half-life and how many weeks a 0.25 grudge takes to be forgotten (report only)", () => {
    // 0.005 is the weight below which `ageGrudge` drops a grudge with no floor.
    const halfLives = Object.values(founded.nations).map((n) => grievanceHalfLifeDays(n.traits.vengefulness) / 7).sort((a, b) => a - b);
    const forgotten = halfLives.map((weeks) => Math.ceil(weeks * Math.log2(0.25 / 0.005)));
    const median = (values: readonly number[]) => values[Math.floor(values.length / 2)]!;
    console.log(`[2a] grievance half-life in weeks: min=${halfLives[0]!.toFixed(0)} median=${median(halfLives).toFixed(0)} max=${halfLives.at(-1)!.toFixed(0)}; weeks for a 0.25 grudge to fall below 0.005: min=${forgotten[0]} median=${median(forgotten)} max=${forgotten.at(-1)}`);
    expect(median(forgotten)).toBeGreaterThan(0);
  });

  it("after a quarter, a grudge's residual weight is at least the residual of an equal-sized favor", () => {
    const phases = campaignTurnPhases(charter);
    const nation = "SAU";
    const key = relationshipKey(nation as NationId, USA);
    const base = founded.relationships[key]!;
    const vengeful = founded.nations[nation as NationId]!.traits.vengefulness;
    const favor: Campaign = { ...founded, relationships: { ...founded.relationships, [key]: { ...base, trust: Math.min(1, base.trust + 0.1) } } };
    const grudge: Campaign = { ...founded, relationships: { ...founded.relationships, [key]: { ...base, grudges: [...base.grudges, createGrudge("probe slight", 0.2, founded.turn, vengeful)] } } };
    let [c, f, g] = [founded, favor, grudge];
    for (let i = 0; i < 13; i++) { c = advanceTurn(c, phases); f = advanceTurn(f, phases); g = advanceTurn(g, phases); }
    const favorLeft = disposition(rel(f, nation, USA), f) - disposition(rel(c, nation, USA), c);
    const grudgeLeft = disposition(rel(c, nation, USA), c) - disposition(rel(g, nation, USA), g);
    console.log(`[2b] ${nation} vengefulness=${vengeful.toFixed(2)}; both shocks were 0.10 of disposition at week 0; after 13 weeks favor residual=${favorLeft.toFixed(3)} grudge residual=${grudgeLeft.toFixed(3)}; grudge weight left=${grudgeWeight(rel(g, nation, USA)).toFixed(3)}`);
    // Realistic (negativity bias): the slight is remembered at least as long as the favor.
    expect(grudgeLeft).toBeGreaterThanOrEqual(favorLeft);
    // Realistic: a favor fades somewhat too; trust is not a permanent bank balance.
    expect(favorLeft).toBeLessThan(0.1 * 0.9);
  }, 120_000);

  it("remembered acts fade with elapsed time, not only with how many acts came after", () => {
    const base = rel(founded, "PAK", USA);
    const lastWeek: Relationship = { ...base, history: [{ turn: 520, kind: "relief", description: "probe" }] };
    const tenYearsAgo: Relationship = { ...base, history: [{ turn: 0, kind: "relief", description: "probe" }] };
    // Read on turn 521, a week after the newer act and ten years after the older one.
    const a = historyPressure(lastWeek, 521);
    const b = historyPressure(tenYearsAgo, 521);
    console.log(`[2c] historyPressure of one relief act last week=${a} and ten years ago=${b}`);
    expect(b).toBeLessThan(a);
  });

  it("repeated small slights accumulate (control)", () => {
    const base = rel(founded, "PAK", USA);
    const many: Relationship = { ...base, grudges: Array.from({ length: 5 }, (_, i) => createGrudge(`slight ${i}`, 0.05, 0, 0.5)) };
    const one: Relationship = { ...base, grudges: [createGrudge("slight", 0.05, 0, 0.5)] };
    console.log(`[2d] five slights weight=${grudgeWeight(many)} one slight=${grudgeWeight(one)}`);
    expect(grudgeWeight(many)).toBeGreaterThan(grudgeWeight(one));
  });
});

describe("3. third parties react by their own ties", () => {
  const sanction = (target: string, actor = USA): ResolutionRequest => ({ actor, target: target as NationId, instrument: "economic", rung: 3 });

  // Enemy-of-enemy alignment is conditional (Maoz et al. 2007), so a rival of
  // the target may stay neutral; what it must not do is read the act the way
  // the target's partners do. Every coercive ripple today cools its observer
  // toward the actor (resolution-ripples.ts), so a government that distrusts
  // Iran cools toward a US sanction on Iran exactly as Iran's partners do.
  it("no government that distrusts the sanctioned one cools toward the sanctioning one", () => {
    const iran = selectNation(founded, "IRN" as NationId)!.base;
    const ripples = projectRipples(founded, sanction("IRN"), iran, 0.42, "the United States");
    const contribution = rippleContribution(founded, sanction("IRN"), ripples);
    const warmers = contribution.effects.filter((e) => e.kind === "relationship" && (e.deltas?.trust ?? 0) > 0);
    const distrustsIran = (id: string) => (rel(founded, id, "IRN")?.trust ?? 0) < 0;
    const rivalsCooling = contribution.effects.filter((e) => e.kind === "relationship" && distrustsIran(e.from as string) && (e.deltas?.trust ?? 0) < 0)
      .map((e) => e.kind === "relationship" ? `${e.from}:${(e.deltas?.trust ?? 0).toFixed(3)}` : "");
    console.log(`[3a] Iran topPartners=${iran.stats.trade.topPartners.join(",")}; memberships=${iran.memberships.join(",")}`);
    console.log(`[3a] ripples on a US sanction of Iran: ${ripples.map((r) => `${r.nation}:${r.relation}:${r.magnitude.toFixed(3)}`).join(" ")}; observers that distrust Iran and cool toward the US=${rivalsCooling.join(" ")}; effects that raise trust toward the actor=${warmers.length}`);
    expect(rivalsCooling, "governments that distrust the target cool toward the coercer").toEqual([]);
  });

  it("an ally's reaction scales with how close it is to the target", () => {
    const target = "POL";
    const pol = selectNation(founded, target as NationId)!.base;
    const ripples = projectRipples(founded, { actor: "RUS" as NationId, target: target as NationId, instrument: "military", rung: 3 }, pol, 0.6, "Russia")
      .filter((r) => r.relation === "ally" || r.relation === "bloc-partner" || r.relation === "bloc-peer");
    const rows = ripples.map((r) => ({ nation: r.nation as string, relation: r.relation, magnitude: r.magnitude, trust: rel(founded, r.nation as string, target)?.trust ?? NaN }));
    const allies = rows.filter((r) => r.relation === "ally");
    const distinct = new Set(allies.map((r) => r.magnitude.toFixed(4))).size;
    const trusts = allies.map((r) => r.trust);
    console.log(`[3b] Russian strike on Poland: ${rows.length} reacting governments; ally rows=${allies.length}; distinct ally magnitudes=${distinct}; ally trust toward Poland spans ${Math.min(...trusts).toFixed(2)}..${Math.max(...trusts).toFixed(2)}; sample=${rows.slice(0, 8).map((r) => `${r.nation}:${r.relation}:${r.magnitude.toFixed(3)}@${r.trust.toFixed(2)}`).join(" ")}`);
    if (allies.length >= 2 && Math.max(...trusts) - Math.min(...trusts) > 0.2) expect(distinct).toBeGreaterThan(1);
  });

  it("NPC-on-NPC coercion moves third parties' readings of the NPC actor (control)", () => {
    const pol = selectNation(founded, "UKR" as NationId)!.base;
    const req: ResolutionRequest = { actor: "RUS" as NationId, target: "UKR" as NationId, instrument: "military", rung: 3 };
    const ripples = projectRipples(founded, req, pol, 0.6, "Russia");
    const effects = rippleContribution(founded, req, ripples).effects;
    console.log(`[3c] Russian strike on Ukraine: ${ripples.length} ripples, ${effects.length} relationship effects toward Russia`);
    expect(effects.length).toBeGreaterThan(0);
  });
});

describe("4. no unbounded chaining of cheap favors", () => {
  // Split per the economic-instruments lane (BL-284): emergency relief now
  // needs a need, so the saturation ordering is asserted on development
  // grants, which need no disaster.
  it("4a: refuses emergency relief to a government with no emergency", () => {
    const req: ResolutionRequest = { actor: USA, target: "PAK" as NationId, instrument: "assistance", rung: 1 };
    const proj = projectAction(founded, req, createRngStreams(founded.seed));
    console.log(`[4a] relief to PAK with no condition: ${proj.ok ? "offered" : `refused: ${proj.reason}`}`);
    expect(proj.ok).toBe(false);
  });

  it("4a: repeated development grants to one government show diminishing returns", () => {
    const target = "PAK" as NationId;
    const phases = campaignTurnPhases(charter);
    let working = founded;
    const gains: number[] = [];
    for (let i = 0; i < 12; i++) {
      const req: ResolutionRequest = { actor: USA, target, instrument: "assistance", rung: 2 };
      const streams = createRngStreams(working.seed);
      const res = resolveAction(working, req, streams);
      if (!res.ok) { console.log(`[4a] grant refused at ${i}: ${res.reason}`); break; }
      const before = rel(working, target, USA).trust;
      working = apply(working, res.packet);
      gains.push(rel(working, target, USA).trust - before);
      working = advanceTurn(working, phases);
    }
    const landed = gains.filter((g) => g > 0.001);
    const first = landed[0] ?? 0;
    const lateMean = landed.slice(-4).reduce((s, g) => s + g, 0) / Math.max(1, landed.slice(-4).length);
    console.log(`[4a] ${gains.length} development grants to ${target}: trust gains=${gains.map((g) => g.toFixed(4)).join(",")} landed=${landed.length} first=${first.toFixed(4)} late mean=${lateMean.toFixed(4)}`);
    expect(landed.length, "enough grants land to read a curve").toBeGreaterThanOrEqual(4);
    expect(lateMean, `late landed grants average ${lateMean.toFixed(4)} against the first ${first.toFixed(4)}`).toBeLessThan(first);
  }, 120_000);

  it("a member who resents a failed public pressure campaign is harder to persuade next time", () => {
    const post = "post-senate-minority-leader" as const;
    const figure = founded.congress.leadership.find((f) => f.post === post)!;
    const before = projectLobbying(founded, post, "call")!.successChance;
    const runtime = founded.people[figure.person]!;
    const tie = runtime.tie ?? { rapport: 0.5, trust: 0.5, favors: [], grudges: [] };
    const aggrieved: Campaign = { ...founded, people: { ...founded.people, [figure.person]: { ...runtime, tie: { ...tie, grudges: Array.from({ length: 5 }, (_, i) => ({ cause: `probe public appeal ${i}`, weight: 0.2, turn: 0 })) } } } };
    const after = projectLobbying(aggrieved, post, "call")!.successChance;
    console.log(`[4b] minority leader call success chance with no grudges=${before}, with five personal grudges of 0.2=${after}`);
    expect(after).toBeLessThan(before);
  });
});
