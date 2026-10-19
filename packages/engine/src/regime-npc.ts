import type { NationId } from "@admin/world";
import { coercionClaims, regimeClaim } from "./coercion-tempo.js";
import type { EffectPacket } from "./effect-types.js";
import { firstTempoRefusal, tempoEffect } from "./npc-tempo.js";
import { nuclearArmed, operationsWeek } from "./regime-acts.js";
import type { TurnPhase } from "./turn-loop.js";
import { resolveAction, type ResolutionRequest } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { selectRelationship, type Campaign } from "./state.js";
import type { RegimeAct } from "./state-world.js";

// Other governments' operations against each other's hold on power.
//
// The agent that chooses other governments' weekly acts never reaches for the
// covert regime rung on its own (a 12-seed passive term saw none), so the
// world's rate is drawn here instead: one draw a week for whether any capital
// starts an operation, then the most hostile reachable pair among the capitals
// with the service to run one. The act goes through the same resolver and the
// same tempo ledger as every other act, so its gates, its odds and the term's
// cap of six hold it, and US treaty partners are as targetable as anyone.

/**
 * The weekly chance that some capital starts an operation. 0.017 a week is
 * about three and a half a term before the cap, inside the owner's band of one
 * to six; a term sees none about one time in thirty. A design value.
 */
export const NPC_REGIME_WEEKLY_CHANCE = 0.017;

/** How cold a relationship has to be before a capital works against the government across it. */
const HOSTILITY_FLOOR = 0.55;

function hostility(campaign: Campaign, from: NationId, to: NationId): number {
  const edge = selectRelationship(campaign, from, to);
  if (!edge) return 0;
  return (1 - edge.trust) * 0.5 + edge.tension * 0.5;
}

/** A capital with the service to run an operation against a head of government. */
function canRun(campaign: Campaign, nation: NationId): boolean {
  const security = campaign.nations[nation]?.stats.security;
  return security !== undefined && security.intelCapability >= 0.65 && security.counterIntel >= 0.4;
}

/** Every hostile pair a capable capital could work against, coldest first. */
function candidatePairs(campaign: Campaign): readonly { readonly sponsor: NationId; readonly target: NationId; readonly heat: number }[] {
  const player = campaign.founding.nation;
  const nations = Object.keys(campaign.nations) as NationId[];
  const pairs = nations
    .filter((sponsor) => sponsor !== player && canRun(campaign, sponsor))
    .flatMap((sponsor) =>
      nations
        .filter((target) => target !== sponsor && !nuclearArmed(campaign, target))
        .map((target) => ({ sponsor, target, heat: hostility(campaign, sponsor, target) }))
        .filter((pair) => pair.heat >= HOSTILITY_FLOOR),
    );
  return [...pairs].sort((a, b) => b.heat - a.heat || `${a.sponsor}${a.target}`.localeCompare(`${b.sponsor}${b.target}`));
}

/** A fragile government invites a coup; a sturdier one only the ballot. */
function actFor(campaign: Campaign, target: NationId): RegimeAct {
  return (campaign.nations[target]?.stats.politics.regimeStability ?? 1) < 0.5 ? "coup-support" : "political-action";
}

/** This week's start, if the world draws one and some pair clears its gates. */
export function npcRegimeStart(campaign: Campaign): EffectPacket | undefined {
  const streams = createRngStreams(campaign.seed);
  if (streams.stream("regime-npc-start", campaign.turn).next() >= NPC_REGIME_WEEKLY_CHANCE) return undefined;
  for (const pair of candidatePairs(campaign)) {
    const request: ResolutionRequest = { actor: pair.sponsor, target: pair.target, instrument: "covert", rung: 5, regimeAct: actFor(campaign, pair.target) };
    if (firstTempoRefusal(campaign, coercionClaims(campaign, request))) continue;
    const result = resolveAction(campaign, request, streams, "simulate");
    if (!result.ok) continue;
    const spent = tempoEffect(campaign, pair.sponsor, [regimeClaim(campaign, request)]);
    return { ...result.packet, effects: [...result.packet.effects, ...(spent ? [spent] : [])] };
  }
  return undefined;
}

/** The week of every running operation (falls, exposures and lapses, after the week's changes of government), and any operation another capital starts. */
export const regimePhase: TurnPhase = (state) => {
  const started = npcRegimeStart(state);
  return [...operationsWeek(state), ...(started ? [started] : [])];
};
