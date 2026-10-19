import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";

// How often the world's other governments may do a kind of thing: a cap on
// how many such acts the whole world makes in any term, and a rest after each
// one on the thing it was done to (a pair of governments, a strait).
//
// Pricing alone did not hold the tempo. The agent weighs every act on its
// merits each week, so a world with nothing rationing it repeated the same
// war-opening act as often as its odds allowed: one passive term held Brent
// above $90 for 73 weeks on a single Chinese blockade of Russia. A rate is a
// different fact from a price, and it is kept as one dated ledger of acts.
//
// A family of act is data, declared by the module that owns the act and passed
// in here. This module keeps no list of families, so a new family (regime
// operations, say) declares its own cap and cooldown and needs no edit here.

/** A term, in weeks: the window every family's cap is counted over. */
export const TERM_WEEKS = 208;

export type TempoFamily = {
  /** The ledger's key for the family; unique across families. */
  readonly id: string;
  /** The most acts of the family the world's governments make in any 208 weeks. */
  readonly perTerm: number;
  /** Weeks one key rests after an act on it before the family may act on it again. */
  readonly cooldownWeeks: number;
  /** The plural a refusal names: "acts of force", "strait closures". */
  readonly noun: string;
};

/** One act a decision would make of a family, on one key. */
export type TempoClaim = {
  readonly family: TempoFamily;
  /** What rests after the act: a pair (`pairKey`), a strait, anything the family names. */
  readonly key: string;
  /** The key in words, for a refusal a person reads: "China and Russia", "the Strait of Hormuz". */
  readonly label?: string;
};

export type TempoEntry = {
  readonly family: string;
  readonly key: string;
  readonly actor: NationId;
  readonly turn: number;
  /** The last turn the entry can still refuse anything; dropped after it. */
  readonly keepUntil: number;
};

export type NpcTempoEffect = { readonly kind: "npcTempo"; readonly entries: readonly TempoEntry[] };

/** The key for a pair of governments, the same whichever acted on which. */
export function pairKey(a: NationId, b: NationId): string {
  return (a as string) < (b as string) ? `${a as string}|${b as string}` : `${b as string}|${a as string}`;
}

/** Every act still on the ledger, oldest first. Absent on older saves, which read as none. */
export function tempoLedger(campaign: Campaign): readonly TempoEntry[] {
  return campaign.npcTempo ?? [];
}

/** Acts of the family the world has made in the term ending this week. */
export function actsThisTerm(campaign: Campaign, family: TempoFamily): number {
  return tempoLedger(campaign).filter((entry) => entry.family === family.id && entry.turn > campaign.turn - TERM_WEEKS).length;
}

/** The turn the family last acted on the key, if it ever did and the entry is still kept. */
export function lastActOn(campaign: Campaign, family: TempoFamily, key: string): number | undefined {
  return tempoLedger(campaign)
    .filter((entry) => entry.family === family.id && entry.key === key)
    .reduce<number | undefined>((latest, entry) => (latest === undefined || entry.turn > latest ? entry.turn : latest), undefined);
}

/** Why the world may not make this act this week, or undefined where it may. */
export function tempoRefusal(campaign: Campaign, claim: TempoClaim): string | undefined {
  const { family, key, label } = claim;
  if (actsThisTerm(campaign, family) >= family.perTerm) {
    return `the world has made its ${family.perTerm} ${family.noun} for this term`;
  }
  const last = lastActOn(campaign, family, key);
  if (last !== undefined && campaign.turn - last < family.cooldownWeeks) {
    return `${family.noun} involving ${label ?? key} rest ${family.cooldownWeeks} weeks after the last, and it was ${campaign.turn - last} weeks ago`;
  }
  return undefined;
}

/** The first refusal among a decision's claims, or undefined where every one is allowed. */
export function firstTempoRefusal(campaign: Campaign, claims: readonly TempoClaim[]): string | undefined {
  for (const claim of claims) {
    const refusal = tempoRefusal(campaign, claim);
    if (refusal) return refusal;
  }
  return undefined;
}

/** The ledger entries an act makes, as the effect that writes them; undefined where it made none. */
export function tempoEffect(campaign: Campaign, actor: NationId, claims: readonly TempoClaim[]): NpcTempoEffect | undefined {
  if (claims.length === 0) return undefined;
  const entries = claims.map(({ family, key }) => ({
    family: family.id,
    key,
    actor,
    turn: campaign.turn,
    keepUntil: campaign.turn + Math.max(TERM_WEEKS, family.cooldownWeeks),
  }));
  return { kind: "npcTempo", entries };
}

/** Appends the act's entries and drops every entry past its keep, so the ledger stays a term long. */
export function applyNpcTempo(campaign: Campaign, effect: NpcTempoEffect): Campaign {
  const kept = tempoLedger(campaign).filter((entry) => entry.keepUntil >= campaign.turn);
  return { ...campaign, npcTempo: [...kept, ...effect.entries] };
}
