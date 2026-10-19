// What money means to a government, and what the headline reading of an
// administration moved by in the record.
//
// The headline used to be `mandate`: a weighted composite of approval,
// stability, standing, readiness and treasury health, presented to the player
// as their standing with the country. It is gone, and the reason is that it was
// not the thing it was labeled. A figure that is twenty percent solvency and
// ten percent force posture is a reading of the *state*, not of what the
// governed think of the president, and calling it the president's standing lied
// to the player in the one number they steered by.
//
// The headline is now `approval`: the poll number the public actually holds,
// derived in opinion.ts from the six judgments a public makes. The other four
// terms did not vanish — they became what they always were, causes. Order at
// home, an army that can answer, a treasury that can pay and a country other
// capitals still take seriously are reasons people think well of a government,
// and they now reach the score the way reasons do: through the public, at the
// public's speed (`OPINION_DRIFT`), rather than as arithmetic billed the same
// week the fact changed.
// Budget authority has no natural 0..1 scale. This is the reference point above
// which treasury health saturates to 1, calibrated against a founding
// campaign's opening authority so the reading opens near its midpoint rather
// than pinned to an extreme.
//
// The calibration is load-bearing, and it is what to re-check whenever the
// playable nation's economy moves or the carry share does. A reference well
// below the founding stock saturates health on turn one and holds it there
// unless the accounts collapse, which turns the `services` judgment's money
// term into a constant and makes every movement in the game (a policy's upkeep,
// the founding cabinet's contribution, an instrument's cost) invisible to what
// the country thinks.
//
// An administration founds on a quarter of the year's discretionary
// appropriation (`openingBudgetAuthority`, funding.ts), so the United States
// opens at about 357,000 and a reference of 500,000 opens that founding at 0.71
// with room to move both ways — the same opening the retired 2.47-million
// wallet had against 3.5 million, because what this reading is about is the
// distance from being unable to pay, and that distance is a ratio.
export const TREASURY_REFERENCE = 500_000;
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
export function treasuryHealth(treasury) {
    return clamp01(treasury / TREASURY_REFERENCE);
}
// Player-facing, in-fiction: each entry is the packet's own narration plus the
// net approval movement it caused — never the raw weighting. Reads the ledger's
// cost field, which apply() populates from whatever metrics actually changed
// (packages/engine/src/effects.ts).
export function selectApprovalMoves(campaign, sinceTurn = 0) {
    return campaign.ledger
        .filter((entry) => entry.turn >= sinceTurn && entry.cost?.approval !== undefined)
        .map((entry) => ({ turn: entry.turn, description: entry.description, approvalDelta: entry.cost.approval }));
}
