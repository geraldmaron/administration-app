import { institutionDef, leaderRoleOf } from "./institutions.js";
import { appealGrantChance, courtStep, courtWeeks } from "./court-procedure.js";
import { scheduleSupremeArgument } from "./court-calendar.js";
import { benchForVotes } from "./court-votes.js";
import { narrowingPropensity } from "./background-docket.js";
import { districtForumFor } from "./lower-bench.js";
import { LOWER_BENCH_SOURCE_DATE } from "./lower-bench-source.js";
import { createRngStreams } from "./rng.js";
import { REMOVAL_REINSTATEMENT_CHANCE, removalProceedingId, removalSuit } from "./legal-exposure.js";
// A member removed from a commission seat the statute still protects sues to
// get it back. After Trump v. Slaughter (2026) a court bound by its reasoning
// is unlikely to agree, so the merits are priced in the administration's
// favor at every level, and the Supreme Court reads its own bench. The case
// runs on the common court clocks. If the member wins, the remedy is the one
// the removal cases describe: reinstatement where the seat can be returned
// (Slaughter's dissent, citing Vitarelli v. Seaton), and back pay from the
// removal otherwise (the remedy sought in Myers and Humphrey's Executor).
/** The position the removal question tests: a President's control of executive officers. */
const REMOVAL_LEAN = { economicLeftRight: 0, authLibertarian: 0.3, nationalistGlobalist: 0 };
/** What losing a removal case costs on the day; a design judgment below an order struck down. */
const REINSTATEMENT_COST = { standing: -0.02 };
function removalMatter(campaign, institution, removal) {
    const def = institutionDef(institution);
    const office = def?.offices[0];
    const name = campaign.people[removal.person]?.base.name;
    if (!def || !office || !name)
        return undefined;
    return {
        kind: "commission-removal", state: "DC",
        title: `${name} v. President of the United States`,
        parties: [{ name, role: "plaintiff" }, { name: "The President of the United States", role: "defendant" },
            { name: def.name, role: "defendant" }],
        injury: `Removed as ${office.title} on turn ${removal.turn}${removal.cause ? ` for ${removal.cause}` : " with no cause stated"}; the statute lets the seat be emptied only for cause.`,
        jurisdiction: "Federal-question action in the United States District Court for the District of Columbia (28 U.S.C. §1331).",
        question: `Does the statute's protection of ${office.title} survive the reasoning of Trump v. Slaughter?`,
        authority: "The seat's for-cause protection; U.S. Const. art. II, §1 and §3; Trump v. Slaughter, 609 U.S. 422 (2026).",
        disputedFacts: `Whether ${def.name} exercises executive power (rules with the force of law, enforcement, suits in court), which Slaughter holds must answer to the President.`,
        reliefSought: "Reinstatement by injunction or declaratory relief, and back pay from the removal.",
        affected: `${name} and ${office.title}.`,
    };
}
function opened(campaign, institution, removal) {
    const matter = removalMatter(campaign, institution, removal);
    if (!matter)
        return undefined;
    const id = removalProceedingId(institution, removal);
    const forum = districtForumFor(undefined, id, campaign.seed);
    return { id, subject: { kind: "commission-removal", institution, person: removal.person, removalTurn: removal.turn },
        matter, filedTurn: campaign.turn, stage: "threshold", nextTurn: campaign.turn,
        lowerForum: { id: forum.id, court: forum.court, circuit: forum.circuit, sourceDate: LOWER_BENCH_SOURCE_DATE,
            authorized: forum.authorized, activeRepublican: forum.activeRepublican, activeDemocratic: forum.activeDemocratic, vacancies: forum.vacancies },
        history: [{ turn: campaign.turn, stage: "threshold", account: `${matter.parties[0].name} sues to be reinstated; the court has not ruled.` }] };
}
/** Each justice's chance of reinstating: Slaughter's level for the bench as a whole, spread by how far each sits from the executive's position. */
export function justiceReinstatementVotes(campaign, draw) {
    const bench = benchForVotes(campaign).filter((justice) => !justice.recused);
    const leans = bench.map((justice) => narrowingPropensity(REMOVAL_LEAN, justice.member));
    const mean = leans.reduce((sum, value) => sum + value, 0) / Math.max(1, leans.length);
    return bench.map((justice, index) => ({ justice: justice.person, seat: justice.seat,
        vote: draw < Math.min(0.95, REMOVAL_REINSTATEMENT_CHANCE * leans[index] / mean) ? "strike" : "uphold" }));
}
/** Reinstatement when the seat can be returned to a living member who holds nothing else; otherwise back pay only. */
export function removalRemedy(campaign, subject) {
    const def = institutionDef(subject.institution);
    const person = campaign.people[subject.person];
    const runtime = campaign.institutions[subject.institution];
    if (def && person?.alive && person.currentRole === undefined && runtime && runtime.leader === undefined) {
        return { words: `${person.base.name} is reinstated as ${def.offices[0]?.title ?? "the officer"}, with back pay from the removal. An acting officer in the seat steps aside.`,
            effects: [{ kind: "institution", institution: def.id, vacate: true, changes: { leader: person.base.id, vacancy: false, vacantDays: 0 } },
                { kind: "person", person: person.base.id, changes: { currentRole: leaderRoleOf(def), loyaltyAtAppointment: person.base.loyalty } }] };
    }
    return { effects: [], words: `The seat cannot be returned${person?.alive ? ", because it has been filled or the member now serves elsewhere" : ""}; the court declares the removal unlawful and awards back pay from the removal.` };
}
function finalEffects(campaign, proceeding, holding, votes, forum) {
    const subject = proceeding.subject;
    const remedy = holding === "struck-down" ? removalRemedy(campaign, subject) : undefined;
    const majority = remedy ? `The removal was unlawful. ${remedy.words}`
        : "On the reasoning of Trump v. Slaughter the President may remove this officer; the removal stands and no remedy issues.";
    const settled = courtStep(proceeding, "final", campaign.turn, majority);
    const record = { id: proceeding.id, subject, matter: proceeding.matter, question: proceeding.matter.question,
        ground: "forbidden", filedTurn: proceeding.filedTurn, dueTurn: proceeding.nextTurn, ruledTurn: campaign.turn, holding, votes,
        opinion: { majority }, procedure: { forum, ...(proceeding.lower ? { lower: proceeding.lower.holding } : {}),
            ...(proceeding.lowerForum ? { lowerForum: proceeding.lowerForum } : {}), ...(proceeding.circuit ? { circuit: proceeding.circuit } : {}),
            ...(proceeding.appeal ? { appeal: proceeding.appeal } : {}), history: settled.history } };
    return [{ kind: "courtProceeding", set: settled }, { kind: "courtCase", set: record }, ...(remedy?.effects ?? []),
        ...(remedy ? [{ kind: "metric", deltas: REINSTATEMENT_COST }] : []),
        { kind: "feed", items: [{ turn: campaign.turn, kind: "governance", visibility: "public",
                    headline: remedy ? `A court rules ${proceeding.matter.parties[0].name}'s removal unlawful.` : `A court lets ${proceeding.matter.parties[0].name}'s removal stand.`,
                    facts: { instrument: proceeding.matter.title, stake: majority, topicTags: ["judiciary"] } }] }];
}
function lowerStep(campaign, proceeding, draw) {
    const set = (next) => [{ kind: "courtProceeding", set: next }];
    const holding = draw < REMOVAL_REINSTATEMENT_CHANCE ? "struck-down" : "upheld";
    if (proceeding.stage === "lower-merits")
        return set(courtStep(proceeding, "circuit-merits", campaign.turn, `The district court ${holding === "struck-down" ? "finds the removal unlawful; its judgment waits on appeal" : "upholds the removal"}. The losing side appeals to the D.C. Circuit.`, { lower: { holding, ruledTurn: campaign.turn, ground: "forbidden", enforcement: "stayed-pending-appeal", modeledStrikeChance: REMOVAL_REINSTATEMENT_CHANCE, draw } }, campaign.turn + courtWeeks(campaign.seed, proceeding.id, "circuitMerits")));
    return set(courtStep(proceeding, "appeal", campaign.turn, `The D.C. Circuit ${holding === "struck-down" ? "holds the removal unlawful" : "upholds the removal"}; the losing side may petition the Supreme Court.`, { circuit: { court: proceeding.lowerForum?.circuit ?? "D.C.", ruledTurn: campaign.turn, holding, votes: [] } }, campaign.turn + courtWeeks(campaign.seed, proceeding.id, "certDisposition")));
}
function supremeStep(campaign, proceeding, draw) {
    if (proceeding.calendar?.status === "scheduled" || proceeding.calendar?.status === "carried")
        return [{ kind: "courtProceeding", set: { ...courtStep(proceeding, "supreme-merits", campaign.turn, "The Supreme Court hears argument on the removal.", { calendar: { ...proceeding.calendar, status: "argued" } }), nextTurn: proceeding.calendar.opinionTurn } }];
    const votes = justiceReinstatementVotes(campaign, draw);
    if (votes.length < 6)
        return [{ kind: "courtProceeding", set: { ...courtStep(proceeding, "supreme-merits", campaign.turn, "Fewer than six justices can sit; the removal case waits."), nextTurn: campaign.turn + 4 } }];
    const strikes = votes.filter((vote) => vote.vote === "strike").length;
    const holding = strikes * 2 === votes.length ? proceeding.circuit.holding : strikes * 2 > votes.length ? "struck-down" : "upheld";
    return finalEffects(campaign, { ...proceeding, appeal: strikes * 2 === votes.length ? "equally-divided" : "majority" }, holding, votes, "supreme");
}
function advance(campaign, proceeding) {
    if (campaign.turn < proceeding.nextTurn || proceeding.stage === "final")
        return [];
    const draw = createRngStreams(campaign.seed).stream("court-procedure", proceeding.id, proceeding.stage).next();
    const set = (next) => [{ kind: "courtProceeding", set: next }];
    switch (proceeding.stage) {
        case "threshold":
            return set(courtStep(proceeding, "interim", campaign.turn, "The court accepts the removal suit and hears the request for interim reinstatement.", {}, proceeding.filedTurn + courtWeeks(campaign.seed, proceeding.id, "interim")));
        case "interim":
            // Interim relief needs a likely win, and after Slaughter the member is unlikely to win.
            return set(courtStep(proceeding, "lower-merits", campaign.turn, "The court declines interim reinstatement; the member is unlikely to succeed on the merits.", { interim: "denied" }, proceeding.filedTurn + courtWeeks(campaign.seed, proceeding.id, "lowerMerits")));
        case "lower-merits":
        case "circuit-merits":
            return lowerStep(campaign, proceeding, draw);
        case "appeal": {
            const circuit = proceeding.circuit;
            if (!circuit)
                throw new Error(`removal appeal has no circuit judgment: ${proceeding.id}`);
            if (draw >= appealGrantChance("silent", circuit.holding))
                return finalEffects(campaign, { ...proceeding, appeal: "denied" }, circuit.holding, [], "circuit");
            const calendar = scheduleSupremeArgument(campaign);
            return set({ ...courtStep(proceeding, "supreme-merits", campaign.turn, `The Supreme Court grants review; argument is set for its October ${calendar.termYear} calendar.`, { appeal: "granted", calendar }), nextTurn: calendar.argumentTurn });
        }
        case "supreme-merits":
            return supremeStep(campaign, proceeding, draw);
        case "remand":
            return [];
    }
}
/** Every contested removal whose member has decided to sue opens one proceeding, and each open one takes its next dated step. */
export function removalMatterEffects(campaign) {
    return Object.values(campaign.institutions).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).flatMap((runtime) => (runtime.contestedRemovals ?? []).flatMap((removal) => {
        const id = removalProceedingId(runtime.id, removal);
        const existing = campaign.judiciary.proceedings?.find((entry) => entry.id === id);
        if (existing)
            return advance(campaign, existing);
        const suit = removalSuit(campaign, runtime.id, removal);
        if (!suit.sues || campaign.turn < suit.decidesTurn || campaign.judiciary.cases.some((entry) => entry.id === id))
            return [];
        const filing = opened(campaign, runtime.id, removal);
        return filing ? [{ kind: "courtProceeding", set: filing }] : [];
    }));
}
