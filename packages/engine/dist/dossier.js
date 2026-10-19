import { WHITE_HOUSE_ROLE_TITLES } from "@admin/world";
import { careerLinesFor, fillNation, hasMilitaryCareer, standoutOfRecord } from "./bio.js";
// --- Selection: stable, and keyed to the person rather than to a draw. -----
// FNV-1a. The dossier is composed on demand — at founding, on the cabinet
// screen, three turns later — and has to come out identical every time without
// an RNG stream to thread through, so the index comes from the person's own id.
function hashIndex(seed, modulo) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash % modulo;
}
function pick(person, section, bank) {
    return bank[hashIndex(`${person.id}:${section}`, bank.length)];
}
// --- Origins: keyed to where the person's economics actually sit. ----------
// Someone's politics and where they grew up are not independent facts, and
// generating them independently produces a cast of free-market populists from
// mill towns and agrarian socialists from banking families. The bank is split
// by the axis the person already carries, so the origin explains the ideology
// instead of contradicting it.
const ORIGINS_LEFT = [
    "Grew up in a district that the last three governments each promised to reindustrialize, and did not.",
    "Raised by a union organizer in a port town, and learned to count a room before learning to drive.",
    "The first in the family to finish school, on a scholarship the family still keeps the letter for.",
    "Came out of a co-operative farming valley where the word for the state is still the word for the weather.",
    "Grew up in public housing on the wrong ring road, and has never once described it as formative in public.",
    "The child of two teachers, in a town where that was the closest thing to a professional class.",
    "Spent school holidays at a strike headquarters her mother ran off a card table, folding leaflets before she could read most of the words on them.",
    "Grew up above a tenants' advice bureau that never once turned away a family who couldn't pay, a fact the landlord upstairs complained about for years.",
    "The youngest of six in a mill town that lost its mill the year of the tenth birthday, and remembers the closure meeting better than the birthday.",
    "Was raised by a widowed nurse who worked double shifts at the free clinic, and still keeps her mother's expired union card in a desk drawer.",
];
const ORIGINS_CENTER = [
    "Grew up in the provincial civil service — a household where the government was a colleague, not a cause.",
    "Raised in a garrison town, moved every three years, and belongs to no constituency in particular.",
    "The child of a country doctor, in a district that voted both ways within a single decade.",
    "Came from a family of shopkeepers who had opinions about every party and joined none of them.",
    "Grew up abroad in a diplomatic household, and came home at nineteen to a country they had to learn.",
    "Raised in a small city that has never been safe for either party, by parents who liked it that way.",
    "Spent childhood on a series of army bases, going to seven schools in eleven years and belonging fully to none of them.",
    "Is the child of a customs inspector, and grew up in a household that discussed the government the way other families discussed the weather.",
    "Grew up in a college town split evenly between two employers, a hospital and a university, that have never agreed on anything.",
    "Was raised by an actuary and a court clerk, professions that between them left no patience for either party's arithmetic.",
];
const ORIGINS_RIGHT = [
    "Comes from a merchant family that has been three generations in the same trade and the same building.",
    "Grew up on land the family has farmed since before the borders were where they are now.",
    "Educated at the school that produces a disproportionate share of the country's permanent secretaries.",
    "The child of an officer's household, raised on the idea that institutions outlast the people in them.",
    "Came from a provincial banking family, and learned young which favors are recorded and which are not.",
    "Raised in a devout household in a conservative province, and has never made a secret of either.",
    "Grew up above the family pharmacy, a business licensed to three generations running, and inherited the ledger before inheriting the store.",
    "Was sent to boarding school at eight, the fourth generation in the family to enter through the same gate.",
    "Comes from a family of surveyors who mapped the same three counties for a century and are still consulted on old boundary disputes.",
    "Grew up in a rectory, the child of a pastor whose congregation has supplied the county's magistrates for two generations.",
];
function origins(person) {
    const axis = person.ideology.economicLeftRight;
    if (axis <= -0.2)
        return ORIGINS_LEFT;
    if (axis >= 0.2)
        return ORIGINS_RIGHT;
    return ORIGINS_CENTER;
}
// --- The defining episode. -------------------------------------------------
//
// Keyed on the readings a campaign cannot write, and only those. Loyalty used
// to rank here alongside them, which made the event a person is remembered for
// a function of how they had voted in the room last week: overrule a Secretary
// through a season and his file reported that he had briefed against a
// principal to three journalists, dated to before the administration existed.
// The loyalty prose did not go in the bin — it is present tense now, and it
// reads a chair rather than a career, in WHERE THEY STAND below.
const EPISODES = {
    competence: {
        high: [
            "Is remembered in the department for a briefing given without notes on a file they had held for four days, and for the fact that nothing in it later turned out to be wrong.",
            "Rebuilt a department that two predecessors had been unable to make function, and did it without a single public statement about either of them.",
            "Caught a nine-figure drafting error in an appropriations rider the night before the vote, working alone from a hotel room with a laptop and a highlighter.",
            "Once ran an entire agency for five months during a vacancy nobody else wanted, and left it in better shape than the confirmed successor found convenient to admit.",
            "Was handed a program three audits had already declared unsalvageable, and turned in a fourth audit, unsolicited, that closed the file for good.",
            "Diagnosed a supply-chain failure from a single misfiled customs form that eleven analysts had already cleared, and had it fixed before the next morning's briefing.",
        ],
        low: [
            "Has been carried by a very good private office for most of a career, an arrangement that has failed publicly exactly once and is remembered for it.",
            "Is known for arriving at the right conclusion late, by a route nobody else can reconstruct and they cannot explain.",
            "Signed off on a forecast that missed by a factor of three, and has attributed the miss to three different causes in three different rooms.",
            "Needed four staffers and a weekend to produce a memo a competent deputy would have drafted alone before lunch.",
            "Presided over a rollout so badly scheduled that two directorates showed up to the same launch a week apart, and neither noticed until the press did.",
            "Has a filing cabinet's worth of contingency plans for a crisis that never happened, and none at all for the one that did.",
        ],
    },
    integrity: {
        high: [
            "Refused to sign off a contract that a previous government very much wanted signed, and spent two years in a lesser post for it.",
            "Published their own department's adverse audit in full, against advice, and has been trusted and disliked in equal measure since.",
            "Returned a campaign contribution the week it would have been most useful, along with a letter explaining exactly why, copied to the ethics office.",
            "Disclosed a conflict of interest nobody else in the room had noticed, and recused from a vote that would have gone the other way without the disclosure.",
            "Testified against a former mentor's conduct under oath, and has never once brought it up since as a credential.",
            "Repaid a travel allowance discovered to be technically permissible but plainly wrong, before any auditor asked a single question about it.",
        ],
        low: [
            "Is the subject of a file that has been opened twice and closed twice, and everyone senior knows which drawer it is in.",
            "Left an earlier post the week before an inspection, in a coincidence that the department has agreed to keep calling one.",
            "Awarded a contract to a firm that had employed a sibling the previous year, and called the sequence a coincidence in writing.",
            "Has an expense history that three different finance officers have each quietly rewritten rather than formally query.",
            "Sat on a damaging internal report for eleven weeks, long enough for the underlying problem to become someone else's to answer for.",
            "Accepted a speaking fee from a regulated industry the week before voting on its regulation, and disclosed it two months after the fact.",
        ],
    },
    charisma: {
        high: [
            "Can turn a hostile committee inside an hour, which is a talent the government has come to rely on rather more than it admits.",
            "Is the one member of the cabinet the broadcasters call first, and the one the leader's office worries about accordingly.",
            "Held a hostile town hall for three hours past its scheduled end and left with the crowd applauding a policy they'd booed walking in.",
            "Talked a furious union delegation out of a strike using nothing but a whiteboard and forty minutes, a story the union still tells on itself.",
            "Can make a budget line item sound like a personal favor to whoever's listening, a skill the whips have learned to deploy on purpose.",
            "Was sent in to close a donor who had already told two other officials no, and came out with a signed pledge and a dinner invitation.",
        ],
        low: [
            "Is disastrous on camera and entirely aware of it, which is why the department's public work goes out under other names.",
            "Has never given a speech anyone remembers, and has written several that other people are remembered for.",
            "Reads every remark from an index card, including condolences, and has been quietly banned from two funerals' worth of eulogies as a result.",
            "Cleared a fundraising room in under a speech by opening with a spreadsheet, a fact the finance office still brings up when planning seating charts.",
            "Once answered a reporter's softball question with a nine-minute description of procurement law, on camera, unprompted.",
            "Has been coached by four separate media consultants, each of whom quit the arrangement citing reasons they declined to make public.",
        ],
    },
    ambition: {
        high: [
            "Has made no secret of wanting the leadership, and keeps a list of the people who will be needed when the moment comes.",
            "Ran for the top job once already, lost narrowly, and has behaved every day since like the contest is still open.",
            "Keeps a shadow cabinet list updated in a drawer nobody is supposed to know about, and has already sounded out half its names.",
            "Turned a routine committee assignment into a national profile within a single term, a maneuver two party elders are still trying to reverse-engineer.",
            "Has quietly outlasted four rivals for the same eventual job, and treats each departure as evidence rather than coincidence.",
            "Accepted a demotion that came with a bigger microphone, a trade the leader's office didn't understand until it was too late to undo.",
        ],
        low: [
            "Has turned down promotion twice, both times for reasons the leader's office found genuinely difficult to believe.",
            "Wants the department and nothing above it, which makes them the rarest thing in the building: a safe deputy.",
            "Was offered the running mate slot twice and found a reason to decline both times that nobody has ever fully believed.",
            "Has held the same modest title for fourteen years by choice, and turns down the annual reshuffle rumor before it can even start.",
            "Asked to be left off the succession shortlist in writing, a request the party has honored mostly because it seemed sincere.",
            "Gave a promotion meant for them to a deputy instead, and has never explained the decision beyond calling it obvious.",
        ],
    },
};
// --- Temperament: the one thing on a Person record nothing else reads. -----
const TEMPERAMENT = {
    ambitious: [
        "Treats every meeting as a small audition, and has never yet been caught doing it by anyone who mattered.",
        "Keeps a private map of who is owed what across the whole government, and updates it after every reshuffle.",
        "Volunteers first for any task force with a photo op attached, and has a staffer whose sole job is checking the guest list in advance.",
        "Collects endorsements the way others collect stamps, and keeps the letters in a binder nobody else has seen the spine of.",
        "Times every resignation threat to land the week before a budget vote, and has never once followed through on one.",
        "Requests the briefing before the briefing, so the real one lands as a formality already agreed in private.",
    ],
    cautious: [
        "Will not move on a file until the third opinion agrees with the first two, which has cost the government time and saved it more.",
        "Has a standing rule against deciding anything on the day it arrives, and has broken it twice in twenty years.",
        "Reads a footnote twice before reading the headline once, and has caught three errors that way that nobody else was looking for.",
        "Keeps a folder of contingencies for decisions not yet made, most of which will never be needed and none of which get thrown away.",
        "Asks who benefits before asking what works, and has been accused of slowing the room down by people who were later glad of it.",
        "Insists on a written record of any verbal assurance, a habit that has embarrassed exactly the people who gave the assurance.",
    ],
    loyal: [
        "Regards a government one has joined as a thing one does not brief against, including to friends, including afterwards.",
        "Has never once let a disagreement inside the cabinet room be legible from outside it.",
        "Turns down interviews that would make the leader look small by comparison, without ever being asked to.",
        "Keeps a single loose-leaf notebook of instructions received in confidence, and has never let a page of it leave the building.",
        "Absorbs blame that was never theirs to take, on the theory that someone has to and it might as well be absorbed quietly.",
        "Declines invitations from anyone plotting a challenge, and does so early enough that the invitation is never repeated.",
    ],
    corrupt: [
        "Has interests that are declared in the letter and considerably less so in the substance.",
        "Does favors that are never quite invoiced, for people who are never quite named, and the arithmetic has always balanced eventually.",
        "Awards contracts that clear every procedural check and land, with striking regularity, on the same three firms.",
        "Keeps a second calendar for meetings that do not appear on the official one, and neither calendar contradicts the other by accident.",
        "Moves relatives into posts a few rungs below where anyone would notice, and has done it in three different departments now.",
        "Settles disputes over dinner rather than in committee, and the outcomes of those dinners are rarely revisited in committee.",
    ],
    principled: [
        "Would rather lose an argument on the record than win it in a corridor, and has done both often enough to be predicted.",
        "Holds positions that have cost them offices, and has not adjusted one of them to get the offices back.",
        "Reads every bill in full before voting on it, including the ones nobody expects to be read, and has the margin notes to prove it.",
        "Turns down the donation that would have solved the campaign's money problem, and has never mentioned the number out loud.",
        "Files a formal objection rather than a quiet word, on the theory that a quiet word disappears and a filing does not.",
        "Has resigned a committee seat over a single clause, and took the demotion that followed without issuing a statement about it.",
    ],
    charismatic: [
        "Is liked instantly by rooms that came in intending not to, which is a fact about them rather than about the rooms.",
        "Remembers the names of everyone's staff, and it has never once read as a technique.",
        "Can turn a hostile press gaggle into a friendly one inside four questions, and has never needed the same trick twice on the same reporter.",
        "Draws a crowd to the least interesting item on any agenda simply by being the one presenting it.",
        "Is quoted by opponents almost as often as allies, which irritates the opponents more than it flatters them.",
        "Has a handshake that colleagues describe unprompted, in the specific and slightly embarrassed way people describe weather.",
    ],
    reclusive: [
        "Does not do receptions, does not do interviews, and has built a career on being the person other people quote.",
        "Is easier to reach by minute than in person, and prefers it that way in a job where nobody else does.",
        "Answers questions in writing whenever the option exists, and has made an entire reputation out of a paper trail nobody else keeps.",
        "Skips the after-parties that build the coalitions other people rely on, and has never once regretted it aloud.",
        "Keeps the blinds drawn on an office with a view everyone else in the building would trade for, and has never explained why.",
        "Delegates every ceremonial appearance that can be delegated, and has a deputy who has become, by accident, more recognizable in public.",
    ],
    hawkish: [
        "Believes deterrence is the only argument anyone abroad has ever actually listened to, and says so in every meeting.",
        "Reads a diplomatic overture as a delaying tactic first and an opportunity second, and has been right often enough to keep doing it.",
        "Keeps a running tally of every broken agreement by name and date, and produces it, unbidden, whenever restraint is proposed.",
        "Pushes for the visible show of force over the quiet one, on the theory that a deterrent nobody sees has not deterred anything.",
        "Treats a ceasefire as a pause for rearmament rather than a result, and has been proven right often enough to keep saying it.",
        "Wants the budget line for hardware protected before the budget line for anything else, and fights that fight every single cycle.",
    ],
    dovish: [
        "Has never voted for a deployment, including the popular ones, including the one that worked.",
        "Treats a channel that is still open as a result in itself, which the defense side finds either naive or infuriating.",
        "Keeps the phone number of a counterpart nobody else in the building will admit to calling, and calls it anyway.",
        "Argues that the cost of the war gets counted years after the vote that started it, and brings the old ledgers back out to prove it.",
        "Would rather fund the clinic than the base, and has moved money quietly from one column to the other more than once.",
        "Sees a show of restraint as the stronger signal, not the weaker one, and has staked more than one career moment on that reading.",
    ],
    pragmatic: [
        "Will take two thirds of a thing today over all of it next year, and has the record to show it usually pays.",
        "Has no fixed position on anything except the arithmetic, which makes them very hard to campaign against.",
        "Changes position the moment the vote count changes, and explains the shift in exactly the same tone both times.",
        "Keeps two versions of every proposal ready, one for the room that wants ambition and one for the room that wants a number.",
        "Trades a policy win for a personnel favor without blinking, and has never once let the trade show up in the official record.",
        "Measures a deal by whether it survives contact with the next election, not by whether it was the best deal available.",
    ],
};
// --- Standing: what loyalty and ambition together make of them now. --------
const AMBITION_FLOOR = 0.6;
const LOYALTY_FLOOR = 0.5;
/**
 * The one section loyalty is allowed to move, and the reason it may.
 *
 * Every line here is a reading of the chair this person is sitting in now, in
 * the present tense, the way the dossier's own loyalty block words "Loyalty in
 * the chair". Nothing here asserts a career, a span of years or an event, and
 * that restraint is the whole point: this is the section the file's lede is
 * taken from, and loyalty is a number two contested calls can move. A sentence
 * here that said what somebody had *done* would be the present rewriting the
 * past, which is the defect that put a Secretary's twenty-year record in the
 * gift of last week's meeting.
 */
const STANDING = {
    rival: [
        "Stands, at present, as the most plausible alternative to whoever is leading — a fact the leader's office reviews more often than it says.",
        "Has enough support of their own that a dismissal would cost more than the seat is worth, and knows the sum precisely.",
        "Holds a bloc of votes large enough to break any close margin, and has let both sides know it without saying so directly.",
        "Turns up at just enough events without the leader present to make the absence itself a subject of commentary.",
        "Keeps a shadow platform ready that differs from the leader's in exactly the places polling says the leader is weakest.",
        "Declines to deny the succession talk when it comes up, which the leader's staff have noticed is itself a kind of answer.",
        "Keeps a private channel open to the opposition's whip, and has an explanation ready that nobody has asked for yet.",
        "Reads every appointment as temporary, including this one, and plans accordingly without much apparent feeling about it.",
        "Reports to a caucus before reporting to this administration, and the sequence shows up in every close vote.",
    ],
    lieutenant: [
        "Is the leader's real deputy whatever the order of precedence says, and is trusted with the decisions that cannot be minuted.",
        "Wants the top job and intends to be given it rather than to take it, which is the only reason the arrangement holds.",
        "Signs off on the leader's toughest calls before they are announced, and takes none of the credit when they land well.",
        "Is handed the file the leader does not want their own name on, and does not let that file surface anywhere else.",
        "Runs the building when the leader travels, so smoothly that nobody outside the office notices the handoff.",
        "Would turn down the top job on terms specific enough that it would not be offered twice, and everyone senior knows it.",
        "Takes an approach from the other side as a thing to be reported upward the same afternoon, not weighed.",
        "Absorbs the blame for decisions made two levels above without asking to have the record corrected.",
        "Sits through a hostile inquiry without producing one document that would make the leader's week easier and the questioner's harder.",
    ],
    servant: [
        "Is the safest pair of hands in the building and has no interest whatsoever in being anything else.",
        "Will carry an unpopular decision in public without being asked twice, and never sends the bill.",
        "Takes the assignment nobody else wants without asking why, and is reliably available for the next one.",
        "Turns down the promotions that would mean more visibility, citing reasons that satisfy nobody and are accepted anyway.",
        "Keeps the trains running on files too dull to attract a rival, and shows no interest at all in the glamorous ones.",
        "Reports every problem upward the same day it appears, without softening it first for the person receiving the news.",
        "Answers the phone at four in the morning and does not ask what the call is going to cost.",
        "Takes a bad instruction and carries it out well, then says what was wrong with it afterward and only upstairs.",
        "Keeps nothing on a personal device and takes no files home, and has never had to be asked about either.",
    ],
    passenger: [
        "Serves without enthusiasm and without any particular plan, which makes them steady and makes them slow.",
        "Is in the government because the government needed the seat filled, and both parties to the arrangement know it.",
        "Shows up to the votes that are mandatory and skips the ones that are merely important, and nobody moves to change that.",
        "Sits in a chair no reshuffle has ever quite found a reason to cut, and does not ask why.",
        "Fills the chair at ceremonies that need a body in it, and is by now hard to distinguish from the furniture.",
        "Neither backs the leader's big plays nor undercuts them, and the silence is the whole of what the office knows about them.",
        "Serves the office rather than whoever happens to be sitting in it, and says so in private.",
        "Owes the seat to a sponsor outside this administration, and weighs every decision here against that debt first.",
        "Would testify accurately about a conversation with the leader, and considers that an unremarkable thing to say out loud.",
    ],
};
/**
 * Where this person stands in this government today.
 *
 * Ambition is authored and fixed; loyalty is the live reading, and the reason
 * the four quadrants are worth having. A minister overruled through a season
 * moves from lieutenant to rival in front of the player, which is a true thing
 * to say about an appointment and would be a lie about a career.
 */
function standing(person) {
    const driven = person.ambition >= AMBITION_FLOOR;
    const committed = person.loyalty >= LOYALTY_FLOOR;
    if (driven && committed)
        return STANDING.lieutenant;
    if (driven)
        return STANDING.rival;
    if (committed)
        return STANDING.servant;
    return STANDING.passenger;
}
// --- Composition. ---------------------------------------------------------
function careerSection(person, role, nationName) {
    const bank = careerLinesFor(role, hasMilitaryCareer(person.career), person.nationality);
    return fillNation(pick(person, "career", bank), nationName);
}
function episodeSection(person, role, nationName) {
    const { key, high } = standoutOfRecord({
        id: person.id,
        role,
        nationName,
        traits: person.traits,
        index: 0,
        careerOffset: 0,
        competence: person.competence,
        loyalty: person.loyalty,
        integrity: person.integrity,
        charisma: person.charisma,
        ambition: person.ambition,
    });
    return pick(person, `episode:${key}`, EPISODES[key][high ? "high" : "low"]);
}
// A person carries one or two traits. Both are voiced where there are two —
// dropping one would leave a trait on the record that no surface ever accounts
// for, which is how "corrupt" became a tag with nothing behind it.
function temperamentSection(person) {
    const lines = person.traits.map((trait) => pick(person, `temperament:${trait}`, TEMPERAMENT[trait]));
    return lines.join(" ");
}
/**
 * A person's full record, in the order a reader wants it: where they came from,
 * how they got here, what they are known for, what they are like, and what they
 * are to this government now.
 *
 * `role` is passed rather than read off the person because it is the seat the
 * dossier is being read *for* — a candidate is being weighed against a chair
 * they do not yet hold, and their eligibility is the honest fallback.
 */
export function composeDossier(person, nationName, role) {
    // The Vice President and the White House posts have no career prose of their
    // own: the road to them is the seat the person was drawn for.
    const seat = role !== undefined && !Object.hasOwn(WHITE_HOUSE_ROLE_TITLES, role) ? role : person.eligibleRoles[0];
    if (!seat)
        throw new Error(`${person.id} is eligible for no role, so no dossier can be written`);
    const sections = [
        { heading: "Origins", body: pick(person, "origins", origins(person)) },
        { heading: "The road here", body: careerSection(person, seat, nationName) },
        { heading: "On the record", body: episodeSection(person, seat, nationName) },
    ];
    const temperament = temperamentSection(person);
    if (temperament)
        sections.push({ heading: "Temperament", body: temperament });
    sections.push({ heading: "Where they stand", body: pick(person, "standing", standing(person)) });
    return sections;
}
