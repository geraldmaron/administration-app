import { addDays, campaignFoundingDate, contestAhead, contestDay, daysBetween, marginHalfWidth, matchupKnown, opposingParty, selectOpponent, usPartyWord, } from "@admin/engine";
import { electionProjectionReading } from "../congress/congress-reading";
import { formatDate } from "../format/figures";
import { BAND_CAPTION, BAND_WORD, opponentIntroduction, seasonStage } from "./finale-copy";
const CONE_STEP_DAYS = 28;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const COMMITTEE_WORD = "a committee chair in Congress";
function officeOf(campaign, runtime) {
    const roles = runtime.base.eligibleRoles.map(String);
    const party = usPartyWord(opposingParty(campaign));
    if (roles.includes("role-governor")) {
        const state = runtime.state ? campaign.states[runtime.state]?.base.name : undefined;
        return state ? `Governor of ${state}` : "a sitting governor";
    }
    if (roles.includes("role-congressional-leader"))
        return `a leader of the ${party}s in Congress`;
    if (roles.includes("role-opposition-leader"))
        return `the ${party}s' leader`;
    return COMMITTEE_WORD;
}
function raceOpponent(campaign, stage) {
    const opponent = selectOpponent(campaign);
    const runtime = opponent ? campaign.people[opponent.person] : undefined;
    if (!opponent || !runtime)
        return undefined;
    const party = usPartyWord(opposingParty(campaign));
    const office = officeOf(campaign, runtime);
    return {
        id: opponent.person,
        name: runtime.base.name,
        party,
        office,
        introduction: opponentIntroduction(stage, runtime.base.name, office, party),
    };
}
function conePoint(campaign, founded, date, share) {
    const half = marginHalfWidth(campaign, date);
    return {
        at: daysBetween(founded, date),
        label: formatDate(date),
        low: clamp01(share - half),
        high: clamp01(share + half),
    };
}
function cone(campaign, share) {
    const founded = campaignFoundingDate(campaign);
    const night = contestDay(campaign);
    const days = daysBetween(campaign.calendar, night);
    if (days < 0)
        return [];
    const steps = Math.floor(days / CONE_STEP_DAYS);
    const dates = Array.from({ length: steps + 1 }, (_, index) => addDays(campaign.calendar, index * CONE_STEP_DAYS));
    const withNight = days % CONE_STEP_DAYS === 0 ? dates : [...dates, night];
    return withNight.map((date) => conePoint(campaign, founded, date, share));
}
/** The race as it stands this week. Undefined once the President has no contest left to run. */
export function raceReading(campaign) {
    if (!contestAhead(campaign))
        return undefined;
    const projection = electionProjectionReading(campaign);
    const known = matchupKnown(campaign);
    const stage = seasonStage(known, true);
    const opponent = raceOpponent(campaign, stage);
    // With nobody on the other side's bench there is no matchup left to learn.
    const half = opponent ? marginHalfWidth(campaign) : 0;
    const founded = campaignFoundingDate(campaign);
    return {
        ...(opponent ? { opponent } : {}),
        stage,
        share: projection.share,
        low: clamp01(projection.share - half),
        high: clamp01(projection.share + half),
        known,
        bandWord: BAND_WORD[stage],
        caption: BAND_CAPTION[stage],
        ...(projection.electoralVotes === undefined ? {} : { electoralVotes: projection.electoralVotes }),
        electoralMajority: projection.electoralMajority,
        wouldHold: projection.wouldHold,
        contestDate: formatDate(contestDay(campaign)),
        todayAt: daysBetween(founded, campaign.calendar),
        contestAt: daysBetween(founded, contestDay(campaign)),
        cone: opponent ? cone(campaign, projection.share) : [],
    };
}
/** The opponent as the contest named them, for a night or an ending that is already decided. */
export function decidedOpponent(campaign) {
    return raceOpponent(campaign, "decided");
}
