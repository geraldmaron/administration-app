import { loyaltyWord, stanceForRatio } from "../format/figures";
// The disposition with its figure, which is the trailing column's whole job.
// A vacant chair the cast can still fill is a decision, not a crisis — amber,
// not the red of one already gone wrong.
export function seatScan(seat) {
    if (seat.isPlayer)
        return { word: "You", figure: "", stance: "favorable" };
    if (seat.holder === undefined) {
        const stance = seat.candidates.length === 0 ? "adverse" : "caution";
        // No figure. The bench count belongs to the `Eligible` chip, where it is
        // labeled: a bare numeral under the word "Vacant" reads as a count of
        // vacancies, and the row's spoken label said "Vacant 3 … Eligible 3".
        return { word: "Vacant", figure: "", stance };
    }
    // The disposition word, and only that. The column is the disposition with its
    // figure, so "Watch" printed over a green 79 was a word disagreeing with the
    // ink beside it — and saying nothing the "Watch: Ambition" chip below did not
    // already say with its subject named. A rival faction and a watch reading are
    // cautions; they belong in the caution chip, which is where they now are.
    //
    // The figure is never the stored percentage — nobody in the fiction of the
    // office is handed a minister's loyalty as a number. It is the signed
    // movement since this chair took the seat (`loyaltyMovedPoints`, the same
    // trend `cautionFact` below already flags when it turns negative), which is
    // the one loyalty figure a president can actually observe happening, and it
    // is blank for a chair that has not moved yet rather than a reading with
    // nothing behind it.
    const loyalty = stanceForRatio(seat.holder.loyalty);
    const moved = seat.loyaltyMovedPoints;
    const figure = moved === undefined || moved === 0 ? "" : `${moved > 0 ? "+" : ""}${moved} pts`;
    return { word: loyaltyWord(loyalty), figure, stance: loyalty };
}
/**
 * The act the row carries, priced in the only currency this surface can state
 * honestly: the statutory rule. The engine charges a dismissal against
 * standing by the officer's own charisma, but it exposes no projection of that
 * charge, so the row names the rule and sends the player to the file that runs
 * the act rather than printing a figure nothing computed.
 */
export function seatLever(seat) {
    if (seat.isPlayer)
        return { kind: "none" };
    if (seat.holder === undefined) {
        if (seat.nomination !== undefined) {
            return { kind: "waiting", label: `${seat.nomination}. The seat stays empty until they're sworn in`, stance: "caution" };
        }
        if (seat.candidates.length === 0) {
            return { kind: "stranded", label: "Nobody available can fill this seat, so it stays empty.", stance: "adverse" };
        }
        const count = seat.candidates.length;
        return {
            kind: "shortlist",
            label: `Fill the seat (${count} available)`,
            stance: "caution",
        };
    }
    if (seat.departing !== undefined)
        return departingLever(seat, seat.departing);
    switch (seat.removal) {
        case "for-cause":
            return { kind: "for-cause", label: "You can remove them only for a serious reason", stance: "caution" };
        case "term-protected":
            return { kind: "protected", label: "They serve a fixed term you can't cut short", stance: "neutral" };
        case "at-will":
            return { kind: "dismiss", label: "You can fire them at any time from their profile", stance: "neutral" };
        default:
            return { kind: "none" };
    }
}
/** A chair whose holder has announced they are going: the act is naming who follows. */
function departingLever(seat, departing) {
    const name = seat.holder?.name ?? "The Secretary";
    if (departing.successorPending && seat.nomination !== undefined) {
        return { kind: "waiting", label: `${seat.nomination}. ${name} serves until they're sworn in`, stance: "neutral" };
    }
    const when = departing.weeksLeft <= 0 ? "this week" : departing.weeksLeft === 1 ? "in a week" : `in ${departing.weeksLeft} weeks`;
    return {
        kind: "shortlist",
        label: `Name a successor. ${name} leaves ${when}, and their deputy fills in if you don't`,
        stance: departing.weeksLeft <= 1 ? "adverse" : "caution",
    };
}
