import { nationName, outstandingIssuedAuthorizationActs, selectActiveAuthorizations, selectDateOfTurn, selectNation, selectObligations, terminationClockRuns, terminationDaysRemaining, terminationWindowFromIntroduction, } from "@admin/engine";
import { formatDate } from "../format/figures.js";
import { warPowersHome } from "../world/war-powers-home.js";
import { assembleServiceDossier } from "../world/service-dossier.js";
import { nationForces } from "../world/nation-forces.js";
import { assessmentRows } from "./assessment-reading.js";
import { collectionReading } from "./collection-reading.js";
import { commandCards } from "./command-board.js";
import { commitmentsReading } from "./commitment-reading.js";
import { covertReading } from "./covert-reading.js";
import { pdbReading } from "./pdb.js";
const URGENCY_ORDER = { hard: 0, soft: 1, ambient: 2 };
export const URGENCY_WORDS = { hard: "Needs you now", soft: "Watch", ambient: "Good to know" };
/** The morning's security items, the ones that need the President first. */
export function dailyItems(campaign) {
    const reading = pdbReading(campaign);
    return { ...reading, items: [...reading.items].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]) };
}
const mean = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
/**
 * Readiness by service. Hulls, airframes and formations are not one quantity,
 * so a service's shares are the average of its assets' own shares, each asset
 * counting once; adding raw counts would let the largest fleet of small units
 * stand for the whole service.
 */
export function serviceReadiness(campaign) {
    const counted = nationForces(campaign, campaign.founding.nation)?.counted ?? [];
    const groups = counted.reduce((map, holding) => (holding.service && holding.total > 0 ? map.set(holding.service, [...(map.get(holding.service) ?? []), holding]) : map), new Map());
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
const nameOf = (campaign, id) => {
    const identity = selectNation(campaign, id)?.base.identity;
    return identity ? nationName(identity) : id;
};
function warPowersRow(campaign, obligation) {
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
export function warPowersRows(campaign) {
    return selectObligations(campaign)
        .filter((obligation) => obligation.terminated === undefined)
        .map((obligation) => warPowersRow(campaign, obligation));
}
/** The force authorizations Congress holds and the ones it has granted. */
export function authorizationRows(campaign) {
    const pending = outstandingIssuedAuthorizationActs(campaign).map((act) => ({ id: act.id, title: act.title, standing: false, until: `The House and Senate answer ${formatDate(act.dueDate)}`, chance: act.forecast.likelihood }));
    const standing = selectActiveAuthorizations(campaign).map((authorization) => ({ id: authorization.id, title: authorization.title, standing: true, until: `In force until ${formatDate(selectDateOfTurn(campaign, authorization.expiresTurn))}` }));
    return [...pending, ...standing];
}
export function securityBoard(campaign) {
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
