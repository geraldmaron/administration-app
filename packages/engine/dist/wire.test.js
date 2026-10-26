import { describe, it, expect } from "vitest";
import { INSTRUMENT_IDS, INSTRUMENT_RUNGS, RUNG_LEVELS } from "./instruments.js";
import { RISK_IDS } from "./resolution.js";
import { answerLine, movePhrase, movePhraseNamed, wireLine, wireRisk, wireStake } from "./wire.js";
import { nationName, takesDefiniteArticle } from "./naming.js";
function act(overrides = {}) {
    return {
        actor: "the United States",
        target: "Vietnam",
        instrument: "economic",
        rung: 2,
        landed: true,
        turn: 4,
        ...overrides,
    };
}
// The catalogue's own vocabulary. Any of these words in a player-facing feed
// line means the row leaked onto the page.
const CATALOGUE_SHAPES = [
    / attempts /,
    / applies /,
    /, and it lands\./,
    /retaliates in kind/,
    /Tariff Increase|Trade Advisory|Private Warning|Limited Strike|Asset Freeze/,
];
describe("the wire desk", () => {
    it("says every rung of every instrument in plain words, both ways it can go", () => {
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of RUNG_LEVELS) {
                for (const landed of [true, false]) {
                    const line = wireLine(act({ instrument, rung, landed }));
                    expect(line.startsWith("The United States ")).toBe(true);
                    expect(line).toContain("Vietnam");
                    expect(line).toMatch(/\.$/);
                    for (const shape of CATALOGUE_SHAPES)
                        expect(line).not.toMatch(shape);
                }
            }
        }
    });
    it("is deterministic on the act's own coordinates", () => {
        expect(wireLine(act())).toBe(wireLine(act()));
        // A different week is allowed a different shape; the same week never is.
        expect(wireLine(act({ turn: 5 }))).toBe(wireLine(act({ turn: 5 })));
    });
    it("folds the outcome into the sentence rather than bolting it on", () => {
        const landed = wireLine(act({ instrument: "economic", rung: 1, landed: true, turn: 1 }));
        expect(landed).toMatch(/warned its companies off doing business in Vietnam/);
        expect(landed).toMatch(/warning held/);
        const failed = wireLine(act({ actor: "Bangladesh", target: "China", instrument: "economic", rung: 2, landed: false, riskId: "market-blowback", turn: 1 }));
        expect(failed).toMatch(/raise tariffs on goods from China|raised tariffs on goods from China/);
        expect(failed).toMatch(/its own markets flinched first/);
    });
    it("names the branch that actually fired, and says nothing invented when it cannot", () => {
        expect(wireStake(act({ landed: false, riskId: "retaliation" }))).toBe("Vietnam answered with measures of its own");
        expect(wireStake(act({ landed: false, riskId: "a-branch-nobody-wrote" }))).toBe("nothing came of it");
    });
    it("has a plain phrase for every rung the catalogue ships", () => {
        for (const definition of INSTRUMENT_RUNGS) {
            const phrase = movePhrase(definition.instrument, definition.rung);
            expect(phrase).not.toBe("the move");
            expect(phrase).toBe(movePhraseNamed(definition.name));
            // A phrase sits mid-sentence, so it never opens with a capital.
            expect(phrase[0]).toBe(phrase[0].toLowerCase());
        }
        // Anything that is not a rung comes back lower-cased, unchanged otherwise.
        expect(movePhraseNamed("Health program")).toBe("health program");
    });
});
describe("country names in running prose", () => {
    it("puts the article on the names that take one and on no others", () => {
        expect(nationName("United States")).toBe("the United States");
        expect(nationName("United Arab Emirates")).toBe("the United Arab Emirates");
        expect(nationName("Netherlands")).toBe("the Netherlands");
        expect(nationName("Germany")).toBe("Germany");
        expect(takesDefiniteArticle("Vietnam")).toBe(false);
    });
    it("lets the dataset settle it once the field exists", () => {
        expect(nationName({ name: "Ukraine", definiteArticle: true })).toBe("the Ukraine");
        expect(nationName({ name: "United States", definiteArticle: false })).toBe("United States");
    });
});
// The verbs the past-tense bank reaches for. A forecast that uses any of them
// is telling the player something has already happened that has not.
const PAST_TENSE_TELLS = [
    "answered", "flinched", "caught", "named", "picked", "folded", "went", "hurt",
    "ran", "held", "hit", "turned", "outlasted", "stolen", "reached", "ended",
    "meant", "asked", "moved", "came", "was", "would", "did",
];
describe("the risk a player reads before committing", () => {
    it("is written forward, and never in the tense the Record uses", () => {
        for (const [instrument, ids] of Object.entries(RISK_IDS)) {
            for (const riskId of ids) {
                const line = wireRisk({ ...act({ instrument: instrument, landed: false }), riskId });
                expect(line.length).toBeGreaterThan(0);
                for (const tell of PAST_TENSE_TELLS) {
                    expect(line).not.toMatch(new RegExp(`\\b${tell}\\b`));
                }
            }
        }
    });
    it("names the target wherever the branch is about the target", () => {
        expect(wireRisk({ ...act({ landed: false }), riskId: "retaliation" })).toBe("Vietnam answers with measures of its own");
        expect(wireRisk({ ...act({ instrument: "military", rung: 4, landed: false }), riskId: "repulsed" })).toBe("Vietnam's forces hold and nothing is gained");
    });
    it("says the same branch two ways, one per tense, and keeps the Record in the past", () => {
        const failed = act({ landed: false, riskId: "retaliation" });
        expect(wireStake(failed)).toBe("Vietnam answered with measures of its own");
        expect(wireRisk({ ...failed, riskId: "retaliation" })).toBe("Vietnam answers with measures of its own");
    });
    it("falls back rather than inventing a failure nobody wrote", () => {
        expect(wireRisk({ ...act({ landed: false }), riskId: "a-branch-nobody-wrote" })).toBe("nothing comes of it");
    });
});
describe("an act made as an answer", () => {
    const act = { actor: "China", target: "the United States", instrument: "economic", rung: 2, landed: true, turn: 9 };
    it("names what it answers before what it did", () => {
        const line = answerLine({ coercer: "the United States", instrument: "economic", rung: 3 }, act);
        expect(line.startsWith(`China answers the United States' ${movePhrase("economic", 3)}.`)).toBe(true);
        expect(line).toContain(wireLine(act));
    });
    it("says whose side a partner is taking", () => {
        const line = answerLine({ coercer: "the United States", instrument: "economic", rung: 3, onBehalfOf: "Russia" }, act);
        expect(line.startsWith("China takes Russia's side against the United States'")).toBe(true);
    });
});
