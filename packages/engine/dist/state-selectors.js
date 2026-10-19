import { relationshipKey } from "./state-campaign.js";
import { campaignStatus, omniscientRead } from "./rules.js";
// The only read path into a campaign. Surfaces never reach into raw state, so
// every question a screen can ask is a function here — which is what makes the
// shape of state something that can change without a hundred call sites moving.
// --- Selectors: the only read path. Surfaces never reach into raw state. ---
export function selectNation(campaign, id) {
    return campaign.nations[id];
}
export function selectPerson(campaign, id) {
    return campaign.people[id];
}
export function selectRelationship(campaign, from, to) {
    return campaign.relationships[relationshipKey(from, to)];
}
export function selectRelationshipsFrom(campaign, from) {
    return Object.values(campaign.relationships).filter((r) => r.from === from);
}
/**
 * Whether the player's government and another already sit in some standing body
 * together.
 *
 * Read off the two nations' own `base.memberships` rather than through
 * `blocsInPlay`, which builds the same fact the other way round (org to member
 * list) out of every nation on the board. Both answer the same question, and
 * this is the direction a selector can ask it in: blocs.ts and treaties.ts both
 * import campaign state at run time, so a selector reaching for either would
 * close a cycle. The treaty floor needs it, so it lives on the read path.
 */
export function sharesCompact(campaign, counterpart) {
    const ours = campaign.nations[campaign.founding.nation]?.base.memberships ?? [];
    const theirs = campaign.nations[counterpart]?.base.memberships ?? [];
    return ours.some((org) => theirs.includes(org));
}
// What the player's own services can currently read of a relationship
// between two other nations. The player's own relationship with any nation
// is always legible — it is lived diplomatic experience, not something to
// spy on — but an NPC-to-NPC relationship is only as legible as the
// player's `intelCapability` outreads the pair's average `counterIntel`,
// the same "outread" comparison every standing-state gate runs, applied to a
// pair rather than to one government. It is a live computation, not stored
// knowledge: raising
// intelCapability or a target's counterIntel dropping (operators.ts) can
// change what is legible turn to turn, same as the feed.
export function hasIntelOnRelationship(campaign, relationship) {
    // Omniscience is a read, so it belongs in the read path and nowhere else: it
    // changes what the player is shown and never what the campaign holds, which
    // is why looking at a hidden relationship under it cannot alter anything. One
    // gate, shared with the country file and the wire, so the three can never
    // disagree about which capital is legible.
    if (omniscientRead(campaign))
        return true;
    const player = campaign.founding.nation;
    if (relationship.from === player || relationship.to === player)
        return true;
    return outreads(campaign, (counterIntelOf(campaign, relationship.from) + counterIntelOf(campaign, relationship.to)) / 2);
}
// A government with no reading at all is assumed fully covered rather than
// wide open: an unknown service is not a penetrated one.
function counterIntelOf(campaign, nation) {
    return selectNation(campaign, nation)?.stats.security.counterIntel ?? 1;
}
/**
 * What getting inside costs, before anything is read.
 *
 * The gate used to be a bare `playerIntel > cover`, which reads collection and
 * protection as the same trade run in two directions — and at that comparison
 * a service that is merely better than its counterpart reads it completely.
 * Penetrating a government's own deliberations is not the marginal case of
 * watching it: it needs sources inside, and a service that is a shade ahead
 * has none. So the player's reach is spent down by this margin first, and what
 * survives is what actually outreads the cover.
 */
const INTEL_PENETRATION_MARGIN = 0.2;
/**
 * What getting inside a government's own deliberations costs, over and above
 * watching its dealings.
 *
 * A tie between two capitals leaks at both ends and is seen by everyone who
 * trades with either, so the relationship gate keeps the lighter margin. A
 * cabinet's own assessments leak at one end, to sources inside it, and at the
 * lighter margin the strongest collection service on earth read every
 * government but sixteen — which left the paid read nothing to sell and no
 * adversary anything to hide. At this margin a third of the governments outside
 * any standing body with the United States keep their counsel, and China,
 * Russia, North Korea and Iran are among them.
 */
const GOVERNMENT_READ_MARGIN = 0.42;
/** The one comparison every intelligence gate is: what the player's own services outread. */
function outreads(campaign, cover, margin = INTEL_PENETRATION_MARGIN) {
    const playerIntel = selectNation(campaign, campaign.founding.nation)?.stats.security.intelCapability ?? 0;
    return playerIntel - margin > cover;
}
/**
 * What the player's services can read of what a foreign government holds
 * internally — its own assessments rather than its dealings with third parties.
 * The outread comparison, run against the one government doing the guarding at
 * the heavier margin a government's own counsel costs. Membership in a shared
 * body grants no access to a government's private deliberations; selective
 * reports must be read through their own record. The player's own government
 * keeps no file on itself worth spying on, so it is always legible.
 */
export function hasIntelOnNation(campaign, nation) {
    if (omniscientRead(campaign))
        return true;
    if (nation === campaign.founding.nation)
        return true;
    return outreads(campaign, counterIntelOf(campaign, nation), GOVERNMENT_READ_MARGIN);
}
export function selectDiscoverableRelationshipsFrom(campaign, from) {
    return selectRelationshipsFrom(campaign, from).filter((r) => hasIntelOnRelationship(campaign, r));
}
/**
 * Whether this campaign has been governed from outside the fiction. Read by the
 * intelligence gates, the removal arc, and anything that ranks a campaign
 * against others — none of which should be reaching into `campaign.godMode`
 * themselves to ask a question this simple.
 */
export function isGodMode(campaign) {
    return campaign.godMode?.enabled === true;
}
export function selectGodMode(campaign) {
    return campaign.godMode;
}
/**
 * Whether this campaign may be ranked. Achievements and leaderboards ask this
 * rather than testing `godMode` directly, so the exclusion is one rule in one
 * place instead of a convention every future scoreboard has to remember.
 */
export function isRankable(campaign) {
    // Standard only. Sandbox is never ranked, and Story forfeits achievements when
    // there are any — neither is reachable in W4, so this reads exactly as
    // `!isGodMode` did while it says the thing that will stay true.
    return campaignStatus(campaign).status === "standard";
}
export function selectMetrics(campaign) {
    return campaign.player.metrics;
}
/**
 * One metric's course, oldest first, with the live turn's reading last. The
 * series a surface draws: the closed turns are settled and the final point is
 * where the metric stands right now.
 */
export function selectMetricSeries(campaign, key) {
    return [...campaign.player.metricHistory.map((snapshot) => snapshot[key]), campaign.player.metrics[key]];
}
/**
 * How far a metric has moved since the last closed turn, or `undefined` where
 * `metricHistory` is genuinely empty and any number would be invented. A built
 * campaign's opening turn is not that case: `inheritedMetricHistory` seeds a
 * predecessor's closing quarter before the president's first turn, so the
 * delta returned there is the move against that inherited reading. Callers
 * must treat the two cases differently — "no change" and "no prior reading"
 * are not the same statement.
 */
export function selectMetricDelta(campaign, key) {
    const previous = campaign.player.metricHistory.at(-1);
    return previous === undefined ? undefined : campaign.player.metrics[key] - previous[key];
}
/** Removal pressure's own course, oldest first, live reading last — the same shape `selectMetricSeries` gives the five metrics. */
export function selectRemovalPressureSeries(campaign) {
    return [...campaign.removal.pressureHistory, campaign.removal.pressure];
}
/** How far removal pressure has moved since the last closed turn, or `undefined` on the opening turn. */
export function selectRemovalPressureDelta(campaign) {
    const previous = campaign.removal.pressureHistory.at(-1);
    return previous === undefined ? undefined : campaign.removal.pressure - previous;
}
/**
 * The chairs this campaign's charter defines, occupied or not.
 *
 * Distinct from `selectCabinet`, which is live occupancy: an emptied chair has
 * no entry there at all, so walking it makes a dismissed minister's ministry
 * disappear from the government rather than stand vacant. The seats are fixed
 * at founding and never change, which is exactly what a surface listing "the
 * cabinet" means by it.
 */
export function selectCabinetSeats(campaign) {
    return Object.keys(campaign.founding.cabinet);
}
export function selectCabinet(campaign) {
    return campaign.player.cabinet;
}
export function selectCabinetHolder(campaign, role) {
    const personId = campaign.player.cabinet[role];
    return personId ? selectPerson(campaign, personId) : undefined;
}
export function hasFlag(campaign, flag) {
    return campaign.player.flags[flag] === true;
}
export function selectLedger(campaign) {
    return campaign.ledger;
}
export function selectLedgerSince(campaign, turn) {
    return campaign.ledger.filter((entry) => entry.turn >= turn);
}
/**
 * Only what this administration decided: the ops it committed, the replies it
 * gave, the appointments it made. Everything a nation, an operator or the
 * month's drift did on its own stays in `selectLedger` — the two are different
 * documents, and reading one as the other is how a player comes to believe the
 * world is only ever reacting to them.
 */
export function selectPlayerLedger(campaign) {
    return campaign.ledger.filter((entry) => entry.actor === "player");
}
export function selectFeed(campaign) {
    return campaign.feed;
}
export function selectRemoval(campaign) {
    return campaign.removal;
}
export function selectConflicts(campaign) {
    return Object.values(campaign.conflicts);
}
export function selectActiveConflicts(campaign) {
    return selectConflicts(campaign).filter((conflict) => conflict.status === "active");
}
export function selectConditions(campaign) {
    return Object.values(campaign.conditions);
}
export function selectActiveConditions(campaign) {
    return selectConditions(campaign).filter((condition) => condition.status === "active");
}
export function selectConditionsFor(campaign, nation) {
    return selectActiveConditions(campaign).filter((condition) => condition.nation === nation);
}
export function selectOrders(campaign) {
    return campaign.orders;
}
export function selectContestedOrders(campaign) {
    return campaign.orders.filter((record) => record.contested);
}
/** Every authorization still in force this week. */
export function selectActiveAuthorizations(campaign) {
    return campaign.congress.authorizations.filter((authorization) => campaign.turn < authorization.expiresTurn);
}
/** The standing authorization to use force against one country, if there is one. */
export function selectAuthorizationAgainst(campaign, target) {
    return selectActiveAuthorizations(campaign).find((authorization) => authorization.target === target);
}
// Ordered by id rather than by insertion, so a caller that walks them reads
// them in the same sequence on every replay.
export function selectBills(campaign) {
    return Object.values(campaign.bills).sort((a, b) => a.id.localeCompare(b.id));
}
/** What is waiting for a signature or a veto right now. */
export function selectBillsOnTheDesk(campaign) {
    return selectBills(campaign).filter((bill) => bill.status === "on-the-desk");
}
/** What the chambers are still working: referred, in markup, or awaiting a call. */
export function selectBillsInProgress(campaign) {
    return selectBills(campaign).filter((bill) => bill.status === "in-progress");
}
/** The acts in force. Durable, and read by everything they constrain. */
export function selectLaws(campaign) {
    return selectBills(campaign).filter((bill) => bill.status === "law");
}
/** Resolve enacted revisions without deleting any entry from the historical statute book. */
function resolvedLaws(campaign) {
    const enacted = [...selectLaws(campaign)].sort((a, b) => (a.resolvedTurn ?? a.introducedTurn) - (b.resolvedTurn ?? b.introducedTurn)
        // A same-week revision follows the statute it names, even if its id sorts first.
        || Number(Boolean(a.revises)) - Number(Boolean(b.revises))
        || a.introducedTurn - b.introducedTurn || a.id.localeCompare(b.id));
    const current = new Map();
    const applied = new Set();
    for (const bill of enacted) {
        if (!bill.revises) {
            // Before explicit revisions, a second housing act after four years was a
            // renewal. Old saves keep both enactments, but only the newer term bills.
            if (bill.act === "act-housing-supply")
                for (const [id, prior] of current) {
                    if (prior.act === bill.act)
                        current.delete(id);
                }
            current.set(bill.id, bill);
            continue;
        }
        // A competing revision that reached the desk after its predecessor was
        // superseded is still historical law, but cannot revive an absent grant.
        if (!current.delete(bill.revises.billId))
            continue;
        applied.add(bill.id);
        if (bill.revises.kind !== "repeal")
            current.set(bill.id, bill);
    }
    return { current, applied };
}
/** Enacted provisions still governing. The historical statute book stays in `selectLaws`. */
export function selectCurrentLaws(campaign) {
    return [...resolvedLaws(campaign).current.values()];
}
/** Whether an enacted revision actually changed its named predecessor. */
export function hasLawRevisionTakenEffect(campaign, billId) {
    return resolvedLaws(campaign).applied.has(billId);
}
export function selectTermClock(campaign) {
    return campaign.termClock;
}
/**
 * Weeks served in *this* term — the only week number a player is ever shown.
 *
 * The turn counter and the term counter agree for exactly one presidency. A
 * re-elected president's term starts at turn 209, so the raw turn is 215 in
 * their seventh week, and every surface that printed `campaign.turn` against a
 * 208-week term told them they were past the end of a term they had just
 * begun. One writer, because two of them is how the masthead came to read
 * "215 / 208 wk" two hundred points above a rail reading "Week 7 of 208".
 */
export function selectWeeksServed(campaign) {
    return campaign.turn - campaign.termClock.termStartTurn + 1;
}
// Ordered by id rather than by insertion, so a caller that walks them reads
// them in the same sequence on every replay.
export function selectTreaties(campaign) {
    return Object.values(campaign.treaties).sort((a, b) => a.id.localeCompare(b.id));
}
/** Signed, and waiting on the Senate. */
export function selectTreatiesAwaitingRatification(campaign) {
    return selectTreaties(campaign).filter((record) => record.status === "signed");
}
/**
 * The instruments actually in force — the only ones that bind anybody. A
 * Senate-ratified treaty and a signature-only executive agreement both bind;
 * one signed but still awaiting the Senate does not.
 */
export function selectBindingTreaties(campaign) {
    return selectTreaties(campaign).filter((record) => record.status === "ratified" || record.status === "in-force-by-signature");
}
export function selectPursuits(campaign) {
    return Object.values(campaign.pursuits);
}
// Ordered by id, not by insertion, so a caller that walks them applies them in
// the same sequence on every replay regardless of how the record was built.
export function selectActivePursuits(campaign) {
    return selectPursuits(campaign)
        .filter((pursuit) => pursuit.status === "active")
        .sort((a, b) => a.id.localeCompare(b.id));
}
/**
 * The campaign one nation is currently running against another, if any. At most
 * one is ever active per ordered pair: a state pressing a neighbor over trade
 * and over its border is running one campaign with two grievances, not two
 * campaigns, and modeling it as two would let the same commitment be spent
 * twice.
 */
export function selectPursuitAgainst(campaign, actor, target) {
    return selectActivePursuits(campaign).find((pursuit) => pursuit.actor === actor && pursuit.target === target);
}
