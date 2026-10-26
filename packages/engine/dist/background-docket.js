import { selectTurnOfDate } from "./clock.js";
import { createRngStreams, hashFraction } from "./rng.js";
import { benchForVotes } from "./court-votes.js";
import { ideologyDistanceFromLean } from "./strike-odds.js";
// The Supreme Court's own docket: thousands of petitions a term that answer no
// act of this President. Kept aggregate. The few rulings that change law the
// engine reads, the doctrines that decide the President's own cases, are
// selected and recorded as cases; the rest is a count.
/**
 * The aggregate the docket is drawn around: the 2024 Term had 3,856 filings,
 * 73 argued cases and 56 signed opinions (Chief Justice's 2025 Year-End
 * Report, supremecourt.gov, opened 2026-10-25).
 */
const TERM_FILINGS = 3856;
const TERM_ARGUED = 73;
const TERM_SIGNED_OPINIONS = 56;
/**
 * The chance a term brings a consequential ruling on one modeled doctrine.
 * A design judgment: across six doctrines it gives about one ruling a term
 * that changes how the President's own acts are reviewed, a small share of
 * the argued cases.
 */
export const DOCTRINE_RULING_CHANCE = 0.18;
/** How far one ruling moves later merits on its doctrine, and the most precedent can move them. */
export const DOCTRINE_STEP = 0.06;
export const DOCTRINE_CAP = 0.15;
export const DOCTRINES = [
    { id: "emergency-powers", question: "How far an emergency statute lets the President act without a further act of Congress.",
        orders: ["order-asset-seizure", "order-emergency-construction"], lean: { economicLeftRight: 0, authLibertarian: 0.25, nationalistGlobalist: 0.15 },
        petitioner: "Calloway Freight Cooperative", respondent: "Department of the Treasury" },
    { id: "immigration-entry", question: "How much a court may review the President's findings when restricting entry.",
        orders: ["order-border-controls", "order-entry-suspension"], lean: { economicLeftRight: 0, authLibertarian: 0.25, nationalistGlobalist: 0.3 },
        petitioner: "Ortega Family Sponsors Network", respondent: "Department of Homeland Security" },
    { id: "spending-conditions", question: "When the executive may attach conditions to money Congress gave the states.",
        orders: ["order-grant-conditions", "order-relief-program"], lean: { economicLeftRight: -0.1, authLibertarian: 0.15, nationalistGlobalist: 0 },
        petitioner: "Lakeshore County Commission", respondent: "Department of Justice" },
    { id: "agency-procedure", question: "What record an agency must build before a rule takes effect.",
        orders: ["order-energy-leasing", "order-clean-energy", "order-regulatory-review"], lean: { economicLeftRight: 0.1, authLibertarian: 0.1, nationalistGlobalist: 0 },
        petitioner: "Harbor Fisheries Association", respondent: "Department of the Interior" },
    { id: "domestic-force", question: "Where federal officers may act to protect federal property inside a state.",
        orders: ["order-force-protection"], lean: { economicLeftRight: 0, authLibertarian: 0.35, nationalistGlobalist: 0.1 },
        petitioner: "Riverside Assembly Project", respondent: "Department of Homeland Security" },
    { id: "economic-direction", question: "How far the executive may direct private production and prices.",
        orders: ["order-price-controls", "order-defense-production"], lean: { economicLeftRight: -0.3, authLibertarian: 0.2, nationalistGlobalist: 0.1 },
        petitioner: "Prairie Millers Guild", respondent: "Department of Commerce" },
];
const jitter = (value, key) => Math.round(value * (0.9 + 0.2 * hashFraction(key)));
/** The term's aggregate docket, the same for a seed every time it is read. */
export function docketTerm(campaign, termYear) {
    const key = `${campaign.seed}:docket:${termYear}`;
    return {
        termYear,
        filings: jitter(TERM_FILINGS, `${key}:filings`),
        argued: jitter(TERM_ARGUED, `${key}:argued`),
        signedOpinions: jitter(TERM_SIGNED_OPINIONS, `${key}:opinions`),
        consequential: DOCTRINES.filter((doctrine) => createRngStreams(campaign.seed).stream("background-docket", termYear, doctrine.id).next() < DOCTRINE_RULING_CHANCE)
            .map((doctrine) => doctrine.id),
    };
}
/** A justice's inclination to rule against the executive on a question; the same shape as an order's merits. */
export function narrowingPropensity(lean, member) {
    const institutional = 0.35;
    const base = 0.15 + institutional * 0.8;
    const skill = member.integrity * 0.55 + member.competence * 0.45;
    return base * 0.55 + ideologyDistanceFromLean(member.ideology, lean) * 0.28 + institutional * 0.25 + (1 - skill) * 0.12;
}
function rulingCase(campaign, doctrine, termYear, filedTurn) {
    const bench = benchForVotes(campaign).filter((justice) => !justice.recused);
    if (bench.length < 6)
        return undefined;
    const draw = createRngStreams(campaign.seed).stream("background-ruling", termYear, doctrine.id).next();
    const votes = bench.map((justice) => ({ justice: justice.person, seat: justice.seat,
        vote: draw < narrowingPropensity(doctrine.lean, justice.member) ? "strike" : "uphold" }));
    const strikes = votes.filter((vote) => vote.vote === "strike").length;
    if (strikes * 2 === votes.length)
        return undefined;
    const holding = strikes * 2 > votes.length ? "struck-down" : "upheld";
    const title = `${doctrine.petitioner} v. ${doctrine.respondent}`;
    return { id: `case:docket:${termYear}:${doctrine.id}`, subject: { kind: "background-docket", termYear, doctrine: doctrine.id },
        matter: { title, parties: [{ name: doctrine.petitioner, role: "plaintiff" }, { name: doctrine.respondent, role: "defendant" }],
            injury: "A party outside this administration's own acts.", jurisdiction: "Certiorari to a federal court of appeals.",
            question: doctrine.question, authority: "The statutes and clauses the doctrine reads.", disputedFacts: "None this administration supplied.",
            reliefSought: "A ruling on the doctrine.", affected: `Later challenges to ${doctrine.orders.length} kinds of executive order.` },
        question: doctrine.question, ground: "silent", filedTurn, dueTurn: campaign.turn, ruledTurn: campaign.turn, holding, votes,
        opinion: { majority: holding === "struck-down"
                ? `In ${title}, the Court narrows the executive's reading; later orders on this doctrine face stiffer review.`
                : `In ${title}, the Court sustains the executive's reading; later orders on this doctrine meet a more deferential bench.` } };
}
/** In the late-June opinion week, the term's consequential rulings are recorded as cases. */
export function backgroundDocketEffects(campaign) {
    const termYear = campaign.calendar.year - 1;
    if (selectTurnOfDate(campaign, { year: termYear + 1, month: 6, day: 30 }) !== campaign.turn)
        return [];
    const filedTurn = selectTurnOfDate(campaign, { year: termYear, month: 10, day: 1 });
    const recorded = new Set(campaign.judiciary.cases.map((entry) => entry.id));
    return docketTerm(campaign, termYear).consequential.flatMap((id) => {
        const doctrine = DOCTRINES.find((entry) => entry.id === id);
        const ruled = rulingCase(campaign, doctrine, termYear, filedTurn);
        if (!ruled || recorded.has(ruled.id))
            return [];
        return [{ kind: "courtCase", set: ruled }, { kind: "feed", items: [{ turn: campaign.turn, kind: "governance",
                        visibility: "public", headline: `The Supreme Court ${ruled.holding === "struck-down" ? "narrows" : "upholds"} executive power in ${ruled.matter.title}.`,
                        facts: { instrument: ruled.matter.title, stake: doctrine.question.replace(/\.$/, ""), topicTags: ["judiciary"] } }] }];
    });
}
/** How far precedent has moved the merits for an order: up when the Court has narrowed its doctrine. */
export function doctrineShift(campaign, orderId) {
    const families = new Set(DOCTRINES.filter((doctrine) => doctrine.orders.includes(orderId)).map((doctrine) => doctrine.id));
    const total = campaign.judiciary.cases.reduce((sum, entry) => entry.subject?.kind === "background-docket" && families.has(entry.subject.doctrine)
        ? sum + (entry.holding === "struck-down" ? DOCTRINE_STEP : -DOCTRINE_STEP) : sum, 0);
    return Math.round(Math.max(-DOCTRINE_CAP, Math.min(DOCTRINE_CAP, total)) * 1000) / 1000 + 0;
}
