import { withStandingFinding } from "./finding-testing.js";
import { withTariffFinding } from "./__fixtures__/tariff.js";
import { describe, it, expect } from "vitest";
import { Relationship, type NationId } from "@admin/world";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { relationshipKey, selectRelationship, type Campaign } from "./state.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { INSTRUMENT_IDS, RUNG_LEVELS } from "./instruments.js";
import { resolveAction, RISK_IDS, type ActionProjection, type ResolutionExtras, type ResolutionRequest } from "./resolution.js";
import {
  consequenceContribution,
  consequenceFlag,
  drawConsequence,
  eligibleConsequences,
  rungBand,
  type ConsequenceCard,
  type ConsequenceSituation,
} from "./consequences.js";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";

const ACTOR = nationA.id;
const TARGET = nationB.id;

const streamsFor = (seed: string) => createRngStreams(makeCampaignSeed(seed));

// The resolver needs a reading in both directions before a grudge or a
// remembered line has anywhere to land.
function board(): Campaign {
  const base = buildCampaign();
  const back = Relationship.parse({
    from: TARGET,
    to: ACTOR,
    trust: 0.2,
    alignment: 0.1,
    tension: 0.1,
    tradeDependence: 0.3,
    militaryThreat: 0.1,
    treaties: [],
    grudges: [],
    history: [],
  });
  return withStandingFinding({
    ...base,
    relationships: { ...base.relationships, [relationshipKey(TARGET as NationId, ACTOR as NationId)]: back },
  } as Campaign, TARGET as NationId);
}

const request = (
  instrument: ResolutionRequest["instrument"],
  rung: ResolutionRequest["rung"],
): ResolutionRequest => ({ actor: ACTOR, target: TARGET, instrument, rung });

function card(overrides: Partial<ConsequenceCard> = {}): ConsequenceCard {
  return {
    id: "card-1",
    instrument: "diplomatic",
    rungBands: ["low", "mid", "high"],
    valence: "success",
    weight: 1,
    beats: ["{{actor}} gets what it came for, and {{target}} counts what it cost."],
    effects: [],
    ...overrides,
  };
}

function situation(overrides: Partial<ConsequenceSituation> = {}): ConsequenceSituation {
  return {
    actor: ACTOR,
    target: TARGET,
    instrument: "diplomatic",
    rung: 3,
    valence: "success",
    ...overrides,
  };
}

// A pool wide enough that every branch of every instrument at every rung finds
// something to say — the "floor" shape the content pack will eventually ship.
function fullPool(): readonly ConsequenceCard[] {
  const cards: ConsequenceCard[] = [];
  for (const instrument of INSTRUMENT_IDS) {
    for (const band of ["low", "mid", "high"] as const) {
      for (const valence of ["success", "partial", "failure"] as const) {
        cards.push(
          card({
            id: `${instrument}-${band}-${valence}`,
            instrument,
            rungBands: [band],
            valence,
            beats: [`${valence}: {{actor}} against {{target}}.`],
          }),
        );
      }
    }
  }
  return cards;
}

describe("the consequence contract", () => {
  it("bands the ladder in three, so a card is authored against a kind of act", () => {
    expect(([1, 2] as const).map(rungBand)).toEqual(["low", "low"]);
    expect(rungBand(3)).toBe("mid");
    expect(([4, 5] as const).map(rungBand)).toEqual(["high", "high"]);
  });

  it("names every risk branch as data, so an auditor can refuse an unknown affinity", () => {
    expect(RISK_IDS.covert).toEqual(["exposure", "asset-lost", "blowback"]);
    for (const instrument of INSTRUMENT_IDS) {
      expect(RISK_IDS[instrument].length).toBeGreaterThan(0);
    }
  });

  it("refuses a card written for another instrument, band, or valence", () => {
    const campaign = board();
    const pool = [card()];
    expect(eligibleConsequences(campaign, pool, situation())).toHaveLength(1);
    expect(eligibleConsequences(campaign, pool, situation({ instrument: "military" }))).toHaveLength(0);
    expect(eligibleConsequences(campaign, pool, situation({ valence: "failure" }))).toHaveLength(0);
    expect(eligibleConsequences(campaign, [card({ rungBands: ["high"] })], situation())).toHaveLength(0);
  });

  it("refuses a risk-specific card on any branch but its own, and on a success", () => {
    const campaign = board();
    const pool = [card({ valence: "failure", riskAffinity: ["rebuffed"] })];
    expect(eligibleConsequences(campaign, pool, situation({ valence: "failure", riskId: "rebuffed" }))).toHaveLength(1);
    expect(eligibleConsequences(campaign, pool, situation({ valence: "failure", riskId: "public-humiliation" }))).toHaveLength(0);
    expect(eligibleConsequences(campaign, pool, situation({ valence: "failure" }))).toHaveLength(0);
  });

  it("spends a once-only card exactly once, off the flag it stamps", () => {
    const campaign = board();
    const pool = [card({ once: true })];
    expect(eligibleConsequences(campaign, pool, situation())).toHaveLength(1);
    const spent = apply(campaign, {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "spent" },
      effects: [{ kind: "flag", set: [consequenceFlag("card-1")] }],
    });
    expect(eligibleConsequences(spent, pool, situation())).toHaveLength(0);
  });

  it("gates on the authoring context and on the campaign's own flags", () => {
    const campaign = board();
    const gated = [card({ conditions: { scenarioClass: ["border"], tone: ["coercive"] } })];
    expect(eligibleConsequences(campaign, gated, situation())).toHaveLength(0);
    expect(
      eligibleConsequences(campaign, gated, situation({ context: { scenarioClass: "border", tone: "coercive" } })),
    ).toHaveLength(1);

    const flagged = [card({ conditions: { flagsSet: ["treaty-signed"] } })];
    expect(eligibleConsequences(campaign, flagged, situation())).toHaveLength(0);
  });

  // A reveal card is told only in a campaign where the briefing really was
  // wrong, and silence is not a claim that it was sound: an act that came out
  // of no briefing at all must not draw a card about one either way.
  it("gates a reveal on whether the briefing turned out to be false", () => {
    const campaign = board();
    const reveal = [card({ conditions: { intelFalse: true } })];
    expect(eligibleConsequences(campaign, reveal, situation({ context: { intelFalse: true } }))).toHaveLength(1);
    expect(eligibleConsequences(campaign, reveal, situation({ context: { intelFalse: false } }))).toHaveLength(0);
    expect(eligibleConsequences(campaign, reveal, situation())).toHaveLength(0);

    const held = [card({ conditions: { intelFalse: false } })];
    expect(eligibleConsequences(campaign, held, situation({ context: { intelFalse: false } }))).toHaveLength(1);
    expect(eligibleConsequences(campaign, held, situation({ context: { intelFalse: true } }))).toHaveLength(0);
    expect(eligibleConsequences(campaign, held, situation())).toHaveLength(0);
  });

  it("draws by weight and repeats the same card for the same seed", () => {
    const campaign = board();
    const pool = [card({ id: "a", weight: 1 }), card({ id: "b", weight: 3 })];
    const drawKey = () => streamsFor("draw").stream("consequence", ACTOR, TARGET, "diplomatic", 3, 1);
    const first = drawConsequence(campaign, pool, situation(), drawKey());
    const second = drawConsequence(campaign, pool, situation(), drawKey());
    expect(first?.id).toBe(second?.id);

    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 400; i++) {
      const drawn = drawConsequence(campaign, pool, situation(), streamsFor(`s${i}`).stream("consequence", i));
      counts[drawn!.id] = (counts[drawn!.id] ?? 0) + 1;
    }
    expect(counts.b!).toBeGreaterThan(counts.a!);
  });
});

// The fixture board is a modest power against a peer, so no rung is a
// foregone conclusion. Walk seeds until the branch under test actually fires
// rather than asserting an outcome the odds do not guarantee.
function firstWhere(
  resolve: (seed: string) => ReturnType<typeof resolveAction>,
): Extract<ReturnType<typeof resolveAction>, { ok: true }> {
  for (let i = 0; i < 200; i++) {
    const resolved = resolve(`seek-${i}`);
    if (resolved.ok && resolved.consequence) return resolved;
  }
  throw new Error("no seed produced a dressed outcome");
}

/** The projection without the matchup it was read off — see the golden packet below. */
function withoutContest(projection: ActionProjection): Omit<ActionProjection, "contest"> {
  const { contest: _contest, ...rest } = projection;
  return rest;
}

describe("the resolver dressed in authored aftermath", () => {
  // The load-bearing one, pinned against a literal rather than against a
  // sibling code path: this is the exact result the resolver returned before
  // authored aftermath existed, for a caller that supplies no extras. If any
  // of it moves, an existing campaign no longer replays.
  it("hands the caller the matchup the odds were read off, layer by layer", () => {
    const resolved = resolveAction(withTariffFinding(buildCampaign(), TARGET), request("economic", 2), streamsFor("golden-packet"));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const contest = resolved.projection.contest;
    expect(contest.instrument).toBe("economic");
    expect(contest.layers.map((layer) => layer.id)).toEqual(["dependence", "reserves", "market", "resolve"]);
    // The odds on the projection are the contest's own, times the difficulty of
    // the rung and whatever the player's own government does to them — never a
    // second estimate of the same thing.
    expect(resolved.projection.successChance).toBeLessThanOrEqual(contest.baseChance);
  });

  it("returns the packet it always returned for a caller that supplies nothing", () => {
    const resolved = resolveAction(withTariffFinding(buildCampaign(), TARGET), request("economic", 2), streamsFor("golden-packet"));
    // The contest is lifted out of the literal rather than pinned inside it:
    // it is the matchup the odds were read off, it is read-only, and inlining
    // five layers of evidence here would bury the packet this test exists to
    // pin. It is asserted on its own below.
    const pinned = resolved.ok ? { ...resolved, projection: withoutContest(resolved.projection) } : resolved;
    expect(pinned).toEqual({
      ok: true,
      projection: {
        request: { actor: ACTOR, target: TARGET, instrument: "economic", rung: 2 },
        rungName: "Tariff Increase",
        timing: { days: 2, label: "First operational report in about 2 days", basis: "A planning estimate for preparation, access and initial reporting. Conditions are checked again before execution; results and political reactions are not guaranteed." },
        available: true,
        cost: { treasury: -5.8500000000000005, standing: -0.0036000000000000003, stability: -0.0022500000000000003 },
        successChance: 0.34973543999999995,
        risks: [
          { id: "retaliation", chance: 0.32513228000000005, description: "Alpland answers with measures of its own." },
          {
            id: "market-blowback",
            chance: 0.32513228000000005,
            description: "Its own markets flinch first.",
          },
        ],
        ripples: [],
        rippleVisibility: "always",
        // Read-only additions to the projection; the packet below — the part a
        // replay depends on — is byte-for-byte what it always was.
        consultation: [{ roleId: "role-treasury-minister" }],
      },
      success: false,
      risk: {
        id: "market-blowback",
        chance: 0.32513228000000005,
        description: "Its own markets flinch first.",
      },
      packet: {
        source: "action",
        actor: "player",
        turn: 1,
        // The provenance the player's own action path now carries. It used to
        // carry none at all, which meant the causal trail could name a
        // drought's eleventh week and could not name the country a covert
        // operation was run against — `actor` says whose hand it was and
        // nothing here is derivable from it. Pinned like everything else in
        // this literal, because it reaches the ledger.
        provenance: {
          origin: "decision",
          confidence: "observed",
          visibility: "public",
          entities: [ACTOR, TARGET],
          systems: ["statecraft", "economic"],
          // The deed flags this act left standing, without the turn-stamps
          // beside them — a later situation gated on one of these can name the
          // week it was set, which is the whole of what a mark is for.
          marks: ["deed:economic:low:failed", `deed-toward:${TARGET}:economic:low:failed`],
        },
        narration: {
          summary: "The United States tried to raise tariffs on goods from Alpland, and its own markets flinched first.",
        },
        commitment: { instrument: "economic", rung: 2, target: TARGET, landed: false },
        effects: [
          {
            kind: "relationship",
            from: ACTOR,
            to: TARGET,
            deltas: { tension: 0.027999999999999997 },
            addHistory: {
              turn: 1,
              kind: "failed-market-blowback",
              description: "Its own markets flinched first.",
            },
          },
          // The act's own record, which the resolver now states in the closed
          // deed vocabulary instead of leaving to whichever card was drawn.
          {
            kind: "flag",
            set: [
              "deed:economic:low:failed",
              "flagset:deed:economic:low:failed:1",
              `deed-toward:${TARGET}:economic:low:failed`,
              `flagset:deed-toward:${TARGET}:economic:low:failed:1`,
            ],
          },
          { kind: "metric", deltas: { treasury: -5.8500000000000005, standing: -0.0092, stability: -0.0022500000000000003 } },
        ],
      },
    });
  });

  it("is byte-identical to the undressed resolver when no pool is supplied", () => {
    const campaign = board();
    for (const instrument of INSTRUMENT_IDS) {
      for (const rung of RUNG_LEVELS) {
        const bare = resolveAction(campaign, request(instrument, rung), streamsFor("golden"));
        const explicitlyEmpty = resolveAction(campaign, request(instrument, rung), streamsFor("golden"), "action", {});
        expect(JSON.stringify(explicitlyEmpty)).toBe(JSON.stringify(bare));
        expect(bare).not.toHaveProperty("consequence");
      }
    }
  });

  it("never adds probability mass: the branch a card dresses is one the projection listed", () => {
    const campaign = board();
    const extras: ResolutionExtras = { consequences: fullPool() };
    for (const instrument of INSTRUMENT_IDS) {
      for (const rung of RUNG_LEVELS) {
        for (const seed of ["a", "b", "c", "d", "e", "f"]) {
          const req = request(instrument, rung);
          const bare = resolveAction(campaign, req, streamsFor(seed));
          const dressed = resolveAction(campaign, req, streamsFor(seed), "action", extras);
          if (!bare.ok || !dressed.ok) continue;
          expect(dressed.projection).toEqual(bare.projection);
          expect(dressed.success).toBe(bare.success);
          expect(dressed.risk).toEqual(bare.risk);
          if (dressed.risk) {
            expect(dressed.projection.risks.map((r) => r.id)).toContain(dressed.risk.id);
          }
        }
      }
    }
  });

  it("draws on its own stream, so the resolution draw is untouched", () => {
    const campaign = board();
    const req = request("economic", 4);
    const bare = resolveAction(campaign, req, streamsFor("stream-proof"));
    const dressed = resolveAction(campaign, req, streamsFor("stream-proof"), "action", { consequences: fullPool() });
    expect(bare.ok && dressed.ok).toBe(true);
    if (!bare.ok || !dressed.ok) return;
    // Same seed, same decision, same outcome — the card only changed the telling.
    expect(dressed.success).toBe(bare.success);
    expect(dressed.packet.narration.summary).not.toBe(bare.packet.narration.summary);

    const replayed = resolveAction(campaign, req, streamsFor("stream-proof"), "action", { consequences: fullPool() });
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(dressed));
  });

  it("calls a success at the very top of its interval partial, without a second roll", () => {
    const campaign = board();
    const extras: ResolutionExtras = { consequences: fullPool() };
    const seen = new Set<string>();
    for (const rung of RUNG_LEVELS) {
      for (let i = 0; i < 60; i++) {
        const resolved = resolveAction(campaign, request("diplomatic", rung), streamsFor(`v${rung}-${i}`), "action", extras);
        if (resolved.ok && resolved.consequence) seen.add(resolved.consequence.valence);
      }
    }
    expect(seen.has("success")).toBe(true);
    expect(seen.has("partial")).toBe(true);
  });

  it("deepens the branch that fired rather than replacing it", () => {
    const campaign = board();
    const deepening = card({
      id: "deep",
      valence: "success",
      effects: [
        { kind: "metric", deltas: { standing: -0.1 }, scaleBySeverity: true },
        { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.2 } },
        { kind: "grudge", cause: "the price of it", weight: 0.3 },
        { kind: "feed", headline: "{{target}} counts the cost of {{actor}}'s move." },
      ],
      sets: ["border-hardened"],
      remembered: "{{actor}} took it anyway.",
    });
    const req = request("diplomatic", 1);
    const resolved = firstWhere((seed) =>
      resolveAction(campaign, req, streamsFor(seed), "action", { consequences: [deepening] }),
    );
    expect(resolved.consequence?.id).toBe("deep");
    expect(resolved.packet.narration.summary).toContain("United States");

    const after = apply(campaign, resolved.packet);
    expect(after.player.flags[consequenceFlag("deep")]).toBe(true);
    expect(after.player.flags["border-hardened"]).toBe(true);
    expect(after.feed.at(-1)?.headline).toBe("Alpland counts the cost of the United States' move.");
    const back = selectRelationship(after, TARGET as NationId, ACTOR as NationId)!;
    expect(back.grudges).toHaveLength(1);
    expect(back.history.some((h) => h.kind === "consequence")).toBe(true);
    // One net metric line, however many sources moved it.
    expect(resolved.packet.effects.filter((e) => e.kind === "metric")).toHaveLength(1);
    // Both durable flags are dated. Without the marker, a follow-up gated on
    // "border-hardened" for six weeks reads it as old the week it is set and
    // arrives at full weight beside the thing it follows.
    expect(after.player.flags[flagMarker(consequenceFlag("deep"), campaign.turn)]).toBe(true);
    expect(after.player.flags[flagMarker("border-hardened", campaign.turn)]).toBe(true);
  });

  it("cannot report a covert operation nobody caught as public", () => {
    const campaign = board();
    const leak = card({
      id: "leak",
      instrument: "covert",
      valence: "failure",
      riskAffinity: ["asset-lost", "blowback"],
      effects: [
        { kind: "feed", headline: "Something went wrong in {{target}}." },
        { kind: "grudge", cause: "the operation", weight: 0.5 },
      ],
      remembered: "{{target}} names {{actor}}.",
    });
    const extras: ResolutionExtras = { consequences: [leak] };
    let fired = 0;
    for (let i = 0; i < 120; i++) {
      const resolved = resolveAction(campaign, request("covert", 3), streamsFor(`leak-${i}`), "action", extras);
      if (!resolved.ok || resolved.consequence?.id !== "leak") continue;
      fired++;
      const after = apply(campaign, resolved.packet);
      // The invisible branches fired, so the world may not name the actor.
      expect(after.feed.at(-1)?.visibility).toBe("intelligence");
      expect(selectRelationship(after, TARGET as NationId, ACTOR as NationId)!.grudges).toHaveLength(0);
      expect(selectRelationship(after, TARGET as NationId, ACTOR as NationId)!.history).toHaveLength(0);
    }
    expect(fired).toBeGreaterThan(0);
  });
});


describe("every act reaches the feed", () => {
  const scene = { severity: 0.5, visible: true, parties: { actor: "United States", target: "Alpland" } };

  it("writes a dispatch for a card that carried no feed recipe", () => {
    const contribution = consequenceContribution(
      board(),
      card({ beats: ["The ambassador is home by Thursday. By the weekend a channel opens through a third capital."] }),
      situation({ instrument: "diplomatic", rung: 3, valence: "success" }),
      scene,
    );
    const feed = contribution.effects.filter((effect) => effect.kind === "feed");
    expect(feed).toHaveLength(1);
    const item = feed[0]!.kind === "feed" ? feed[0]!.items[0]! : undefined;
    expect(item?.headline).toContain("The United States called its ambassador home from Alpland");
    expect(item?.headline).not.toMatch(/ attempts |Recall Ambassador/);
    // The card's own first sentence is the particular the piece opens on.
    expect(item?.facts?.stake).toBe("The ambassador is home by Thursday.");
    expect(item?.actor).toBe(ACTOR);
    expect(item?.target).toBe(TARGET);
  });

  it("leaves an authored feed line alone rather than printing the week twice", () => {
    const contribution = consequenceContribution(
      board(),
      card({ effects: [{ kind: "feed", headline: "{{target}} names the officer in public." }] }),
      situation(),
      scene,
    );
    const feed = contribution.effects.filter((effect) => effect.kind === "feed");
    expect(feed).toHaveLength(1);
    const item = feed[0]!.kind === "feed" ? feed[0]!.items[0]! : undefined;
    expect(item?.headline).toBe("Alpland names the officer in public.");
  });

  it("keeps an unwitnessed outcome off the public wire", () => {
    const contribution = consequenceContribution(
      board(),
      card({ instrument: "covert" }),
      situation({ instrument: "covert", rung: 2 }),
      { ...scene, visible: false },
    );
    const feed = contribution.effects.find((effect) => effect.kind === "feed");
    expect(feed?.kind === "feed" ? feed.items[0]!.visibility : undefined).toBe("intelligence");
  });
});
