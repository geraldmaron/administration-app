import { withTariffFinding } from "./__fixtures__/tariff.js";
import { outstandingInstrumentActs, resolveDueInstruments } from "./instrument-issued.js";
import { describe, it, expect } from "vitest";
import { Nation, Person, Relationship, worldDataset, type RoleId } from "@admin/world";
import { createRngStreams } from "./rng.js";
import { apply, type EffectPacket } from "./effects.js";
import { relationshipKey, selectActiveConflicts, selectRelationship, type Campaign } from "./state.js";
import { projectAction, RISK_IDS } from "./resolution.js";
import { openConflict, termsOfferedFlag } from "./conflicts.js";
import { conflictPhase } from "./war-tick.js";
import { joinConflict } from "./war-entry.js";
import {
  assertPlayable,
  commitReply,
  openConversation,
  projectReply,
  resolveSpeaker,
  POSITION_RELATIONSHIP_LIMIT,
  type ConversationScript,
  type ReplyOption,
} from "./conversations.js";
import { chargedQuote } from "./charged-quote.js";
import { realizePositionCost } from "./position-assessment.js";
import { buildCampaign, nationA, nationB, person, relationship } from "./__fixtures__/campaign.js";
import { selectConsequencesOf, selectDecisionLegacy, withCausalMarks } from "./causality.js";
import { flagMarker, markedFlags } from "./marked-flags.js";
import { transmittableActs } from "./legislation.js";

const CHANCELLOR = person.eligibleRoles[0]! as RoleId;
const streams = () => createRngStreams(buildCampaign().seed);

function commitReplyOrThrow(campaign: Campaign, on: ConversationScript, option: ReplyOption) {
  const result = commitReply(campaign, on, option, streams());
  if (!result.ok) throw new Error(`reply refused: ${result.missingCapability}`);
  return result;
}

// The actor needs the reserves and reach to clear an economic gate, otherwise a
// test about a reply's trade-off would be testing a refusal instead.
function capableCampaign(): Campaign {
  const base = buildCampaign();
  const actor = Nation.parse({
    ...nationA,
    stats: {
      ...nationA.stats,
      economy: { ...nationA.stats.economy, reserves: 50_000, gdp: 500_000 },
      trade: { ...nationA.stats.trade, exports: 100_000 },
    },
  });
  // The counterpart's own reading of the player, so what is said to it has
  // somewhere to be remembered.
  const held = Relationship.parse({ ...relationship, from: relationship.to, to: relationship.from });
  // The instrument reply here is a tariff, which needs a trade law behind it.
  return withTariffFinding({
    ...base,
    nations: { ...base.nations, [actor.id]: { base: actor, stats: actor.stats, traits: actor.traits } },
    relationships: { ...base.relationships, [relationshipKey(held.from, held.to)]: held },
  }, nationB.id);
}

/**
 * A board with enough of every reading on it to pay whatever the fixture
 * quotes. The projection states what will actually be charged, so a campaign
 * short of the price proves the floor rather than the quote — which is a
 * different rule, tested on its own below.
 */
function fundedCampaign(): Campaign {
  const base = capableCampaign();
  return {
    ...base,
    player: { ...base.player, metrics: { ...base.player.metrics, treasury: 50_000, standing: 0.6, stability: 0.6 } },
  };
}

const tariff: ReplyOption = {
  id: "press",
  tone: "coercive",
  text: "Then we raise the tariff and let them explain it at home.",
  commitment: { kind: "instrument", instrument: "economic", rung: 2 },
};

const concede: ReplyOption = {
  id: "concede",
  tone: "conciliatory",
  text: "We will let this one pass, quietly.",
  commitment: {
    kind: "position",
    cost: { standing: -0.02 },
    pull: { nationalistGlobalist: 0.1 },
    remembered: "United States let the border incident pass without answer.",
  },
};

const FORCE: ReplyOption = {
  id: "force",
  tone: "coercive",
  text: "Then we answer with the army.",
  commitment: { kind: "instrument", instrument: "military", rung: 5 },
};

function script(overrides: Partial<ConversationScript> = {}): ConversationScript {
  return {
    id: "border-incident",
    counterpart: nationB.id,
    subject: "The border incident",
    opening: [
      { speaker: { kind: "cabinet", role: CHANCELLOR }, text: "They moved a patrol across the line last night." },
      { speaker: { kind: "counterpart" }, text: "A navigation error. Nothing more." },
    ],
    options: [tariff, concede],
    ...overrides,
  };
}

describe("the trade-off gate", () => {
  it("transmits an eligible bill through the reply and refuses a duplicate without enacting it", () => {
    const campaign = buildCampaign();
    const act = transmittableActs(campaign)[0]!;
    const option: ReplyOption = { ...concede, id: "send-bill", commitment: {
      kind: "position", cost: {}, remembered: "The President sent the bill to Congress.", transmit: act.id,
    } };
    const on = script({ options: [tariff, option] });
    expect(() => assertPlayable(on)).not.toThrow();
    const projected = projectReply(campaign, on, option, streams());
    expect(projected.available).toBe(true);
    const committed = commitReplyOrThrow(campaign, on, option);
    expect(committed.packet.effects.some((effect) => effect.kind === "bill")).toBe(true);
    expect(committed.packet.effects.some((effect) => effect.kind === "metric" && effect.deltas.treasury !== undefined)).toBe(false);
    const sent = apply(campaign, committed.packet);
    expect(projectReply(sent, on, option, streams()).available).toBe(false);
    expect(commitReply(sent, on, option, streams()).ok).toBe(false);
  });

  it("rejects a reply that costs nothing", () => {
    const costless: ReplyOption = {
      ...concede,
      id: "free",
      commitment: { kind: "position", cost: {}, remembered: "United States said nothing at all." },
    };
    expect(() => assertPlayable(script({ options: [tariff, costless] }))).toThrow(/costs nothing/);
  });

  // Content written against the impact bands authors no metric cost at all —
  // what the decision spends is declared and resolved into effects instead.
  // Reading only `cost` refused exactly that content as a free choice.
  it("accepts a reply whose price is a resolved impact rather than an authored cost", () => {
    const declared: ReplyOption = {
      ...concede,
      id: "priced-by-impact",
      commitment: {
        kind: "position",
        cost: {},
        remembered: "The emergency appropriation was asked for and the town was moved off the flood plain.",
        resolved: [
          { kind: "metric", deltas: { treasury: -8_400 } },
          { kind: "opinion", deltas: { services: -0.04 } },
        ],
      },
    };
    expect(() => assertPlayable(script({ options: [tariff, declared] }))).not.toThrow();
  });

  it("rejects a cost written as an explicit zero, which reads as costed but is not", () => {
    const zeroed: ReplyOption = {
      ...concede,
      id: "zero",
      commitment: { kind: "position", cost: { standing: 0 }, remembered: "United States said nothing at all." },
    };
    expect(() => assertPlayable(script({ options: [tariff, zeroed] }))).toThrow(/costs nothing/);
  });

  it("rejects a thread with one reply, or with replies in a single tone", () => {
    expect(() => assertPlayable(script({ options: [tariff] }))).toThrow(/fewer than two/);
    expect(() => assertPlayable(script({ options: [tariff, { ...tariff, id: "press-again" }] }))).toThrow(/one tone/);
  });

  it("opening a thread runs the gate, so no surface can render a costless decision", () => {
    const costless: ReplyOption = {
      ...concede,
      commitment: { kind: "position", cost: {}, remembered: "United States said nothing at all." },
    };
    expect(() => openConversation(capableCampaign(), script({ options: [tariff, costless] }), streams())).toThrow(
      /costs nothing/,
    );
  });
});

describe("speaker truth", () => {
  it("resolves a cabinet beat to whoever holds the office in this campaign", () => {
    const speaker = resolveSpeaker(buildCampaign(), script(), { kind: "cabinet", role: CHANCELLOR });
    expect(speaker).toEqual({ kind: "official", role: CHANCELLOR, person: person.id, name: person.name });
  });

  it("reads an empty chair as an empty chair rather than putting words in a dead minister's mouth", () => {
    const base = buildCampaign();
    const dead: Campaign = { ...base, people: { ...base.people, [person.id]: { ...base.people[person.id]!, alive: false } } };
    expect(resolveSpeaker(dead, script(), { kind: "cabinet", role: CHANCELLOR })).toEqual({
      kind: "vacant",
      role: CHANCELLOR,
    });
  });

  it("names the counterpart nation rather than its id", () => {
    expect(resolveSpeaker(buildCampaign(), script(), { kind: "counterpart" })).toEqual({
      kind: "counterpart",
      nation: nationB.id,
      name: nationB.identity.name,
    });
  });

  it("resolves every opening beat's speaker when the thread opens", () => {
    const thread = openConversation(capableCampaign(), script(), streams());
    expect(thread.beats.map((b) => b.speaker.kind)).toEqual(["official", "counterpart"]);
    expect(thread.beats[0]!.text).toBe(script().opening[0]!.text);
  });

  // A counterpart speaking as a government rather than a person is the exact
  // defect a cabinet role never has: nobody reads "the Treasury says" and takes
  // it as a minister's own word. Seated the same way `/nation`, `/ops` and
  // `/person` already name a foreign head of government — its charter's lead
  // chair, held by the highest-competence living national eligible for it.
  describe("a counterpart speaks as the person who holds the office, not the country", () => {
    const charter = worldDataset.charters.find((c) => c.id === "charter-parliamentary-republic")!;
    const lead = charter.cabinetRoles[0] as RoleId;

    function withPrimeMinister(alive: boolean, overrides: Partial<{ id: string; name: string; competence: number }> = {}): Campaign {
      const base = buildCampaign();
      const primeMinister = Person.parse({
        ...person,
        id: overrides.id ?? "PER-2",
        name: overrides.name ?? "Elsa Voss",
        nationality: nationB.id,
        eligibleRoles: [lead],
        competence: overrides.competence ?? person.competence,
      });
      return {
        ...base,
        nations: {
          ...base.nations,
          [nationB.id]: { ...base.nations[nationB.id]!, base: { ...nationB, identity: { ...nationB.identity, government: charter.id } } },
        },
        people: { ...base.people, [primeMinister.id]: { base: primeMinister, alive } },
      };
    }

    it("names the seated national rather than the nation, once the charter and pool support one", () => {
      const campaign = withPrimeMinister(true);
      expect(resolveSpeaker(campaign, script(), { kind: "counterpart" })).toEqual({
        kind: "counterpart",
        nation: nationB.id,
        name: "Elsa Voss",
        person: "PER-2",
      });
    });

    it("still falls back to the nation's own name when nobody eligible is left alive", () => {
      const campaign = withPrimeMinister(false);
      expect(resolveSpeaker(campaign, script(), { kind: "counterpart" })).toEqual({
        kind: "counterpart",
        nation: nationB.id,
        name: nationB.identity.name,
      });
    });

    it("hands the seat to a successor the instant the incumbent dies, and to nobody else while they are alive", () => {
      const withTwo = (incumbentAlive: boolean): Campaign => {
        const base = withPrimeMinister(incumbentAlive, { id: "PER-2", name: "Elsa Voss", competence: 0.7 });
        const understudy = Person.parse({
          ...person,
          id: "PER-3",
          name: "Mattis Rohde",
          nationality: nationB.id,
          eligibleRoles: [lead],
          competence: 0.4,
        });
        return { ...base, people: { ...base.people, [understudy.id]: { base: understudy, alive: true } } };
      };
      expect(resolveSpeaker(withTwo(true), script(), { kind: "counterpart" })).toMatchObject({ person: "PER-2" });
      expect(resolveSpeaker(withTwo(false), script(), { kind: "counterpart" })).toMatchObject({ person: "PER-3" });
    });
  });
});

describe("a reply's trade-off, before choosing", () => {
  it("shows the resolver's own figures for an instrument reply, not a second estimate", () => {
    const campaign = capableCampaign();
    const projected = projectReply(campaign, script(), tariff, streams());
    const direct = projectAction(
      campaign,
      { actor: campaign.founding.nation, target: nationB.id, instrument: "economic", rung: 2 },
      streams(),
    );
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    expect(projected.cost).toEqual(direct.projection.cost);
    expect(projected.successChance).toBe(direct.projection.successChance);
    expect(projected.risks).toEqual(direct.projection.risks);
  });

  it("carries a declared cost and no roll for a position reply", () => {
    const campaign = capableCampaign();
    const projected = projectReply(campaign, script(), concede, streams());
    expect(projected.available).toBe(true);
    expect(projected.cost).toEqual(realizePositionCost(campaign, { standing: -0.02 }));
    expect(projected.successChance).toBeUndefined();
  });

  // The defect this guards: if projectReply's position branch returns
  // `commitment.cost` alone, a reply priced entirely through the impact model,
  // with nothing typed into `cost`, quotes a free choice while commitReply goes
  // on to charge the resolved treasury effect anyway.
  it("quotes a resolved impact's metric movement, not only the authored cost", () => {
    const priced: ReplyOption = {
      ...concede,
      id: "priced-by-impact",
      commitment: {
        kind: "position",
        cost: {},
        remembered: "The emergency appropriation was authorized.",
        resolved: [
          { kind: "metric", deltas: { treasury: -8_400 } },
          { kind: "opinion", deltas: { services: -0.04 } },
        ],
      },
    };
    const projected = projectReply(fundedCampaign(), script(), priced, streams());
    // Only the resolved effect that moves a metric is quoted; the opinion
    // effect is not a metric-cost field and stays revealed in the record.
    expect(projected.cost).toEqual({ treasury: -8_400 });
  });

  it("sums an authored cost and a resolved metric effect on different fields, rather than dropping either", () => {
    const priced: ReplyOption = {
      ...concede,
      id: "priced-both-ways",
      commitment: {
        kind: "position",
        cost: { standing: -0.02 },
        remembered: "The emergency appropriation was authorized.",
        resolved: [{ kind: "metric", deltas: { treasury: -8_400 } }],
      },
    };
    const campaign = fundedCampaign();
    const projected = projectReply(campaign, script(), priced, streams());
    expect(projected.cost).toEqual({ ...realizePositionCost(campaign, { standing: -0.02 }), treasury: -8_400 });
  });

  it("quotes exactly what commitReply charges, for a reply priced by resolved impact alone", () => {
    // Holding enough authority to pay the quote: the account is floored at zero
    // now, so a fixture below the price would prove the floor, not the quote.
    const base = capableCampaign();
    const campaign: Campaign = {
      ...base,
      player: { ...base.player, metrics: { ...base.player.metrics, treasury: 50_000 } },
    };
    const priced: ReplyOption = {
      ...concede,
      id: "priced-by-impact",
      commitment: {
        kind: "position",
        cost: {},
        remembered: "The emergency appropriation was authorized.",
        resolved: [{ kind: "metric", deltas: { treasury: -8_400 } }],
      },
    };
    const projected = projectReply(campaign, script(), priced, streams());
    const result = commitReply(campaign, script(), priced, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = apply(campaign, result.packet);
    expect(next.player.metrics.treasury - campaign.player.metrics.treasury).toBeCloseTo(projected.cost.treasury!);
  });

  it("marks a reply the campaign cannot afford as unavailable, naming what is missing", () => {
    // The plain fixture actor has nothing like the force the top military rung
    // needs, so the gate should refuse it by name.
    const projected = projectReply(buildCampaign(), script(), FORCE, streams());
    expect(projected.available).toBe(false);
    expect(projected.missingCapability).toBeTruthy();
  });
});

describe("committing to a reply", () => {
  it("charges a position reply, pulls alignment, and leaves the counterpart remembering it", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), concede, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const next = apply(campaign, result.packet);
    expect(next.player.metrics.standing).toBeCloseTo(campaign.player.metrics.standing - 0.02);
    expect(next.player.alignments.nationalistGlobalist).toBeGreaterThan(campaign.player.alignments.nationalistGlobalist);
    const held = selectRelationship(next, relationship.to, relationship.from)!;
    expect(held.history.at(-1)).toEqual({
      turn: campaign.turn,
      kind: "position",
      description: "United States let the border incident pass without answer.",
    });
    expect(next.ledger.at(-1)!.description).toBe("United States let the border incident pass without answer.");
  });

  it("speaks a position's rejoinder after the narrator states what was decided", () => {
    // Without one, a position resolves into the player's own sentence read back
    // to them and nothing else — the shallow path nine replies in ten take.
    const campaign = capableCampaign();
    const answered: ReplyOption = {
      ...concede,
      commitment: {
        ...(concede.commitment as Extract<ReplyOption["commitment"], { kind: "position" }>),
        rejoinder: {
          speaker: { kind: "cabinet", role: CHANCELLOR },
          text: "The crossing stayed open all week, and by Friday there were twice as many trucks on it.",
        },
      },
    };
    const result = commitReply(campaign, script(), answered, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beats.map((beat) => beat.speaker.kind)).toEqual(["player", "narrator", "official"]);
    expect(result.beats[2]!.text).toBe("The crossing stayed open all week, and by Friday there were twice as many trucks on it.");
  });

  // A spoken answer is the overwhelming majority of what a president decides,
  // and it reached the causal trail carrying no provenance at all — so the
  // record could walk back from a tariff to the week it was signed and could
  // not say which capital a whole term of positions had been spoken to.
  it("stamps a spoken position with both governments it passed between", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), concede, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const provenance = result.packet.provenance;
    expect(provenance?.origin).toBe("decision");
    expect(provenance?.confidence, "the words were said, not inferred").toBe("observed");
    expect(provenance?.visibility, "saying them in the room is the act").toBe("public");
    // Both ends, not only the capital spoken to: the exchange between two
    // governments is a thread, and a thread with one end on it is not one the
    // trail can walk back along.
    expect(provenance?.entities).toEqual([campaign.founding.nation, script().counterpart]);
    expect(provenance?.systems).toEqual(["statecraft", "conversation"]);
  });

  it("keeps a position given on classified reporting out of the public causal trail", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script({ visibility: "intelligence" }), concede, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.provenance?.visibility).toBe("intelligence");
    const signed = apply(campaign, result.packet);
    expect(signed.ledger.at(-1)?.causal?.visibility).toBe("intelligence");
  });

  // The one edge a presidential decision can actually leave. A decision creates
  // no record with a `causedBy` on it — it moves relationships, spends metrics
  // and sets flags — so the flags it sets are the only thing a situation dealt
  // months later can be gated on, and until they were stamped, nobody could
  // walk back from the situation to the signature.
  it("names the decision that set the flag this situation was gated on", () => {
    const campaign = capableCampaign();
    const opener: ReplyOption = {
      ...concede,
      id: "sign",
      commitment: {
        kind: "position",
        cost: { standing: -0.02 },
        remembered: "United States signed the crossing agreement.",
      },
    };
    const first = commitReply(campaign, script({ options: [tariff, opener] }), opener, streams());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // The content layer folds the authored flags on after the engine builds the
    // packet, so the stamp is taken again over the finished thing.
    const marked = withCausalMarks({
      ...first.packet,
      effects: [...first.packet.effects, { kind: "flag", set: markedFlags(["crossing-agreed"], campaign.turn) }],
    });
    expect(marked.provenance?.marks).toContain("crossing-agreed");
    expect(marked.provenance?.marks, "the turn-stamp beside a flag is not a fact anything gates on").not.toContain(
      flagMarker("crossing-agreed", campaign.turn),
    );

    const signed = apply(campaign, marked);
    const signature = signed.ledger.at(-1)!.causal!.eventId;

    const followUp = commitReply(
      signed,
      script({ options: [tariff, concede], gatedOn: ["crossing-agreed"] }),
      concede,
      streams(),
    );
    expect(followUp.ok).toBe(true);
    if (!followUp.ok) return;
    expect(followUp.packet.provenance?.causeIds).toContain(signature);

    const answered = apply(signed, followUp.packet);
    expect(selectConsequencesOf(answered.ledger, signature).map((entry) => entry.description)).toEqual([
      followUp.packet.narration.summary,
    ]);
    expect(selectDecisionLegacy(answered.ledger, signature).length).toBe(1);
  });

  // A first move answers to nothing, and a gate nobody ever satisfied on the
  // record is not an edge — an edge pointing at nothing is worse than no edge,
  // because the panel would read as a chain the player could not follow.
  it("names no cause for a first move, or for a gate no decision on the record set", () => {
    const campaign = capableCampaign();
    const opening = commitReplyOrThrow(campaign, script(), concede);
    expect(opening.packet.provenance?.causeIds ?? []).toEqual([]);

    const inherited = commitReplyOrThrow(campaign, script({ gatedOn: ["set-before-the-oath"] }), concede);
    expect(inherited.packet.provenance?.causeIds ?? []).toEqual([]);
  });

  // The second thing said to a capital answers the first. This is the edge that
  // makes a term of positions a thread rather than a list: an administration's
  // dealings with one government are one running argument, and the record can
  // now walk back along it.
  it("does not make a second reply answer the first just because both went to the same capital", () => {
    // This used to be the graph's widest edge, and it was withdrawn: two acts
    // passing between the same two governments is adjacency, not causation, and
    // a "why this happened" built out of it is one a player has no way to check.
    // A reply answers what its own situation was gated on, and a situation that
    // was gated on nothing answers nothing — which is what an unconditioned
    // script is.
    const campaign = capableCampaign();
    const first = apply(campaign, commitReplyOrThrow(campaign, script(), concede).packet);
    const opening = first.ledger.at(-1)!.causal!.eventId;

    const second = commitReplyOrThrow(first, script(), concede);
    expect(second.packet.provenance?.causeIds ?? []).toEqual([]);
    expect(selectConsequencesOf(apply(first, second.packet).ledger, opening).length).toBe(0);
  });

  // The half of a declared impact that charges nothing. It reached the board
  // as a caption before the choice and then vanished, so the record could not
  // say the administration had committed forces or burned a source at all.
  it("carries what the answer committed of the government's own capacity onto the ledger", () => {
    const campaign = capableCampaign();
    const committing: ReplyOption = {
      ...concede,
      commitment: {
        ...(concede.commitment as Extract<ReplyOption["commitment"], { kind: "position" }>),
        institutional: ["forces-committed", "alliance-credit-spent"],
      },
    };
    const result = commitReply(campaign, script(), committing, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.institutional).toEqual(["forces-committed", "alliance-credit-spent"]);
    expect(apply(campaign, result.packet).ledger.at(-1)!.institutional).toEqual([
      "forces-committed",
      "alliance-credit-spent",
    ]);
  });

  it("leaves an answer that committed none of it off the record entirely", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), concede, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.institutional).toBeUndefined();
    // Omitted rather than written empty: an explicit undefined does not
    // survive the JSON round trip a save is.
    expect("institutional" in apply(campaign, result.packet).ledger.at(-1)!).toBe(false);
  });

  it("leaves a position with no rejoinder exactly as it was", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), concede, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beats.map((beat) => beat.speaker.kind)).toEqual(["player", "narrator"]);
  });

  it("speaks an instrument's rejoinder between the order and the resolver's answer", () => {
    // The room reacts at the moment of commitment, blind to the roll — so its
    // line lands before any narration that already knows how the attempt went.
    const campaign = capableCampaign();
    const ordered: ReplyOption = {
      ...tariff,
      commitment: {
        ...(tariff.commitment as Extract<ReplyOption["commitment"], { kind: "instrument" }>),
        rejoinder: {
          speaker: { kind: "cabinet", role: CHANCELLOR },
          text: "Commerce can have the schedule drafted by morning; the ports will feel it before the week is out.",
        },
      },
    };
    const result = commitReply(campaign, script(), ordered, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beats.map((beat) => beat.speaker.kind)).toEqual(["player", "official", "narrator"]);
    expect(result.beats[1]!.text).toBe(
      "Commerce can have the schedule drafted by morning; the ports will feel it before the week is out.",
    );
    expect(result.beats[2]!.text).toBe(result.packet.narration.summary);
  });

  it("resolves an instrument reply through the resolver and speaks the consequence in the thread", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), tariff, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.source).toBe("conversation");
    expect(result.beats.map((beat) => beat.speaker.kind)).toEqual(["player", "narrator"]);
    expect(result.beats[0]!.text).toBe(tariff.text);
    expect(result.beats[1]!.text).toBe(result.packet.narration.summary);
  });

  it("speaks an authored aftermath as its own beats, in the register the player answered in", () => {
    const campaign = capableCampaign();
    // One card per valence, so the assertion is about the threading rather
    // than about which way this particular seed happened to fall.
    const pool = (["success", "partial", "failure"] as const).map((valence) => ({
      id: `tariff-bites-${valence}`,
      instrument: "economic" as const,
      rungBands: ["low" as const],
      valence,
      conditions: { tone: ["coercive"] },
      weight: 1,
      beats: ["{{target}}'s importers start hedging.", "{{actor}} reads the wire and says nothing."],
      effects: [],
    }));
    const bare = commitReply(campaign, script(), tariff, streams());
    const dressed = commitReply(campaign, script(), tariff, streams(), { consequences: pool });
    expect(bare.ok && dressed.ok).toBe(true);
    if (!bare.ok || !dressed.ok) return;
    // The reply's own tone is what let the card through; nothing else changed.
    expect(dressed.beats.map((beat) => beat.speaker.kind)).toEqual(["player", "narrator"]);
    expect(dressed.beats[1]!.text).not.toContain("importers start hedging");
    const pending = apply(campaign, dressed.packet);
    const act = outstandingInstrumentActs(pending)[0]!;
    const completed = resolveDueInstruments({ ...pending, calendar: act.dueDate });
    expect(completed.packets[0]!.narration.summary).toContain("Alpland's importers start hedging.");
    expect(bare.beats).toHaveLength(2);
  });

  it("states the commitment and the room's own counsel on the packet, authored aftermath or not", () => {
    // The chair the economic ladder answers to, so there is a room to record.
    const base = capableCampaign();
    const financeRole = "role-finance-minister" as RoleId;
    const minister = { ...person, id: "PER-fin" as typeof person.id, eligibleRoles: [financeRole] };
    const campaign: Campaign = {
      ...base,
      people: { ...base.people, [minister.id]: { base: minister, alive: true, currentRole: financeRole } },
      player: { ...base.player, cabinet: { ...base.player.cabinet, [financeRole]: minister.id } },
    };
    const pool = [
      {
        id: "tariff-bites",
        instrument: "economic" as const,
        rungBands: ["low" as const],
        valence: "success" as const,
        conditions: {},
        weight: 1,
        beats: ["The wire carries nothing anyone can quote."],
        effects: [],
      },
    ];
    const dressed = commitReply(campaign, script(), tariff, streams(), { consequences: pool });
    expect(dressed.ok).toBe(true);
    if (!dressed.ok) return;
    expect(dressed.packet.commitment).toBeUndefined();
    const pending = apply(campaign, dressed.packet);
    const act = outstandingInstrumentActs(pending)[0]!;
    expect(act.request).toMatchObject({ instrument: "economic", rung: 2, target: nationB.id });
    const completed = resolveDueInstruments({ ...pending, calendar: act.dueDate });
    expect(completed.packets[0]!.commitment).toMatchObject({ instrument: "economic", rung: 2, target: nationB.id, landed: expect.any(Boolean) });
    // The odds the minister was reading, kept rather than reconstructed.
    const projected = projectReply(campaign, script(), tariff, streams());
    expect(dressed.packet.counsel).toEqual({
      role: financeRole,
      person: minister.id,
      stance: expect.stringMatching(/^(for|against|wary)$/),
      successChance: projected.successChance,
      room: expect.arrayContaining([
        { role: financeRole, person: minister.id, stance: expect.stringMatching(/^(for|against|wary)$/) },
      ]),
    });
  });

  it("refuses an instrument reply the campaign cannot afford instead of resolving it anyway", () => {
    const result = commitReply(buildCampaign(), script(), FORCE, streams());
    expect(result.ok).toBe(false);
  });
});

// The defect these cover: a reply could say the war was over, and the war went
// on billing the country every week because words moved nothing but the
// player's own metrics.
describe("what a position reply reaches", () => {
  function atWar(): { campaign: Campaign; conflict: ReturnType<typeof openConflict> } {
    const base = capableCampaign();
    const conflict = openConflict(nationB.id, base.founding.nation, base.turn, "the border crossing");
    return { campaign: { ...base, conflicts: { ...base.conflicts, [conflict.id]: conflict } }, conflict };
  }

  function position(id: string, commitment: Partial<Extract<ReplyOption["commitment"], { kind: "position" }>>): ReplyOption {
    return {
      id,
      tone: "conciliatory",
      text: "We will take the terms as they are relayed to us.",
      commitment: {
        kind: "position",
        cost: { standing: -0.02 },
        remembered: "The government took the terms as relayed and ended the war on the lines as they stood.",
        ...commitment,
      },
    };
  }

  it("moves both governments' reading of each other, not only the counterpart's memory", () => {
    const campaign = capableCampaign();
    const reply = position("thaw", { relationship: { trust: 0.06, tension: -0.05 } });
    const result = commitReply(campaign, script(), reply, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = apply(campaign, result.packet);
    const ours = selectRelationship(next, campaign.founding.nation, nationB.id)!;
    const theirs = selectRelationship(next, nationB.id, campaign.founding.nation)!;
    const beforeOurs = selectRelationship(campaign, campaign.founding.nation, nationB.id)!;
    expect(ours.trust).toBeCloseTo(beforeOurs.trust + 0.06);
    expect(ours.tension).toBeCloseTo(Math.max(0, beforeOurs.tension - 0.05));
    expect(theirs.trust).toBeGreaterThan(selectRelationship(campaign, nationB.id, campaign.founding.nation)!.trust);
  });

  it("clamps a delta beyond the bound rather than letting words out-punch the ladder", () => {
    const campaign = capableCampaign();
    const before = selectRelationship(campaign, campaign.founding.nation, nationB.id)!;
    const reply = position("shout", { relationship: { trust: 5 } });
    const result = commitReply(campaign, script(), reply, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = selectRelationship(apply(campaign, result.packet), campaign.founding.nation, nationB.id)!;
    expect(after.trust).toBeCloseTo(Math.min(1, before.trust + POSITION_RELATIONSHIP_LIMIT));
  });

  it("ends the war when the terms are accepted, and the front stops billing the next turn", () => {
    const { campaign, conflict } = atWar();
    const result = commitReply(campaign, script(), position("accept", { conflictMove: "acceptTerms" }), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = apply(campaign, result.packet);
    const settled = next.conflicts[conflict.id]!;
    expect(settled.status).toBe("settled");
    expect(settled.endedTurn).toBe(campaign.turn);
    expect(settled.beats.at(-1)!.description).toBe(result.packet.narration.summary);
    expect(selectActiveConflicts(next)).toHaveLength(0);
    // The weekly war phase is what charges attrition; a settled war is no
    // longer in it, so the fiction and the ledger now say the same thing.
    expect(conflictPhase(next)).toHaveLength(0);
  });

  it("cools the front by one step when the answer de-escalates, without ending the war", () => {
    const { campaign, conflict } = atWar();
    const result = commitReply(campaign, script(), position("cool", { conflictMove: "deescalate" }), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet).conflicts[conflict.id]!;
    expect(after.status).toBe("active");
    expect(after.intensity).toBeCloseTo(conflict.intensity - 0.2);
  });

  it("leaves an offer standing for later content to read, rather than settling anything", () => {
    const { campaign, conflict } = atWar();
    const result = commitReply(campaign, script(), position("offer", { conflictMove: "offerTerms" }), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = apply(campaign, result.packet);
    expect(next.player.flags[termsOfferedFlag(conflict.id)]).toBe(true);
    expect(next.player.flags[flagMarker(termsOfferedFlag(conflict.id), campaign.turn)]).toBe(true);
    expect(next.conflicts[conflict.id]!.status).toBe("active");
  });

  it("is inert, not fatal, when the war ended before the answer was given", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), position("accept", { conflictMove: "acceptTerms" }), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => apply(campaign, result.packet)).not.toThrow();
    expect(result.packet.effects.some((effect) => effect.kind === "conflict")).toBe(false);
  });

  // Entering somebody else's war. The counterpart is a belligerent in a war the
  // player is out of; "beside" has to put the player on the counterpart's own
  // side, because the alternative — aiming a military rung at the nation being
  // defended — invades the country the answer meant to save.
  function joining(side: "beside" | "against"): ReplyOption {
    return { id: `join-${side}`, tone: "firm", text: "Our own people go and stand with them.", commitment: { kind: "join", side } };
  }

  function alliesWar(): { campaign: Campaign; conflict: ReturnType<typeof openConflict> } {
    const base = capableCampaign();
    // A war needs a third party: the fixture's nationA *is* the player, so a
    // war between the two fixture nations would be the player's own, which is
    // the one case a join must refuse.
    const invader = Nation.parse({ ...nationB, id: "INV", identity: { ...nationB.identity, name: "Invadia" } });
    // Entering a war is gated on having a force that could take the field, and
    // reach is read off the live force: lift and bases abroad are what carry it.
    const seat = base.nations[base.founding.nation]!;
    const armed = Nation.parse({
      ...seat.base,
      bands: {
        ...seat.base.bands,
        militaryMetrics: {
          forceIndex: 0.8,
          mobilizationCap: 0.7,
          sustainability: { warDuration: 0.7, industrialMobilization: 0.7 },
          downtime: 0.3,
        },
      },
      stats: {
        ...seat.stats,
        military: { ...seat.stats.military, airliftCapacity: 0.8, sealiftCapacity: 0.8, basesAbroad: 3 },
      },
    });
    const towardInvader = Relationship.parse({ ...relationship, from: base.founding.nation, to: invader.id });
    const invaderToward = Relationship.parse({ ...relationship, from: invader.id, to: base.founding.nation });
    const conflict = openConflict(invader.id, nationB.id, base.turn, "the frontier they both claim");
    return {
      campaign: {
        ...base,
        nations: {
          ...base.nations,
          [armed.id]: { base: armed, stats: armed.stats, traits: armed.traits },
          [invader.id]: { base: invader, stats: invader.stats, traits: invader.traits },
        },
        relationships: {
          ...base.relationships,
          [relationshipKey(towardInvader.from, towardInvader.to)]: towardInvader,
          [relationshipKey(invaderToward.from, invaderToward.to)]: invaderToward,
        },
        conflicts: { ...base.conflicts, [conflict.id]: conflict },
      },
      conflict,
    };
  }

  it("enters the counterpart's war on the counterpart's own side", () => {
    const { campaign, conflict } = alliesWar();
    const result = commitReply(campaign, script(), joining("beside"), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet).conflicts[conflict.id]!;
    // The counterpart is the defender, so the player joins the defense — never
    // the side attacking the nation the scenario cast.
    expect(after.joined.defender).toContain(campaign.founding.nation);
    expect(after.joined.aggressor).not.toContain(campaign.founding.nation);
  });

  // Entering somebody else's war is the loudest decision the room ever hears,
  // and it was the one commit path that kept no record of who argued which way
  // — so a Secretary who filed a warning against it had no evidence of having
  // done so, and nothing that prices a grievance had anything to read.
  it("keeps the room's argument about entering a war, and where the entry sits in the graph", () => {
    const { campaign } = alliesWar();
    const result = commitReply(campaign, script(), joining("beside"), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.counsel?.room?.length ?? 0).toBeGreaterThan(0);
    expect(result.packet.provenance?.origin).toBe("decision");
    expect(result.packet.provenance?.entities).toEqual([campaign.founding.nation, script().counterpart]);
  });

  it("speaks a join's rejoinder after the narrator states the entry", () => {
    const { campaign } = alliesWar();
    const answered: ReplyOption = {
      ...joining("beside"),
      commitment: {
        kind: "join",
        side: "beside",
        rejoinder: {
          speaker: { kind: "cabinet", role: CHANCELLOR },
          text: "The first transports lift tonight; the committee chairs are being called now, not tomorrow.",
        },
      },
    };
    const result = commitReply(campaign, script(), answered, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beats.map((beat) => beat.speaker.kind)).toEqual(["player", "narrator", "official"]);
    expect(result.beats[2]!.text).toBe(
      "The first transports lift tonight; the committee chairs are being called now, not tomorrow.",
    );
  });

  // Two doors into a war, one War Powers record: a reply that commits forces
  // owes Congress exactly what the Operations room's button does.
  it("opens the same War Powers record from a reply as a join from the Operations room", () => {
    const { campaign, conflict } = alliesWar();
    const replied = commitReply(campaign, script(), joining("beside"), streams());
    const direct = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
    expect(replied.ok && direct.ok).toBe(true);
    if (!replied.ok || !direct.ok) return;
    const record = (packet: EffectPacket) => {
      const after = apply(campaign, packet);
      return { obligations: after.security.warPowers.obligations, unauthorized: after.congress.unauthorized };
    };
    const fromReply = record(replied.packet);
    expect(fromReply.obligations).toEqual([expect.objectContaining({ target: "INV", kind: "hostilities" })]);
    expect(fromReply.unauthorized.map((action) => action.target)).toEqual(["INV"]);
    expect(fromReply).toEqual(record(direct.packet));
  });

  it("enters opposite them when the answer is against", () => {
    const { campaign, conflict } = alliesWar();
    const result = commitReply(campaign, script(), joining("against"), streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet).conflicts[conflict.id]!;
    expect(after.joined.aggressor).toContain(campaign.founding.nation);
  });

  it("refuses, rather than inventing a front, when the counterpart is fighting nobody", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), joining("beside"), streams());
    expect(result.ok).toBe(false);
    const projection = projectReply(campaign, script(), joining("beside"), streams());
    expect(projection.available).toBe(false);
  });

  it("states what entering costs before it is entered", () => {
    const { campaign } = alliesWar();
    const projection = projectReply(campaign, script(), joining("beside"), streams());
    expect(projection.available).toBe(true);
    // Defending somebody under attack buys standing and spends readiness.
    expect(projection.cost.standing).toBeGreaterThan(0);
    expect(projection.cost.militaryReadiness).toBeLessThan(0);
  });
});

describe("a staged instrument reply carries its key out", () => {
  // Every band and valence covered, with a failure entry per named risk, so
  // the assertion is about forwarding rather than about which way this seed
  // happened to fall.
  const sequences = (["low", "mid", "high"] as const).flatMap((band) => [
    { id: `economic-${band}-success`, instrument: "economic" as const, rungBands: [band], valence: "success" as const, weight: 1 },
    { id: `economic-${band}-partial`, instrument: "economic" as const, rungBands: [band], valence: "partial" as const, weight: 1 },
    ...RISK_IDS.economic.map((riskId) => ({
      id: `economic-${band}-failure-${riskId}`,
      instrument: "economic" as const,
      rungBands: [band],
      valence: "failure" as const,
      riskAffinity: [riskId],
      weight: 1,
    })),
  ]);

  it("does not reveal a staged outcome before the operation executes", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), tariff, streams(), { sequences });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.staged).toBeUndefined();
    expect(outstandingInstrumentActs(apply(campaign, result.packet))).toHaveLength(1);
  });

  it("carries no key at all when nothing was staged", () => {
    const campaign = capableCampaign();
    const result = commitReply(campaign, script(), tariff, streams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("staged" in result).toBe(false);
  });
});

// Everything the resolver computes and the meeting room used to throw away.
// `/ops` drew the war line, the arsenal, the consultation list and the rebuild
// clock off the same projection; a president ordering the identical act from
// the conversation saw a price, one worst-case sentence and three countries.
describe("the whole projection reaching the room the decision is taken in", () => {
  const strike: ReplyOption = {
    id: "strike",
    tone: "coercive",
    text: "Then we hit it tonight.",
    commitment: { kind: "instrument", instrument: "military", rung: 4 },
  };

  it("carries the matchup, the arsenal, the war ledger, the consultation list and the rebuild clock", () => {
    const campaign = capableCampaign();
    const thread = script({ options: [strike, concede] });
    const projected = projectReply(campaign, thread, strike, streams());
    const direct = projectAction(
      campaign,
      { actor: campaign.founding.nation, target: nationB.id, instrument: "military", rung: 4 },
      streams(),
    );
    expect(direct.ok).toBe(true);
    if (!direct.ok || !projected.available) return;

    expect(projected.contest).toEqual(direct.projection.contest);
    expect(projected.consultation).toEqual(direct.projection.consultation);
    expect(projected.consultation?.length ?? 0).toBeGreaterThan(0);
    expect(projected.capacity).toEqual(direct.projection.capacity);
    expect(projected.capacity).toBeDefined();
    expect(projected.deterrence).toEqual(direct.projection.deterrence);
    expect(projected.deterrence).toBeDefined();
    expect(projected.conflict).toEqual(direct.projection.conflict);
  });

  it("leaves a blocked reply with nothing to draw rather than a half-filled projection", () => {
    const blocked = projectReply(buildCampaign(), script({ options: [FORCE, concede] }), FORCE, streams());
    expect(blocked.available).toBe(false);
    expect(blocked.consultation).toBeUndefined();
    expect(blocked.capacity).toBeUndefined();
  });
});

// A position is not rolled for, so nothing here is an estimate: every entry
// names an effect the commit actually applies.
describe("what a spoken answer exposes", () => {
  it("states an exposure where an instrument would state a failure branch, and still quotes no odds", () => {
    const projected = projectReply(capableCampaign(), script(), concede, streams());
    expect(projected.successChance).toBeUndefined();
    expect(projected.risks).toEqual([]);
    const ids = (projected.exposure ?? []).map((entry) => entry.id);
    expect(ids).toContain("counterpart-remembers");
    expect(ids).toContain("alignment-staked");
  });

  it("names the rebuild clock on an answer that spends the force", () => {
    const commits: ReplyOption = {
      ...concede,
      id: "surge",
      commitment: { kind: "position", cost: { militaryReadiness: -0.06 }, remembered: "The units were moved." },
    };
    const projected = projectReply(capableCampaign(), script({ options: [tariff, commits] }), commits, streams());
    const clock = (projected.exposure ?? []).find((entry) => entry.id === "force-short");
    expect(clock?.description).toMatch(/3 weeks/);
  });

  it("says the answer rests on an unconfirmed claim, ahead of anything else it exposes", () => {
    const doubted = script({ briefingDoubted: true });
    const projected = projectReply(capableCampaign(), doubted, concede, streams());
    expect(projected.exposure?.[0]?.id).toBe("briefing-unconfirmed");
  });

  it("carries no exposure on a week where the answer is entirely at home and moves nothing but the panel", () => {
    const campaign = capableCampaign();
    const athome = script({ counterpart: campaign.founding.nation });
    const plain: ReplyOption = {
      ...concede,
      id: "say-so",
      commitment: { kind: "position", cost: { stability: -0.03 }, remembered: "The administration said so." },
    };
    const projected = projectReply(campaign, { ...athome, options: [tariff, plain] }, plain, streams());
    expect(projected.exposure).toBeUndefined();
  });
});

// What the card quotes and what the ledger records for the same act.
describe("the price against the board it will be charged to", () => {
  const heavy: ReplyOption = {
    ...concede,
    id: "spend-standing",
    commitment: { kind: "position", cost: { standing: -0.05 }, remembered: "The administration spent what it had left." },
  };

  function drained(standing: number): Campaign {
    const base = capableCampaign();
    return { ...base, player: { ...base.player, metrics: { ...base.player.metrics, standing } } };
  }

  it("quotes the remaining balance rather than the authored magnitude, and says there is none left", () => {
    const campaign = drained(0.02);
    const projected = projectReply(campaign, script({ options: [tariff, heavy] }), heavy, streams());
    expect(projected.cost.standing).toBeCloseTo(-0.02, 10);
    expect(projected.exhausted).toEqual(["standing"]);
  });

  it("agrees with the ledger's realized cost for the same act", () => {
    const campaign = drained(0.02);
    const thread = script({ options: [tariff, heavy] });
    const projected = projectReply(campaign, thread, heavy, streams());
    const committed = commitReply(campaign, thread, heavy, streams());
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    const entry = apply(campaign, committed.packet).ledger.at(-1)!;
    expect(entry.cost?.standing).toBeCloseTo(projected.cost.standing ?? 0, 10);
  });

  it("leaves an affordable price exactly as the board realizes it, never re-derived through the clamp", () => {
    const campaign = drained(0.6);
    const projected = projectReply(campaign, script({ options: [tariff, heavy] }), heavy, streams());
    expect(projected.cost).toEqual(realizePositionCost(campaign, { standing: -0.05 }));
    expect(projected.cost.standing).toBeLessThanOrEqual(-0.05);
    expect(projected.exhausted).toBeUndefined();
  });

  it("splits the price into what is spent and what is assessed, and freezes the assessment on the ledger", () => {
    const campaign = drained(0.6);
    const thread = script({ options: [tariff, heavy] });
    const projected = projectReply(campaign, thread, heavy, streams());
    expect(projected.assessment).toBeDefined();
    expect(projected.assessment?.spent).toEqual({});
    expect(projected.assessment?.assessed.map((impact) => impact.domain)).toEqual(["standing"]);
    expect(projected.assessment?.assessed[0]?.confidence).toBe("estimated");
    const committed = commitReply(campaign, thread, heavy, streams());
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    const entry = apply(campaign, committed.packet).ledger.at(-1)!;
    expect(entry.assessment).toEqual(projected.assessment);
  });

  // Exported so a surface outside a conversation — the instrument ladder on
  // /ops and the country file — can quote against the same board through the
  // one function apply() is itself clamped by, rather than growing a second
  // copy of this math the moment a second surface needed it.
  it("is exported directly, for a surface that has no conversation to project through", () => {
    const campaign = drained(0.02);
    const quote = chargedQuote({ standing: -0.05 }, campaign);
    expect(quote.cost.standing).toBeCloseTo(-0.02, 10);
    expect(quote.exhausted).toEqual(["standing"]);
  });
});

// The room, kept. A cabinet that split three-to-one used to leave a record
// naming one minister, so a Secretary who filed a warning against the
// president's course had no evidence of having done so.
describe("the counsel the record keeps", () => {
  const HAWK_ROLE = "role-defense-minister" as RoleId;
  const DOVE_ROLE = "role-foreign-minister" as RoleId;

  function splitRoom(): Campaign {
    const base = capableCampaign();
    const seat = (campaign: Campaign, role: RoleId, traits: readonly string[], auth: number): Campaign => {
      const holder = {
        ...person,
        id: `PER-${role}` as typeof person.id,
        eligibleRoles: [role],
        traits: traits as typeof person.traits,
        ideology: { economicLeftRight: 0, authLibertarian: auth, nationalistGlobalist: 0 },
      };
      return {
        ...campaign,
        people: { ...campaign.people, [holder.id]: { base: holder, alive: true, currentRole: role } },
        player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: holder.id } },
      };
    };
    return seat(seat(base, HAWK_ROLE, ["hawkish"], 0.6), DOVE_ROLE, ["dovish"], -0.4);
  }

  it("stamps every seat that spoke, not only the chair the decision routed to", () => {
    const campaign = splitRoom();
    const thread = script({ scenarioClass: "foreign-crisis" });
    const committed = commitReply(campaign, thread, concede, streams());
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    const room = committed.packet.counsel?.room ?? [];
    expect(room.length).toBeGreaterThan(1);
    expect(new Set(room.map((voice) => voice.stance)).size).toBeGreaterThan(1);
    // The primary is still the chair the subject routed to, and it is the first
    // voice in the room rather than a second copy that could disagree with it.
    expect(room[0]?.role).toBe(committed.packet.counsel?.role);
    expect(room[0]?.stance).toBe(committed.packet.counsel?.stance);
  });

  it("survives the round trip a save is, so a term's worth of overrulings is still there on reload", () => {
    const campaign = splitRoom();
    const committed = commitReply(campaign, script({ scenarioClass: "foreign-crisis" }), concede, streams());
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    const entry = apply(campaign, committed.packet).ledger.at(-1)!;
    expect(JSON.parse(JSON.stringify(entry)).counsel.room).toEqual(entry.counsel?.room);
  });
});
