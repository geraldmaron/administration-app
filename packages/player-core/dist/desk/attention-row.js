/**
 * Whether a turn-stamped record belongs to the week that just ran, so a
 * standing row can stop being loud the moment it stops being new.
 *
 * Beside the row shape rather than inside one builder's module, because the
 * Desk's standing conditions and the scandal and cabinet builders all need the
 * same answer, and a second copy of it would let two rows disagree about what
 * "new" means.
 *
 * A record written inside a tick's own phase carries the turn that was
 * closing when the phase ran (`state.turn`, read before `advanceTurn` rolls it
 * forward), so by the time the resulting campaign is read its `turn` field is
 * already one ahead. A record written by a direct action carries the turn
 * that is still current, no roll-forward involved. Both conventions are real
 * and live side by side in this engine, so a record reads as fresh under
 * either: this turn, or the one just before it.
 */
export function justHappened(campaign, turn) {
    if (turn === undefined)
        return false;
    const age = campaign.turn - turn;
    return age >= 0 && age <= 1;
}
