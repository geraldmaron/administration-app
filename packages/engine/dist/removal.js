import { advanceInability, INABILITY_ENDING } from "./inability.js";
import { selectFragility } from "./fragility.js";
import { removalPressureFromAlignment } from "./alignment.js";
import { selectApprovalMoves } from "./metrics.js";
import { INHERITED_WEEKS } from "./inheritance.js";
import { METRIC_HISTORY_WINDOW } from "./turn-loop.js";
import { countRemovalVotes, removalVoteLine } from "./removal-votes.js";
import { selectOversightPressure } from "./oversight.js";
import { factionPressure } from "./cabinet.js";
import { ruleValue } from "./rules.js";
import { turnsFor } from "./pace.js";
import { successionHandover } from "./succession.js";
export * from "./removal-votes.js";
// Losing power is a
// multi-beat arc per charter, not a threshold that ends the game. Pressure
// derives from metrics, factional alignment, accumulated decisions, the
// chamber's mood and how much of the recent record was spent past a floor —
// never from turn count — and only the final beat actually ends the arc. The
// one duration it does read is how long its own open beat has stood, which is
// a fact about the proceeding rather than a countdown on the presidency.
/**
 * What removal pressure is made of.
 *
 * `congress` is the branch that actually removes a president, and it was
 * missing: the arc read the player's own metrics, their alignment and their
 * recent decisions, and never once read the chamber that brings the articles.
 * A government that has gone around Congress repeatedly is in a different kind
 * of trouble from one that is merely unpopular, and until this term existed the
 * model could not tell those two apart.
 *
 * The other three are scaled down rather than left alone, because the weights
 * are shares of one pressure and a fourth term added on top would silently
 * raise every campaign's reading by the amount of the new one.
 *
 * `floors` is the fifth, and the only one that reads a breach rather than a
 * level. Every other term ultimately runs through a composite that the opinion
 * layer deliberately damps, so a government could be insolvent for two years
 * out of four, hold its own country's stability on the floor and answer nobody
 * abroad, and the arc would read that as a somewhat unpopular administration.
 * Being unable to pay is not a low score; it is a fact the country can see, and
 * it belongs in the reading on its own terms. Sharing the same fifth as
 * Congress because they are the same order of fact: something visible from
 * outside the building that an unpopular-but-functioning government does not
 * have against it.
 *
 * The other four are scaled down again for the reason above. `alignment` gives
 * up the most: it was the term that opened a beat before the first decision was
 * taken, purely off the founding program, and a share that large made the
 * opening legislative slate a louder statement about the administration than a
 * term of governing.
 */
/**
 * `faction` is the sixth weighted term, and the only one that reads the
 * President's own government rather than the country or the Congress.
 *
 * The cabinet phase can already produce the most dramatic person-outcome in the
 * game — a Secretary who "has stopped waiting to be given the job and started
 * assembling the votes for it" — and nothing followed it. The badge moved one
 * pairwise tie score by four tenths and put a word on a dossier. The rival
 * never mounted the challenge the headline said they were building, because no
 * institution in the model could see them: this list had no faction term, so a
 * president governing with half their cabinet in open revolt read exactly as
 * safe as one governing with none.
 *
 * The other five are scaled down rather than left alone, the same arithmetic
 * the `floors` term was added under: the weights are shares of one pressure,
 * and a sixth added on top would silently raise every campaign's reading by the
 * amount of the new one.
 */
export const PRESSURE_WEIGHTS = {
    unpopularity: 0.331,
    alignment: 0.184,
    decisionHistory: 0.129,
    congress: 0.129,
    floors: 0.147,
    faction: 0.08,
};
// Every clock in this file is written as a stretch of the fiction rather than
// as a number of turns, and converted through `turnsFor` where it is read. A
// turn is one week today; when that becomes a dial, "the recent record" and "a
// season of standing" keep meaning the same spans of governing rather than
// silently becoming two or four times as long — which is exactly what a private
// copy of the conversion in this file could not promise.
// Ten weeks: near enough that the country would still call these decisions
// this administration's recent record, far enough back that one bad week is not
// the whole of it.
const DECISION_HISTORY_DAYS = 70;
// How far back a breach still counts against the administration: half a
// fictional year. Long enough that a month of emergency borrowing does not read
// as collapse, short enough that a government which has since balanced its
// books is not still being charged for one.
const FLOOR_BREACH_WINDOW_DAYS = 168;
// Near enough to nothing that the reading is "there is none left" rather than
// "there is little left". Stability and standing are both floored at zero and
// both spend real campaigns sitting there.
export const REMOVAL_METRIC_FLOOR = 0.05;
// The three ways a government can be plainly failing at the job while the polls
// say only that it is unloved: the bills cannot be paid, the country is not
// being held, and nobody abroad is taking the call.
//
// These matter more now than they did. The largest pressure term used to read a
// composite that already had solvency and force posture inside it; it now reads
// the approval rating, which carries those facts only as slowly as the public
// revises. The floors are what keep an institution able to see a plainly
// failing government before its polling catches up.
//
// The money breach reads exhaustion rather than overdraft, and the difference
// is the Antideficiency Act. A government does not go into deficit on its own
// appropriation: an obligation in excess of it is void, and the officer who
// made it is the one who is reportable. So a week at zero authority is a week
// in which every obligation this administration reached for was refused, and
// `floorBreachPressure` counting those weeks is the report — a president is
// charged for running the government out of money, not for a negative number
// that cannot exist.
const FLOOR_BREACHES = [
    (metrics) => metrics.treasury <= 0,
    (metrics) => metrics.stability <= REMOVAL_METRIC_FLOOR,
    (metrics) => metrics.standing <= REMOVAL_METRIC_FLOOR,
];
/**
 * The pressure each beat of the arc opens at. The last one is removal itself.
 *
 * These are set against what the pressure function actually reaches, not
 * against a tidy-looking spread — and, this time, against a desk that is
 * played. Every previous tuning of these numbers was measured on a harness
 * that founds a campaign, enacts a program and then ends turns: it never
 * stages a scenario and never answers one, so it was reading the drift of a
 * country nobody was governing. The three ladders that came out of it are not
 * superseded distributions, they are the wrong measurement, and the numbers
 * they quoted are not repeated here for that reason. Playing the desk lifts the
 * whole reading: a government that does nothing measured 0.194–0.279 on the
 * empty harness and 0.389–0.525 once it is handed decisions, so a first beat
 * pitched at 0.37 fired in every archetype the game has, which is the exact
 * defect — "a no-confidence murmur was the game's greeting rather than a
 * warning" — that these thresholds have now been re-tuned to fix twice.
 *
 * Measured over 30 campaigns, five ways of playing, two in-game years each, on
 * the full corpus, with the ladder set out of reach so that no campaign ended
 * early and the distribution describes the pressure function rather than itself.
 * Peak pressure by way of playing: 0.307–0.427 for a president who answers
 * whatever most repairs their worst reading, 0.321–0.410 for one who plays the
 * odds, 0.389–0.525 for one who takes the mildest answer every week and never
 * spends, 0.525–0.578 for one who ignores their own country, and 0.651–0.706
 * for one who reaches for the heaviest instrument available.
 *
 * 0.45 is the reading of a government that is failing at the job rather than
 * merely finding it hard. It sits above every campaign that was actually being
 * governed — carefully or opportunistically, both top out below 0.43 — and
 * below the median of one that has stopped governing, so the first murmur is
 * something a president earns rather than something they are greeted with.
 *
 * 0.52 is the reading at which a president who has abandoned their own country
 * is the ordinary case: every neglectful campaign measured at or above it. A
 * formal motion should be the normal consequence of that and an unusual one for
 * anybody else, and no careful campaign comes within a fifth of it.
 *
 * 0.60 is above what any way of playing short of the most destructive one
 * reaches on conditions alone, and below every reckless campaign. So a
 * president is removed outright only for governing destructively — and a
 * neglectful one is removed only by leaving a filed motion unanswered long
 * enough for it to carry itself the rest of the way, which is the clock that
 * `standingBeatPressure` exists to be. That distinction is the point of the
 * ladder: one presidency is ended by what it did, the other by what it never
 * got around to doing about it.
 *
 * The rungs are 0.07 and 0.08 apart, neither wider than `STANDING_BEAT_SWING`,
 * so a proceeding that keeps its justification for a full political season can
 * reach the next beat unaided. A wider gap would make that clock decorative.
 *
 * Chosen by what they produce as much as by where they sit, which is the test
 * the last tuning got right and the only one that catches a ladder that reads
 * plausibly and plays badly. Over two in-game years: a destructive presidency
 * is removed every time, at a median of turn 20, first warned around turn 8
 * rather than on turn 1 before it had answered anything; a neglectful one is
 * removed in five campaigns of eight, at a median of turn 82, with the best
 * part of a year between the first murmur and the end; a coasting one opens the
 * arc in five of eight and is never removed inside one term. Neither way of
 * actually governing is ever removed, and the one that plays the odds never
 * hears the first murmur at all. Over two full terms both the coaster and the
 * neglectful president are removed in five campaigns of six, which is the case
 * that matters most: without a working ladder every one of them ends on the
 * same fixed election date four in-game years out, whatever they have done.
 *
 * Note when re-measuring, because this is easy to get wrong: peak pressure is
 * not independent of these numbers. A campaign
 * that ends in removal stops accumulating, so lowering the final beat lowers
 * the observed maximum, and an open beat now feeds back into the reading as
 * well. Re-measure with the ladder out of reach, on the harness that plays the
 * desk, and re-measure at all of it whenever anything approval is made of moves.
 *
 * Every turn quoted above is a week of the fiction, which is what a turn is
 * today. Nothing in this file is calibrated in turns — every clock it owns is
 * written in days and the ladder is a level — so if a turn ever stops being a
 * week these figures are the ones to restate, not the constants under them.
 */
export const BEAT_THRESHOLDS = [0.45, 0.52, 0.6];
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function clampSigned(value) {
    return Math.max(-1, Math.min(1, value));
}
// A proceeding that has been opened either gathers signatures or loses them,
// and these three numbers are what gathering means.
//
// A quarter of a fictional year is how long a committee gets before the country
// has drawn its own conclusion about whether it has anything: long enough that
// the administration has a real chance to answer the case, short enough that
// the answer has to come inside one political season.
const BEAT_RIPENS_OVER_DAYS = 84;
// How far the underlying case has to move, either way, for the proceeding to be
// running at full speed. About one rung of the ladder: the ground has to shift
// by roughly what it took to open the beat in the first place.
const BEAT_DRIVE_SPAN = 0.06;
// Where the proceeding turns, measured back from the reading that opened the
// beat. Holding exactly the conditions the motion was filed over is not an
// answer to it, so a government that merely stops getting worse still watches
// the case ripen; the accusers only start losing signatures once the
// administration has genuinely pulled the ground back out from under them.
const BEAT_RELIEF_MARGIN = 0.03;
// The most a standing proceeding can add to the reading, or take off it. Set to
// the width of the widest rung of the ladder, so that a case which holds its
// justification through a full season carries itself to the next beat unaided —
// an inquiry does not idle — and one that has lost it hands the administration
// back the ground the failed attempt cost its accusers.
const STANDING_BEAT_SWING = 0.08;
// Each RemovalMechanism's implied institutional expectation of the player's
// alignment: institutions read the same conduct differently depending on
// how they came to power. Democratic mechanisms expect a less authoritarian player; coup/clerical
// mechanisms tolerate — even reward — more authoritarian conduct.
const MECHANISM_EXPECTED_ALIGNMENT = {
    "no-confidence": { authLibertarian: -0.4 },
    impeachment: { authLibertarian: -0.3 },
    "electoral-defeat": { authLibertarian: -0.5 },
    coup: { authLibertarian: 0.3 },
    "clerical-council": { authLibertarian: 0.1 },
};
const BEAT_NARRATION = {
    "no-confidence": [
        "Junior lawmakers start talking about a no-confidence vote against you.",
        "A no-confidence motion against you is filed in the Assembly.",
        "The motion passes. The Assembly no longer backs you, and you are removed.",
    ],
    impeachment: [
        "Lawmakers on a committee start talking about impeaching you.",
        "Congress votes to impeach you.",
        "You are found guilty at trial and removed from office.",
    ],
    coup: [
        "Officers are overheard questioning who gives the orders.",
        "A group of officers moves to seize key military sites.",
        "The coup succeeds and you are removed.",
    ],
    "clerical-council": [
        "The Council quietly checks whether your decrees follow religious doctrine.",
        "The Council meets to decide whether to withdraw its support.",
        "The Council rules against you and you are removed.",
    ],
    "electoral-defeat": [
        "Polls show your coalition losing ground.",
        "The opposition builds a lead going into the election.",
        "You lose the election and hand power to your successor.",
    ],
};
// The five raw 0..1 readings the weights above are applied to, pulled out on
// their own so `computeRemovalPressure` and `selectPressureComposition` read
// one formula rather than two copies that can drift apart.
function pressureTermReadings(state, charter) {
    // The public's own verdict, which is what an institution moving against a
    // president is actually answering to. It used to be one minus a composite
    // that was seventy percent state capacity, so a solvent, orderly, well-armed
    // government read as safe from removal however much the country loathed it.
    const unpopularity = 1 - state.player.metrics.approval;
    const alignmentPressureRaw = removalPressureFromAlignment(state.player.alignments, MECHANISM_EXPECTED_ALIGNMENT[charter.removalMechanism]);
    const alignment = (alignmentPressureRaw + 1) / 2; // [-1,1] -> [0,1]
    const recentMoves = selectApprovalMoves(state, state.turn - turnsFor(DECISION_HISTORY_DAYS));
    const negativeMoveMagnitude = recentMoves
        .filter((move) => move.approvalDelta < 0)
        .reduce((sum, move) => sum + Math.abs(move.approvalDelta), 0);
    const decisionHistory = clamp01(negativeMoveMagnitude);
    return {
        unpopularity,
        alignment,
        decisionHistory,
        congress: congressionalPressure(state),
        floors: floorBreachPressure(state),
        faction: factionPressure(state),
    };
}
// Documented weighted composite: low approval, alignment opposed to what the
// charter's institutions expect, a recent run of approval-damaging decisions, a
// hostile chamber, a record spent past one of the floors, and a bloc inside the
// President's own government that is not theirs each raise
// pressure. Never reads state.turn as
// a countdown — only as windows over the ledger, the metric record and the
// arc's own open beat.
export function computeRemovalPressure(state, charter) {
    const readings = pressureTermReadings(state, charter);
    const conditions = clamp01(Object.keys(PRESSURE_WEIGHTS).reduce((sum, term) => sum + readings[term] * PRESSURE_WEIGHTS[term], 0));
    // Endogenous fragility, and the reason a bad administration compounds rather
    // than paying the same flat price twenty times. A healthy government's
    // amplification is 1 and this line changes nothing for it; a hollowed-out one
    // absorbs the same conditions far worse. Every point of it is a reading the
    // player can see and move, so nothing here is a hidden difficulty curve.
    const amplified = clamp01(conditions * selectFragility(state).amplification);
    // The proceeding reads the conditions rather than the total, so what a
    // standing beat adds this week cannot be part of what justifies it next week.
    return clamp01(amplified + standingBeatPressure(state.removal, state.turn, amplified));
}
/**
 * The live breakdown behind `computeRemovalPressure`, for a screen that has
 * to show its work rather than repeat the constant weights. A screen printing
 * `PRESSURE_WEIGHTS` beside the figure was showing what each term is *worth*,
 * never what it is *doing this week* — two governments at the same weight can
 * be reading very differently on the term itself, and only this selector
 * exposes that.
 */
export function selectPressureComposition(state, charter) {
    const readings = pressureTermReadings(state, charter);
    const components = Object.keys(PRESSURE_WEIGHTS).map((term) => ({
        term,
        weight: PRESSURE_WEIGHTS[term],
        reading: readings[term],
        contribution: readings[term] * PRESSURE_WEIGHTS[term],
    }));
    const conditions = clamp01(components.reduce((sum, component) => sum + component.contribution, 0));
    const fragility = selectFragility(state);
    const amplified = clamp01(conditions * fragility.amplification);
    return {
        components,
        fragilityContribution: amplified - conditions,
        fragility,
        standingBeatContribution: standingBeatPressure(state.removal, state.turn, amplified),
    };
}
/**
 * What a composition's own rows add to — the six terms, fragility's
 * multiple, and the open proceeding, combined by the same formula
 * `computeRemovalPressure` applies to the same readings.
 *
 * Deliberately not `RemovalArc.pressure`. That figure is carried from the
 * last weekly tick's removal phase and holds until the next one; a
 * composition is read live, off whatever state the screen passed in. A
 * mid-week act moves a reading the composition sees immediately and the
 * arc's stored pressure does not, so a screen that labeled its breakdown's
 * total "Removal pressure" — implying the arc's figure — could show a
 * breakdown that does not add up to the number printed above it. This is
 * the number the breakdown actually adds up to, for whatever state it was
 * read against.
 */
export function pressureCompositionTotal(composition) {
    const conditions = composition.components.reduce((sum, component) => sum + component.contribution, 0);
    const amplified = conditions + composition.fragilityContribution;
    return clamp01(amplified + composition.standingBeatContribution);
}
/**
 * What the arc can see that the polls cannot show it.
 *
 * Deliberately a share of a window rather than a count of weeks: what this
 * reports is "most of this administration has been spent unable to pay", a
 * sentence that stays true however long a week is, rather than a tally that
 * would double if the campaign's pace ever halved.
 */
/** How many inherited rows are still in the bounded history. The rest have scrolled out. */
export function inheritedRowsStillHeld(turn) {
    const governedWeeks = Math.max(0, turn - 1);
    const scrolled = Math.max(0, INHERITED_WEEKS + governedWeeks - METRIC_HISTORY_WINDOW);
    return Math.max(0, INHERITED_WEEKS - scrolled);
}
export function floorBreachPressure(state) {
    // Only the weeks this administration actually governed. The history opens
    // with the inherited quarter, then keeps the last 24 rows, so a fixed skip
    // of 13 starts dropping governed weeks once that quarter scrolls out.
    const governed = state.player.metricHistory.slice(inheritedRowsStillHeld(state.turn));
    const record = [...governed, state.player.metrics].slice(-turnsFor(FLOOR_BREACH_WINDOW_DAYS));
    const breaches = record.reduce((sum, metrics) => sum + FLOOR_BREACHES.filter((isBreached) => isBreached(metrics)).length, 0);
    return clamp01(breaches / (record.length * FLOOR_BREACHES.length));
}
/**
 * What an already-open proceeding does on its own.
 *
 * A filed motion that stands for four in-game years without moving is not a
 * warning, it is furniture, which is what an arc that only ever adds or holds
 * beats produces. A proceeding that keeps its justification gathers weight
 * until it reaches the next beat by itself; one
 * whose justification has gone gives ground back, because an attempt that
 * visibly failed costs the people who brought it.
 *
 * The beat itself is never withdrawn. What happened to this presidency stays in
 * its record, and every consumer of `beats` — the narration index, the
 * severity reading, the election's record penalty — is written against a list
 * that only ever grows. What eases is the pressure, which is the thing the
 * player can actually act on.
 *
 * Reads how long the beat has stood, which is a duration inside the arc's own
 * record rather than a countdown from the founding, and is why this is not the
 * turn-count dependency the rest of the file refuses.
 */
function standingBeatPressure(arc, turn, conditions) {
    const openIndex = arc.beats.length - 1;
    const opened = arc.beats[openIndex];
    const threshold = BEAT_THRESHOLDS[openIndex];
    if (!opened || threshold === undefined)
        return 0;
    const standing = Math.max(0, turn - opened.turn);
    const ripeness = Math.min(1, standing / turnsFor(BEAT_RIPENS_OVER_DAYS));
    const drive = clampSigned((conditions - (threshold - BEAT_RELIEF_MARGIN)) / BEAT_DRIVE_SPAN);
    return STANDING_BEAT_SWING * ripeness * drive;
}
/**
 * What the other branch contributes.
 *
 * Three separate facts, and all are needed: a Congress that has turned against
 * the administration is the standing condition an impeachment grows out of,
 * every use of force it was told about rather than asked is a specific count,
 * and an open investigation is the machinery an impeachment actually rides in
 * on. Oversight also lowers the mood target, and deliberately enters both — a
 * live inquiry sours the room this week AND is its own count, the same way an
 * unauthorized deployment already does. Kept together here so the arc reads
 * one figure and the weights above stay shares of a whole.
 */
function congressionalPressure(state) {
    const hostility = 1 - state.congress.disposition;
    const unilateral = Math.min(1, state.congress.unauthorized.length * 0.25);
    const oversight = selectOversightPressure(state);
    return clamp01(hostility * 0.55 + unilateral * 0.35 + oversight * 0.1);
}
// --- The two votes ----------------------------------------------------------
//
// The counts themselves live in removal-votes.ts; the arc reads them at the
// ladder above, so the case each vote weighs is measured from these rungs.
function removalVotesAt(state, charter, pressure) {
    return countRemovalVotes(state, charter, pressure, BEAT_THRESHOLDS);
}
/**
 * The two counts as they stand this week, for a screen that has to show a whip
 * count rather than a verdict. Empty for a charter that removes by any means
 * other than impeachment.
 */
export function selectRemovalVotes(state, charter) {
    return removalVotesAt(state, charter, state.removal.pressure);
}
/** The count standing between the arc and its next beat, if it has not carried. */
function shortfall(state, charter, pressure, nextBeatIndex) {
    const gate = removalVotesAt(state, charter, pressure).find((step) => step.beat === nextBeatIndex);
    return gate === undefined || gate.vote.passed ? undefined : gate;
}
function beatsCrossed(pressure) {
    return BEAT_THRESHOLDS.filter((threshold) => pressure >= threshold).length;
}
/**
 * How much trouble the administration is actually in, for a surface that has to
 * color the reading.
 *
 * It is derived from the beats the arc has genuinely opened, never from a
 * threshold a screen picked. A screen calling pressure adverse at its own 0.45,
 * a figure matching nothing in this file, stays calm through the first beat
 * opening at 0.3 and then alarms at a level the arc still considers beat one.
 */
export function removalSeverity(arc) {
    if (arc.resolved)
        return "adverse";
    const crossed = beatsCrossed(arc.pressure);
    if (crossed === 0)
        return "neutral";
    return crossed === 1 ? "caution" : "adverse";
}
function buildEndingSummary(state, charter) {
    const recentMoves = selectApprovalMoves(state, state.turn - turnsFor(DECISION_HISTORY_DAYS)).filter((move) => move.approvalDelta < 0);
    const causes = recentMoves
        .slice(-3)
        .map((d) => d.description)
        .join(" "); // in-fiction, no raw weight breakdown
    return causes.length > 0
        ? `${BEAT_NARRATION[charter.removalMechanism][2]} What sealed it: ${causes}`
        : BEAT_NARRATION[charter.removalMechanism][2];
}
// Advances the arc by at most one new beat per turn, purely from the
// pressure computed against this turn's live state — even if pressure spikes
// past multiple thresholds at once, the story paces out one beat at a time,
// giving the player a turn to react. Beats are append-only — a beat that
// already happened stays part of the story — but pressure dropping back
// down stops any further beat from being added, which is what makes the arc
// survivable rather than a one-way ratchet.
//
// Between two beats the arc is not idle: the open one gathers or loses weight
// on its own (`standingBeatPressure`), so a proceeding the administration never
// answers arrives at the next beat by itself and one it does answer subsides.
export function advanceRemovalArc(state, charter) {
    const current = state.removal;
    if (current.resolved)
        return current;
    const pressure = computeRemovalPressure(state, charter);
    const crossed = beatsCrossed(pressure);
    // Invulnerability is the arc stopping one beat short, not the arc going away.
    // Pressure still computes and still reads on the situation room, and every
    // earlier beat still fires, so a sandbox campaign can still be seen to be
    // failing — it simply cannot be ended. Suppressing the reading instead would
    // hide the one figure that says whether an edit made things better or worse.
    const invulnerable = ruleValue(state, "removal.immune") && current.beats.length >= BEAT_THRESHOLDS.length - 1;
    const nextBeatIndex = current.beats.length;
    if (crossed <= current.beats.length || invulnerable) {
        return { ...current, pressure };
    }
    // Pressure opens the question; the chamber answers it. A reading past the
    // rung with no majority behind it leaves the arc exactly where it was, which
    // is the whole of what separates a president Congress will not remove from
    // one it cannot yet count the votes to remove.
    if (shortfall(state, charter, pressure, nextBeatIndex) !== undefined) {
        return { ...current, pressure };
    }
    const description = BEAT_NARRATION[charter.removalMechanism][nextBeatIndex];
    const beats = [...current.beats, { turn: state.turn, description }];
    const resolved = nextBeatIndex === BEAT_THRESHOLDS.length - 1;
    return {
        mechanism: charter.removalMechanism,
        pressure,
        pressureHistory: current.pressureHistory,
        beats,
        resolved,
        ...(resolved ? { endingSummary: withHandover(buildEndingSummary(state, charter), state, charter) } : {}),
    };
}
// A conviction removes a President, not the presidency: the ending names who
// takes the oath, read before the arc resolves so the line is the one in office
// that day. Only an impeachment charter hands the office down this way.
function withHandover(summary, state, charter) {
    if (charter.removalMechanism !== "impeachment")
        return summary;
    const handover = successionHandover(state);
    return handover.length > 0 ? `${summary} ${handover}` : summary;
}
function inabilityLine(count) {
    if (count.passed)
        return INABILITY_ENDING;
    return `The Vice President and a majority of the cabinet declare the President unable to serve; the House counts ${count.house.yeas} of ${count.house.required} and the Senate ${count.senate.yeas} of ${count.senate.required}, and the President resumes the office.`;
}
export function removalPhase(charter) {
    return (state) => {
        if (state.removal.resolved)
            return [];
        const laddered = advanceRemovalArc(state, charter);
        // The inability watch runs on the arc the ladder leaves, so a presidency the
        // ladder ended this week is not also declared unable.
        const inability = advanceInability(state, charter, laddered);
        const nextArc = inability.arc;
        const gainedANewBeat = nextArc.beats.length > state.removal.beats.length;
        // A week in which the reading was past the rung and the chamber still had
        // no majority is the most informative week the arc has, and it used to
        // narrate as the same shrug as a quiet one.
        const held = !gainedANewBeat && beatsCrossed(nextArc.pressure) > state.removal.beats.length
            ? shortfall(state, charter, nextArc.pressure, state.removal.beats.length)
            : undefined;
        const summary = inability.count
            ? inabilityLine(inability.count)
            : gainedANewBeat
                ? nextArc.beats.at(-1).description
                : held
                    ? removalVoteLine(held)
                    : "The pressure to remove you shifts this week.";
        const packet = {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary },
            effects: [{ kind: "removal", arc: nextArc }],
        };
        return [packet];
    };
}
