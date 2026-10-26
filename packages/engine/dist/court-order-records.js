import { STATE_IDS } from "@admin/world";
import { flagMarker } from "./marked-flags.js";
import { COURT_TIMING_DAYS } from "./court-procedure.js";
import { createRngStreams } from "./rng.js";
import { turnsFor, weeksFor } from "./pace.js";
export const COURT_ORDER_KIND_IDS = ["search-warrant", "title-iii-order", "fisa-order", "injunction-enforcement"];
const OPENED = "2026-10-25";
const govinfo = (title, section) => `https://www.govinfo.gov/link/uscode/${title}/${section}`;
export const COURT_ORDER_KINDS = {
    "search-warrant": {
        kind: "search-warrant", name: "Search warrant", noun: "a search warrant", court: "a federal magistrate judge", public: false,
        authority: { kind: "regulation", cite: "Fed. R. Crim. P. 41", name: "Search and seizure",
            limit: "A magistrate judge must issue the warrant on probable cause to search for evidence of a crime, and it must be executed within 14 days.",
            source: "https://www.law.cornell.edu/rules/frcrmp/rule_41", opened: OPENED },
        // Rule 41(d)(3) allows a warrant by telephone; a day to three is a planning value.
        decisionDays: { min: 1, max: 3, source: "Fed. R. Crim. P. 41(d)(3) permits a warrant on information sent by telephone or other reliable electronic means. Planning band." },
        // Rule 41(e)(2)(A)(i): executed within a specified time no longer than 14 days.
        termDays: 14,
    },
    "title-iii-order": {
        kind: "title-iii-order", name: "Title III interception order", noun: "a Title III interception order", court: "a federal district judge", public: false,
        authority: { kind: "statute", cite: "18 U.S.C. §2518", name: "Interception of wire, oral, or electronic communications",
            limit: "Probable cause that a person is committing an offense §2516 lists, ordinary investigation tried and failed, and no more than thirty days at a time.",
            source: govinfo(18, "2518"), opened: OPENED },
        decisionDays: { min: 2, max: 10, source: "18 U.S.C. §2518(1)-(3): a written application under oath, decided ex parte. No official median found; planning band." },
        // §2518(5): in no event longer than thirty days; extensions only on a new application.
        termDays: 30,
    },
    "fisa-order": {
        kind: "fisa-order", name: "FISA surveillance order", noun: "a FISA surveillance order", court: "the Foreign Intelligence Surveillance Court", public: false,
        authority: { kind: "statute", cite: "50 U.S.C. §1805", name: "The Foreign Intelligence Surveillance Act",
            limit: "Probable cause that the target is a foreign power or its agent; no U.S. person is one solely for activities the First Amendment protects.",
            source: govinfo(50, "1805"), opened: OPENED },
        decisionDays: { min: 7, max: 30, source: "50 U.S.C. §§1804-1805: an application approved by the Attorney General, decided ex parte. No official median found; planning band." },
        // §1805(d)(1): ninety days, or less; a year only for a foreign power or a non-U.S.-person agent.
        termDays: 90,
    },
    "injunction-enforcement": {
        kind: "injunction-enforcement", name: "Injunction enforcing federal law", noun: "an injunction enforcing federal law", court: "the federal district court", public: true,
        authority: { kind: "statute", cite: "28 U.S.C. §§1331, 1345", name: "Suits by the United States",
            limit: "The district court hears a civil action the United States brings under federal law; the injunction binds the parties it names, and a court enforces it.",
            source: govinfo(28, "1345"), opened: OPENED },
        decisionDays: COURT_TIMING_DAYS.interim,
        // A preliminary injunction has no statutory term; six months is a planning bound on how long one holds without a merits ruling.
        termDays: 182,
    },
};
/** Weeks after a denial before Justice will file the same kind of application in the same state again. A planning value. */
export const DENIAL_COOLDOWN_WEEKS = 4;
/** An order this close to its end may be renewed by a new application. */
export const RENEWAL_WINDOW_WEEKS = 2;
const APPLICATION = "court-application";
const KINDS = new Set(COURT_ORDER_KIND_IDS);
const STATES = new Set(STATE_IDS);
const percent = (share) => Math.min(100, Math.max(0, Math.round(share * 100)));
/** The flag an application leaves: its kind, its state and the odds it was filed on, in whole percents, never the answer. */
export function courtApplicationFlag(kind, state, odds) {
    return `${APPLICATION}:${kind}:${state}:g${percent(odds.granted)}:n${percent(odds.narrowed)}`;
}
/** The court's answer to one application, drawn once on its own stream against the odds it was filed on. */
export function courtApplicationOutcome(campaign, application) {
    const draw = createRngStreams(campaign.seed).stream("court-order", application.kind, application.state, application.appliedTurn).next();
    const { granted, narrowed } = application.odds;
    return draw < granted ? "granted" : draw < granted + narrowed ? "narrowed" : "denied";
}
/** The flag a ruling leaves the week the court gives it, the one content reads. */
export function courtRulingFlag(kind, state, outcome) {
    return `court-order-${outcome}:${kind}:${state}`;
}
/** The week the court answers an application filed this week, drawn once inside the kind's band. */
export function courtOrderDecideTurn(campaign, kind, state, appliedTurn) {
    const band = COURT_ORDER_KINDS[kind].decisionDays;
    const days = band.min + Math.floor(createRngStreams(campaign.seed).stream("court-order-timing", kind, state, appliedTurn).next() * (band.max - band.min + 1));
    return appliedTurn + turnsFor(days);
}
/** A granted order's term in whole weeks, never rounded past the days the law allows. */
export function courtOrderTermWeeks(kind) {
    return Math.max(1, weeksFor(COURT_ORDER_KINDS[kind].termDays, "floor"));
}
const GRANTED_ODDS = /^g(\d{1,3})$/;
const NARROWED_ODDS = /^n(\d{1,3})$/;
function parsedApplication(campaign, key) {
    const [kind, state, granted, narrowed, turnText] = key.slice(`flagset:${APPLICATION}:`.length).split(":");
    const appliedTurn = Number(turnText);
    const g = GRANTED_ODDS.exec(granted ?? "")?.[1];
    const n = NARROWED_ODDS.exec(narrowed ?? "")?.[1];
    if (!KINDS.has(kind) || !STATES.has(state) || g === undefined || n === undefined || !Number.isInteger(appliedTurn))
        return undefined;
    const k = kind;
    const s = state;
    return { id: `${APPLICATION}:${k}:${s}:${appliedTurn}`, kind: k, state: s, appliedTurn,
        decideTurn: courtOrderDecideTurn(campaign, k, s, appliedTurn), odds: { granted: Number(g) / 100, narrowed: Number(n) / 100 } };
}
/** Every application filed, newest first, optionally for one state. The ruling phase reads these to give the court's answer. */
export function courtApplications(campaign, state) {
    const prefix = `flagset:${APPLICATION}:`;
    return Object.keys(campaign.player.flags)
        .filter((key) => key.startsWith(prefix) && campaign.player.flags[key])
        .map((key) => parsedApplication(campaign, key))
        .filter((application) => application !== undefined && (state === undefined || application.state === state))
        .sort((a, b) => b.appliedTurn - a.appliedTurn || a.id.localeCompare(b.id));
}
/** The answer the court gave, read off the ruling flag stamped with the week it gave it. */
function ruling(campaign, application) {
    return ["granted", "narrowed", "denied"].find((outcome) => campaign.player.flags[flagMarker(courtRulingFlag(application.kind, application.state, outcome), application.decideTurn)]);
}
/** An application with what the court has said of it by this week. */
export function courtOrderRecord(campaign, application, outcome) {
    const { id, kind, state, appliedTurn, decideTurn } = application;
    if (campaign.turn < decideTurn || !outcome)
        return { id, kind, state, appliedTurn, decideTurn, status: "pending" };
    if (outcome === "denied")
        return { id, kind, state, appliedTurn, decideTurn, status: "denied", outcome, cooldownEndsTurn: decideTurn + DENIAL_COOLDOWN_WEEKS };
    const termEndsTurn = decideTurn + courtOrderTermWeeks(kind);
    return { id, kind, state, appliedTurn, decideTurn, status: campaign.turn < termEndsTurn ? outcome : "expired", outcome, termEndsTurn };
}
/** Every application this administration has filed, newest first, optionally for one state, with the answers the court has given. */
export function courtOrderRecords(campaign, state) {
    return courtApplications(campaign, state).map((application) => courtOrderRecord(campaign, application, ruling(campaign, application)));
}
/** The newest application of this kind in this state, whatever became of it. */
export function courtOrderStatus(campaign, state, kind) {
    return courtOrderRecords(campaign, state).find((record) => record.kind === kind);
}
/** A granted or narrowed order of one of these kinds now running in this state, the widest first. */
export function liveCourtOrder(campaign, state, kinds) {
    return courtOrderRecords(campaign, state)
        .filter((record) => kinds.includes(record.kind) && (record.status === "granted" || record.status === "narrowed"))
        .sort((a, b) => Number(a.status === "narrowed") - Number(b.status === "narrowed") || b.decideTurn - a.decideTurn)[0];
}
/** The orders that authorize electronic surveillance (50 U.S.C. §1812). */
export const SURVEILLANCE_ORDER_KINDS = ["fisa-order", "title-iii-order"];
/**
 * The public losses an application can leave: an injunction denied or
 * narrowed in open court. Sealed orders lose in private and count for nothing
 * here; a leak is charged where the ruling lands.
 */
export function courtOrderLosses(campaign) {
    return courtOrderRecords(campaign).filter((record) => COURT_ORDER_KINDS[record.kind].public
        && (record.status === "denied" || record.outcome === "narrowed")).length;
}
/** How long collection under an order counts as evidence for the next application in the same state. */
export const SURVEILLANCE_EVIDENCE_WEEKS = 8;
/** The flag collection under a court order leaves on a state. */
export function surveilledUnderOrderFlag(state) {
    return `surveilled-under-order:${state}`;
}
/** Whether collection under a court order has run in this state recently enough to support another application. */
export function recentlySurveilled(campaign, state) {
    const prefix = `flagset:${surveilledUnderOrderFlag(state)}:`;
    return Object.keys(campaign.player.flags).some((key) => key.startsWith(prefix) && campaign.player.flags[key]
        && campaign.turn - Number(key.slice(prefix.length)) < SURVEILLANCE_EVIDENCE_WEEKS);
}
