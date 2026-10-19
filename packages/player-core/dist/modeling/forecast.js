import { hasIntelOnNation, intelligenceCoverage, isGodMode, orderDepartment, seatKindOf, selectActing, selectForecastRecord, } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { pendingConversations } from "../conversation/scripts";
import { roleTitle } from "../format/figures";
const SEAT = {
    foreign: "role-foreign-minister",
    defense: "role-defense-minister",
    intelligence: "role-intelligence-director",
    economy: "role-treasury-minister",
    justice: "role-attorney-general",
    homeland: "role-homeland-secretary",
    "white-house": "role-chief-of-staff",
};
/** A seat nobody holds is forecast by its career staff alone: the read of a capable office, without anyone to sharpen it. */
export const VACANT_SEAT_COMPETENCE = 0.35;
function actDomain(act) {
    switch (act.act) {
        case "instrument": {
            const ref = act.option.ref;
            if (ref.kind !== "instrument")
                return "foreign";
            return ref.instrument === "military" ? "defense" : ref.instrument === "covert" ? "intelligence" : ref.instrument === "economic" ? "economy" : "foreign";
        }
        case "lift":
        case "stand-down":
            return "foreign";
        case "lever":
            return "economy";
        case "nominate":
            return act.picks.length > 0 && act.picks.every((pick) => seatKindOf(pick.office) === "justice" || seatKindOf(pick.office) === "circuit") ? "justice" : "white-house";
        case "withdraw-nomination":
            return "justice";
        case "locale":
            return "homeland";
        default:
            return "white-house";
    }
}
function domainOf(campaign, spec) {
    if (spec.kind === "budget-draft")
        return "economy";
    if (spec.kind === "order")
        return orderDepartment(charterOf(campaign).id, spec.id) ?? "white-house";
    if (spec.kind === "decision") {
        const cast = pendingConversations(campaign).find((entry) => entry.def.id === spec.id);
        return cast && cast.counterpart !== campaign.founding.nation ? "foreign" : "white-house";
    }
    if (spec.kind !== "acts")
        return "white-house";
    const act = spec.alternatives.find((entry) => entry.act)?.act;
    return act ? actDomain(act) : "white-house";
}
const WORLD_DOMAINS = new Set(["foreign", "defense", "intelligence"]);
function confidenceOf(competence, coverage) {
    const score = coverage === undefined ? competence : competence * (0.5 + 0.5 * coverage);
    return score >= 0.65 ? "high" : score >= 0.4 ? "moderate" : "low";
}
function occupant(campaign, role) {
    return campaign.player.cabinet[role] ?? selectActing(campaign, role);
}
/** Who forecasts this choice, on what basis, and how sure. God Mode alone forecasts from the truth. */
export function forecastSource(campaign, spec) {
    if (isGodMode(campaign))
        return { basis: { kind: "truth" }, label: "God Mode (from the true campaign)", confidence: "high" };
    const domain = domainOf(campaign, spec);
    const role = (domain in SEAT ? SEAT[domain] : domain);
    const person = occupant(campaign, role);
    const runtime = person ? campaign.people[person] : undefined;
    const competence = runtime?.base.competence ?? VACANT_SEAT_COMPETENCE;
    const coverage = WORLD_DOMAINS.has(domain) ? worldCoverage(campaign, spec) : undefined;
    const title = roleTitle(role, charterOf(campaign).roleTitles);
    return {
        basis: { kind: "staff", role, ...(person ? { person } : {}), competence },
        label: runtime ? `${title} ${runtime.base.name}` : `the ${title}'s staff, with nobody in the top job`,
        confidence: confidenceOf(competence, coverage),
        role,
        ...(person ? { person } : {}),
        ...(coverage === undefined ? {} : { coverage }),
    };
}
/** For a choice about one government, whether the services read it; otherwise how much of the world they read. */
function worldCoverage(campaign, spec) {
    const act = spec.kind === "acts" ? spec.alternatives.find((entry) => entry.act?.act === "instrument")?.act : undefined;
    if (act?.act === "instrument")
        return hasIntelOnNation(campaign, act.nation) ? 1 : 0;
    const cast = spec.kind === "decision" ? pendingConversations(campaign).find((entry) => entry.def.id === spec.id) : undefined;
    if (cast)
        return hasIntelOnNation(campaign, cast.counterpart) ? 1 : 0;
    return intelligenceCoverage(campaign);
}
/**
 * The packet that files a staff forecast on the Record, for the option the
 * President took. Background bookkeeping, as a held document's admission is:
 * it changes nothing in the world and is read by the forecast record alone.
 * A God Mode forecast is not a staff's and is not filed.
 */
export function forecastPacket(campaign, filed) {
    const { source } = filed;
    if (source.basis.kind === "truth" || !source.role)
        return undefined;
    const record = {
        id: `forecast:${campaign.turn}:${campaign.ledger.length}`,
        turn: campaign.turn,
        date: campaign.calendar,
        role: source.role,
        ...(source.person ? { person: source.person } : {}),
        subject: filed.subject,
        option: filed.option,
        horizonWeeks: filed.weeks,
        dueTurn: campaign.turn + filed.weeks,
        approval: filed.approval,
        confidence: source.confidence,
    };
    return {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        background: true,
        narration: { summary: `The forecast for ${filed.subject} is filed. ${source.label} expected approval near ${Math.round(filed.approval.median * 100)}% in ${filed.weeks} weeks.` },
        effects: [{ kind: "forecast", record }],
    };
}
/** Each adviser's forecasts against what happened: how often the range held, and by how much the middle missed. */
export function adviserTrackRecords(campaign) {
    const titles = charterOf(campaign).roleTitles;
    return selectForecastRecord(campaign).map((adviser) => {
        const settled = adviser.records.flatMap((entry) => (entry.outcome.state === "settled" ? [entry.outcome] : []));
        const name = adviser.person ? campaign.people[adviser.person]?.base.name : undefined;
        return {
            role: adviser.role,
            title: roleTitle(adviser.role, titles),
            ...(name ? { name } : {}),
            filed: adviser.records.length,
            settled: settled.length,
            within: settled.filter((outcome) => outcome.within).length,
            ...(settled.length > 0 ? { meanMiss: settled.reduce((sum, outcome) => sum + Math.abs(outcome.error), 0) / settled.length } : {}),
            entries: adviser.records,
        };
    });
}
