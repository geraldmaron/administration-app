/**
 * The sentences the dossier's reading of a person is drawn from.
 *
 * One bank per reading per direction, and every line is written to state the
 * comparison it is making: this person against the people this chair is
 * normally recruited from. That is not decoration. The five figures are printed
 * as meters on the same screen, and a block that said "Loyalty — Weak" beside a
 * bar reading 0.32 was either restating the bar or, for an opposition leader
 * whose window runs low by design, contradicting it. A sentence that says out
 * loud which yardstick it used cannot do either.
 *
 * The other rule these were written to: a line has to cost the president
 * something, or say what it buys them. High integrity is a person who will
 * refuse you in public. High competence is a department that stops writing
 * things down. Flattery with no consequence attached is the register this bank
 * exists to avoid, and the reason it is eight deep per cell rather than one.
 */
/** Every reading, each way it can land. */
export type AssessmentCell =
  | "competence:high"
  | "competence:low"
  | "loyalty:high"
  | "loyalty:low"
  | "integrity:high"
  | "integrity:low"
  | "charisma:high"
  | "charisma:low"
  | "ambition:high"
  | "ambition:low";

export const ASSESSMENT_LINES: Record<AssessmentCell, readonly string[]> = {
  "competence:high": [
    "Turns a bad file around in a week, and expects the building to keep that pace once the crisis is over.",
    "Finds the error nobody else found, then says so in a meeting the president needed to end quietly.",
    "Was overruled on a forecast that later proved right to the decimal, and has not been gracious about it since.",
    "Keeps the whole file in memory, so the staff stops writing things down and an inquiry later finds nothing on paper.",
    "Is better at this than the last several occupants, and knows it well enough to argue back in front of staff.",
    "Runs ahead of what this chair selects for, which buys speed now and a rival with a record later.",
    "Brings a standard the post has not held in years, which makes replacing them later a much harder problem.",
    "Was passed over twice for being right too early, and now says the unwelcome thing before anyone has asked for it.",
  ],
  "competence:low": [
    "Comes in below what this chair normally draws, and the gap shows up first in whatever has to be signed quickly.",
    "Needs a deputy the post does not usually need, and that deputy becomes the person the building actually calls.",
    "Every briefing here costs the administration a day, because the preparation this chair assumes is not there.",
    "Has been briefed on the same treaty three times and asks the same opening question at the start of each one.",
    "Inherited a working office and left it needing two more people to do the same amount of work.",
    "Struggles with the volume this post carries, and the backlog becomes a number somebody hostile will eventually ask for.",
    "Nothing complicated can be handed over here without a second pair of eyes, which the chair is not staffed for.",
    "Loses an hour of every meeting to a detail already settled, and the settled thing gets reopened about a third of the time.",
  ],
  "loyalty:high": [
    "Holds to an administration harder than this chair usually does, which means bad news arrives late and arrives softened.",
    "Reads far more committed than the post selects for, and will carry an order that ought to have been refused.",
    "Went to the wall for a decision they argued against in private, and has never once said so in public.",
    "Would resign before leaking, which sounds like an asset until the thing that needed leaking is sitting on their desk.",
    "Refused a better office in the middle of a bad month, and the refusal is now a debt the president cannot repay cheaply.",
    "Treats a private instruction as a standing order, so a remark made in irritation gets carried out before it can be withdrawn.",
    "Attaches to a principal more completely than the post tends to, making a dismissal cost the whole staff beneath them.",
    "Stayed through a losing position long past the point of usefulness, and cost the administration a week it did not have.",
  ],
  "loyalty:low": [
    "Reads less attached than this chair normally requires, which buys candid advice and costs a private conversation staying private.",
    "The first serious disagreement here will be reported before it is settled, which the post does not usually risk.",
    "Has a lawyer on retainer for the day this administration ends, and retained one before the first week of it was out.",
    "Answers to a constituency that did not vote for this administration, and will say so under oath without being pressed.",
    "Keeps more of a career outside this government than the chair expects, and acts on that whenever the polling turns.",
    "Keeps a diary of every meeting, and has told two people it is for the memoir rather than the record.",
    "Is the first name the other side floats whenever a bipartisan seat opens, and has never asked them to stop floating it.",
    "Answers a hostile question honestly on the first ask, and has cost the press office two corrections in a single month.",
  ],
  "integrity:high": [
    "Runs cleaner than this chair usually draws, and a president gets the benefit of that only while the orders stay defensible.",
    "Refuses in public where the post normally refuses in private, and the difference will eventually be a news cycle.",
    "Put a disagreement in writing when a phone call would have buried it, and the writing is now discoverable.",
    "Refused the appointment the first time it was offered, and named the reason in a letter that three other offices have read.",
    "An adverse finding goes into the record here rather than into a quiet word, and the cost lands on the administration.",
    "Is harder to move than anyone this chair has held recently, and pressure that works elsewhere will not work here.",
    "Costs the administration a favor it was counting on, every time the favor turns out to need a rule bent.",
    "Lost a friend of twenty years to a disclosure that could have waited, and has not argued that it should have.",
  ],
  "integrity:low": [
    "Reads looser on conduct than this chair usually draws, which makes them useful for a year and a headline after that.",
    "Has a second income the disclosure form does not quite cover, and a filing deadline arrives every spring.",
    "Was quietly moved out of an earlier job rather than fired, and the people who moved them still take the calls.",
    "Comes in more compromised than the post normally tolerates, so whoever holds that information holds part of the administration.",
    "Does the thing nobody else in this chair would do, which is useful exactly once and expensive from then on.",
    "Owes a favor to someone who has not called it in yet, and the debt predates this administration entirely.",
    "Settled two internal complaints without a finding, and the terms of both are one subpoena away from print.",
    "Bent a rule once for a reason that held up, and has bent four more since for reasons that did not.",
  ],
  "charisma:high": [
    "Carries a room better than this chair usually requires, which makes the worst news of any week land softer.",
    "Presence runs well past the range this chair draws from, and a hearing that should be a loss turns into a draw.",
    "The seat does not normally get a voice like this, so the hardest sale of any week will end up being made by this office.",
    "Holds a bigger public than this chair usually does, an asset in a bad week and a problem in a quiet one.",
    "Wins the room so reliably that the department has stopped preparing for the meetings where the room is already lost.",
    "Can carry an argument the numbers do not support, which is useful exactly once and expensive every time after that.",
    "Was the one asked to carry the announcement nobody else would stand behind, and has been asked for every one since.",
    "Invitations arrive without the president's office on them, a pull this chair's field does not usually have.",
  ],
  "charisma:low": [
    "Was kept off the podium through the last bad week, and the decision that needed defending went undefended in public.",
    "Puts the same argument in writing twice rather than say it once out loud, which slows every decision this office has to explain.",
    "A policy that sells itself under anyone else this chair might seat will have to be sold twice under this one.",
    "Every other name in this chair's field handles a camera better, which turns a routine briefing into a weekly risk.",
    "Loses arguments in the room that the paperwork already won, which this chair's usual occupant does not.",
    "Persuasion runs a full step under what this chair typically draws, so the votes will have to be found somewhere else.",
    "Was pulled from a hearing after the opening statement, and the department has been answering that hearing's questions in writing since.",
    "Ranks last in this chair's field for presence, which is survivable until the first week that needs a public face.",
  ],
  "ambition:high": [
    "Runs hotter on ambition than any name this chair normally attracts, and the difference will be spent building something private.",
    "Treats this chair as a stop rather than a destination, unlike the rest of its field, and the stop will be short.",
    "Ambition this far above the chair's range shows up in the hiring first, a staff assembled for the next job.",
    "Reads the seat as leverage rather than as work, and the files that carry no leverage have already started to slip.",
    "Outranks this chair's whole field on drive, and none of that drive is aimed at the work this chair actually does.",
    "Spends the standing this seat carries on the next one, so whatever is left of it is not available for this office's fights.",
    "Has already priced what this seat is worth to a future campaign, and will not spend a week on anything cheaper.",
    "Keeps a second set of relationships this office has never been shown, and asks for nothing that would need to be recorded.",
  ],
  "ambition:low": [
    "Sits at the bottom of this chair's ambition range, which is the cheapest insurance a president can buy in one appointment.",
    "Will not ask for the budget the department needs, because asking is the part of the job that was never wanted.",
    "Has turned down every fight that would have made a name, including two the office needed somebody to pick.",
    "Costs less to keep than anyone else this chair draws, because there is no faction behind them asking to be paid.",
    "Takes the instruction as given and asks nothing further, which is restful until an instruction arrives that was wrong.",
    "Reads far lower on drive than this chair typically requires, which trades some initiative for a subordinate who stays one.",
    "Was content to let a deputy take the credit, and the deputy now runs the part of the department that matters.",
    "Where this chair's field is usually restless, this one is finished climbing, and a finished climber never becomes a rival.",
  ],
};

/**
 * How the fact behind a reading is introduced.
 *
 * Several, drawn by the same hash as the reading itself, because the clause
 * lands under every item on every file in the government: one frame would make
 * the whole cast sound like one form letter with the nouns swapped, which is
 * the failure this pass is correcting elsewhere and would be silly to
 * reintroduce here.
 *
 * `{fact}` is never the first word of a frame, so a driver phrase never needs
 * to be capitalized to be dropped into one.
 */
export const BECAUSE_FRAMES: readonly string[] = [
  "Most of it is {fact}.",
  "The record puts it down to {fact}.",
  "It traces to {fact}.",
  "That is {fact} showing.",
  "What did it was {fact}.",
];
