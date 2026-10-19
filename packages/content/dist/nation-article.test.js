import { describe, expect, it } from "vitest";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { atSentenceStart, nationPhrase, takesDefiniteArticle } from "./nation-article.js";
import { castBound } from "./scenario-cast.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
const campaign = sealedCampaign();
// A cast scenario whose only content is the sentence under test, so the
// rendered string can be asserted whole.
function saying(text, overrides = {}) {
    const base = FIXTURE_SCENARIOS[0];
    return {
        ...base,
        id: "article-probe",
        opening: [{ speaker: { kind: "narrator" }, text }],
        ...overrides,
    };
}
const render = (text, counterpart = "CHN") => castBound(campaign, saying(text), counterpart).script.opening[0].text;
describe("a nation name and its article", () => {
    it("puts the article in front of the names that take one", () => {
        expect(takesDefiniteArticle({ name: "United States" })).toBe(true);
        expect(takesDefiniteArticle({ name: "United Kingdom" })).toBe(true);
        expect(takesDefiniteArticle({ name: "United Arab Emirates" })).toBe(true);
        expect(takesDefiniteArticle({ name: "Democratic Republic of the Congo" })).toBe(true);
        expect(takesDefiniteArticle({ name: "Netherlands" })).toBe(true);
        expect(takesDefiniteArticle({ name: "Philippines" })).toBe(true);
    });
    it("leaves every other name bare", () => {
        for (const name of ["China", "Japan", "Russia", "Turkey", "Belarus", "South Korea"]) {
            expect(takesDefiniteArticle({ name }), name).toBe(false);
        }
    });
    // The dataset's own flag is the answer wherever it exists, including where it
    // corrects the heuristic in either direction.
    it("takes the dataset's declaration over the heuristic, both ways", () => {
        expect(takesDefiniteArticle({ name: "United States", definiteArticle: false })).toBe(false);
        expect(takesDefiniteArticle({ name: "Sudan", definiteArticle: true })).toBe(true);
    });
    it("capitalizes the article only where the token opens a sentence", () => {
        expect(nationPhrase("United States", true)).toBe("the United States");
        expect(nationPhrase("United States", true, { sentenceStart: true })).toBe("The United States");
    });
    it("writes an article name's possessive the way a newsroom would", () => {
        expect(nationPhrase("United States", true, { possessive: true })).toBe("the United States'");
        expect(nationPhrase("Netherlands", true, { possessive: true })).toBe("the Netherlands'");
        expect(nationPhrase("United Kingdom", true, { possessive: true })).toBe("the United Kingdom's");
    });
    it("reads a sentence start off the text around the token", () => {
        expect(atSentenceStart("{{nation}} held", 0)).toBe(true);
        expect(atSentenceStart("It broke. {{nation}} held", 10)).toBe(true);
        expect(atSentenceStart("a duty on U.S. {{sector}} goods", 15)).toBe(false);
        expect(atSentenceStart("as long as {{nation}} wanted", 11)).toBe(false);
    });
});
describe("the binder, on the sentence a player actually read", () => {
    // The rendered week-one memo said "as long as United States wanted it to
    // hold", which is the whole reason this exists.
    it("no longer drops the article mid-sentence", () => {
        expect(render("The bridge stood as long as {{nation}} wanted it to hold, and not one week longer than that.")).toContain("as long as the United States wanted");
    });
    it("capitalizes the article when the token opens the beat", () => {
        expect(render("{{nation}} has said this twice already, and the second time nobody wrote it down at all.")).toMatch(/^The United States has said/);
    });
    it("carries the possessive without doubling the sibilant", () => {
        expect(render("Every word of {{nation}}'s answer was drafted before the meeting even opened its file.")).toContain("the United States' answer");
    });
    it("leaves a counterpart whose name takes no article exactly as it was", () => {
        expect(render("The convoy turned back before it reached {{counterpart}}, and nobody has explained why yet.")).toContain("reached China,");
        expect(render("Nothing in {{counterpart}}'s answer said when, and the omission was the only deliberate part.")).toContain("China's answer");
    });
});
