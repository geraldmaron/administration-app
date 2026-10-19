import { FactionId } from "@admin/world";
import { selectCabinet } from "./state.js";
import { flagMarker, markedFlags } from "./marked-flags.js";
import { turnsFor } from "./pace.js";
import { roleTitle } from "./naming.js";
// A bloc inside the administration that is not the President's: how one forms,
// what it costs while it stands, and the one way it ends.
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/**
 * The faction a chair breaks away into.
 *
 * One builder, exported, because there were two copies of this template — one
 * here and one in appointments.ts — and two copies of the string that names a
 * thing is how the same faction ends up with two identities the moment either
 * side is edited.
 */
export function rivalFaction(role) {
    return FactionId.parse(`${role}-rival`);
}
/** The flag authored content gates on, and the clock a faction's age is read off: `faction:<id>`. */
export function factionFlag(id) {
    return `faction:${id}`;
}
/**
 * How much of the President's own government is not the President's.
 *
 * A rival still in the room is worse than one already dismissed — an officer
 * with a department behind them can hold a decision up from inside — but a
 * dismissed one does not stop counting, because that is exactly the minister
 * who takes the fight outside the building. Both ripen: a bloc that has stood
 * half a fictional year is a faction, and a bloc that formed on Tuesday is a
 * bad week.
 */
const FACTION_SEATED_WEIGHT = 0.6;
const FACTION_DEPARTED_WEIGHT = 0.25;
const FACTION_RIPENS_OVER_DAYS = 168;
// What a bloc is worth on the day it forms. Not nothing: the week a Secretary
// announces they are counting votes is the week the government looks like it is
// coming apart, and a ripeness that started at zero made the most dramatic
// person-outcome in the game cost exactly nothing until months later.
const FACTION_NEW_SHARE = 0.25;
function factionFormedTurn(campaign, id) {
    // The prefix is sliced off the one builder rather than written out again:
    // the marker's shape belongs to marked-flags.ts and a second copy of the
    // template here is how this reader would quietly stop finding them.
    const sample = flagMarker(factionFlag(id), 0);
    const prefix = sample.slice(0, sample.lastIndexOf(":") + 1);
    for (const key of Object.keys(campaign.player.flags)) {
        if (campaign.player.flags[key] !== true || !key.startsWith(prefix))
            continue;
        const turn = Number(key.slice(prefix.length));
        if (Number.isFinite(turn))
            return turn;
    }
    return undefined;
}
/** Every bloc standing inside the administration right now, largest first. */
export function selectFactions(campaign, charterTitles) {
    const cabinet = selectCabinet(campaign);
    const byId = new Map();
    for (const runtime of Object.values(campaign.people)) {
        const id = runtime.affiliation;
        if (id === undefined)
            continue;
        byId.set(id, [...(byId.get(id) ?? []), runtime.base.id]);
    }
    return [...byId]
        .map(([id, members]) => {
        const formedTurn = factionFormedTurn(campaign, id) ?? campaign.turn;
        const role = id.replace(/-rival$/, "");
        return {
            id,
            role,
            name: `the ${roleTitle(role, charterTitles)}'s bloc`,
            members,
            seated: members.filter((person) => Object.values(cabinet).includes(person)).length,
            formedTurn,
            standingTurns: Math.max(0, campaign.turn - formedTurn),
        };
    })
        .sort((a, b) => b.members.length - a.members.length);
}
/**
 * What the standing blocs are costing the President's hold on their own
 * government, 0..1.
 *
 * Read by the removal arc as its sixth term. It compounds twice over — a
 * faction that survives ripens, and a President who answers one by dismissing
 * its leader gets a resentful ex-Secretary who keeps the badge — which is the
 * property the arc's other terms do not have and the reason this belongs there
 * rather than as another one-week metric hit.
 */
export function factionPressure(campaign) {
    const ripenOver = turnsFor(FACTION_RIPENS_OVER_DAYS);
    const total = selectFactions(campaign).reduce((sum, faction) => {
        const ripeness = FACTION_NEW_SHARE + (1 - FACTION_NEW_SHARE) * Math.min(1, faction.standingTurns / ripenOver);
        const departed = faction.members.length - faction.seated;
        return sum + (faction.seated * FACTION_SEATED_WEIGHT + departed * FACTION_DEPARTED_WEIGHT) * ripeness;
    }, 0);
    return clamp01(total);
}
/** What a chair breaking away writes: the badge on the person, and the dated flag the arc and the corpus both read. */
export function factionEffects(turn, role, person) {
    const id = rivalFaction(role);
    return [
        { kind: "person", person, changes: { affiliation: id } },
        { kind: "flag", set: markedFlags([factionFlag(id)], turn) },
    ];
}
// --- Ending a bloc ------------------------------------------------------------
/**
 * What bringing a bloc back inside costs, and what it buys.
 *
 * The political capital is a day of the President's standing spent in public on
 * people who went against them, more of it the larger the bloc: a reconciliation
 * is read as a concession, because it is one. The seat is the other half: a
 * member still in the cabinet is promised a hearing they were not getting, which
 * is what brings their loyalty back up, and what a President who reconciles with
 * a bloc they could have outlasted is paying for. A bloc that simply faded would
 * make losing your own government free.
 */
const RECONCILE_STANDING_FLOOR = 0.02;
const RECONCILE_STANDING_PER_MEMBER = 0.01;
const RECONCILE_LOYALTY_LIFT = 0.08;
/** The flag a bloc's end leaves on the record, so a later story can gate on it: `faction-reconciled:<id>`. */
export function reconciledFlag(id) {
    return `faction-reconciled:${id}`;
}
/** The price of ending a bloc, which `reconcileFaction` spends as it stands. */
export function projectFactionReconciliation(campaign, id) {
    const faction = selectFactions(campaign).find((entry) => entry.id === id);
    if (!faction)
        return { ok: false, reason: "There is no such bloc in your government." };
    const cabinet = new Set(Object.values(selectCabinet(campaign)).map(String));
    const brought = faction.members.filter((member) => cabinet.has(member));
    const standing = RECONCILE_STANDING_FLOOR + RECONCILE_STANDING_PER_MEMBER * faction.members.length;
    return {
        ok: true,
        faction,
        cost: { standing: -Math.round(standing * 1000) / 1000 },
        risks: [
            {
                id: "faction-reconciled",
                chance: 1,
                description: brought.length > 0
                    ? `${faction.name} stands down. ${brought.length === 1 ? "Its cabinet member is" : `Its ${brought.length} cabinet members are`} promised a hearing, and their loyalty rises ${Math.round(RECONCILE_LOYALTY_LIFT * 100)} points.`
                    : `${faction.name} stands down. None of its members is still in your cabinet, so all you gain is quiet.`,
            },
        ],
        brought,
    };
}
/** Every marker the bloc's flag left, so a bloc that re-forms later is dated from its new start. */
function factionMarks(campaign, id) {
    const flag = factionFlag(id);
    const sample = flagMarker(flag, 0);
    const prefix = sample.slice(0, sample.lastIndexOf(":") + 1);
    return Object.keys(campaign.player.flags).filter((key) => key === flag || key.startsWith(prefix));
}
/**
 * End a bloc: the badge comes off everyone carrying it, the flag it formed
 * under is cleared, and the President pays for it in public. The one writer
 * that ends a faction.
 */
export function reconcileFaction(campaign, id) {
    const projection = projectFactionReconciliation(campaign, id);
    if (!projection.ok)
        return projection;
    const { faction, brought } = projection;
    const summary = `The President brings ${faction.name} back inside the administration.`;
    const effects = [
        ...faction.members.map((member) => ({
            kind: "person",
            person: member,
            changes: { affiliation: undefined },
            ...(brought.includes(member) ? { loyaltyShift: RECONCILE_LOYALTY_LIFT } : {}),
        })),
        { kind: "flag", clear: factionMarks(campaign, id), set: markedFlags([reconciledFlag(id)], campaign.turn) },
        { kind: "metric", deltas: projection.cost },
        { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline: summary, facts: { subject: faction.name } }] },
    ];
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: faction.members.map(String), systems: ["cabinet", "faction"] },
            narration: { summary },
            effects,
        },
    };
}
