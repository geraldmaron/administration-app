import { selectRelationship, type Campaign, type NationRuntime } from "@admin/engine";
import { ORG_G7, type NationId } from "@admin/world";
import { selfNation } from "./subjects.js";

// Sensible company for the President's government, drawn from the world as
// the campaign holds it: the bodies a government sits in this week, the
// neighbors the dataset records, the tension the United States reads with
// each capital, and the dataset's derived bands. Nothing here ranks a government by a figure
// the services cannot read.

export type PeerRule = "g7" | "neighbors" | "rivals" | "allies" | "power-tier";

export const PEER_RULES: readonly PeerRule[] = ["g7", "neighbors", "rivals", "allies", "power-tier"];

/** Enough to read as company, few enough for a matrix on a phone. */
export const PEER_SET_SIZE = 8;

/** The rivals set is short: past the handful of tensest capitals the word stops meaning anything. */
const RIVAL_COUNT = 5;

export type PeerSet = {
  readonly rule: PeerRule;
  readonly label: string;
  /** How the set was chosen, one sentence. */
  readonly basis: string;
  /** Never includes the President's own government. */
  readonly nations: readonly NationId[];
  /** Why the set is empty, where it is. */
  readonly empty?: string;
};

type Candidate = { readonly id: NationId; readonly runtime: NationRuntime };

function others(campaign: Campaign): readonly Candidate[] {
  const self = selfNation(campaign);
  return (Object.keys(campaign.nations) as NationId[])
    .filter((id) => id !== self)
    .sort()
    .map((id) => ({ id, runtime: campaign.nations[id]! }));
}

const byOutput = (a: Candidate, b: Candidate): number => b.runtime.stats.economy.gdp - a.runtime.stats.economy.gdp || a.id.localeCompare(b.id);

const memberships = (runtime: NationRuntime): readonly string[] => runtime.memberships ?? runtime.base.memberships;

function chosen(campaign: Campaign, rule: PeerRule): readonly NationId[] {
  const self = campaign.nations[selfNation(campaign)];
  const pool = others(campaign);
  switch (rule) {
    case "g7":
      return pool.filter(({ runtime }) => memberships(runtime).includes(ORG_G7)).sort(byOutput).map(({ id }) => id);
    case "neighbors": {
      const neighbors = new Set<string>(self?.base.geo.neighbors ?? []);
      return pool.filter(({ id }) => neighbors.has(id)).sort(byOutput).map(({ id }) => id);
    }
    case "rivals":
      return pool
        .map(({ id }) => ({ id, tension: selectRelationship(campaign, selfNation(campaign), id)?.tension }))
        .flatMap((entry) => (entry.tension === undefined || entry.tension <= 0 ? [] : [{ id: entry.id, tension: entry.tension }]))
        .sort((a, b) => b.tension - a.tension || a.id.localeCompare(b.id))
        .slice(0, RIVAL_COUNT)
        .map(({ id }) => id);
    case "allies":
      return pool.filter(({ runtime }) => runtime.base.bands.alignmentBand === "aligned").sort(byOutput).slice(0, PEER_SET_SIZE).map(({ id }) => id);
    case "power-tier": {
      const tier = self?.base.bands.powerTier;
      return pool.filter(({ runtime }) => runtime.base.bands.powerTier === tier).sort(byOutput).slice(0, PEER_SET_SIZE).map(({ id }) => id);
    }
  }
}

const DESCRIPTION: Readonly<Record<PeerRule, { readonly label: string; readonly basis: string; readonly empty: string }>> = {
  g7: { label: "G7", basis: "The other members of the Group of Seven, the biggest economies first.", empty: "No other G7 member is in the game." },
  neighbors: { label: "Neighbors", basis: "The countries next to this one, the biggest economies first.", empty: "No country next to this one is in the game." },
  rivals: {
    label: "Rivals",
    basis: `The ${RIVAL_COUNT} countries you have the most tension with this week.`,
    empty: "You don't have tension with any country this week.",
  },
  allies: {
    label: "Allies",
    basis: `Up to ${PEER_SET_SIZE} countries on the side of the Western alliances, through membership or their own stated leaning, the biggest economies first.`,
    empty: "No country in the game counts as an ally.",
  },
  "power-tier": {
    label: "Similar power",
    basis: `Up to ${PEER_SET_SIZE} countries about as powerful as this one, the biggest economies first.`,
    empty: "No other country is about as powerful as this one.",
  },
};

/** A default comparison set for the President's government under one rule. */
export function peerSet(campaign: Campaign, rule: PeerRule): PeerSet {
  const nations = chosen(campaign, rule);
  const { label, basis, empty } = DESCRIPTION[rule];
  return { rule, label, basis, nations, ...(nations.length === 0 ? { empty } : {}) };
}
