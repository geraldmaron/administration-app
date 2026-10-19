import { describe, expect, it } from "vitest";
import { balanceSeeds, playCampaign } from "./balance-harness.js";
import { cabinetPerTerm } from "./cast-breaks.js";
// What a President who overrules the room costs in departures. The rate is the
// owner's to bound, since the break rate is calibrated on Presidents who keep
// their counsel; what is held here is only the direction, which is the
// mechanism's own claim: a chair overruled more often is likelier to go. The
// earlier measurement this follows up says a median chair reaches the
// resignation bar after five or six net overrulings; this counts what that
// does to a term.
//
// The President is the passive proxy plus one habit: every so often a decision
// is taken with the whole room on record against it. Nothing else changes, so
// the departures counted are the overrulings' and not a playing style's.
const SEEDS = balanceSeeds(4);
const WEEKS = 104;
/** Weeks between decisions taken over the room's objection; 0 never overrules. */
const CADENCES = [0, 8, 4, 2, 1];
function overruleTheRoom(state) {
    const room = Object.entries(state.player.cabinet)
        .filter(([role, person]) => role !== state.founding.leadRole && state.people[person]?.alive === true)
        .map(([role, person]) => ({ role, person, stance: "against" }));
    return {
        source: "action",
        actor: "player",
        turn: state.turn,
        narration: { summary: "The President goes ahead over the objection of the whole room." },
        effects: [],
        ...(room.length > 0 ? { counsel: { ...room[0], room } } : {}),
    };
}
function runAt(cadence) {
    const decide = (state, step) => (cadence > 0 && step % cadence === 0 ? [overruleTheRoom(state)] : []);
    return SEEDS.map((seed) => playCampaign(seed, "passive", WEEKS, undefined, undefined, { decide }));
}
describe("the cabinet under a President who overrules it", () => {
    it("reports the leaks, challenges and departures per term at each cadence, and loses more of the cabinet the more often it overrules", () => {
        const lines = [];
        const departures = [];
        for (const cadence of CADENCES) {
            const outcomes = runAt(cadence);
            const perTerm = cabinetPerTerm(outcomes);
            const overrulings = cadence === 0 ? 0 : Math.ceil(WEEKS / cadence);
            lines.push(`[overruling every ${cadence === 0 ? "never" : `${cadence} weeks`}] n=${outcomes.length} overrulings=${overrulings} ` +
                `leaks ${perTerm.leak}, challenges ${perTerm.challenge}, resignations ${perTerm.resignation} per term`);
            expect(outcomes.every((outcome) => outcome.turnsPlayed > 0)).toBe(true);
            departures.push(perTerm.challenge + perTerm.resignation);
        }
        console.info(lines.join("\n"));
        // Cadences run from never to every week, so departures may not fall along
        // them; and overruling every other month already costs more than never.
        for (let index = 1; index < departures.length; index += 1)
            expect(departures[index]).toBeGreaterThanOrEqual(departures[index - 1]);
        expect(departures[1]).toBeGreaterThan(departures[0] * 2);
    }, 1_800_000);
});
