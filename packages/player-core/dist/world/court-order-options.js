import { COURT_ORDER_KIND_IDS, COURT_ORDER_KINDS, OBSTRUCTION_WEEKS, courtOrderProjection, courtOrderRecords, courtOrderStatus, requestCourtOrder, } from "@admin/engine";
import { orderAuthorityRecord } from "../authority/registry";
const weeks = (count) => `${count} ${count === 1 ? "week" : "weeks"}`;
const percent = (share) => Math.min(100, Math.max(0, Math.round(share * 100)));
function oddsView(projection) {
    const granted = percent(projection.odds.granted);
    const narrowed = Math.min(100 - granted, percent(projection.odds.narrowed));
    return { granted, narrowed, denied: 100 - granted - narrowed };
}
function evidenceView(projection) {
    const { capability, predicate, priority, surveillance, score } = projection.evidence;
    const lines = [
        `FBI capability: ${percent(capability)}%`,
        predicate > 0 ? `Legal grounds: ${percent(predicate)}%` : "No legal grounds on the record",
        ...(priority ? ["An investigative priority is in force here"] : []),
        ...(surveillance ? ["Collection under an earlier order here"] : []),
    ];
    return { capability: percent(capability), predicate: percent(predicate), score: percent(score), priority, surveillance, lines };
}
const days = (kind) => COURT_ORDER_KINDS[kind].termDays;
const ENABLES = {
    "fisa-order": (name) => `Lets Justice conduct surveillance in ${name} on the targets and for the term the order names.`,
    "title-iii-order": (name) => `Lets Justice intercept the communications the order names in ${name}, for up to ${days("title-iii-order")} days.`,
    "injunction-enforcement": (name) => `If ${name} leaves the injunction defied for ${weeks(OBSTRUCTION_WEEKS).replace(/^1 /, "a ")}, the Insurrection Act's obstruction ground (§252) opens.`,
    "search-warrant": () => `Lets agents search what the warrant names, within ${days("search-warrant")} days. No other act depends on it.`,
};
const OPENS = {
    "fisa-order": "surveil-under-order",
    "title-iii-order": "surveil-under-order",
    "injunction-enforcement": "proclaim",
};
const AG_WORDS = {
    carried: "The Attorney General will file it.",
    "slow-walked": "The Attorney General would sit on it. Nothing would be filed this week.",
    refused: "The Attorney General would refuse to file it.",
};
function statusText(record, turn) {
    if (record.status === "pending") {
        const left = Math.max(0, record.decideTurn - turn);
        return { text: left > 0 ? `Waiting on the court. It answers within ${weeks(left)}.` : "Waiting on the court's answer.", weeksLeft: left };
    }
    if (record.status === "granted" || record.status === "narrowed") {
        const left = Math.max(0, (record.termEndsTurn ?? turn) - turn);
        const granted = record.status === "granted" ? "Granted." : "Granted, narrower than Justice asked.";
        return { text: `${granted} In force for ${weeks(left)} more.`, weeksLeft: left };
    }
    if (record.status === "denied") {
        const left = Math.max(0, (record.cooldownEndsTurn ?? turn) - turn);
        return left > 0 ? { text: `Denied. Justice can file again in ${weeks(left)}.`, weeksLeft: left } : { text: "Denied." };
    }
    return { text: "Expired. It no longer authorizes anything." };
}
function applicationView(campaign, record) {
    const name = campaign.states[record.state]?.base.name ?? record.state;
    const { text, weeksLeft } = statusText(record, campaign.turn);
    const live = record.status === "granted" || record.status === "narrowed";
    return {
        id: record.id,
        kind: record.kind,
        name: COURT_ORDER_KINDS[record.kind].name,
        status: record.status,
        statusText: text,
        appliedTurn: record.appliedTurn,
        decideTurn: record.decideTurn,
        ...(record.termEndsTurn !== undefined ? { termEndsTurn: record.termEndsTurn } : {}),
        ...(record.cooldownEndsTurn !== undefined ? { cooldownEndsTurn: record.cooldownEndsTurn } : {}),
        ...(weeksLeft !== undefined ? { weeksLeft } : {}),
        ...(live ? { enables: ENABLES[record.kind](name) } : {}),
    };
}
function authorityOf(kind) {
    const authority = COURT_ORDER_KINDS[kind].authority;
    const record = orderAuthorityRecord(authority);
    return { cite: authority.cite, name: authority.name, limit: authority.limit, ...(record ? { recordId: record.id } : {}) };
}
function benchView(projection) {
    if (!projection.bench)
        return undefined;
    const { court, shift } = projection.bench;
    return { court, leaning: shift > 0 ? "your way" : shift < 0 ? "against you" : "even" };
}
function filed(campaign, state, kind, projection) {
    if (!projection.availability.ok)
        return undefined;
    const result = requestCourtOrder(campaign, state, kind);
    return result.ok ? result.packet : undefined;
}
function optionFor(campaign, state, kind) {
    const projection = courtOrderProjection(campaign, state, kind);
    const name = campaign.states[state]?.base.name ?? state;
    const { min, max } = projection.decisionWeeks;
    const latest = courtOrderStatus(campaign, state, kind);
    const bench = benchView(projection);
    const packet = filed(campaign, state, kind, projection);
    const opensAct = OPENS[kind];
    return {
        kind,
        name: projection.def.name,
        court: projection.def.court,
        authority: authorityOf(kind),
        enables: ENABLES[kind](name),
        ...(opensAct ? { opensAct } : {}),
        ...(projection.availability.ok ? {} : { locked: `This needs ${projection.availability.missing}.` }),
        ...(packet ? { packet } : {}),
        evidence: evidenceView(projection),
        odds: oddsView(projection),
        ...(bench ? { bench } : {}),
        decisionWeeks: { min, max },
        decisionText: min === max ? `About ${weeks(min)}` : `${min} to ${weeks(max)}`,
        termWeeks: projection.termWeeks,
        termText: `${weeks(projection.termWeeks)} once granted`,
        ...(projection.attorneyGeneral ? { attorneyGeneral: projection.attorneyGeneral, attorneyGeneralText: AG_WORDS[projection.attorneyGeneral] } : {}),
        renewal: projection.renewal,
        ...(latest ? { latest: applicationView(campaign, latest) } : {}),
    };
}
/** Every court order Justice could ask for over one state this week, in the engine's order. */
export function courtOrderOptions(campaign, state) {
    return COURT_ORDER_KIND_IDS.map((kind) => optionFor(campaign, state, kind));
}
/** The "Seek a court order" desk for one state: what can be asked for, and what became of what was. */
export function courtOrderDesk(campaign, state) {
    const applications = courtOrderRecords(campaign, state).map((record) => applicationView(campaign, record));
    return {
        state,
        options: courtOrderOptions(campaign, state),
        applications,
        live: applications.filter((application) => application.status === "granted" || application.status === "narrowed"),
    };
}
