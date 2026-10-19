import { apply, appointmentPool, bandedAgainstList, candidateFit, committeeName, confirmationVote, fillVacantOffices, institutionDef, isConsensus, nomineeCrossesTheAisle, officeDef, openNomination, presidentFit, seatKindOf, selectPerson, selectPipelineReading, vettingFindings, } from "@admin/engine";
import { judgeAttribute } from "../government/machine-readings";
import { caucusName, caucusParty } from "../congress/party-words";
import { packetCost } from "../dossier/person-lever";
import { benchReading } from "../judiciary/courts";
import { vacancyBoard } from "../oversight/appointments-pipeline";
import { reasonWords, whyLine } from "./reason-words";
/** How many names a seat sets out: enough to choose between, each counted against today's Senate. */
export const DESK_CANDIDATES = 8;
const GROUP_ORDER = ["cabinet", "agencies", "courts"];
function groupOf(kind) {
    if (kind === "cabinet")
        return "cabinet";
    return kind === "justice" || kind === "circuit" ? "courts" : "agencies";
}
/** Every open seat the Senate confirms with nobody before it: the vacancy board's, and any Supreme Court seat it does not list. */
function openSeats(campaign) {
    const board = vacancyBoard(campaign).open;
    const listed = new Set(board.map((row) => row.office));
    const court = benchReading(campaign).seats.flatMap((seat) => {
        if (!seat.vacant || seat.pending || listed.has(seat.office))
            return [];
        const days = campaign.institutions[seat.institution]?.vacantDays ?? 0;
        return [{ office: seat.office, institution: seat.institution, title: seat.title, body: institutionDef(seat.institution)?.name ?? seat.title, days }];
    });
    return [...board, ...court].filter((row) => seatKindOf(row.office) !== undefined);
}
function readingsFor(kind, person) {
    const second = kind === "justice" || kind === "circuit" || kind === "joint-chiefs" ? "integrity" : "loyalty";
    return [judgeAttribute("competence", person.competence), judgeAttribute(second, person[second])];
}
function objectionsTo(campaign, kind, committee, person, vote) {
    const own = vote.byCaucus.administration;
    const other = vote.byCaucus.opposition;
    const panel = committee ? `The ${committeeName(committee)}` : "The committee";
    return [
        ...(own.seats - own.yeas > 0 ? [`${own.seats - own.yeas} members of the ${caucusName(caucusParty(campaign, "administration"))} vote no`] : []),
        ...(other.seats - other.yeas > 0 ? [`${other.seats - other.yeas} members of the ${caucusName(caucusParty(campaign, "opposition"))} vote no`] : []),
        ...(kind === "cabinet" && nomineeCrossesTheAisle(campaign, person.id) ? ["Your own cabinet secretaries are unhappy that this job is going to the other party"] : []),
        ...vettingFindings(person).map((finding) => `${panel} objects to ${finding}`),
    ];
}
function candidateOf(campaign, office, kind, row, fit) {
    const person = row.person.base;
    const committee = officeDef(office)?.committee;
    const vote = confirmationVote(campaign, person.id);
    const opened = openNomination(campaign, office, person.id);
    return {
        personId: person.id,
        name: person.name,
        why: whyLine(row.reasons),
        reasons: row.reasons.map(reasonWords),
        fit,
        crossesAisle: nomineeCrossesTheAisle(campaign, person.id),
        readings: readingsFor(kind, person),
        vote,
        consensus: isConsensus(vote),
        vetting: vettingFindings(person),
        objections: objectionsTo(campaign, kind, committee, person, vote),
        cost: opened.ok ? packetCost(opened.packet) : {},
        ...(opened.ok ? {} : { unavailable: opened.reason }),
    };
}
function seatOf(campaign, open) {
    const kind = seatKindOf(open.office);
    if (!kind)
        return undefined;
    const pool = appointmentPool(campaign, open.office);
    const shown = pool.slice(0, DESK_CANDIDATES);
    const president = presidentFit(campaign);
    const bands = bandedAgainstList(shown.map((row) => candidateFit(row.person.base, president)));
    const committee = officeDef(open.office)?.committee;
    return {
        ...open,
        group: groupOf(kind),
        kind,
        ...(committee ? { committee: committeeName(committee) } : {}),
        candidates: shown.map((row, index) => candidateOf(campaign, open.office, kind, row, bands[index].band)),
        eligible: pool.length,
    };
}
/**
 * The recommended name for each seat in desk order: the best fit nobody
 * earlier on the desk is already recommended for, so the defaults never send
 * one person up for two seats. Supreme Court seats are left unpicked.
 */
function withRecommendations(seats) {
    const taken = new Set();
    return seats.map((seat) => {
        if (seat.kind === "justice")
            return seat;
        const pick = seat.candidates.find((candidate) => !candidate.unavailable && !taken.has(candidate.personId));
        if (!pick)
            return seat;
        taken.add(pick.personId);
        return { ...seat, recommended: pick.personId };
    });
}
/** Every open Senate-confirmed seat, cabinet then agencies then courts, longest open first in each; `only` narrows it to some. */
export function appointmentDesk(campaign, only) {
    const seats = openSeats(campaign)
        .flatMap((open) => seatOf(campaign, open) ?? [])
        .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || b.days - a.days || a.title.localeCompare(b.title));
    const recommended = withRecommendations(seats);
    return { seats: only ? recommended.filter((seat) => only(seat)) : recommended, pipeline: selectPipelineReading(campaign) };
}
/**
 * The names a desk sends: the President's choice where they made one (none
 * leaves the seat open), otherwise the best fit nobody else on the desk is
 * picked for. A choice comes first, so picking for one seat the name another
 * seat was defaulting to moves that seat's default to its next name rather
 * than sending one person up twice. A Supreme Court seat is never filled by
 * default.
 */
export function deskPicks(desk, chosen = {}) {
    const taken = new Set(Object.values(chosen).filter((person) => typeof person === "string"));
    return desk.seats.flatMap((seat) => {
        const choice = chosen[seat.office];
        if (choice !== undefined)
            return choice ? [{ office: seat.office, person: choice }] : [];
        if (seat.kind === "justice")
            return [];
        const next = seat.candidates.find((candidate) => !candidate.unavailable && !taken.has(candidate.personId));
        if (!next)
            return [];
        taken.add(next.personId);
        return [{ office: seat.office, person: next.personId }];
    });
}
/** Each seat's recommended name, as the picks a desk opens with. */
export function deskDefaults(desk) {
    return deskPicks(desk);
}
function sumCosts(costs) {
    return costs.reduce((total, cost) => {
        const next = { ...total };
        for (const [key, delta] of Object.entries(cost))
            next[key] = (next[key] ?? 0) + (delta ?? 0);
        return next;
    }, {});
}
function nameOf(campaign, person) {
    return selectPerson(campaign, person)?.base.name ?? "A nominee";
}
/**
 * The nominations the picks send, one packet per seat, each built on the state
 * the ones before it leave: the engine's own batch, so a person picked for two
 * seats goes up for the first and is refused for the second, and the refusal
 * says why.
 */
export function deskPlan(campaign, picks) {
    const offices = picks.map((pick) => pick.office);
    const chosen = Object.fromEntries(picks.map((pick) => [pick.office, pick.person]));
    const packets = fillVacantOffices(campaign, offices, chosen);
    const after = packets.reduce(apply, campaign);
    const sent = new Set(packets.flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "nomination" && effect.nomination ? [effect.nomination.office] : []))));
    const title = (office) => officeDef(office)?.title ?? office;
    return {
        packets,
        lines: picks.filter((pick) => sent.has(pick.office)).map((pick) => ({ office: pick.office, title: title(pick.office), name: nameOf(campaign, pick.person) })),
        refused: picks.filter((pick) => !sent.has(pick.office)).map((pick) => {
            const result = openNomination(after, pick.office, pick.person);
            return { office: pick.office, title: title(pick.office), name: nameOf(campaign, pick.person), reason: result.ok ? "This nomination wasn't sent." : result.reason };
        }),
        cost: sumCosts(packets.map(packetCost)),
    };
}
