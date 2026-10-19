import { describe, expect, it } from "vitest";
import {
  apply,
  coalitionFlag,
  commitReply,
  conflictPhase,
  createRngStreams,
  openConflict,
  readPlayerCommitments,
  selectActiveConflicts,
  selectRelationshipsFrom,
  type EffectPacket,
} from "@admin/engine";
import { sealedCampaign, underStrain, withFlags, withLoneEdge } from "./__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { previewBoards } from "./preview-board.js";
import { auditScenario } from "./scenario-audit.js";
import {
  bindCounterpart,
  castBound,
  castScenario,
  eligibleScenarios,
  rememberReply,
  scenarioLive,
  selectScenario,
} from "./scenario-cast.js";
import { deskOpen } from "./desk-window.js";
import {
  REVEALED_PREFERENCE_EVIDENCE_FLOOR,
  ScenarioDef,
  scenarioFiredFlag,
  severityStagedFlag,
  type ScenarioCast,
} from "./scenario.js";
import { flagSetFlag } from "./scenario-deed-flags.js";
import { effectiveWeight, FLAG_AGE_SATURATION } from "./scenario-cast.js";
import type { Campaign, NationCondition } from "@admin/engine";
import type { NationId } from "@admin/world";

const campaign = sealedCampaign();
const playerEdges = () =>
  selectRelationshipsFrom(campaign, campaign.founding.nation).filter((edge) => edge.to !== campaign.founding.nation);
const def = (id: string): ScenarioDef => {
  const found = FIXTURE_SCENARIOS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no scenario ${id} in the core pack`);
  return found;
};

describe("casting against the live board", () => {
  it("binds the tensest counterpart the player actually holds a reading of", () => {
    const cast = castScenario(campaign, def("fixture-the-border-reading"));
    expect(cast).toBeDefined();
    const tensest = [...playerEdges()].sort(
      (a, b) => b.tension - a.tension || String(a.to).localeCompare(String(b.to)),
    )[0];
    expect(cast!.counterpart).toBe(tensest!.to);
  });

  it("renders every placeholder — no braces reach a player", () => {
    for (const scenario of FIXTURE_SCENARIOS) {
      const cast = castScenario(campaign, scenario);
      expect(cast, scenario.id).toBeDefined();
      const copy = [cast!.script.subject, ...cast!.script.opening.map((beat) => beat.text), ...cast!.script.options.map((option) => option.text)];
      for (const text of copy) expect(text, scenario.id).not.toContain("{{");
    }
  });

  it("binds a rejoinder like any other beat — placeholder rendered, chair seated", () => {
    // A rejoinder reaches the player down the reply path rather than the
    // opening path, which is exactly why it has to be bound here too: an
    // unrendered one would put braces on screen after the player commits.
    const base = def("fixture-the-border-reading");
    const first = base.replies[0]!;
    if (first.commitment.kind !== "position") throw new Error("fixture drift: first reply is no longer a position");
    const answered: ScenarioDef = {
      ...base,
      replies: [
        {
          ...first,
          commitment: {
            ...first.commitment,
            rejoinder: {
              speaker: { kind: "cabinet", roleHint: "foreign" },
              text: "{{counterpart}} read it as an answer within the day, and said so on their own broadcast that night.",
            },
          },
        },
        ...base.replies.slice(1),
      ],
    };
    const cast = castScenario(campaign, answered)!;
    const commitment = cast.script.options[0]!.commitment;
    expect(commitment.kind).toBe("position");
    if (commitment.kind !== "position") return;
    expect(commitment.rejoinder).toBeDefined();
    expect(commitment.rejoinder!.text).not.toContain("{{");
    expect(commitment.rejoinder!.speaker.kind).toBe("cabinet");
    if (commitment.rejoinder!.speaker.kind !== "cabinet") return;
    expect(Object.keys(campaign.player.cabinet)).toContain(commitment.rejoinder!.speaker.role);
  });

  it("gives cabinet beats to seats this campaign actually filled", () => {
    const cast = castScenario(campaign, def("fixture-the-border-reading"))!;
    const briefer = cast.script.opening[0]!.speaker;
    expect(briefer.kind).toBe("cabinet");
    if (briefer.kind !== "cabinet") return;
    expect(Object.keys(campaign.player.cabinet)).toContain(briefer.role);
  });

  // The half of an impact the model prices at nothing had nowhere to go: it
  // was drawn to the player before the choice, resolved into no effect, and so
  // left no trace on the ledger for the review afterwards to read.
  it("hands the institutional half of a declared impact to the engine whole", () => {
    const cast = castScenario(campaign, def("fixture-the-border-reading"))!;
    const answered = cast.script.options.find((option) => option.id === "answer-the-paper-with-paper")!;
    expect(answered.commitment.kind).toBe("position");
    if (answered.commitment.kind !== "position") return;
    expect(answered.commitment.institutional).toEqual(["alliance-credit-earned"]);

    const ordered = cast.script.options.find((option) => option.id === "close-our-side-too")!;
    expect(ordered.commitment.kind, "the fixture's other reply is the control").toBe("instrument");
  });

  // The doubt has to travel with the script, not with the scenario file: the
  // meeting room only ever sees what casting handed it, and a briefing whose
  // own confidence band says it can be overturned has to say so on the board
  // the President reads before choosing, not in the aftermath.
  it("marks the script when the briefing behind it can be overturned, and only then", () => {
    const base = def("fixture-the-border-reading");
    expect(castBound(campaign, { ...base, intelConfidence: "disputed" }, "DEU" as NationId).script.briefingDoubted).toBe(
      true,
    );
    expect(
      castBound(campaign, { ...base, intelConfidence: "single-sourced" }, "DEU" as NationId).script.briefingDoubted,
    ).toBe(true);
    expect(
      castBound(campaign, { ...base, intelConfidence: "confirmed" }, "DEU" as NationId).script.briefingDoubted,
      "a confirmed claim is never overturned, so there is nothing to doubt",
    ).toBeUndefined();
    expect(
      castBound(campaign, base, "DEU" as NationId).script.briefingDoubted,
      "an unmarked scenario carries no briefing with anything to be wrong about",
    ).toBeUndefined();
  });
});

describe("the same nation opens different doors as friend and adversary", () => {
  const other = playerEdges()[0]!.to;
  const asFriend = withLoneEdge(campaign, other, { trust: 0.8, tension: 0.1 });
  const asAdversary = withLoneEdge(campaign, other, { trust: -0.5, tension: 0.7 });

  it("the friend's wire opens only for a friend; the shootdown only for a rival", () => {
    const friendIds = eligibleScenarios(asFriend, FIXTURE_SCENARIOS).map((cast) => cast.def.id);
    const adversaryIds = eligibleScenarios(asAdversary, FIXTURE_SCENARIOS).map((cast) => cast.def.id);
    expect(friendIds).toContain("fixture-the-quiet-word");
    expect(friendIds).not.toContain("fixture-the-border-reading");
    expect(adversaryIds).toContain("fixture-the-border-reading");
    expect(adversaryIds).not.toContain("fixture-the-quiet-word");
  });

});

describe("what a player answers becomes who they are", () => {
  it("a chained scenario stays shut until the flag that opens it is earned", () => {
    // Late enough for the chain's own turn bound, so the flag is the only
    // thing left deciding whether the follow-up is live.
    const settled = { ...campaign, turn: campaign.turn + 4 };
    const before = eligibleScenarios(settled, FIXTURE_SCENARIOS).map((cast) => cast.def.id);
    expect(before).not.toContain("fixture-the-bill-for-the-guarantee");
    const after = eligibleScenarios(withFlags(settled, { "guaranteed-the-deposits": true }), FIXTURE_SCENARIOS).map(
      (cast) => cast.def.id,
    );
    expect(after).toContain("fixture-the-bill-for-the-guarantee");
  });

  it("a once scenario never fires twice", () => {
    const friendly = withLoneEdge(campaign, playerEdges()[0]!.to, { trust: 0.8, tension: 0.1 });
    const fired = withFlags(friendly, { [scenarioFiredFlag("fixture-the-quiet-word")]: true });
    expect(eligibleScenarios(friendly, FIXTURE_SCENARIOS).map((cast) => cast.def.id)).toContain("fixture-the-quiet-word");
    expect(eligibleScenarios(fired, FIXTURE_SCENARIOS).map((cast) => cast.def.id)).not.toContain("fixture-the-quiet-word");
  });

  it("committing a reply stamps the fired flag, the memory, the closed desk, and the headline", () => {
    const scenario = castScenario(campaign, def("fixture-the-queue-at-the-branch"))!;
    const packet: EffectPacket = {
      source: "conversation",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "The square was cleared." },
      effects: [],
    };
    const remembered = rememberReply(campaign, packet, scenario, "clear-the-depot-square");
    const next = apply(campaign, remembered);
    expect(next.player.flags[scenarioFiredFlag("fixture-the-queue-at-the-branch")]).toBe(true);
    expect(next.player.flags["cleared-the-square"]).toBe(true);
    expect(deskOpen(campaign)).toBe(true);
    expect(deskOpen(next)).toBe(false);
    const press = next.feed.filter((item) => item.kind === "press");
    expect(press).toHaveLength(1);
    expect(press[0]!.headline).not.toContain("{{");
    // Every committed reply also files as a decision on the record, not only
    // the ones a writer flagged as big enough for a press line above.
    const record = next.feed.filter((item) => item.kind === "player-action");
    expect(record).toHaveLength(1);
    expect(record[0]!.headline).toBe("The queue outside the branch");
    // The two markers stamped beside the memory: when the deed happened, for
    // agedAtLeast follow-ups, and how loud the week was, for severity pacing.
    expect(next.player.flags[flagSetFlag("cleared-the-square", campaign.turn)]).toBe(true);
    expect(next.player.flags[severityStagedFlag("serious", campaign.turn)]).toBe(true);
  });

  it("still files a decision on the record when the reply authors no press line", () => {
    const scenario = castScenario(campaign, def("fixture-the-queue-at-the-branch"))!;
    const packet: EffectPacket = {
      source: "conversation",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "The government put itself behind every deposit in the country." },
      effects: [],
    };
    const remembered = rememberReply(campaign, packet, scenario, "stand-behind-the-deposits");
    const next = apply(campaign, remembered);
    expect(next.feed.filter((item) => item.kind === "press")).toHaveLength(0);
    const record = next.feed.filter((item) => item.kind === "player-action");
    expect(record).toHaveLength(1);
    // The situation's own subject, not `packet.narration.summary` — the two
    // must read as different sentences, or the aftermath ceremony's "What the
    // country remembers" and "It ran as" beats would print the same line twice.
    expect(record[0]!.headline).toBe("The queue outside the branch");
    expect(record[0]!.headline).not.toBe(remembered.narration.summary);
    expect(record[0]!.visibility).toBe("public");
  });

  // Who acted and who, if anyone, it was aimed at: the President decided it,
  // and a scenario at home names no foreign party, so the record carries no
  // target rather than the player's own nation standing in as one.
  it("files the decision as the President's, aimed at nobody when it happened at home", () => {
    const decided = (id: string, reply: string) => {
      const scenario = castScenario(campaign, def(id))!;
      const packet: EffectPacket = { source: "conversation", actor: "player", turn: campaign.turn, narration: { summary: "Decided." }, effects: [] };
      return apply(campaign, rememberReply(campaign, packet, scenario, reply)).feed.find((item) => item.kind === "player-action")!;
    };
    const home = decided("fixture-the-queue-at-the-branch", "stand-behind-the-deposits");
    expect(home.actor).toBe(campaign.founding.nation);
    expect(home).not.toHaveProperty("target");
    const abroadCast = castScenario(campaign, def("fixture-the-border-reading"))!;
    const abroad = decided("fixture-the-border-reading", abroadCast.def.replies[0]!.id);
    expect(abroad.actor).toBe(campaign.founding.nation);
    expect(abroad.target).toBe(abroadCast.counterpart);
    expect(abroad.target).not.toBe(campaign.founding.nation);
  });

  it("an aged follow-up stays dark until the deed has gone cold", () => {
    const followUp: ScenarioDef = {
      ...def("fixture-the-bill-for-the-guarantee"),
      id: "fixture-the-late-bill",
      conditions: [{ kind: "flag", flag: "guaranteed-the-deposits", is: true, agedAtLeast: 3 }],
    };
    const deedTurn = campaign.turn;
    const promised = withFlags(campaign, {
      "guaranteed-the-deposits": true,
      [flagSetFlag("guaranteed-the-deposits", deedTurn)]: true,
    });
    const liveAt = (turn: number) =>
      eligibleScenarios({ ...promised, turn }, [followUp]).map((cast) => cast.def.id);
    // Turns one and two after the deed: the flag is true and the scenario is
    // still not a callback, so it stays dark.
    expect(liveAt(deedTurn)).not.toContain("fixture-the-late-bill");
    expect(liveAt(deedTurn + 1)).not.toContain("fixture-the-late-bill");
    expect(liveAt(deedTurn + 2)).not.toContain("fixture-the-late-bill");
    expect(liveAt(deedTurn + 3)).toContain("fixture-the-late-bill");
    expect(liveAt(deedTurn + 7)).toContain("fixture-the-late-bill");
  });

  it("treats a flag set before markers existed as old enough by construction", () => {
    const followUp: ScenarioDef = {
      ...def("fixture-the-bill-for-the-guarantee"),
      id: "fixture-the-cold-bill",
      conditions: [{ kind: "flag", flag: "guaranteed-the-deposits", is: true, agedAtLeast: 3 }],
    };
    const promised = withFlags({ ...campaign, turn: campaign.turn + 10 }, { "guaranteed-the-deposits": true });
    expect(eligibleScenarios(promised, [followUp]).map((cast) => cast.def.id)).toContain("fixture-the-cold-bill");
  });
});

describe("selection", () => {
  it("is deterministic for the same campaign at the same turn", () => {
    const first = selectScenario(campaign, FIXTURE_SCENARIOS);
    const second = selectScenario(campaign, FIXTURE_SCENARIOS);
    expect(first?.def.id).toBe(second?.def.id);
    expect(first?.counterpart).toBe(second?.counterpart);
  });

  it("urgency boosts raise a scenario's draw weight as the board worsens", () => {
    const other = playerEdges()[0]!.to;
    const calm = withLoneEdge(campaign, other, { trust: 0, tension: 0.4 });
    const tense = withLoneEdge(campaign, other, { trust: 0, tension: 0.9 });
    const weightIn = (state: typeof campaign) =>
      eligibleScenarios(state, FIXTURE_SCENARIOS).find((cast) => cast.def.id === "fixture-the-border-reading")?.weight;
    expect(weightIn(tense)!).toBeGreaterThan(weightIn(calm)!);
  });

  it("uses the same stream discipline as the event deck — a fresh draw each turn", () => {
    const laterTurn = { ...campaign, turn: campaign.turn + 7 };
    // Not asserting a different pick — only that both draws resolve legally.
    expect(() => selectScenario(laterTurn, FIXTURE_SCENARIOS)).not.toThrow();
    expect(createRngStreams(campaign.seed).stream("scenario", campaign.turn).next()).toBe(
      createRngStreams(campaign.seed).stream("scenario", campaign.turn).next(),
    );
  });
});

// Cabinet attributes gating a scenario's very availability — the mechanics
// counterpart to a minister's advisory opinion on a decision already offered.
describe("cabinet attributes gate what content the board can show", () => {
  const gatedOn = (attribute: "competence" | "loyalty", atLeast: number): ScenarioDef => ({
    ...def("fixture-the-border-reading"),
    conditions: [{ kind: "cabinetAttribute", roleHint: "lead", attribute, atLeast }],
  });

  it("is live only once the actual holder of the named chair clears the bar", () => {
    const leadId = campaign.player.cabinet[campaign.founding.leadRole]!;
    const leadCompetence = campaign.people[leadId]!.base.competence;

    expect(scenarioLive(campaign, gatedOn("competence", leadCompetence - 0.01), campaign.founding.nation)).toBe(true);
    expect(scenarioLive(campaign, gatedOn("competence", leadCompetence + 0.01), campaign.founding.nation)).toBe(false);
  });

  it("a vacant or dead chair satisfies nothing, whatever the bound", () => {
    const leadId = campaign.player.cabinet[campaign.founding.leadRole]!;
    const vacant = { ...campaign, people: { ...campaign.people, [leadId]: { ...campaign.people[leadId]!, alive: false } } };
    expect(scenarioLive(vacant, gatedOn("loyalty", 0), campaign.founding.nation)).toBe(false);
  });
});

// Content names a function; the charter supplies the body. This is the
// mechanism that lets a scenario about the legislature be written once and
// stay true under a parliament, a junta, and a clerical council alike.
describe("institution tokens resolve through the founding charter", () => {
  const CHARTERS = [
    ["charter-usa-constitution", "Congress", "The Presidency"],
    ["charter-parliamentary-republic", "National Assembly", "Prime Minister's Cabinet"],
    ["charter-military-junta", "Officer Corps Council", "Ministry of Order"],
  ] as const;

  const speaking = (text: string, conditions: ScenarioDef["conditions"] = []): ScenarioDef => ({
    ...def("fixture-the-border-reading"),
    conditions,
    opening: [{ speaker: { kind: "narrator" }, text }],
  });

  it.each(CHARTERS)("names %s's own bodies, not another charter's", (charterId, assembly, executive) => {
    const founded = sealedCampaign("institution-tokens", charterId);
    const script = castScenario(founded, speaking("{{assembly}} sits tomorrow; {{executive}} will not wait."))!.script;

    expect(script.opening[0]!.text).toBe(`${assembly} sits tomorrow; ${executive} will not wait.`);
  });

  it("gates a scenario on a body the charter may not have at all", () => {
    // The US constitution seats a judiciary; a junta does not. The gate is
    // whether the founding charter actually has the body, not whether the
    // sentence named one.
    const founded = sealedCampaign("institution-tokens", "charter-usa-constitution");
    const junta = sealedCampaign("institution-tokens", "charter-military-junta");
    const needsCourt = speaking("The ruling stands.", [{ kind: "charterInstitution", institution: "judiciary", present: true }]);
    const needsNoCourt = speaking("The ruling stands.", [{ kind: "charterInstitution", institution: "judiciary", present: false }]);

    expect(scenarioLive(founded, needsCourt, founded.founding.nation)).toBe(true);
    expect(scenarioLive(founded, needsNoCourt, founded.founding.nation)).toBe(false);
    expect(scenarioLive(junta, needsCourt, junta.founding.nation)).toBe(false);
    expect(scenarioLive(junta, needsNoCourt, junta.founding.nation)).toBe(true);
  });
});

// The gates the dynamism audit found missing: the war and disaster classes were
// keyed to tension and stability, which are proxies for a war and a famine
// rather than the war and the famine, so a scenario about the front could open
// in a country at peace.
describe("gating on what the board is actually carrying", () => {
  const PLAYER = sealedCampaign().founding.nation;

  const atWar = (campaign: Campaign, aggressor: NationId, defender: NationId): Campaign => ({
    ...campaign,
    conflicts: {
      "war:x": {
        id: "war:x",
        aggressor,
        defender,
        joined: { aggressor: [], defender: [] },
        startedTurn: 1,
        cause: "A border seized.",
        intensity: 0.6,
        warSupport: { aggressor: 0.6, defender: 0.6 },
        exhaustion: { aggressor: 0.1, defender: 0.1 },
        status: "active",
        beats: [],
      },
    },
  });

  const suffering = (campaign: Campaign, kind: NationCondition["kind"], severity: number): Campaign => ({
    ...campaign,
    conditions: {
      "c:1": {
        id: "c:1",
        nation: PLAYER,
        kind,
        scope: "nation",
        severity,
        startedTurn: 1,
        status: "active",
        beats: [],
      },
    },
  });

  const gated = (conditions: ScenarioDef["conditions"]): ScenarioDef =>
    ({ ...FIXTURE_SCENARIOS[0]!, id: "gate-probe", once: false, conditions }) as ScenarioDef;

  it("tells the player's own war apart from everyone else's", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const mine = gated([{ kind: "warState", role: "any" }]);
    const theirs = gated([{ kind: "warState", role: "none" }]);
    expect(scenarioLive(base, mine, other)).toBe(false);
    expect(scenarioLive(atWar(base, PLAYER, other), mine, other)).toBe(true);
    // A world at peace does not satisfy "a war the player is staying out of":
    // there is no war to stay out of.
    expect(scenarioLive(base, theirs, other)).toBe(false);
    expect(scenarioLive(atWar(base, other, "COD" as NationId), theirs, other)).toBe(true);
  });

  it("tells starting a war apart from being invaded", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const invaded = gated([{ kind: "warState", role: "defender" }]);
    expect(scenarioLive(atWar(base, PLAYER, other), invaded, other)).toBe(false);
    expect(scenarioLive(atWar(base, other, PLAYER), invaded, other)).toBe(true);
  });

  it("counts a war the President joined as the country's own, and not as starting one or being invaded", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const joined: Campaign = {
      ...base,
      conflicts: {
        "war:joined": {
          id: "war:joined",
          aggressor: "RUS" as NationId,
          defender: "UKR" as NationId,
          joined: { aggressor: [], defender: [PLAYER] },
          startedTurn: 1,
          cause: "A border seized.",
          intensity: 0.6,
          warSupport: { aggressor: 0.6, defender: 0.6 },
          exhaustion: { aggressor: 0.1, defender: 0.1 },
          status: "active",
          beats: [],
        },
      },
    };
    expect(scenarioLive(joined, gated([{ kind: "warState", role: "any" }]), other)).toBe(true);
    expect(scenarioLive(joined, gated([{ kind: "warState", role: "none" }]), other)).toBe(false);
    expect(scenarioLive(joined, gated([{ kind: "warState", role: "aggressor" }]), other)).toBe(false);
    expect(scenarioLive(joined, gated([{ kind: "warState", role: "defender" }]), other)).toBe(false);
    const urgent = { ...gated([]), boosts: [{ source: "warIntensity" as const, factor: 1 }] } as ScenarioDef;
    expect(effectiveWeight(joined, urgent, other)).toBeCloseTo(urgent.weight * 1.6);
  });

  it("gates on the condition the country is actually living through", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const outbreak = gated([{ kind: "conditionActive", condition: "pandemic", atLeast: 0.1 }]);
    expect(scenarioLive(suffering(base, "flood", 0.9), outbreak, other)).toBe(false);
    expect(scenarioLive(suffering(base, "pandemic", 0.5), outbreak, other)).toBe(true);
  });

  it("reads an unbounded gate as the condition running, not as any board at all", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const running = gated([{ kind: "conditionActive", condition: "pandemic" }]);
    expect(scenarioLive(base, running, other)).toBe(false);
    expect(scenarioLive(suffering(base, "pandemic", 0.3), running, other)).toBe(true);
    const mildOnly = gated([{ kind: "conditionActive", condition: "flood", atMost: 0.4 }]);
    expect(scenarioLive(base, mildOnly, other)).toBe(false);
    expect(scenarioLive(suffering(base, "flood", 0.3), mildOnly, other)).toBe(true);
  });

  it("lets a scenario ask for a crisis that has got out of hand", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const severe = gated([{ kind: "conditionActive", atLeast: 0.7 }]);
    expect(scenarioLive(suffering(base, "flood", 0.3), severe, other)).toBe(false);
    expect(scenarioLive(suffering(base, "flood", 0.8), severe, other)).toBe(true);
  });

  it("makes a worsening crisis likelier as it worsens, rather than merely possible", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const def = { ...gated([]), boosts: [{ source: "conditionSeverity" as const, factor: 2 }] } as ScenarioDef;
    const mild = effectiveWeight(suffering(base, "flood", 0.2), def, other);
    const severe = effectiveWeight(suffering(base, "flood", 0.9), def, other);
    expect(severe).toBeGreaterThan(mild);
    expect(mild).toBeGreaterThan(effectiveWeight(base, def, other));
  });

  it("lets a boost that names a kind rise only on that kind, so a flood never raises a prices scenario", () => {
    const base = sealedCampaign();
    const other = "ALP" as NationId;
    const prices = { ...gated([]), boosts: [{ source: "conditionSeverity" as const, factor: 2, kind: "inflation-shock" as const }] } as ScenarioDef;
    expect(effectiveWeight(suffering(base, "flood", 0.9), prices, other)).toBe(prices.weight);
    expect(effectiveWeight(suffering(base, "inflation-shock", 0.5), prices, other)).toBeCloseTo(prices.weight * 2);
    const anyKind = { ...gated([]), boosts: [{ source: "conditionSeverity" as const, factor: 2 }] } as ScenarioDef;
    expect(effectiveWeight(suffering(base, "flood", 0.9), anyKind, other)).toBeCloseTo(anyKind.weight * 2.8);
  });

  describe("a callback ripens instead of waiting on a draw", () => {
    const other = "ALP" as NationId;
    const ripening: ScenarioDef = {
      ...gated([{ kind: "flag", flag: "guaranteed-the-deposits", is: true }]),
      boosts: [{ source: "flagAge", factor: 1 }],
    };
    const deedTurn = 4;
    const remembered = withFlags(sealedCampaign(), {
      "guaranteed-the-deposits": true,
      [flagSetFlag("guaranteed-the-deposits", deedTurn)]: true,
    });
    const weightAt = (turn: number) => effectiveWeight({ ...remembered, turn }, ripening, other);

    it("weighs more the longer the deed has stood", () => {
      expect(weightAt(deedTurn)).toBe(ripening.weight);
      expect(weightAt(deedTurn + 1)).toBeGreaterThan(weightAt(deedTurn));
      expect(weightAt(deedTurn + 6)).toBeGreaterThan(weightAt(deedTurn + 1));
    });

    it("saturates, so an ancient deed cannot own the pool", () => {
      const saturated = weightAt(deedTurn + FLAG_AGE_SATURATION);
      expect(saturated).toBe(ripening.weight * 2);
      expect(weightAt(deedTurn + FLAG_AGE_SATURATION * 5)).toBe(saturated);
    });

    it("adds nothing while the flag is unset — the scenario is dark anyway", () => {
      expect(effectiveWeight(sealedCampaign(), ripening, other)).toBe(ripening.weight);
    });

    it("treats a deed stamped before markers existed as fully ripe", () => {
      const noMarker = withFlags({ ...sealedCampaign(), turn: 30 }, { "guaranteed-the-deposits": true });
      expect(effectiveWeight(noMarker, ripening, other)).toBe(ripening.weight * 2);
    });
  });
});

// The keystone the war class rests on: the board a peace scenario is drawn on
// is the board its answer has to be able to change. Written against the
// reachability preview's own at-war board rather than a hand-built conflict,
// so what is proved here is what the publish gate says content ships onto.
describe("a reply that reaches the war it was cast onto", () => {
  const peaceTerms: ScenarioDef = {
    id: "fixture-the-terms-on-the-table",
    class: "war",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "The terms on the table",
    cast: { pick: "warCounterpart" },
    conditions: [{ kind: "warState", role: "any" }],
    weight: 1,
    locus: { site: "capital", ground: "counterpart", descriptor: "the conference room borrowed for talks neither side will call talks" },
    particulars: [
      { label: "Terms relayed", value: "Through a mediator, not through us" },
      { label: "Since last exchange", value: "4 days" },
      { label: "Lines held", value: "Where they actually sit today" },
      { label: "Signatures wanted", value: "Both, inside the week" },
    ],
    transmission: {
      relay: "cable",
      text: "The terms stand as written for four days and not an hour past them. We will not be negotiating the lines again, and we are not asking the mediator to carry a second version of this.",
      attribution: "Their delegation, through the mediator",
    },
    opening: [
      {
        speaker: { kind: "cabinet", roleHint: "foreign" },
        text: "They have put terms on the table through a mediator rather than through us directly, four days after the last exchange, and what we do with the offer is the whole of this week.",
      },
    ],
    replies: [
      {
        id: "accept-the-terms",
        tone: "principled",
        text: "Accept the terms as relayed and end this now, on the lines as they actually sit.",
        commitment: {
          kind: "position",
          cost: { treasury: -30, stability: 0.06, standing: -0.03 },
          remembered: "The government accepted the terms as relayed and ended the war on the lines as they actually stood.",
          rejoinder: { speaker: { kind: "cabinet" as const, roleHint: "foreign" as const }, text: "Two firms that had been waiting on it withdrew their bids the same afternoon, and neither would say on the telephone why." },
          relationship: { trust: 0.08, tension: -0.12 },
          conflictMove: "acceptTerms",
        },
      },
      {
        id: "fight-on-for-better-lines",
        tone: "firm",
        text: "Reject the offer and keep pressing while the front is still moving our way.",
        commitment: {
          kind: "position",
          cost: { treasury: -80, militaryReadiness: -0.06, standing: 0.04 },
          // Another season on the front is the force committed and the dead it
          // costs, which is what makes refusing the terms a decision.
          impact: { human: { lives: "hundreds", borneBy: "the-services" }, agency: "our-doing", institutional: ["forces-committed"] },
          remembered: "The offered terms were turned down in favor of another season on the front, and the fighting went on.",
          rejoinder: { speaker: { kind: "narrator" as const }, text: "The provincial office answered inside the day, faster than it has ever answered anything, and its answer was a single word long." },
          relationship: { trust: -0.05, tension: 0.06 },
        },
      },
    ],
  };

  const atWarBoard = (): Campaign => {
    // The player's own war specifically — one preview board carries a war
    // between two other nations, and peace terms are not the player's to sign.
    const board = previewBoards().find((candidate) =>
      selectActiveConflicts(candidate).some(
        (conflict) => conflict.aggressor === candidate.founding.nation || conflict.defender === candidate.founding.nation,
      ),
    );
    if (!board) throw new Error("the preview boards no longer carry a war for peace content to be true on");
    return board;
  };

  it("parses, audits clean, and is live on the board that carries a war", () => {
    expect(() => ScenarioDef.parse(peaceTerms)).not.toThrow();
    expect(auditScenario(peaceTerms)).toEqual([]);
    const board = atWarBoard();
    const counterpart = bindCounterpart(board, peaceTerms)!;
    expect(scenarioLive(board, peaceTerms, counterpart)).toBe(true);
  });

  it("ends that war when the terms are accepted, and the front stops billing next tick", () => {
    const board = atWarBoard();
    const cast = castScenario(board, peaceTerms)!;
    // The scenario is talking to the nation it is fighting, not to a third
    // party — the cast reads the war rather than the tension table.
    const war = selectActiveConflicts(board).find(
      (conflict) => conflict.aggressor === board.founding.nation || conflict.defender === board.founding.nation,
    )!;
    expect([war.aggressor, war.defender]).toContain(cast.counterpart);

    const accept = cast.script.options.find((option) => option.id === "accept-the-terms")!;
    const result = commitReply(board, cast.script, accept, createRngStreams(board.seed));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = apply(board, result.packet);
    expect(next.conflicts[war.id]!.status).toBe("settled");
    // The board carries the wars the transition found as well as this one, so
    // the claim is about this front: it leaves the active roster, and the tick
    // bills exactly the fronts that are left.
    const activeAfter = selectActiveConflicts(next).map((conflict) => conflict.id);
    expect(activeAfter).not.toContain(war.id);
    expect(activeAfter).toHaveLength(selectActiveConflicts(board).length - 1);
    expect(conflictPhase(next)).toHaveLength(activeAfter.length);
  });

  it("leaves the war running when the answer refuses the terms", () => {
    const board = atWarBoard();
    const cast = castScenario(board, peaceTerms)!;
    const war = selectActiveConflicts(board).find(
      (conflict) => conflict.aggressor === board.founding.nation || conflict.defender === board.founding.nation,
    )!;
    const fightOn = cast.script.options.find((option) => option.id === "fight-on-for-better-lines")!;
    const result = commitReply(board, cast.script, fightOn, createRngStreams(board.seed));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const active = selectActiveConflicts(apply(board, result.packet)).map((conflict) => conflict.id);
    expect(active).toContain(war.id);
    expect(active).toHaveLength(selectActiveConflicts(board).length);
  });
});

// The defect this block exists for: a front-week scenario cast "tensest" and
// gated on warState passes the gate because of one war and binds the
// counterpart of another. The two picks below read the conflicts instead, and
// the boards here are built so that the tension table and the war disagree.
describe("war casting binds the nation actually being fought", () => {
  const base = sealedCampaign();
  const player = base.founding.nation;
  const byTension = [...selectRelationshipsFrom(base, player)]
    .filter((edge) => edge.to !== player)
    .sort((a, b) => b.tension - a.tension || String(a.to).localeCompare(String(b.to)));
  const tensest = byTension[0]!.to;
  const calmest = byTension[byTension.length - 1]!.to;
  const bystander = byTension[1]!.to;

  const fighting = (
    campaign: Campaign,
    aggressor: NationId,
    defender: NationId,
    intensity = 0.5,
  ): Campaign => {
    const conflict = { ...openConflict(aggressor, defender, campaign.turn, "A border seized."), intensity };
    return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
  };

  const bindWith = (campaign: Campaign, cast: ScenarioCast): NationId | undefined =>
    bindCounterpart(campaign, { ...FIXTURE_SCENARIOS[0]!, cast });

  it("binds the belligerent, not the tensest nation, when the two disagree", () => {
    const board = fighting(base, calmest, player);
    expect(calmest).not.toBe(tensest);
    expect(bindWith(board, { pick: "warCounterpart" })).toBe(calmest);
    expect(bindWith(board, { pick: "tensest" })).toBe(tensest);
  });

  it("binds nothing when the player is in no war at all", () => {
    expect(bindWith(base, { pick: "warCounterpart" })).toBeUndefined();
    // A war between two other nations is not the player's war either.
    expect(bindWith(fighting(base, tensest, bystander), { pick: "warCounterpart" })).toBeUndefined();
  });

  it("takes the hottest front when the player is fighting on two", () => {
    const board = fighting(fighting(base, tensest, player, 0.3), player, calmest, 0.8);
    expect(bindWith(board, { pick: "warCounterpart" })).toBe(calmest);
  });

  it("binds a principal of somebody else's war, ignoring the player's own", () => {
    const elsewhere = fighting(base, bystander, calmest);
    expect(bindWith(elsewhere, { pick: "belligerent", side: "aggressor" })).toBe(bystander);
    expect(bindWith(elsewhere, { pick: "belligerent", side: "defender" })).toBe(calmest);
    // Unsided, the player's own reading decides which half of it they are
    // being asked about.
    expect(bindWith(elsewhere, { pick: "belligerent" })).toBe(
      byTension.findIndex((edge) => edge.to === bystander) < byTension.findIndex((edge) => edge.to === calmest)
        ? bystander
        : calmest,
    );
    expect(bindWith(fighting(base, tensest, player), { pick: "belligerent" })).toBeUndefined();
  });

  it("binds the government the President joined a war against, and leaves that war out of somebody else's", () => {
    const joined = fighting(base, calmest, bystander);
    const war = Object.values(joined.conflicts).find((conflict) => conflict.aggressor === calmest)!;
    const beside: Campaign = {
      ...joined,
      conflicts: { ...joined.conflicts, [war.id]: { ...war, joined: { aggressor: [], defender: [player] } } },
    };
    expect(bindWith(beside, { pick: "warCounterpart" })).toBe(calmest);
    expect(bindWith(beside, { pick: "belligerent" })).toBeUndefined();
  });

  it("has a preview board each war cast can bind on, so the gate is not casting into the dark", () => {
    const boards = previewBoards();
    expect(boards.some((board) => bindWith(board, { pick: "warCounterpart" }) !== undefined)).toBe(true);
    expect(boards.some((board) => bindWith(board, { pick: "belligerent" }) !== undefined)).toBe(true);
  });
});

describe("board states content could not previously see", () => {
  const base = sealedCampaign();
  const player = base.founding.nation;
  const other = "ALP" as NationId;
  const gate = (conditions: ScenarioDef["conditions"]): ScenarioDef =>
    ({ ...FIXTURE_SCENARIOS[0]!, id: "breadth-probe", once: false, conditions }) as ScenarioDef;

  it("reads the coalition flag against whichever nation the condition names", () => {
    const againstThem = gate([{ kind: "coalition", against: "counterpart", present: true }]);
    const againstUs = gate([{ kind: "coalition", against: "player", present: true }]);
    expect(scenarioLive(base, againstThem, other)).toBe(false);
    expect(scenarioLive(withFlags(base, { [coalitionFlag(other)]: true }), againstThem, other)).toBe(true);
    // The same flag on the other subject answers the other question and not
    // this one — which is the whole reason a literal flag condition could not
    // do this job.
    expect(scenarioLive(withFlags(base, { [coalitionFlag(other)]: true }), againstUs, other)).toBe(false);
    expect(scenarioLive(withFlags(base, { [coalitionFlag(player)]: true }), againstUs, other)).toBe(true);
  });

  it("finds the compacts two governments both signed, and calls a country no partner of itself", () => {
    const shared = gate([{ kind: "sharedMembership", present: true }]);
    const boards = previewBoards();
    const live = boards.filter((board) => {
      const counterpart = bindCounterpart(board, { ...shared, cast: { pick: "closest" } });
      return counterpart !== undefined && scenarioLive(board, { ...shared, cast: { pick: "closest" } }, counterpart);
    });
    expect(live.length).toBeGreaterThanOrEqual(1);
    // A domestic scenario's counterpart is the player's own nation, and a
    // country shares every compact it holds with itself.
    for (const board of boards) expect(scenarioLive(board, shared, board.founding.nation)).toBe(false);
  });

  it("reads the program this administration actually legislated", () => {
    const inherited = gate([{ kind: "policyStance", domain: "defense", stance: "defense-continuity", active: true }]);
    const rearming = gate([{ kind: "policyStance", domain: "defense", stance: "defense-rearmament", active: true }]);
    expect(scenarioLive(base, inherited, other)).toBe(true);
    expect(scenarioLive(base, rearming, other)).toBe(false);
    expect(previewBoards().some((board) => scenarioLive(board, rearming, other))).toBe(true);
  });

  it("reads the pressure the country carries from people the state does not command", () => {
    const insurgent = gate([{ kind: "operatorPressure", field: "insurgency", atLeast: 0.4 }]);
    const quiet = gate([{ kind: "operatorPressure", field: "protest", atMost: 0.35 }]);
    expect(scenarioLive(base, insurgent, other)).toBe(false);
    expect(scenarioLive(underStrain(base), insurgent, other)).toBe(true);
    expect(scenarioLive(base, quiet, other)).toBe(true);
    expect(scenarioLive(underStrain(base), quiet, other)).toBe(false);
  });

  it("reads the world's file on the player, and refuses to read one that does not exist yet", () => {
    const pays = gate([{ kind: "revealedPreference", trait: "concedesUnderPressure", atLeast: 0.6 }]);
    // A bound a fresh campaign's reported midpoint satisfies arithmetically.
    // It must still be false, or every campaign opens on scenarios about a
    // pattern the player has not had a chance to establish.
    const anything = gate([{ kind: "revealedPreference", trait: "concedesUnderPressure", atMost: 1 }]);
    expect(scenarioLive(base, pays, other)).toBe(false);
    expect(scenarioLive(base, anything, other)).toBe(false);

    const read = previewBoards().find((board) => scenarioLive(board, pays, other));
    expect(read).toBeDefined();

    // One answer short of the floor is one short of a pattern, however
    // one-sided the answers that remain are.
    const underPressure = (campaign: Campaign) =>
      readPlayerCommitments(campaign).filter((commitment) => commitment.instrument === "diplomatic");
    expect(underPressure(read!)).toHaveLength(REVEALED_PREFERENCE_EVIDENCE_FLOOR);
    const thinner: Campaign = {
      ...read!,
      ledger: read!.ledger.filter(
        (entry, index) => entry.commitment?.instrument !== "diplomatic" || index !== read!.ledger.findIndex((e) => e.commitment?.instrument === "diplomatic"),
      ),
    };
    expect(underPressure(thinner)).toHaveLength(REVEALED_PREFERENCE_EVIDENCE_FLOOR - 1);
    expect(scenarioLive(thinner, pays, other)).toBe(false);
  });

  it("gives every trait a board at both poles, so neither bound ships dead content", () => {
    const boards = previewBoards();
    const reachable = (trait: "concedesUnderPressure" | "escalatesWhenTested" | "honorsFriends", bound: object) =>
      boards.some((board) => scenarioLive(board, gate([{ kind: "revealedPreference", trait, ...bound }]), other));
    for (const trait of ["concedesUnderPressure", "escalatesWhenTested", "honorsFriends"] as const) {
      expect(reachable(trait, { atLeast: 0.6 }), `${trait} high`).toBe(true);
      expect(reachable(trait, { atMost: 0.2 }), `${trait} low`).toBe(true);
    }
  });

  it("counts a friendship test separately from a test under pressure", () => {
    const pays = gate([{ kind: "revealedPreference", trait: "concedesUnderPressure", atLeast: 0.6 }]);
    const read = previewBoards().find((board) => scenarioLive(board, pays, other));
    expect(read).toBeDefined();
    // Strip the record with its friends and leave the record under pressure
    // whole. The friendship traits must go dark and the pressure ones must not
    // — a trait borrowing another's evidence would keep both alive.
    const nothingAboutFriends: Campaign = {
      ...read!,
      ledger: read!.ledger.filter((entry) => entry.commitment?.instrument !== "assistance"),
    };
    for (const bound of [{ atLeast: 0 }, { atMost: 1 }]) {
      expect(scenarioLive(nothingAboutFriends, gate([{ kind: "revealedPreference", trait: "honorsFriends", ...bound }]), other)).toBe(false);
    }
    expect(scenarioLive(nothingAboutFriends, pays, other)).toBe(true);
  });

  it("reads the shape of the player's own country", () => {
    const coastal = gate([{ kind: "geography", field: "coastal", is: true }]);
    const landlocked = gate([{ kind: "geography", field: "landlocked", is: true }]);
    expect(scenarioLive(base, coastal, other)).toBe(true);
    expect(scenarioLive(base, landlocked, other)).toBe(false);
    const boards = previewBoards();
    expect(boards.some((board) => scenarioLive(board, coastal, other))).toBe(true);
    // With the United States the only playable nation, no board is landlocked
    // — a landlocked-player gate is now dead content the reachability audit
    // is expected to catch, not a fixture gap.
    expect(boards.some((board) => scenarioLive(board, landlocked, other))).toBe(false);
  });

  it("reads a state's grievance marks — locus or any, filtered by signature", () => {
    const withMarks = (state: "CA" | "IA", weight: number, signature = "water-scare:fresno"): Campaign => {
      const runtime = base.states[state]!;
      return {
        ...base,
        states: {
          ...base.states,
          [state]: {
            ...runtime,
            marks: [
              {
                turn: 1,
                signature,
                weight,
                valence: -1,
                decayRate: 0.06,
                reason: "test",
              },
            ],
          },
        },
      };
    };
    const locusGate: ScenarioDef = {
      ...gate([{ kind: "stateGrievance", scope: "locus", signature: "water-scare:fresno", atMost: -0.3 }]),
      locus: { site: "interior", ground: "home", state: "CA", descriptor: "the valley" },
    };
    expect(scenarioLive(base, locusGate, other)).toBe(false);
    expect(scenarioLive(withMarks("CA", 0.8), locusGate, other)).toBe(true);
    expect(scenarioLive(withMarks("IA", 0.8), locusGate, other)).toBe(false);

    const anyGate = gate([{ kind: "stateGrievance", scope: "any", signature: "water-scare:fresno", atMost: -0.3 }]);
    expect(scenarioLive(withMarks("IA", 0.8), anyGate, other)).toBe(true);
    expect(scenarioLive(withMarks("CA", 0.8, "other-slug"), anyGate, other)).toBe(false);

    const missingLocus = gate([{ kind: "stateGrievance", scope: "locus", atLeast: 0 }]);
    expect(scenarioLive(base, missingLocus, other)).toBe(false);
  });

  it("reads a cohort's strain — filtered by cause, signed net weight", () => {
    const withStrain = (cohort: "rural" | "goods-producing", weight: number, cause = "water-scare:fresno"): Campaign => ({
      ...base,
      cohorts: {
        ...base.cohorts,
        [cohort]: [
          {
            createdTurn: 1,
            cause,
            weight,
            valence: -1,
            decayRate: 0.06,
            reason: "test",
          },
        ],
      },
    });
    const gateOn = (cause?: string): ScenarioDef =>
      gate([{ kind: "cohortStrain", cohort: "rural", cause, atMost: -0.3 }]);

    expect(scenarioLive(base, gateOn("water-scare:fresno"), other)).toBe(false);
    expect(scenarioLive(withStrain("rural", 0.8), gateOn("water-scare:fresno"), other)).toBe(true);
    expect(scenarioLive(withStrain("rural", 0.8, "other-slug"), gateOn("water-scare:fresno"), other)).toBe(false);
    expect(scenarioLive(withStrain("goods-producing", 0.8), gateOn("water-scare:fresno"), other)).toBe(false);
    expect(scenarioLive(withStrain("rural", 0.8), gateOn(), other)).toBe(true);
  });
});

describe("an arc stays about the country it opened on", () => {
  // The defect this exists to close: a scenario binds its counterpart by a rule
  // evaluated the week it is drawn, so a follow-up written as a callback
  // re-ranks months later and can arrive about a country the president never
  // dealt with. The opener pins; the beat reads the pin.
  const opener = (): ScenarioDef =>
    ScenarioDef.parse({
      ...def(FIXTURE_SCENARIOS[0]!.id),
      id: "family-opener",
      cast: { pick: "tensest", role: "head-of-government" },
      conditions: [],
      once: true,
      family: { id: "strait", role: "opener" },
    });
  const beat = (): ScenarioDef =>
    ScenarioDef.parse({
      ...def(FIXTURE_SCENARIOS[0]!.id),
      id: "family-beat",
      cast: { pick: "tensest", role: "head-of-government" },
      conditions: [],
      family: { id: "strait", role: "beat" },
    });

  it("does not deal a beat before its family has opened", () => {
    const board = withLoneEdge(sealedCampaign(), "DEU", { trust: 0, tension: 0.9 });
    expect(bindCounterpart(board, beat())).toBeUndefined();
    expect(eligibleScenarios(board, [beat()]).map((entry) => entry.def.id)).toEqual([]);
  });

  it("hands the beat the country the opener was answered about, not this week's ranking", () => {
    const first = withLoneEdge(sealedCampaign(), "DEU", { trust: 0, tension: 0.9 });
    const bound = bindCounterpart(first, opener());
    expect(bound).toBe("DEU");

    const cast = castBound(first, opener(), bound!);
    const answered = apply(
      first,
      rememberReply(
        first,
        {
          source: "conversation",
          actor: "player",
          turn: first.turn,
          narration: { summary: "The president answers." },
          effects: [],
        },
        cast,
        cast.def.replies[0]!.id,
      ),
    );

    // The board moves on: another country is now the tensest by a distance.
    const later = withLoneEdge({ ...answered, turn: answered.turn + 9 }, "CHN", { trust: 0, tension: 0.95 });
    expect(bindCounterpart(later, opener())).toBe("CHN");
    // And the arc still asks about the country it opened on.
    expect(bindCounterpart(later, beat())).toBe("DEU");
  });

  it("stops dealing once the family is closed", () => {
    const first = withLoneEdge(sealedCampaign(), "DEU", { trust: 0, tension: 0.9 });
    const cast = castBound(first, opener(), "DEU" as NationId);
    const opened = apply(
      first,
      rememberReply(
        first,
        { source: "conversation", actor: "player", turn: first.turn, narration: { summary: "Answered." }, effects: [] },
        cast,
        cast.def.replies[0]!.id,
      ),
    );
    const closing = ScenarioDef.parse({
      ...beat(),
      id: "family-close",
      family: { id: "strait", role: "close" },
      replies: beat().replies.map((reply, index) => ({ ...reply, resolves: index === 0 ? "held" : "lost" })),
    });
    const closeCast = castBound(opened, closing, "DEU" as NationId);
    const closed = apply(
      opened,
      rememberReply(
        opened,
        { source: "conversation", actor: "player", turn: opened.turn, narration: { summary: "Answered." }, effects: [] },
        closeCast,
        closeCast.def.replies[0]!.id,
      ),
    );
    expect(bindCounterpart(closed, beat())).toBeUndefined();
  });
});

describe("briefing fields use the same binding as dialogue", () => {
  it("binds particulars and context without mutating authored data", () => {
    const base = def("fixture-the-border-reading");
    const authored: ScenarioDef = { ...base, particulars: [{ label: "Origin", value: "{{counterpart}}" }], ...(base.context ? { context: { ...base.context, unknown: "What {{counterpart}} knows." } } : {}) };
    const cast = castScenario(campaign, authored)!;
    expect(cast.def.particulars?.[0]?.value).not.toContain("{{");
    expect(cast.def.context?.unknown ?? "").not.toContain("{{");
    expect(authored.particulars?.[0]?.value).toBe("{{counterpart}}");
  });
});
