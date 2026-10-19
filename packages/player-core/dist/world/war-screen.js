import { REPORT_WINDOW_DAYS, calledCompactsIn, campaignDay, hasIntelOnNation, nationName, outstandingIssuedAuthorizationActs, sentenceCase, selectAuthorizationAgainst, projectCallAnswers, projectLeave, projectPeace, selectCallableCompacts, selectObligations, sideOf, terminationClockRuns, terminationDaysRemaining, terminationWindowFromIntroduction, } from "@admin/engine";
import { organizationById } from "@admin/world";
import { formatDate } from "../format/figures";
import { placeForces } from "../geo/force-placement";
import { intensityWord } from "./conflict-intensity";
import { warAgeLine, warBeatDate } from "./war-age";
import { warFileReading } from "./war-file";
import { dueIn, reportStanding, warPartyForces } from "./war-powers-reading";
// One war as a screen reads it: who is on each side and why they came, how hot
// the front is and how much each side has left, where forces stand, the War
// Powers paper the President owes, and which doors are open. Every figure comes
// from the engine's own readers; a side the services cannot read is shown as
// unread rather than guessed at.
export const SIDE_LABEL = { aggressor: "The attacking side", defender: "The defending side" };
const STATUS_WORD = {
    active: "Under way",
    "aggressor-victory": "Ended. The attacker won.",
    "defender-victory": "Ended. The defender won.",
    settled: "Settled",
};
function supportWord(value) {
    if (value >= 0.6)
        return "Firm";
    if (value >= 0.35)
        return "Wavering";
    return "Thin";
}
function exhaustionWord(value) {
    if (value >= 0.6)
        return "Spent";
    if (value >= 0.3)
        return "Wearing";
    return "Fresh";
}
export function nationNameIn(campaign, nation) {
    return campaign.nations[nation]?.base.identity.name ?? nation;
}
/** A government as a sentence carries it: "the United States", "Iran". */
function nationPhrase(campaign, nation) {
    const identity = campaign.nations[nation]?.base.identity;
    return identity ? nationName(identity) : nation;
}
function casualtyWords(band) {
    if (!band)
        return undefined;
    const confidence = band.confidence === "high" ? "counted" : band.confidence === "medium" ? "estimated" : "a rough estimate";
    const range = (low, high) => `${low.toLocaleString("en-US")} to ${high.toLocaleString("en-US")}`;
    return `${range(band.killed.low, band.killed.high)} killed and ${range(band.wounded.low, band.wounded.high)} wounded (${confidence})`;
}
function membersOf(campaign, conflict, side, reasons, committed) {
    const us = campaign.founding.nation;
    const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
    return [principal, ...conflict.joined[side]].map((nation, index) => ({
        nation,
        name: nationNameIn(campaign, nation),
        role: index === 0 ? "principal" : "joined",
        us: nation === us,
        reasons: reasons.get(nation) ?? [],
        committed: committed.get(nation) ?? [],
    }));
}
function readSide(campaign, conflict, side, file, committed) {
    const reasons = new Map(file.joiners.filter((joiner) => joiner.side === side).map((joiner) => [joiner.nation, joiner.reasons.map((line) => line.text)]));
    const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
    // The services read a government's will to fight only where they read the government; the United States' own side is always legible.
    const legible = hasIntelOnNation(campaign, principal);
    const casualties = casualtyWords(file.casualties[side]);
    return {
        side,
        label: SIDE_LABEL[side],
        members: membersOf(campaign, conflict, side, reasons, committed),
        ...(legible ? { support: { value: conflict.warSupport[side], word: supportWord(conflict.warSupport[side]) } } : {}),
        ...(legible ? { exhaustion: { value: conflict.exhaustion[side], word: exhaustionWord(conflict.exhaustion[side]) } } : {}),
        ...(casualties ? { casualties } : {}),
        likely: file.likelyJoiners[side].map((joiner) => ({ nation: joiner.nation, name: nationNameIn(campaign, joiner.nation), forecast: joiner.forecast })),
    };
}
/** Forces the President has committed to this war: against its belligerents, or to the war itself. */
function warForces(campaign, conflict) {
    const belligerents = new Set([conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender]);
    const ours = new Set(Object.values(campaign.commitments)
        .filter((commitment) => commitment.status === "active" && ((commitment.target.kind === "conflict" && commitment.target.id === conflict.id) || (commitment.target.kind === "nation" && belligerents.has(commitment.target.id))))
        .map((commitment) => commitment.id));
    return placeForces(campaign)
        .filter((placement) => ours.has(placement.id) || belligerents.has(placement.zone))
        .map((placement) => ({
        id: placement.id,
        label: placement.label,
        zoneName: placement.zoneName,
        precision: placement.precision,
        point: placement.point,
        personnel: placement.personnel,
        ...(placement.service ? { service: placement.service } : {}),
        ...(placement.personnelBand ? { band: placement.personnelBand } : {}),
    }));
}
/** One introduction of force as its War Powers paper: the report, the sixty days, and Congress's answer on the government it targets. */
export function paperOf(campaign, obligation) {
    const standing = reportStanding(obligation);
    const day = terminationDaysRemaining(campaign, obligation);
    return {
        id: obligation.id,
        description: obligation.description,
        against: obligation.target,
        report: standing,
        ...(standing === "Owed" ? { reportClock: dueIn(campaign, Math.max(0, obligation.dueDay - campaignDay(campaign)), REPORT_WINDOW_DAYS, (date) => `Report to Congress by ${date}`) } : {}),
        ...(terminationClockRuns(campaign, obligation) ? { withdrawal: dueIn(campaign, day, terminationWindowFromIntroduction(obligation), (date) => `Troops must leave by ${date} unless Congress votes`) } : {}),
        authorization: authorizationOf(campaign, obligation.target, pendingTargets(campaign)),
    };
}
function warPapers(campaign, conflict) {
    const us = campaign.founding.nation;
    const side = sideOf(conflict, us);
    if (!side)
        return [];
    const enemies = new Set(side === "aggressor" ? [conflict.defender, ...conflict.joined.defender] : [conflict.aggressor, ...conflict.joined.aggressor]);
    return selectObligations(campaign)
        .filter((obligation) => enemies.has(obligation.target) && !obligation.terminated)
        .map((obligation) => paperOf(campaign, obligation));
}
function peaceOf(campaign, conflict) {
    const projection = projectPeace(campaign, conflict.id);
    if (!projection)
        return undefined;
    return {
        counterpart: projection.counterpartName,
        offered: projection.offered,
        forecast: projection.forecast,
        reasoning: projection.reasoning,
        joined: conflict.joined[projection.ourSide].includes(campaign.founding.nation),
    };
}
function pendingTargets(campaign) {
    return new Set(outstandingIssuedAuthorizationActs(campaign).map((act) => act.target));
}
function authorizationOf(campaign, nation, pending) {
    const covered = selectAuthorizationAgainst(campaign, nation);
    return {
        nation,
        name: nationNameIn(campaign, nation),
        state: covered ? "covered" : pending.has(nation) ? "pending" : "open",
        ...(covered ? { title: covered.title } : {}),
    };
}
function authorizationsOf(campaign, conflict) {
    const pending = pendingTargets(campaign);
    return [conflict.aggressor, conflict.defender].map((nation) => authorizationOf(campaign, nation, pending));
}
function compactsOf(campaign, conflictId) {
    const called = new Set(calledCompactsIn(campaign, conflictId));
    return selectCallableCompacts(campaign)
        .filter((entry) => entry.conflict === conflictId)
        .map((entry) => ({
        org: entry.org,
        name: organizationById.get(entry.org)?.name ?? entry.orgName,
        called: called.has(entry.org),
        answers: projectCallAnswers(campaign, entry.org, conflictId).map((joiner) => ({ nation: joiner.nation, name: nationNameIn(campaign, joiner.nation), forecast: joiner.forecast })),
    }));
}
/** One war's screen reading. Undefined for a war not on the board. */
export function warScreenReading(campaign, id) {
    const file = warFileReading(campaign, id);
    if (!file)
        return undefined;
    const { conflict } = file;
    const us = campaign.founding.nation;
    const usSide = sideOf(conflict, us);
    const parties = warPartyForces(campaign, id);
    const everyone = [...(parties?.aggressor ?? []), ...(parties?.defender ?? [])];
    const members = everyone.map((party) => party.nation);
    const committed = new Map(everyone.map((party) => [party.nation, party.committed]));
    const aggressor = nationPhrase(campaign, conflict.aggressor);
    const defender = nationPhrase(campaign, conflict.defender);
    const over = conflict.status !== "active";
    const peace = !over && usSide ? peaceOf(campaign, conflict) : undefined;
    return {
        id,
        conflict,
        title: `${sentenceCase(aggressor)} against ${defender}`,
        cause: conflict.cause,
        age: warAgeLine(campaign, conflict),
        over,
        statusWord: STATUS_WORD[conflict.status],
        usRole: !usSide ? "outside" : conflict.joined[usSide].includes(us) ? "joined" : "principal",
        ...(usSide ? { usSide } : {}),
        intensity: { value: conflict.intensity, word: intensityWord(conflict.intensity) },
        sides: { aggressor: readSide(campaign, conflict, "aggressor", file, committed), defender: readSide(campaign, conflict, "defender", file, committed) },
        forces: warForces(campaign, conflict),
        papers: over ? [] : warPapers(campaign, conflict),
        ...(peace ? { peace } : {}),
        canLeave: !over && projectLeave(campaign, id)?.refusal === undefined && projectLeave(campaign, id) !== undefined,
        compacts: over ? [] : compactsOf(campaign, id),
        authorizations: over || usSide ? [] : authorizationsOf(campaign, conflict),
        set: members.map((nation) => `nation:${nation}`).join("|"),
        beats: conflict.beats.map((beat) => ({ date: formatDate(warBeatDate(campaign, beat.turn)), description: beat.description })),
    };
}
