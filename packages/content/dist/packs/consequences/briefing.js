// The aftermath of having believed something.
//
// Every other card in the bundled pool is written about an act: it worked, it
// half worked, it went wrong. These are written about the *briefing* the act
// came out of — the hedged claim the room decided to act on before it was
// firm. They are the only cards in the pool gated on `intelFalse`, which is why
// they live together rather than under their instruments: the register is one
// register, and a writer adding to it needs to see the whole doctrine at once.
//
// Three rules govern the writing here and all three are audit-enforced, not
// advice.
//
// A reveal card may only ever be told in a campaign where the claim really was
// false, so `intelFalse: true` is not decoration — it is the difference between
// this pool and a game that occasionally tells the player they were fooled for
// atmosphere. And every one of them names the check that would have caught it:
// the report nobody asked to see, the second pass nobody ordered, the question
// nobody put. That line is the whole point. Without it a reveal is the game
// gloating; with it the player leaves knowing a move, and the next hedged
// briefing is a decision instead of a coin toss.
//
// The third rule is why this file is as long as it is. A reveal is drawn from
// one cell of the instrument by band by valence matrix like any other card, so
// a cell with no reveal in it is a cell where a false briefing goes untold —
// the campaign privately holds that the yard was empty and the player is
// informed only that the strike went well. Every cell therefore carries one,
// including the success cells: the resolver never learns the premise was
// hollow and will rule the act a success on its own terms, and an act that
// comes off perfectly against nothing is the sharpest form of this mechanic
// rather than an exception to it. The fifteen wide cards below are that floor,
// each written to read at any rung of its ladder; the band-specific ones are
// the sharper telling where a particular rung earns one.
//
// The counterweight is here too, and it matters as much. `intelFalse: false`
// cards are told when a thinly sourced claim held — because a pool that only
// speaks when the services were wrong would teach a player to distrust every
// hedge, and distrusting every hedge is as unthinking as trusting every one.
/**
 * What a briefing card carries into the draw against the ordinary tellings of
 * the same outcome.
 *
 * These cards are already rare: they are only eligible in the week a marked
 * claim's truth is settled, which is a small share of a campaign. Left at the
 * even weight the floor uses, a reveal would then lose that week to the four or
 * five cards written for the act, and the mechanic would be silent in most of
 * the weeks it fired — a coin toss stacked on top of a coin toss, and a player
 * with no way to learn anything from either. The weight is what makes the
 * verdict reach the room that has to live with it. Both sides of the bet carry
 * it, so a briefing that held is told as loudly as one that did not; weighting
 * only the reveals would teach that a hedge is usually a lie, which is the
 * opposite of what the rate actually is.
 */
const BRIEFING_WEIGHT = 8;
// --- The floor: one reveal per instrument per valence, at any rung ------------
const WIDE_REVEALS = [
    {
        id: "cq-briefing-diplomatic-success-agreed-to-a-thing-that-was-not-there",
        instrument: "diplomatic",
        rungBands: ["low", "mid", "high"],
        valence: "success",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "{{target}} agrees to everything asked, which is the first sign that what was asked for cost them nothing. The movement the whole approach was built on came down one channel, and the earlier cable that would have shown the channel had been quiet all season sat unread in the same folder.",
            "{{actor}} has its agreement. What the agreement was meant to prevent is now a sentence nobody in the room wants to finish out loud.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.02 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { trust: 0.02 } },
        ],
        sets: ["agreed-against-nothing"],
    },
    {
        id: "cq-briefing-diplomatic-partial-the-transcript-says-otherwise",
        instrument: "diplomatic",
        rungBands: ["low", "mid", "high"],
        valence: "partial",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The language is agreed and the premise underneath it comes apart in the second week. The account it rested on came from a single desk, and the record of the last meeting, which nobody asked to see, has {{target}} saying the opposite in plain words and on a date everyone can check.",
            "The agreement stands. Everybody who reads the record afterwards understands exactly what {{actor}} did not know when it put its name to it.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.05 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.04 } },
        ],
        sets: ["signed-against-the-record"],
    },
    {
        id: "cq-briefing-diplomatic-failure-its-own-files-had-answered-it",
        instrument: "diplomatic",
        rungBands: ["low", "mid", "high"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The approach fails on its own terms and then fails again on the facts. The case rested on one source with a grievance of his own, and the older reporting that contradicted him was never requested, because requesting it meant delaying a statement the room had already agreed to make.",
            "{{target}} publishes the two documents side by side and lets the comparison do the rest of the work.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.08 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.06, tension: 0.08 } },
            { kind: "feed", headline: "{{actor}} built a week of diplomacy on a claim its own older reporting had already answered" },
        ],
        sets: ["argued-against-its-own-files"],
        remembered: "{{actor}} came to us with a case its own files had already settled, and had not troubled to read them first.",
    },
    {
        id: "cq-briefing-economic-success-aimed-at-a-shortfall-counted-twice",
        instrument: "economic",
        rungBands: ["low", "mid", "high"],
        valence: "success",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The measures bite precisely where they were aimed, and the harm they were aimed at turns out never to have happened. The trade behind the case was entered by two offices working from one shipment, and the customs return that would have shown the doubling was never requested.",
            "The money moves regardless. What it was for is a question {{actor}} now answers in the past tense.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.03, treasury: -1200 } }],
        sets: ["priced-a-double-count"],
    },
    {
        id: "cq-briefing-economic-partial-an-office-reporting-on-itself",
        instrument: "economic",
        rungBands: ["low", "mid", "high"],
        valence: "partial",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "Half of it lands and the ledger the whole thing was drawn from does not survive its first hearing. The totals came from an office reporting on its own performance, and the second set held down the corridor went unread, because asking for it meant putting a question in writing that nobody wanted answered.",
            "The measures stay where they are. What the hearing turns to next is how {{actor}} chose them, and on whose word.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.06, treasury: -3000 } }],
        sets: ["took-an-office-at-its-word"],
    },
    {
        id: "cq-briefing-economic-failure-a-quarter-in-two-places",
        instrument: "economic",
        rungBands: ["low", "mid", "high"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "It goes badly, and then the case for having done it collapses underneath the going badly. The shortfall was a bookkeeping artifact, one quarter entered in two places by a desk with a review coming, and the reconciliation that would have caught it had been sitting in a queue nobody moved it out of.",
            "{{target}} says nothing at all and lets {{actor}}'s own auditors say it instead, which is cheaper and lands harder.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.09, stability: -0.04, treasury: -5000 } },
            { kind: "feed", headline: "The shortfall that justified the whole package was one quarter counted twice" },
        ],
        sets: ["acted-on-an-artifact"],
        remembered: "{{actor}} moved against us over a hole in its own books, and its own auditors were the ones who found it.",
    },
    {
        id: "cq-briefing-covert-success-clean-run-empty-hands",
        instrument: "covert",
        rungBands: ["low", "mid", "high"],
        valence: "success",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The operation runs clean, comes home whole, and brings back exactly what it went for. What it went for is worth nothing. The name at the middle of it was sold by a source who was owed money, and the pay record that would have said so was never opened, because opening it meant reopening the case.",
            "Nobody outside the building will ever hear about it. Everybody inside it has now learned something about how {{actor}} picks a name.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.02, stability: -0.02 } }],
        sets: ["clean-run-empty-hands"],
    },
    {
        id: "cq-briefing-covert-partial-sold-the-same-site-twice",
        instrument: "covert",
        rungBands: ["low", "mid", "high"],
        valence: "partial",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "Half of it works, and the half that works is what proves the case was hollow. The voice that named the site had named it once before, to somebody else, for money, and that debrief sat unopened in a service which had already sent the assessment upward as settled fact.",
            "What was recovered is filed and never cited again, and the case it was meant to make is dropped without anyone having to say out loud that it was never a case.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.05, stability: -0.04 } }],
        sets: ["bought-a-name-twice-sold"],
    },
    {
        id: "cq-briefing-covert-failure-paid-by-two-services",
        instrument: "covert",
        rungBands: ["low", "mid", "high"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "It comes apart in the ordinary way, and the people sent to pick through the wreckage find that the premise was invented before the operation was. The one voice the file rested on had been on two payrolls in the same season, and the ledger that would have shown it was never sought.",
            "{{target}} has nothing to prove and knows it. It publishes what it found and lets the room trace the line back to {{actor}} unaided.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.1, stability: -0.07 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.1, tension: 0.12 } },
            { kind: "grudge", cause: "ran an operation here on a voice it never checked", weight: 0.45 },
        ],
        sets: ["ran-it-on-a-bought-voice"],
        remembered: "{{actor}} came into our country on the word of a man two services were paying, and checked with neither.",
    },
    {
        id: "cq-briefing-military-success-a-flawless-operation-about-nothing",
        instrument: "military",
        rungBands: ["low", "mid", "high"],
        valence: "success",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The force does exactly what it was ordered to do, on time and without a scratch, and finds the place empty. The movement that justified the order was routine and filed in the open, and the summary saying so was never read, because the assessment had already gone up the chain as fact.",
            "The report of a flawless operation and the report of an operation about nothing are the same report, and both of them are true.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.03 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { tension: 0.02 } },
        ],
        sets: ["went-in-against-nothing"],
    },
    {
        id: "cq-briefing-military-partial-one-debrief-and-no-second",
        instrument: "military",
        rungBands: ["low", "mid", "high"],
        valence: "partial",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "It half works, which is the outcome that leaves the most to be examined, and what the examination turns up is that the case was thin from its first morning. The crew whose account started it was never debriefed a second time, and nobody asked why a claim of that size was resting on one account.",
            "The forces come home. The question of what they were sent for outlives by some distance the week they were sent in.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.07, militaryReadiness: -0.03, stability: -0.04 } }],
        sets: ["sent-them-on-one-account"],
    },
    {
        id: "cq-briefing-military-failure-the-dates-were-published",
        instrument: "military",
        rungBands: ["low", "mid", "high"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "It goes wrong, and then the reason it was ordered goes wrong behind it. What the buildup amounted to was a drill with its dates published in advance, and the liaison note that said so plainly was never opened by anybody senior enough for the saying to count.",
            "{{target}} walks reporters over the ground itself, which is the only argument it has to make and the only one it needs.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.11, stability: -0.06 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.11, tension: 0.13 } },
            { kind: "grudge", cause: "came at us over a drill it could have read about", weight: 0.5 },
        ],
        sets: ["moved-against-a-drill"],
        remembered: "{{actor}} sent its forces against a drill whose dates had been published, and read the notice afterwards.",
    },
    {
        id: "cq-briefing-assistance-success-a-shortage-already-over",
        instrument: "assistance",
        rungBands: ["low", "mid", "high"],
        valence: "success",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The aid arrives, is handed out, and turns out to have been sent against a shortage that had ended before the request ever reached {{actor}}. The survey the appeal quoted was a season old, and the field office's newer count went unread in the building that approved the flights.",
            "{{target}} is grateful in public and puzzled in private, and of the two the private version is the one that gets repeated.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.02, treasury: -1800 } }],
        sets: ["shipped-against-an-old-survey"],
    },
    {
        id: "cq-briefing-assistance-partial-the-same-district-twice",
        instrument: "assistance",
        rungBands: ["low", "mid", "high"],
        valence: "partial",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "Some of it lands where it was needed and some of it lands where the need was invented. The list came from an office with every reason to lengthen it, and the register that would have shown the same district entered twice under two spellings sat unread while the aircraft were loading.",
            "What went to the wrong place is not coming back, and the accounting for it belongs to whoever asks the first question in public.",
        ],
        effects: [{ kind: "metric", deltas: { standing: -0.05, stability: -0.02, treasury: -3500 } }],
        sets: ["fed-a-padded-list"],
    },
    {
        id: "cq-briefing-assistance-failure-a-road-called-open",
        instrument: "assistance",
        rungBands: ["low", "mid", "high"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The convoy is taken apart before it arrives, and the reason it went that way does not survive the first hour of the inquiry. The road was called open in a single report from people who wanted the traffic, and the escort's own account of the same road went unread.",
            "The stores are gone, the people who were waiting on them are still waiting, and the route was {{actor}}'s to choose.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.09, stability: -0.05, treasury: -4000 } },
            { kind: "grudge", cause: "sent our relief down a road nobody had checked", weight: 0.35 },
        ],
        sets: ["chose-an-unchecked-road"],
        remembered: "{{actor}} routed the convoy down a road one interested party called open, and asked nobody else.",
    },
];
// --- The sharper telling, where a particular rung earns one ------------------
const BAND_REVEALS = [
    {
        id: "cq-briefing-military-high-failure-the-yard-was-an-exercise",
        instrument: "military",
        rungBands: ["high"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The yard is hit exactly as planned and there is nothing in it. The movement order that put the vehicles there was an exercise order, filed in the open, and the liaison officer's own summary said so in its second paragraph — a summary nobody asked for, because the estimate had already gone up the chain as fact.",
            "{{target}} does not need to say anything clever. It walks the cameras through the empty sheds itself.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.09, stability: -0.05 } },
            { kind: "relationship", direction: "target-to-actor", deltas: { trust: -0.12, tension: 0.14 } },
            { kind: "grudge", cause: "struck us over an exercise", weight: 0.5 },
        ],
        sets: ["struck-on-an-exercise"],
        remembered: "{{actor}} bombed a yard full of nothing and learned afterwards that the answer had been on file the whole time.",
    },
    {
        id: "cq-briefing-covert-mid-failure-the-wrong-man-entirely",
        instrument: "covert",
        rungBands: ["mid"],
        valence: "failure",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The name came from one channel and the channel was settling something of its own. The man was a clerk with an unlucky route to work, and the travel record that would have shown it sat unread in a folder the service never opened because opening it meant admitting the case rested on a single voice.",
            "He is released without apology, which is its own kind of statement, and the people who watched it happen draw the obvious conclusion about how {{actor}} picks a name.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.07, stability: -0.06 } },
            { kind: "grudge", cause: "took the wrong man on one source", weight: 0.4 },
        ],
        sets: ["took-the-wrong-name"],
        remembered: "{{actor}} lifted a man on the word of one source and the file that cleared him was never opened.",
    },
    {
        id: "cq-briefing-economic-mid-partial-a-budget-defending-itself",
        instrument: "economic",
        rungBands: ["mid"],
        valence: "partial",
        conditions: { intelFalse: true },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The measures land, and then the figure they were built on comes apart under the first serious question anyone puts to it. It was assembled by an office whose funding was under review, from an estimate that had never been checked against the customs returns — a check that would have taken an afternoon and that nobody ordered, because the number was the number everyone wanted.",
            "The measures stay in force regardless. Explaining why is now the harder job.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: -0.06, treasury: -4000 } },
            { kind: "feed", headline: "The number that justified the sanctions came from an office defending its own budget" },
        ],
        sets: ["acted-on-a-cooked-figure"],
        remembered: "{{actor}} priced a whole policy off a figure an office invented to keep itself funded.",
    },
];
// --- The other side of the bet ----------------------------------------------
const HELD = [
    {
        id: "cq-briefing-diplomatic-low-partial-the-disputed-timing-held",
        instrument: "diplomatic",
        rungBands: ["low"],
        valence: "partial",
        conditions: { intelFalse: false },
        weight: BRIEFING_WEIGHT,
        beats: [
            "The approach was made on an assessment the second service would not sign, and the second service was wrong. The timing holds, the meeting happens, and the room quietly notes which desk had been right — a fact worth more, over a term, than the meeting itself.",
        ],
        effects: [
            { kind: "metric", deltas: { standing: 0.02, militaryReadiness: -0.02 } },
            { kind: "relationship", direction: "actor-to-target", deltas: { trust: 0.03 } },
        ],
        sets: ["thin-sourcing-held"],
    },
];
export const BRIEFING_CONSEQUENCES = [...WIDE_REVEALS, ...BAND_REVEALS, ...HELD];
