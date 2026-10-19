import { formatRatio } from "../format/figures";
// The ambition a disaffected chair needs before it builds a faction instead of
// resigning, and the discount a charismatic one gets. Restated here as local
// numbers rather than imported from the simulation: a sentence checked against
// the constant it was generated from proves only that the file parses, and
// these two figures are printed to the player as prose.
export const CHALLENGE_AMBITION_MARK = 0.65;
export const CHARISMATIC_CHALLENGE_DISCOUNT = 0.1;
// How far personal integrity can hold a disaffected chair back from acting.
// Capped below the whole risk on purpose — nobody is proof against their own
// disaffection, and a chair who cannot be moved at all is a seat with no story
// in it.
const INTEGRITY_RESTRAINT = 0.6;
// The president's podium and their one-on-one on the Hill are one reading, and
// it is these two shares of it. The same split covers both, which is why the
// copy can name it once.
const PODIUM_CHARISMA_SHARE = 0.6;
const PODIUM_COMPETENCE_SHARE = 0.4;
// What the President's own readings are worth on the day of the oath, restated
// from the engine's LEADER_PORTFOLIO (opening-portfolios.ts) for the same
// reason the cabinet numbers above are: they are printed as prose, and the
// alignment gate reads both files. A push is the weight times the reading's
// distance from the middle, so the most it can move is half the weight.
const LEADER_COMPETENCE_STABILITY_WEIGHT = 0.1;
const LEADER_CHARISMA_STANDING_WEIGHT = 0.12;
const LEADER_INTEGRITY_STABILITY_WEIGHT = 0.06;
/** The most a leader push can move its reading, in the points a screen prints. */
function oathPoints(weight) {
    return Math.round((weight / 2) * 100);
}
/**
 * The ambition mark this particular person is measured against.
 *
 * A charismatic chair does not need as much of it: charm is what turns a
 * grievance into a following, so the bar for mounting a challenge rather than
 * walking out sits lower for them than for an equally disloyal but charmless
 * colleague.
 */
export function challengeMarkFor(traits) {
    return traits.includes("charismatic")
        ? CHALLENGE_AMBITION_MARK - CHARISMATIC_CHALLENGE_DISCOUNT
        : CHALLENGE_AMBITION_MARK;
}
const CHALLENGE_MARK_WORDS = `${formatRatio(CHALLENGE_AMBITION_MARK)} (${formatRatio(CHALLENGE_AMBITION_MARK - CHARISMATIC_CHALLENGE_DISCOUNT)} for a charismatic secretary)`;
/** What runs for nobody: a kind the simulation reads no personal attribute for at all. */
const NO_READER = "This trait doesn't affect anything in their job.";
const UNREAD_STEM = "This trait doesn't affect anything";
/** A justice's read of a case: how skilled it is, never which way it leans (ideology sets that; see `IDEOLOGY_CONSEQUENCE`). */
const JUSTICE_SKILL = {
    text: "Together with their other skill score (competence or integrity), this decides how good their judgment is on a case. Their politics decide which way they lean, not this.",
    readBy: ["justiceStrikePropensity"],
};
/** A Hill leader's lean toward the administration — ambition and loyalty, read together. */
function hillLean(partner) {
    return {
        text: `Together with their ${partner}, this decides how strongly they side with you.`,
        readBy: ["figureTarget", "caucusTarget"],
    };
}
/** A Hill leader's resistance to being lobbied — ambition and integrity, read together. */
function hillLobby(partner) {
    return {
        text: `Together with their ${partner}, this decides how hard it is for you to win them over.`,
        readBy: ["projectLobbying"],
    };
}
/** A reading their government's decisions do not take from them: it acts on the country's temperament, moved only by their lean. */
const FOREIGN_LEADER_TEMPERAMENT = {
    text: "Their government acts on its country's overall character, not on this personal trait. Open the country's page to see that character.",
};
// How far a foreign head of government's own readings move the government
// they lead, restated from the engine's leader lean (foreign-leader.ts) because
// they are printed as prose. Each is the pull at the reading's two ends,
// measured against the leader the country had when the table was drawn, and no
// axis moves past the bound however the readings add up.
const FOREIGN_LEADER_AMBITION_SWING = 0.04;
const FOREIGN_LEADER_INTEGRITY_SWING = 0.06;
const FOREIGN_LEADER_LOYALTY_SWING = 0.04;
const FOREIGN_LEADER_OFFSET_BOUND = 0.1;
/** A swing as the points a screen prints. */
function swingPoints(swing) {
    return Math.round(swing * 100);
}
/** The line for a reading their lean does read: which part of the government's temperament it moves, and by how much. */
function foreignLeaderLean(moves, swing) {
    return {
        text: `While they lead, this moves ${moves} by up to ${swingPoints(swing)} points either way, compared with the leader the country had at the start. All their traits together never move it more than ${swingPoints(FOREIGN_LEADER_OFFSET_BOUND)} points. The original leader changes nothing, because the country's character already reflects them.`,
        readBy: ["leaderOffset", "liveTemperament"],
    };
}
/** "If seated: ", then the cabinet line — true of an available or former officer only once the President seats them. */
function ifSeated(line) {
    return { text: `If you appoint them: ${line.text}`, ...(line.readBy ? { readBy: line.readBy } : {}) };
}
const COMPETENCE_CABINET = {
    // Deliberately comparative rather than a pass mark. Nothing in the game
    // refuses a nomination on competence at the readings the cast actually
    // produces, so copy promising one would be describing a gate the player
    // will never see close.
    //
    // Not "how much their department gets done": a department's own delivery
    // excludes its Secretary's competence (leaderDeliveryTerm is zero for one).
    // What the reading moves is the work the department owns, and Agriculture and
    // Transportation own none of it.
    text: "This decides how well their department does its own work. It changes the odds on the tools the department uses (by up to 10% either way), how well its programs and budget are carried out, and how likely an executive order in its area is to be challenged. For Defense, it also changes how well a war goes. Agriculture and Transportation have none of these, so there it only shapes their advice. In every job, it makes their read of the odds more accurate when they advise you. Compare it with the other people who could fill this job. It can also slip. If their department gets less than six tenths of its work done, their competence drops every week.",
};
const LOYALTY_CABINET = {
    // The ten-point floor binds only the slow political wear. Overruling,
    // an unanswered offer to resign and a nominee from across the aisle each
    // move loyalty without it, so the sentence says which is which.
    text: "When loyalty is low, a secretary may leak, resign, or turn on you. Going against their advice lowers it the most, and taking their advice wins a little back. Leaving their offer to resign unanswered lowers it some. So does seating a nominee from the other party, and that lowers it for every secretary at once. It also slips a little each week if they're from the other party, if their politics are far from yours, or, for an ambitious secretary, if your approval is low. That weekly slip stops ten points below where it started. Going against their advice has no such limit. Loyalty also helps decide how well a Secretary of Defense fights a war and how likely an executive order in a secretary's area is to be challenged.",
};
const INTEGRITY_CABINET = {
    text: `Integrity keeps an unhappy secretary from acting on it. At full integrity, it cuts their weekly chance of leaking, resigning, or turning on you by ${formatRatio(INTEGRITY_RESTRAINT)}. It doesn't keep them in the job. A secretary with high integrity is also a little more likely to offer to resign, and to say why in public if they leave.`,
};
const CHARISMA_CABINET = {
    // The line this replaces claimed charisma set "how dangerous they are once
    // they are outside the chair." It does not: the rival faction a dismissed
    // officer builds is gated on ambition alone, and charisma only ever moves
    // the Standing the dismissal costs.
    text: "This decides how much international standing you lose if you fire them. It does nothing else while they serve. If they cause trouble after they leave, that comes from their ambition, not their charm.",
};
const AMBITION_CABINET = {
    text: `More ambition isn't a good thing here. It only means more risk. Above ${CHALLENGE_MARK_WORDS}, a secretary who has lost faith in you starts a rival faction (a group working against you) instead of resigning, and each week that faction lasts costs you a little more. The more ambitious they are, the more a leak or a faction costs you, the louder they are when they break with you, and the less likely they are to offer to resign. If your Chief of Staff is weak, the most ambitious secretary's requests reach your desk first.`,
};
export const ATTRIBUTE_CONSEQUENCE = {
    competence: {
        cabinet: COMPETENCE_CABINET,
        available: ifSeated(COMPETENCE_CABINET),
        former: ifSeated(COMPETENCE_CABINET),
        president: {
            text: `${formatRatio(PODIUM_COMPETENCE_SHARE)} of how well you do at press conferences and in private meetings with members of Congress comes from this. Charisma makes up the rest. When you take office, it also moves your starting stability up or down by as much as ${oathPoints(LEADER_COMPETENCE_STABILITY_WEIGHT)} points.`,
        },
        justice: JUSTICE_SKILL,
        hill: { text: NO_READER },
        governor: { text: NO_READER },
        mayor: { text: NO_READER },
        agency: {
            text: "This decides how well their agency does what it's asked. Above average, it gets a little more done. Below average, a little less.",
        },
        "foreign-leader": FOREIGN_LEADER_TEMPERAMENT,
        foreign: { text: NO_READER },
        deceased: { text: NO_READER },
    },
    loyalty: {
        cabinet: LOYALTY_CABINET,
        available: ifSeated(LOYALTY_CABINET),
        former: ifSeated(LOYALTY_CABINET),
        president: {
            text: "This trait doesn't affect anything in your job. Cabinet unity counts only your secretaries' loyalty, and the weekly check for who breaks with you skips you, since there's nobody above you to break with.",
        },
        justice: { text: NO_READER },
        hill: hillLean("ambition"),
        governor: { text: NO_READER },
        mayor: { text: NO_READER },
        agency: { text: NO_READER },
        "foreign-leader": foreignLeaderLean("how well their government keeps its promises to other countries", FOREIGN_LEADER_LOYALTY_SWING),
        foreign: { text: NO_READER },
        deceased: { text: NO_READER },
    },
    integrity: {
        cabinet: INTEGRITY_CABINET,
        available: ifSeated(INTEGRITY_CABINET),
        former: ifSeated(INTEGRITY_CABINET),
        // Read once, and only once: the line this replaces said nothing read it at
        // all, while the opening position weighed it on the day of the oath.
        president: {
            text: `This counts only once, when you take office. It moves your starting stability up or down by as much as ${oathPoints(LEADER_INTEGRITY_STABILITY_WEIGHT)} points. After that, the weekly check for who breaks with you skips you, and the Senate checks integrity only for nominees.`,
        },
        justice: JUSTICE_SKILL,
        hill: hillLobby("ambition"),
        governor: { text: NO_READER },
        mayor: { text: NO_READER },
        agency: { text: NO_READER },
        "foreign-leader": foreignLeaderLean("how closely their government follows the law and its treaties", FOREIGN_LEADER_INTEGRITY_SWING),
        foreign: { text: NO_READER },
        deceased: { text: NO_READER },
    },
    charisma: {
        cabinet: CHARISMA_CABINET,
        available: ifSeated(CHARISMA_CABINET),
        former: ifSeated(CHARISMA_CABINET),
        president: {
            text: `${formatRatio(PODIUM_CHARISMA_SHARE)} of how well you do at press conferences and in private meetings with members of Congress comes from this. Competence makes up the rest. When you take office, it also moves your starting international standing up or down by as much as ${oathPoints(LEADER_CHARISMA_STANDING_WEIGHT)} points.`,
        },
        justice: { text: NO_READER },
        hill: { text: NO_READER },
        governor: { text: NO_READER },
        mayor: { text: NO_READER },
        agency: { text: NO_READER },
        "foreign-leader": FOREIGN_LEADER_TEMPERAMENT,
        foreign: { text: NO_READER },
        deceased: { text: NO_READER },
    },
    ambition: {
        cabinet: AMBITION_CABINET,
        available: ifSeated(AMBITION_CABINET),
        former: ifSeated(AMBITION_CABINET),
        president: {
            text: "This trait doesn't affect anything in your job. Ambition drives a run for the top job, and you already have it.",
        },
        justice: { text: NO_READER },
        hill: hillLean("loyalty"),
        governor: { text: NO_READER },
        mayor: { text: NO_READER },
        agency: { text: NO_READER },
        "foreign-leader": foreignLeaderLean("how much risk their government will take", FOREIGN_LEADER_AMBITION_SWING),
        foreign: { text: NO_READER },
        deceased: { text: NO_READER },
    },
};
/** The consequence line for one reading on one kind of file. */
export function attributeConsequence(key, subject) {
    return ATTRIBUTE_CONSEQUENCE[key][subject].text;
}
/**
 * Whether any decision reads this reading for a person of this standing. A
 * file whose rows say nothing reads them must not then name one of them as
 * the reading to plan around.
 */
export function attributeIsRead(key, subject) {
    const line = ATTRIBUTE_CONSEQUENCE[key][subject];
    return !line.text.startsWith(UNREAD_STEM) && line.text !== FOREIGN_LEADER_TEMPERAMENT.text;
}
/**
 * What each of a person's ten temperament traits actually moves, said once.
 *
 * The two-way graded/pressure split lives on `AssessmentReading` now, and a trait
 * word is not a fifth reading to grade. The paired test walks `PersonTrait`'s
 * own enum, not this table's keys, so a trait the dataset adds with nothing
 * behind it fails there instead of arriving on a file as a word with no
 * consequence.
 */
// Read by: loyal, pragmatic, ambitious and the other pairings in
// cabinet-alignment.ts, which only draws the cabinet chart; cautious in
// counsel.ts; corrupt, principled and reclusive in cabinet.ts; charismatic in
// cabinet.ts; hawkish and dovish in counsel.ts. Loyal, pragmatic and ambitious
// also have a stability push at the oath (TRAIT_PUSHES), but at the fifteen
// secretaries a full US cabinet seats it is 0.4 points, under the half point
// the opening position drops as rounding, so no sentence promises it. The
// sentences carry the effect only: a file name is a developer's pointer and has
// no place in what a player reads.
export const TRAIT_EFFECT = {
    ambitious: "Clashes with cautious colleagues on the cabinet chart. This only shows on the chart and doesn't change what happens.",
    cautious: "Wants better odds of success before advising you to act.",
    loyal: "Gets along with other loyal secretaries on the cabinet chart. This only shows on the chart and doesn't change what happens.",
    corrupt: "Makes them more likely each week to act against you when they're unhappy. On the cabinet chart, they clash with principled colleagues.",
    principled: "Makes them less likely to act against you when they're unhappy. On the cabinet chart, they clash with corrupt colleagues.",
    charismatic: `Makes it easier for a disloyal secretary to start a rival faction instead of resigning. The ambition it takes drops from ${formatRatio(CHALLENGE_AMBITION_MARK)} to ${formatRatio(CHALLENGE_AMBITION_MARK - CHARISMATIC_CHALLENGE_DISCOUNT)}.`,
    reclusive: "Makes them less likely to act against you at all, because they keep to themselves.",
    hawkish: "Pushes their advice toward using force. On the cabinet chart, they clash with doves, who prefer to avoid force.",
    dovish: "Pushes their advice away from force. On the cabinet chart, they clash with hawks, who are quicker to use it.",
    pragmatic: "Gets along with other pragmatists on the cabinet chart. This only shows on the chart and doesn't change what happens.",
};
/** What a trait moves, in a sentence. */
export function traitEffect(trait) {
    return TRAIT_EFFECT[trait];
}
/**
 * What ideology moves, in one line under the three axes: a justice's lean on
 * a case (`strike-odds.ts`), how fast a secretary's loyalty wears down against
 * the President's politics (`loyalty.ts`), the cabinet chart, and the Fed
 * chair's tilt (`monetary.ts`). Not "how united your cabinet is": that figure
 * is the mean loyalty of the secretaries and reads no ideology.
 */
export const IDEOLOGY_CONSEQUENCE = "For a justice, this decides which way they lean on a case. For a secretary, the further their politics are from yours, the faster their loyalty slips. It also decides how well they get along with colleagues on the cabinet chart. For the Federal Reserve chair, their economic views tilt the Fed toward fighting high prices or protecting jobs. It shows where they stand, not how good they are.";
