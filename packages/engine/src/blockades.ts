import type { NationId } from "@admin/world";
import type { Effect } from "./effects.js";
import { forceScale } from "./force-packages.js";
import { chokepointExposure } from "./geography.js";
import { liveNation, type InstrumentContext } from "./instrument-gates.js";
import type { Campaign } from "./state.js";

// A blockade as a standing state rather than a one-time write.
//
// The rung used to take a share off the target's imports once and never give
// it back, so a blockade lifted the next week left the country poorer for the
// rest of the campaign, and every repeat compounded the cut: one passive term
// left Russia's imports at 0.07 of founding after eleven Chinese blockades. A
// blockade is hulls on station. What it stops is read off this record each
// week by the readers that price it (`external-pressure.ts` for the target's
// growth, `commodity-shocks.ts` for the barrels it keeps off the market), so
// it bites while the force is there and is gone the week the force is not.
//
// Nothing writes the lift. A blockade is in force while everything holding it
// on station still stands: the war it opened or joined, the deployment paying
// for the hulls, and the War Powers introduction it was reported under. A
// recall winds the deployment down, a war's end winds down the war, and a
// President who terminates the use of force discharges the introduction; any
// one of them lifts it, and a second record of the lift could only disagree.

export type Blockade = {
  readonly id: string;
  readonly imposer: NationId;
  readonly target: NationId;
  readonly startedTurn: number;
  /** 0..1 of the target's seaborne trade stopped while it stands. */
  readonly cut: number;
  /** The war the blockade opened or joined. Every blockade has one, because a blockade is an act of war. */
  readonly conflictId: string;
  /** The deployment that pays for the hulls, where the imposer's books carry one. */
  readonly commitmentId?: string;
  /** The War Powers introduction it was reported under, where the imposer has a Congress. */
  readonly obligationId?: string;
};

export type BlockadeEffect = { readonly kind: "blockade"; readonly set: Blockade };

export function applyBlockade(campaign: Campaign, effect: BlockadeEffect): Campaign {
  return { ...campaign, blockades: { ...campaign.blockades, [effect.set.id]: effect.set } };
}

/** Planning value: the share of seaborne trade a blockade stops against a coast with nothing to funnel it. */
export const BLOCKADE_BASE_CUT = 0.5;

/** Planning value: what a strait the target's trade has to pass adds, per unit of exposure: a navy sits on the strait. */
export const BLOCKADE_STRAIT_CUT = 0.25;

/** Planning value: the most a blockade stops; some trade always leaks by land, by air and by night. */
export const BLOCKADE_MAX_CUT = 0.9;

/** What a blockade ordered with this force against this coast would stop. */
export function blockadeCut(ctx: InstrumentContext): number {
  const exposure = chokepointExposure(liveNation(ctx.campaign, ctx.target));
  const cut = (BLOCKADE_BASE_CUT + BLOCKADE_STRAIT_CUT * exposure) * forceScale(3, ctx.force);
  return Math.round(Math.min(BLOCKADE_MAX_CUT, Math.max(0, cut)) * 1000) / 1000;
}

/**
 * The record a landed blockade leaves, tied to the effects in the same packet
 * that hold it on station.
 */
export function blockadeRecord(ctx: InstrumentContext, conflictId: string, siblings: readonly Effect[]): Effect {
  const commitment = siblings.find((effect) => effect.kind === "commitment");
  const obligation = siblings.find((effect) => effect.kind === "warPowers" && effect.open !== undefined);
  const set: Blockade = {
    id: `blockade:${ctx.actor as string}:${ctx.target as string}:${ctx.campaign.turn}`,
    imposer: ctx.actor,
    target: ctx.target,
    startedTurn: ctx.campaign.turn,
    cut: blockadeCut(ctx),
    conflictId,
    ...(commitment?.kind === "commitment" ? { commitmentId: commitment.set.id } : {}),
    ...(obligation?.kind === "warPowers" && obligation.open ? { obligationId: obligation.open.id } : {}),
  };
  return { kind: "blockade", set };
}

function stillOnStation(campaign: Campaign, blockade: Blockade): boolean {
  if (campaign.conflicts[blockade.conflictId]?.status !== "active") return false;
  if (blockade.commitmentId !== undefined && campaign.commitments[blockade.commitmentId]?.status !== "active") return false;
  if (blockade.obligationId === undefined) return true;
  const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === blockade.obligationId);
  return obligation?.terminated === undefined;
}

const inForceBySnapshot = new WeakMap<Campaign, readonly Blockade[]>();

/** Every blockade still on station, oldest first. */
export function blockadesInForce(campaign: Campaign): readonly Blockade[] {
  const known = inForceBySnapshot.get(campaign);
  if (known) return known;
  const standing = Object.values(campaign.blockades ?? {})
    .filter((blockade) => stillOnStation(campaign, blockade))
    .sort((a, b) => a.startedTurn - b.startedTurn || a.id.localeCompare(b.id));
  inForceBySnapshot.set(campaign, standing);
  return standing;
}

/** The blockade this government already holds on that one, if it holds one. */
export function blockadeBy(campaign: Campaign, imposer: NationId, target: NationId): Blockade | undefined {
  return blockadesInForce(campaign).find((blockade) => blockade.imposer === imposer && blockade.target === target);
}

/**
 * How much of a country's seaborne trade is stopped this week, 0..1.
 *
 * The heaviest blockade on it, not the sum: two navies off one coast stop the
 * same ships, and a second blockade adding its cut to the first would be the
 * compounding this record exists to end.
 */
export function blockadeCutOn(campaign: Campaign, nation: NationId): number {
  return blockadesInForce(campaign)
    .filter((blockade) => blockade.target === nation)
    .reduce((heaviest, blockade) => Math.max(heaviest, blockade.cut), 0);
}
