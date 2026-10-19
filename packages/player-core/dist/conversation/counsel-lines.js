import { counselOnReply, dissentingCounsel, } from "@admin/engine";
import { charterOf } from "../campaign/founding-options";
import { roleTitle } from "../format/figures";
import { classPhrase } from "./labels";
const HIGH_CONVICTION = 0.7;
/**
 * How much of the room a minister's own ground buys them.
 *
 * Conviction alone is `person.competence`, which no campaign effect ever
 * moves, so a band read off it alone would never change for the life of a
 * campaign and the same Secretary would deliver every opinion in the same
 * register. Where they are standing is the other half: a Secretary is louder
 * about their own department's business than about somebody else's.
 */
const STAKE_CONVICTION = { owns: 0.12, standing: 0.04, outside: -0.08 };
function convictionBand(conviction, stake) {
    const spoken = conviction + STAKE_CONVICTION[stake];
    if (spoken > HIGH_CONVICTION)
        return "high";
    if (spoken >= 0.45)
        return "mid";
    return "low";
}
// How a spoken answer's register reads inside a sentence about it.
const TONE_ADJECTIVE = {
    conciliatory: "conciliatory",
    evasive: "noncommittal",
    principled: "principled",
    firm: "firm",
    coercive: "hard",
};
function articled(name) {
    const lowered = name.toLowerCase();
    return `${/^[aeiou]/.test(lowered) ? "an" : "a"} ${lowered}`;
}
/** The course as a noun phrase a sentence can carry — the rung's own catalogue name, the answer and the week it answers, or the war being entered. */
function courseNoun(course) {
    if (course.kind === "instrument")
        return articled(course.name);
    if (course.kind === "join") {
        return course.side === "beside" ? "entering their war beside them" : "entering the war against them";
    }
    const register = TONE_ADJECTIVE[course.tone];
    const subject = course.scenarioClass ? classPhrase(course.scenarioClass) : undefined;
    return subject === undefined ? `the ${register} answer` : `${articled(register)} answer to ${subject}`;
}
function hashIndex(seed, count) {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return count === 0 ? 0 : hash % count;
}
function whoLabel(counsel, titles) {
    return `${counsel.name} (${roleTitle(counsel.role, titles)})`;
}
function shortAgency(role, titles) {
    const title = roleTitle(role, titles);
    if (title.startsWith("Secretary of "))
        return title.slice("Secretary of ".length);
    if (title === "Attorney General")
        return "Justice";
    return title;
}
const FOR_INSTINCT_FOR = [
    (who, band, course) => band === "high"
        ? `${who} wants ${course} and wants it done now.`
        : band === "low"
            ? `${who} supports ${course}, though not strongly.`
            : `${who} supports ${course}. They know this area well.`,
    (who, band, course) => (band === "high" ? `${who} will defend ${course} to the cabinet if you choose it.` : `${who} would choose ${course} themselves.`),
    (who, band, course) => (band === "high" ? `${who} backs ${course} without reservation.` : `${who} backs ${course}, with some caution.`),
    (who, band, course) => band === "low" ? `${who} leans toward ${course} but won't press for it.` : `${who} thinks ${course} is exactly the kind of choice they'd make.`,
];
const FOR_INSTINCT_AGAINST = [
    (who, _band, course) => `${who} supports ${course} anyway. They worry more about walking away than about the odds.`,
    (who, band, course) => band === "high" ? `${who} supports ${course}, even though it isn't their usual instinct.` : `${who} would rather deal with the trouble ${course} brings than miss the chance.`,
    (who, _band, course) => `${who} supports ${course}, even if they would have put it differently.`,
    (who, band, course) => band === "low" ? `${who} agrees to ${course}, with clear doubts.` : `${who} supports ${course}. They think the gain is worth the political cost to them.`,
];
const FOR_THIN_ODDS = [
    (who, _band, course) => `${who} supports ${course}, even at these odds.`,
    (who, band, course) => (band === "high" ? `${who} says ${course} is a long shot worth taking.` : `${who} would rather try ${course} than do nothing.`),
    (who, _band, course) => `${who} backs ${course}, knowing the odds are poor.`,
    (who, band, course) => (band === "low" ? `${who} supports ${course}, but is ready to change course if it goes badly.` : `${who} accepts the risk in ${course}. They think waiting costs more.`),
];
const AGAINST_INSTINCT_FOR = [
    (who, _band, course) => `${who} is against ${course}. It runs against everything they believe.`,
    (who, band, course) => (band === "high" ? `${who} is firmly against ${course}.` : `${who} can't square ${course} with what they think is best for the country.`),
    (who, _band, course) => `${who} says ${course} asks them to give up too much.`,
    (who, band, course) => (band === "low" ? `${who} is against ${course}, but won't fight you on it.` : `${who} thinks ${course} is the wrong kind of pressure.`),
];
const AGAINST_INSTINCT_AGAINST = [
    (who, band, course) => band === "high"
        ? `${who} is against ${course}. Their instincts and the odds both say no, and they'll say so openly.`
        : `${who} is against ${course}. Their instincts and the odds both say no.`,
    (who, band, course) => (band === "high" ? `${who} will argue against ${course} in cabinet if you move ahead.` : `${who} sees nothing in ${course} that suits how they work.`),
    (who, band, course) => band === "high" ? `${who} opposes ${course} on principle and on cost, and wants that on the record.` : `${who} opposes ${course} on principle and on cost.`,
    (who, band, course) => (band === "low" ? `${who} is against ${course}, but only mildly.` : `${who} says no to ${course}, and means it.`),
];
const AGAINST_THIN_ODDS = [
    (who, _band, course) => `${who} is against ${course}. They think the odds are worse than the rest of the cabinet believes.`,
    (who, band, course) => (band === "high" ? `${who} says the odds don't justify the risk in ${course}.` : `${who} won't spend their influence on ${course} at these odds.`),
    (who, _band, course) => `${who} opposes ${course} because they don't think it can work.`,
    (who, band, course) => (band === "low" ? `${who} is against ${course}, mainly because the odds look too risky.` : `${who} thinks ${course} would need far better luck than you can count on.`),
];
const WARY_INSTINCT_FOR = [
    (who, _band, course) => `${who} won't stop you on ${course}, but wouldn't have proposed it.`,
    (who, band, course) => (band === "high" ? `${who} can accept ${course}, but won't pretend to like it.` : `${who} is wary of ${course}, even though it mostly fits their instincts.`),
    (who, _band, course) => `${who} says go ahead with ${course}, but keep talks open in private.`,
    (who, band, course) => (band === "low" ? `${who} has no strong view on ${course}.` : `${who} doesn't object to ${course}, only to how fast it's moving.`),
];
const WARY_INSTINCT_AGAINST = [
    (who, _band, course) => `${who} is wary of ${course}. It goes against their instincts, and they want a way out if it fails.`,
    (who, band, course) => (band === "high" ? `${who} won't block ${course}, but wants their doubts on the record.` : `${who} thinks ${course} is the kind of call that gets blamed later.`),
    (who, _band, course) => `${who} won't stop you on ${course}, but keeps asking what happens if it fails.`,
    (who, band, course) => (band === "low" ? `${who} is uneasy about ${course} and unlikely to defend it in public.` : `${who} says they can accept ${course} once, not twice.`),
];
const WARY_THIN_ODDS = [
    (who, band, course) => band === "high" ? `${who} won't stop you on ${course}, but says a failure would be yours to own.` : `${who} won't stop you on ${course}, but keeps pointing to the odds.`,
    (who, band, course) => (band === "high" ? `${who} accepts ${course} only if you take responsibility for a failure.` : `${who} is wary of ${course} because the odds give them nothing to rely on.`),
    (who, band, course) => (band === "low" ? `${who} won't fight you on ${course}, but doesn't expect it to work.` : `${who} says that if ${course} fails, you'll have to explain it.`),
    (who, band, course) => (band === "low" ? `${who} has no strong view on the odds for ${course}.` : `${who} wants it on the record that the odds on ${course} worry them.`),
];
// The departmental banks: a cabinet officer's most common objection is not "I
// disagree" but "not out of my account".
const FOR_DEPARTMENT_STAKE = [
    (who, band, course, agency) => (band === "high" ? `${who} wants ${course}, and says ${agency} is ready to run it today.` : `${who} supports ${course}. It runs through ${agency}, and they want it there.`),
    (who, band, course, agency) => band === "low" ? `${who} supports ${course}, and would rather ${agency} ran it than another department.` : `${who} asks for ${agency} to run ${course}. The department has been preparing for exactly this.`,
    (who, _band, course, agency) => `${who} backs ${course}. It's ${agency}'s responsibility, and they say so directly.`,
    (who, band, course, agency) => (band === "high" ? `${who} will put ${agency} behind ${course} and answer for how it goes.` : `${who} supports ${course} because it's the work ${agency} exists to do.`),
];
const AGAINST_DEPARTMENT_STAKE = [
    (who, _band, course, agency) => `${who} is against ${course}, even though it falls to ${agency}. They say the department isn't set up for it.`,
    (who, band, course, agency) => (band === "high" ? `${who} refuses ${course} on ${agency}'s behalf, and wants the refusal in writing.` : `${who} opposes ${course}. ${agency} would be blamed if it failed.`),
    (who, _band, course, agency) => `${who} says ${agency} shouldn't be asked to take on ${course}, and won't offer to.`,
    (who, band, course, agency) => (band === "low" ? `${who} is against ${course}, mildly, because they doubt ${agency} can deliver it.` : `${who} thinks ${course} is the wrong job for ${agency}.`),
];
const WARY_DEPARTMENT_STAKE = [
    (who, band, course, agency) => band === "high"
        ? `${who} will carry out ${course} because it's ${agency}'s job, and wants you to know it's duty, not enthusiasm.`
        : `${who} accepts ${course} as ${agency}'s job, without pretending to want it.`,
    (who, _band, course, agency) => `${who} doesn't object to ${course}, and ${agency} can handle it, but wants the order of steps settled first.`,
    (who, band, course, agency) => (band === "low" ? `${who} is wary of ${course}, even though it's their department's work. ${agency} can do it, but not quickly.` : `${who} accepts ${course} for ${agency} and asks for enough staff to do it.`),
    (who, _band, course, agency) => `${who} will run ${course} through ${agency} if you order it, and wants the risks on the record.`,
];
const FOR_CROWDED_OUT = [
    (who, _band, course, agency) => `${who} supports ${course} anyway, and says ${agency} will find the money.`,
    (who, band, course, agency) => (band === "high" ? `${who} backs ${course} and offers to have ${agency} cover the cost.` : `${who} supports ${course}, even though ${agency} pays for it.`),
    (who, _band, course, agency) => `${who} supports ${course}, and says ${agency} can wait three months.`,
    (who, band, course, agency) => (band === "low" ? `${who} agrees to ${course}, and doesn't raise what it takes from ${agency}.` : `${who} supports ${course} and will tell ${agency} themselves why its money is short.`),
];
const AGAINST_CROWDED_OUT = [
    (who, _band, course, agency) => `${who} is against ${course}. ${agency} would pay for it, and had other plans for that money.`,
    (who, band, course, agency) => band === "high" ? `${who} is firmly against ${course}. ${agency} is being asked to pay for someone else's problem.` : `${who} opposes ${course}. ${agency} would be paying for someone else's problem.`,
    (who, _band, course, agency) => `${who} says no to ${course}. The money it needs was promised to ${agency}.`,
    (who, band, course, agency) => (band === "low" ? `${who} is against ${course}, mainly because ${agency} would go without.` : `${who} won't pay for ${course} out of ${agency}'s budget, and says so up front.`),
];
const WARY_CROWDED_OUT = [
    (who, band, course, agency) => (band === "high" ? `${who} won't block ${course}, but wants it on the record that ${agency} is paying for it.` : `${who} won't block ${course}, but points out that ${agency} pays for it.`),
    (who, _band, course, agency) => `${who} is wary of ${course}. ${agency} can handle the cost once.`,
    (who, _band, course, agency) => `${who} won't stop you on ${course}, and asks what ${agency} has to give up to pay for it.`,
    (who, band, course, agency) => (band === "low" ? `${who} has no strong view on ${course}, but asks whether ${agency} is paying for it again.` : `${who} says ${agency} can afford ${course} for the next three months, but not after that.`),
];
// Exhaustive over CounselStance × CounselReason (15 cells): a reason the
// engine can return that this table did not carry would fail to compile
// rather than fall back to a stance's generic template.
const TEMPLATES = {
    for: {
        "instinct-for": FOR_INSTINCT_FOR,
        "instinct-against": FOR_INSTINCT_AGAINST,
        "thin-odds": FOR_THIN_ODDS,
        "department-stake": FOR_DEPARTMENT_STAKE,
        "crowded-out": FOR_CROWDED_OUT,
    },
    against: {
        "instinct-for": AGAINST_INSTINCT_FOR,
        "instinct-against": AGAINST_INSTINCT_AGAINST,
        "thin-odds": AGAINST_THIN_ODDS,
        "department-stake": AGAINST_DEPARTMENT_STAKE,
        "crowded-out": AGAINST_CROWDED_OUT,
    },
    wary: {
        "instinct-for": WARY_INSTINCT_FOR,
        "instinct-against": WARY_INSTINCT_AGAINST,
        "thin-odds": WARY_THIN_ODDS,
        "department-stake": WARY_DEPARTMENT_STAKE,
        "crowded-out": WARY_CROWDED_OUT,
    },
};
/**
 * What the phrasing varies on: who is speaking and what they are speaking
 * about. The person alone would give a chair one opener and one sentence for
 * the life of the campaign, so the same minister would contradict the
 * president in identical words every time they disagreed.
 */
function phrasingKey(counsel) {
    return `${counsel.person}·${counsel.reply}`;
}
function sentenceFor(counsel, titles) {
    const who = whoLabel(counsel, titles);
    const pool = TEMPLATES[counsel.stance][counsel.reason];
    const index = hashIndex(phrasingKey(counsel), pool.length);
    return pool[index](who, convictionBand(counsel.conviction, counsel.stake), courseNoun(counsel.course), shortAgency(counsel.role, titles));
}
/**
 * One counsel sentence for the reply on screen, composed only from
 * `CabinetCounsel`'s own fields — never a raw `stance`, `reason` or `stake`.
 *
 * `undefined` where there is no seated chair to compose from: no role routes
 * to this reply, or the chair that would is vacant. Both are the surface's own
 * cases to render (a caller already handles them); this only speaks for a
 * living minister.
 */
export function counselSentence(campaign, script, reply) {
    const counsel = counselOnReply(campaign, script, reply);
    if (!counsel || counsel.kind !== "counsel")
        return undefined;
    const titles = charterOf(campaign).roleTitles ?? {};
    const line = sentenceFor(counsel, titles);
    const dissenter = dissentingCounsel(campaign, script, reply);
    if (!dissenter || dissenter.kind !== "counsel")
        return { speaker: counsel.person, line };
    // Every sentence opens on the minister's own name — a proper noun the
    // "But" needs no lower-casing to lead into.
    return {
        speaker: counsel.person,
        line,
        dissent: { speaker: dissenter.person, line: `But ${sentenceFor(dissenter, titles)}` },
    };
}
