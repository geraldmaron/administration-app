import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { confirmationQuestion, confirmationVote } from "./confirmation-count.js";
// The count once said 68 to 32 for every capable nominee early in a term,
// whatever their record: the nominee's record was added to the room, and the
// room plus the Senate's deference already reached the ceiling, so the clamp
// erased the difference. These hold the fix: the record is read by each
// senator, after the caucus position.
const SEEDS = ["confirmation-separates-a", "confirmation-separates-b", "confirmation-separates-c"];
/** A nominee of no party (so no caucus reads them across the aisle) with the record given. */
function withNominee(campaign, id, record) {
    const template = Object.values(campaign.people).find((runtime) => runtime.alive && runtime.currentRole === undefined && runtime.base.nationality === campaign.founding.nation);
    const { party: _party, ...rest } = template.base;
    const base = { ...rest, id: id, ambition: 0.5, ...record };
    return { ...campaign, people: { ...campaign.people, [id]: { base, alive: true } } };
}
describe("the Senate's count on a nominee", () => {
    it.each(SEEDS)("tells a strong record from an ordinary one at the founding (%s)", (seed) => {
        const founded = foundedForBalance(seed).campaign;
        const both = withNominee(withNominee(founded, "PER-STRONG", { competence: 0.95, integrity: 0.9 }), "PER-ORDINARY", { competence: 0.6, integrity: 0.55 });
        const strong = confirmationVote(both, "PER-STRONG");
        const ordinary = confirmationVote(both, "PER-ORDINARY");
        expect(strong.yeas).toBeGreaterThan(ordinary.yeas);
    });
    it("separates nominees in a Senate warm enough that the room and the deference reach the ceiling", () => {
        const founded = foundedForBalance(SEEDS[0]).campaign;
        const warm = { ...founded, congress: { ...founded.congress, disposition: 1 } };
        const both = withNominee(withNominee(warm, "PER-STRONG", { competence: 0.95, integrity: 0.9 }), "PER-WEAK", { competence: 0.3, integrity: 0.3 });
        expect(confirmationVote(both, "PER-STRONG").yeas).toBeGreaterThan(confirmationVote(both, "PER-WEAK").yeas);
    });
    it("reads the record as the nominee's merit, not as the room's appeal", () => {
        const founded = withNominee(foundedForBalance(SEEDS[0]).campaign, "PER-STRONG", { competence: 0.95, integrity: 0.9 });
        const question = confirmationQuestion(founded, "PER-STRONG");
        expect(question.merit).toBeGreaterThan(0);
        expect(question.appeal).toBe(confirmationQuestion(founded, "PER-NOBODY").appeal);
    });
});
