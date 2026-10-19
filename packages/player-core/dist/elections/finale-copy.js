// The finale's words: the other party's candidate as the season defines them,
// the band's captions, how each ending reads, the legacy's section lines and
// the successor's epilogue. These are the last words a campaign prints, so they
// are written as a record rather than a scoreboard: plain, past tense where the
// thing is done, and never a verdict the numbers beside them do not carry.
export function seasonStage(known, contestAhead) {
    if (!contestAhead)
        return "decided";
    if (known < 0.25)
        return "bench";
    if (known < 0.7)
        return "field";
    return "nominee";
}
export function opponentIntroduction(stage, name, office, party) {
    switch (stage) {
        case "bench":
            return `The ${party}s haven't picked a candidate yet. The name people keep mentioning is ${name}, ${office}.`;
        case "field":
            return `${name}, ${office}, is leading the ${party} candidates and is running against your record.`;
        case "nominee":
            return `${name}, ${office}, is the ${party} candidate for President. Every speech now is about you.`;
        case "decided":
            return `${name}, ${office}, was the ${party} candidate for President.`;
    }
}
export const BAND_WORD = {
    bench: "Wide open",
    field: "Narrowing",
    nominee: "Firm",
    decided: "Settled",
};
export const BAND_CAPTION = {
    bench: "The other party hasn't picked a candidate yet, so the result could land anywhere in this range. How you govern moves the middle of it. The campaign decides how wide it is.",
    field: "The range gets narrower as the other party drops candidates. What's left is a candidate voters don't fully know yet.",
    nominee: "The other party has picked its candidate. The range that's left comes from the rest of the campaign, and it closes on Election Day.",
    decided: "The votes are counted. There is no range left.",
};
export const ENDING_TITLE = {
    removed: "Removed from office",
    defeated: "Lost the election",
    "term-limited": "Two full terms served",
};
export function endingOpening(kind, when, successor) {
    switch (kind) {
        case "defeated":
            return successor
                ? `At noon on ${when}, ${successor} takes the oath. Voters chose a new President.`
                : `At noon on ${when}, the other party takes the oath. Voters chose a new President.`;
        case "term-limited":
            return `Your second term ends at noon on ${when}. The Constitution doesn't allow a third term, so the country judges your whole record without voting on you again.`;
        case "removed":
            return `The Senate voted to convict you and remove you from office. Your presidency ended on ${when}.`;
    }
}
export const ENDING_CLOSING = {
    defeated: "Your last job as President is to hand a working government to the next one.",
    "term-limited": "The office passes to the next President, and your record stays. You won't face another vote.",
    removed: "Your time in office ended early. The job goes on under the next President.",
};
/** The one line an election night prints when the country keeps the President. */
export const REELECTED_LINE = "The country gave you four more years. Every promise you haven't kept yet now has a deadline that can't move.";
export function successorEpilogue(name, from, sameParty, weeksLeft) {
    const oath = from === "vice-president"
        ? `${name} took the oath the same day.`
        : `There was no Vice President, so the Speaker of the House, ${name}, took the oath the same day.`;
    const party = sameParty
        ? "The new President takes over your Cabinet, the same Congress, and every promise made to other countries, but not the trust that went with them."
        : "The presidency passed to the other party without an election, and the new President follows that party's plans.";
    const time = weeksLeft > 0
        ? `${weeksLeft} weeks are left in a term ${name} didn't win. You no longer decide what happens in them.`
        : `The term had almost nothing left in it. You no longer decide what ${name} does with the days that remain.`;
    return [oath, party, time];
}
export const LEGACY_LINES = {
    timeline: "Every law signed, every election night, every step toward removal, and every war, in the order they happened.",
    country: "Where the country's numbers ended up, next to where they were when you took office.",
    lawsNone: "None of the bills you asked for became law.",
    promisesNone: "Your platform made no promises the game could check.",
    warsNone: "The United States fought no wars while you were President.",
    congress: "The House and Senate as the last election left them. This is the Congress the next President will work with.",
};
export function lawsLine(count) {
    return count === 1 ? "1 law was passed." : `${count} laws were passed.`;
}
export function promisesLine(kept, broken, open) {
    const parts = [`${kept} kept`, `${broken} broken`];
    if (open > 0)
        parts.push(`${open} never settled`);
    return `Of the promises in your platform, ${parts.join(", ")}.`;
}
export const LEGACY_CLOSING = {
    defeated: "The election is over. The record shows what you did.",
    "term-limited": "The record covers eight years of laws, votes, and wars.",
    removed: "People remember a presidency that ends early for how it ended first. What you did before that is in the record too.",
};
