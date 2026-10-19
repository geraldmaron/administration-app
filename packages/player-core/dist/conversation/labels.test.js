import { describe, expect, it } from "vitest";
import { waitingReason } from "./labels";
describe("waitingReason", () => {
    it("reads as a plain sentence with no all-caps tag", () => {
        expect(waitingReason("serious", "justice")).toBe("A serious matter about a question of law, waiting on your answer.");
        expect(waitingReason("routine", "migration")).toBe("A routine matter about large numbers of people crossing a border, waiting on your answer.");
    });
});
