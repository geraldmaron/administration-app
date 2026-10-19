import {
  nationName,
  outstandingIssuedAuthorizationActs,
  selectActiveAuthorizations,
  selectDateOfTurn,
  selectNation,
  selectObligations,
  terminationClockRuns,
  terminationDaysRemaining,
  terminationWindowFromIntroduction,
  type Campaign,
  type ReportObligation,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { formatDate } from "../format/figures.js";
import { warPowersHome } from "../world/war-powers-home.js";
import { assembleServiceDossier } from "../world/service-dossier.js";
import { nationForces } from "../world/nation-forces.js";
import { assessmentRows, type SecurityAssessmentRow } from "./assessment-reading.js";
import { collectionReading, type CollectionReading } from "./collection-reading.js";
import { commandCards, type CommandCard } from "./command-board.js";
import { commitmentsReading, type CommitmentsReading } from "./commitment-reading.js";
import { covertReading, type CovertReading } from "./covert-reading.js";
import { pdbReading, type PdbItem, type PdbReading } from "./pdb.js";

// The security desk in one reading: the morning's items by urgency, the
// commands, readiness by service, the War Powers paper, and the five ledgers
// the President acts on (covert findings, collection, assessments,
// commitments, and force authorizations waiting on Congress).

export type ServiceReadiness = {
  readonly id: string;
  readonly name: string;
  /** How many kinds of asset the service fields. */
  readonly lines: number;
  /** The share of an asset's fielded force that is free to go this week, averaged over the service's assets, 0..1. */
  readonly ready: number;
  /** The share held abroad by standing commitments, averaged the same way. */
  readonly abroad: number;
  /** The share fielded, uncommitted and not ready to go, averaged the same way. */
  readonly resting: number;
};

export type WarPowersRow = {
  readonly id: string;
  readonly target: string;
  readonly description: string;
  readonly reported: boolean;
  readonly missed: boolean;
  /** Days left before the force must come out without a vote; absent where no sixty-day clock runs. */
  readonly clock?: { readonly left: number; readonly window: number };
  readonly href: string;
};

export type AuthorizationRow = { readonly id: string; readonly title: string; readonly standing: boolean; readonly until: string; readonly chance?: string };

export type SecurityBoard = {
  readonly pdb: PdbReading;
  readonly commands: readonly CommandCard[];
  readonly functional: readonly CommandCard[];
  readonly readiness: readonly ServiceReadiness[];
  readonly warPowers: readonly WarPowersRow[];
  readonly authorizations: readonly AuthorizationRow[];
  readonly covert: CovertReading;
  readonly collection: CollectionReading;
  readonly assessments: readonly SecurityAssessmentRow[];
  readonly commitments: CommitmentsReading;
};

const URGENCY_ORDER: Readonly<Record<PdbItem["urgency"], number>> = { hard: 0, soft: 1, ambient: 2 };

export const URGENCY_WORDS: Readonly<Record<PdbItem["urgency"], string>> = { hard: "Needs you now", soft: "Watch", ambient: "Good to know" };

/** The morning's security items, the ones that need the President first. */
export function dailyItems(campaign: Campaign): PdbReading {
  const reading = pdbReading(campaign);
  return { ...reading, items: [...reading.items].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]) };
}

const mean = (values: readonly number[]): number => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

/**
 * Readiness by service. Hulls, airframes and formations are not one quantity,
 * so a service's shares are the average of its assets' own shares, each asset
 * counting once; adding raw counts would let the largest fleet of small units
 * stand for the whole service.
 */
export function serviceReadiness(campaign: Campaign): readonly ServiceReadiness[] {
  const counted = nationForces(campaign, campaign.founding.nation)?.counted ?? [];
  const groups = counted.reduce((map, holding) => (holding.service && holding.total > 0 ? map.set(holding.service, [...(map.get(holding.service) ?? []), holding]) : map), new Map<string, typeof counted>());
  return [...groups.entries()]
    .map(([id, holdings]) => ({
      id,
      name: assembleServiceDossier(campaign, id)?.name ?? id,
      lines: holdings.length,
      ready: mean(holdings.map((holding) => holding.available / holding.total)),
      abroad: mean(holdings.map((holding) => holding.committed / holding.total)),
      resting: mean(holdings.map((holding) => holding.belowReadiness / holding.total)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const nameOf = (campaign: Campaign, id: NationId): string => {
  const identity = selectNation(campaign, id)?.base.identity;
  return identity ? nationName(identity) : (id as string);
};

function warPowersRow(campaign: Campaign, obligation: ReportObligation): WarPowersRow {
  const runs = terminationClockRuns(campaign, obligation);
  return {
    id: obligation.id,
    target: nameOf(campaign, obligation.target),
    description: obligation.description,
    reported: obligation.filing !== undefined,
    missed: obligation.missed === true,
    ...(runs ? { clock: { left: terminationDaysRemaining(campaign, obligation), window: terminationWindowFromIntroduction(obligation) } } : {}),
    href: warPowersHome(campaign, obligation.target),
  };
}

/** The War Powers paper still open: forces introduced and not brought out. */
export function warPowersRows(campaign: Campaign): readonly WarPowersRow[] {
  return selectObligations(campaign)
    .filter((obligation) => obligation.terminated === undefined)
    .map((obligation) => warPowersRow(campaign, obligation));
}

/** The force authorizations Congress holds and the ones it has granted. */
export function authorizationRows(campaign: Campaign): readonly AuthorizationRow[] {
  const pending = outstandingIssuedAuthorizationActs(campaign).map((act): AuthorizationRow => ({ id: act.id, title: act.title, standing: false, until: `The House and Senate answer ${formatDate(act.dueDate)}`, chance: act.forecast.likelihood }));
  const standing = selectActiveAuthorizations(campaign).map((authorization): AuthorizationRow => ({ id: authorization.id, title: authorization.title, standing: true, until: `In force until ${formatDate(selectDateOfTurn(campaign, authorization.expiresTurn))}` }));
  return [...pending, ...standing];
}

export function securityBoard(campaign: Campaign): SecurityBoard {
  const cards = commandCards(campaign);
  return {
    pdb: dailyItems(campaign),
    commands: cards.filter((card) => card.hasArea),
    functional: cards.filter((card) => !card.hasArea),
    readiness: serviceReadiness(campaign),
    warPowers: warPowersRows(campaign),
    authorizations: authorizationRows(campaign),
    covert: covertReading(campaign),
    collection: collectionReading(campaign),
    assessments: assessmentRows(campaign),
    commitments: commitmentsReading(campaign),
  };
}
