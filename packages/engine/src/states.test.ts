import { Charter, ELECTORAL_COLLEGE } from "@admin/world";
import { DEFAULT_ADMINISTRATION_PARTY } from "./party.js";
import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { routeDomestic, type DomesticSignature } from "./domestic-signature.js";
import { apply, type EffectPacket } from "./effects.js";
import { holdElection, projectVote } from "./elections.js";
import {
  BASE_MARK_DECAY,
  GRIEVANCE_LEAN_SCALE,
  OMISSION_DECAY,
  grievanceLean,
  type GrievanceMark,
  type PendingClaim,
} from "./state-geography.js";
import {
  electoralVotesWon,
  leanDriftDelta,
  omissionMarkWeight,
  selectUsStateVoteDriver,
  STATE_LEAN_DRIFT,
  STATE_VOTE_LEVERAGE,
  statePhase,
} from "./states.js";
import type { Campaign } from "./state.js";
import type { AdministrationStanding } from "./party.js";
import type { UsMajorParty } from "./state-legislature.js";

/** A president of one of the two majors, anchored on their own caucus. */
const standing = (party: UsMajorParty): AdministrationStanding => ({
  administrationParty: party,
  caucusAnchor: party,
});

const charter = Charter.parse({
  id: "charter-1",
  name: "The Constitution",
  removalMechanism: "impeachment",
  cabinetRoles: ["role-chancellor"],
  institutions: [{ name: "Congress", role: "Brings impeachment.", kind: "assembly" }],
  decisionConstraint: "Treaties require the Senate.",
  successionRule: "The Vice President serves out the term.",
  roleTitles: { "role-chancellor": "President" },
});

function lockLeans(campaign: Campaign, lean: number): Campaign {
  const states = Object.fromEntries(
    Object.entries(campaign.states).map(([id, state]) => [id, { ...state, lean, base: { ...state.base, lean } }]),
  ) as Campaign["states"];
  return { ...campaign, states };
}

describe("electoral college overlay", () => {
  it("awards every electoral vote at a 1.0 Democratic share and none at 0", () => {
    const campaign = buildCampaign();
    expect(electoralVotesWon(campaign, 1, standing("democrat"))).toBe(ELECTORAL_COLLEGE);
    expect(electoralVotesWon(campaign, 0, standing("democrat"))).toBe(0);
  });

  it("awards every electoral vote at a 1.0 Republican share and none at 0", () => {
    const campaign = buildCampaign();
    expect(electoralVotesWon(campaign, 1, standing("republican"))).toBe(ELECTORAL_COLLEGE);
    expect(electoralVotesWon(campaign, 0, standing("republican"))).toBe(0);
  });

  it("splits the college between the two tickets at an even national share", () => {
    const campaign = buildCampaign();
    const dem = electoralVotesWon(campaign, 0.5, standing("democrat"));
    const gop = electoralVotesWon(campaign, 0.5, standing("republican"));
    expect(dem + gop).toBe(ELECTORAL_COLLEGE);
    expect(dem).toBeGreaterThan(0);
    expect(gop).toBeGreaterThan(0);
  });

  it("does not call a popular-share win an electoral win when the college is locked the other way", () => {
    const red = lockLeans(buildCampaign(), 1);
    const share = projectVote(red).share;
    expect(share).toBeGreaterThan(0.5);
    expect(electoralVotesWon(red, share, standing("democrat"))).toBe(0);
    expect(holdElection(red, charter, "presidential", 209).won).toBe(false);
  });

  it("moves the vote when state lean moves, at the stated leverage", () => {
    const clean = buildCampaign();
    expect(selectUsStateVoteDriver(clean, standing("democrat"))).toBe(0);
    const shocked = lockLeans(clean, 0);
    const shockedLive: Campaign = {
      ...shocked,
      states: Object.fromEntries(
        Object.entries(shocked.states).map(([id, state]) => [id, { ...state, lean: state.lean + 0.1 }]),
      ) as Campaign["states"],
    };
    expect(selectUsStateVoteDriver(shockedLive, standing("democrat"))).toBeCloseTo(-0.1 * STATE_VOTE_LEVERAGE, 3);
    expect(projectVote(shockedLive).drivers.some((driver) => driver.reason === "how the states have moved")).toBe(true);
  });
});

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

function mark(weight: number, valence: 1 | -1 = -1): GrievanceMark {
  return {
    turn: 0,
    signature: "plant-closed",
    weight,
    valence,
    decayRate: BASE_MARK_DECAY,
    reason: "the plant closed",
  };
}

/**
 * Isolated reachability math, kept so the drift formula stays
 * pinned without a full campaign. statePhase acceptance below runs the same
 * interaction through apply().
 */
function stepTowardMarks(lean: number, founding: number, marks: readonly GrievanceMark[]): number {
  const anchor = round3(Math.max(-1, Math.min(1, founding + grievanceLean(marks, standing(DEFAULT_ADMINISTRATION_PARTY)))));
  return round3(lean + leanDriftDelta(lean, anchor));
}

function decayMarks(marks: readonly GrievanceMark[]): readonly GrievanceMark[] {
  return marks
    .map((entry) => ({ ...entry, weight: Math.max(0, entry.weight - entry.decayRate) }))
    .filter((entry) => entry.weight > 0);
}

function applyPackets(campaign: Campaign, packets: readonly EffectPacket[]): Campaign {
  return packets.reduce((acc, packet) => apply(acc, packet), campaign);
}

function heldMark(weight: number, valence: 1 | -1 = -1): GrievanceMark {
  // decayRate 0: a "held pattern" — the administration keeps pressing the same
  // states so weight does not fade under statePhase's decay pass.
  return { ...mark(weight, valence), decayRate: 0 };
}

const steelSignature = (): DomesticSignature => ({
  sectors: ["steel-heavy"],
  magnitude: "heavy",
  signature: "tariff:steel",
  reason: "A steel tariff lands where the mills are.",
});

describe("grievance anchor reachability", () => {
  it("closes a proportional fraction of any gap in one step", () => {
    expect(leanDriftDelta(0, 0.2)).toBeCloseTo(0.2 * STATE_LEAN_DRIFT, 3);
    expect(leanDriftDelta(0.1, 0.1)).toBe(0);
  });

  it("a held mark pattern pulls lean measurably into the anchor within twenty turns", () => {
    // Pattern: two full-weight marks held for twenty turns, the "term spent
    // hurting the same states" case. A capped drift of 0.003 would close at
    // most 0.06 over that window against a 0.24 gap and never reach the anchor.
    const founding = 0;
    const held = [mark(1), mark(1)];
    const displacement = grievanceLean(held, standing(DEFAULT_ADMINISTRATION_PARTY));
    expect(Math.abs(displacement)).toBeCloseTo(2 * GRIEVANCE_LEAN_SCALE, 3);

    let lean = founding;
    for (let turn = 0; turn < 20; turn += 1) {
      lean = stepTowardMarks(lean, founding, held);
    }

    const gapToAnchor = Math.abs(founding + displacement - lean);
    const gapToFounding = Math.abs(lean - founding);
    // After twenty turns lean sits nearer the live anchor than founding: a
    // shock-alone pass does not get there.
    expect(gapToFounding).toBeGreaterThan(0.05);
    expect(gapToAnchor).toBeLessThan(gapToFounding);
    expect(gapToAnchor).toBeLessThan(Math.abs(displacement) * 0.35);
  });

  it("a single decaying mark does not leave a permanent lean shift", () => {
    const founding = 0;
    let marks: readonly GrievanceMark[] = [mark(1)];
    let lean = founding;

    for (let turn = 0; turn < 80; turn += 1) {
      lean = stepTowardMarks(lean, founding, marks);
      marks = decayMarks(marks);
    }

    expect(marks).toHaveLength(0);
    expect(Math.abs(lean - founding)).toBeLessThan(0.02);
  });
});

describe("statePhase", () => {
  it("a steel-signature act moves PA, OH, IN, MI and leaves Hawaii untouched", () => {
    const campaign = buildCampaign();
    const effects = routeDomestic(campaign, steelSignature());
    const ids = new Set(effects.map((effect) => effect.state));
    for (const id of ["PA", "OH", "IN", "MI"] as const) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ids.has("HI")).toBe(false);

    const routed = apply(campaign, {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: "steel tariff" },
      effects: [...effects],
    });
    const after = applyPackets(routed, statePhase(routed));
    // Marks hold the anchor off founding, so one decay tick does not erase the move.
    expect(Math.abs(after.states.PA!.lean - after.states.PA!.base.lean)).toBeGreaterThan(0);
  });

  it("after twenty turns with held marks, lean sits off founding toward the grievance anchor", () => {
    const opening = buildCampaign();
    const founding = opening.states.OH!.lean;
    const held = [heldMark(1), heldMark(1)];
    let campaign = apply(opening, {
      source: "action",
      actor: "player",
      turn: opening.turn,
      narration: { summary: "seed held marks" },
      effects: [{ kind: "state", state: "OH", replaceMarks: held, reason: "held pattern" }],
    });

    for (let turn = 0; turn < 20; turn += 1) {
      campaign = { ...campaign, turn: campaign.turn + 1 };
      campaign = applyPackets(campaign, statePhase(campaign));
    }

    const lean = campaign.states.OH!.lean;
    const displacement = grievanceLean(held, standing(DEFAULT_ADMINISTRATION_PARTY));
    const gapToAnchor = Math.abs(founding + displacement - lean);
    const gapToFounding = Math.abs(lean - founding);
    expect(gapToFounding).toBeGreaterThan(0.05);
    expect(gapToAnchor).toBeLessThan(gapToFounding);
  });

  it("an unanswered PendingClaim expires into an omitted: mark with federalDependence weight", () => {
    const opening = buildCampaign();
    const claim: PendingClaim = {
      signature: "flood-aid",
      openedTurn: opening.turn,
      expiresTurn: opening.turn,
      weight: 0.8,
      reason: "Flood aid was promised and never arrived.",
    };
    const seeded = apply(opening, {
      source: "action",
      actor: "player",
      turn: opening.turn,
      narration: { summary: "open claim" },
      effects: [{ kind: "state", state: "OH", addClaim: claim, reason: "promised aid" }],
    });

    const packets = statePhase(seeded);
    const ohPackets = packets.filter((packet) => packet.effects.some((effect) => effect.kind === "state" && effect.state === "OH"));
    expect(ohPackets).toHaveLength(1);

    const after = applyPackets(seeded, packets);
    const oh = after.states.OH!;
    expect(oh.claims.some((entry) => entry.signature === "flood-aid")).toBe(false);
    const omission = oh.marks.find((entry) => entry.signature === "omitted:flood-aid");
    expect(omission).toBeDefined();
    expect(omission!.valence).toBe(-1);
    expect(omission!.decayRate).toBe(OMISSION_DECAY);
    expect(omission!.weight).toBe(
      omissionMarkWeight(claim.weight, oh.base.character.federalDependence),
    );
    expect(omission!.reason).toBe(claim.reason);
  });

  it("emits at most one packet per moved state", () => {
    const opening = buildCampaign();
    const claim: PendingClaim = {
      signature: "flood-aid",
      openedTurn: 1,
      expiresTurn: opening.turn,
      weight: 0.5,
      reason: "aid never came",
    };
    const seeded = apply(opening, {
      source: "action",
      actor: "player",
      turn: opening.turn,
      narration: { summary: "seed" },
      effects: [
        { kind: "state", state: "OH", replaceMarks: [mark(1)], addClaim: claim, reason: "seed" },
        { kind: "state", state: "PA", replaceMarks: [mark(1)], reason: "seed" },
      ],
    });
    const packets = statePhase(seeded);
    const stateIds = packets.flatMap((packet) =>
      packet.effects.filter((effect) => effect.kind === "state").map((effect) => effect.state),
    );
    expect(new Set(stateIds).size).toBe(stateIds.length);
    for (const packet of packets) {
      expect(packet.effects).toHaveLength(1);
    }
  });
});
