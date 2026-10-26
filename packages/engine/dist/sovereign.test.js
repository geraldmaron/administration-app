import { debtToGdp, FISCAL_ANCHORS } from "@admin/world";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { rungDefinition } from "./instruments.js";
import { booksFor, foreignWeek } from "./national-books.js";
import { createRngStreams } from "./rng.js";
import { borrowingCapacity, clampToLetter, CREDIT_TO_LEND, foreignRollover, nonErodibleShare, nonErodibleShareOf, openingRate, openingScore, publishesFiscalFigures, selectSovereign, letterOfScore, notchName, ratingActionSentence, ratingCause, ratingSpread, reviewDue, reviewOffset, reviewRating, } from "./sovereign.js";
const { campaign: FOUNDED } = foundedForBalance("sovereign");
describe("the agencies' scale", () => {
    it("names every notch the way the agencies write it and reads each back to its letter", () => {
        expect([21, 20, 18, 17, 12, 9, 6, 5, 2, 1].map(notchName)).toEqual(["AAA", "AA+", "AA-", "A+", "BBB-", "BB-", "B-", "CCC+", "CC", "D"]);
        expect([21, 18, 17, 15, 12, 9, 6, 2, 1].map(letterOfScore)).toEqual(["AAA", "AA", "A", "A", "BBB", "BB", "B", "CCC", "D"]);
    });
    it("holds a finer reading inside the letter it was authored with", () => {
        expect(clampToLetter(20.3, "AA")).toBe(20);
        expect(clampToLetter(22, "AA")).toBe(20);
        expect(clampToLetter(2.7, "BB")).toBe(9);
        expect(clampToLetter(9, "D")).toBe(1);
    });
    it("charges nothing over a top-rated government at AA- and above, and widens as default comes into view", () => {
        expect(ratingSpread(21)).toBe(0);
        expect(ratingSpread(18)).toBe(0);
        expect(ratingSpread(16)).toBeCloseTo(0.003, 9);
        expect(ratingSpread(13)).toBeCloseTo(0.01, 9);
        expect(ratingSpread(1)).toBeCloseTo(0.15, 9);
        for (let score = 1; score < 21; score += 1)
            expect(ratingSpread(score)).toBeGreaterThanOrEqual(ratingSpread(score + 1));
    });
});
describe("a review", () => {
    const stable = { score: 16, outlook: "stable" };
    it("warns before it cuts, and cuts only after half a year on the warning", () => {
        const warned = reviewRating(stable, 14.5, 26);
        expect(warned.action?.kind).toBe("outlook");
        expect(warned.state).toMatchObject({ score: 16, outlook: "negative", negativeSince: 26 });
        expect(reviewRating(warned.state, 14.5, 39).action).toBeUndefined();
        const cut = reviewRating(warned.state, 14.5, 52);
        expect(cut.action?.kind).toBe("downgrade");
        expect(cut.state.score).toBe(15);
        // Still half a notch short after the cut, so the warning stands and its clock restarts.
        expect(cut.state).toMatchObject({ outlook: "negative", negativeSince: 52 });
    });
    it("moves one notch at a time however far the fundamentals have fallen", () => {
        const warned = reviewRating(stable, 9, 0).state;
        expect(reviewRating(warned, 9, 26).state.score).toBe(15);
    });
    it("lifts a warning once the numbers come back, and raises only after a positive watch", () => {
        const warned = reviewRating(stable, 15.5, 0).state;
        expect(reviewRating(warned, 15.9, 26).state.outlook).toBe("stable");
        const watched = reviewRating(stable, 17.6, 0).state;
        expect(watched.outlook).toBe("positive");
        expect(reviewRating(watched, 17.6, 26).state.score).toBe(17);
    });
    it("never lifts a default, and takes nobody else below CC", () => {
        expect(reviewRating({ score: 1, outlook: "stable" }, 12, 26).action).toBeUndefined();
        const floor = { score: 2, outlook: "negative", negativeSince: 0 };
        expect(reviewRating(floor, -5, 52).state.score).toBe(2);
    });
    it("reviews each government twice a year on its own week", () => {
        const nation = "BRA";
        const due = Array.from({ length: 104 }, (_, turn) => turn).filter((turn) => reviewDue(nation, turn));
        expect(due).toHaveLength(4);
        expect(due[1] - due[0]).toBe(26);
        expect(due[0]).toBe(reviewOffset(nation));
    });
});
describe("no stock reprices in a week", () => {
    it("moves the rate a two-letter downgrade reaches by no more than the week's rollover of the gap", () => {
        const id = "BRA";
        const runtime = FOUNDED.nations[id];
        const books = booksFor(FOUNDED, runtime);
        const downgraded = { ...books, rating: { ...books.rating, score: books.rating.score - 6 } };
        expect(letterOfScore(downgraded.rating.score)).not.toBe(letterOfScore(books.rating.score));
        const week = foreignWeek(FOUNDED, runtime, downgraded, { inflation: 0.03, expectedInflation: 0.03 });
        const market = week.books.rates.market;
        const rate = books.rates.effective;
        const ratio = debtToGdp(runtime.stats);
        const newBorrowing = Math.max(0, rate * ratio - books.anchor.primaryBalance) / ratio;
        expect(market - rate).toBeGreaterThan(0.01);
        expect(week.books.rates.effective - rate).toBeGreaterThan(0);
        expect(week.books.rates.effective - rate).toBeLessThanOrEqual(((market - rate) * (foreignRollover(id) + newBorrowing)) / 52 + 1e-7);
    });
    it("keeps every multiplier on interest in the credit module", () => {
        const read = import.meta.glob("./*.ts", { query: "?raw", import: "default", eager: true });
        const sources = Object.fromEntries(Object.entries(read).filter(([file]) => !file.endsWith(".test.ts")));
        expect(Object.keys(sources).length).toBeGreaterThan(100);
        const premium = Object.entries(sources).filter(([, text]) => /DEBT_LIMIT_PREMIUM|overBorrowingCeiling/.test(text));
        expect(premium.map(([file]) => file)).toEqual([]);
        // Interest is the stock at the rate it was issued at, and nothing else.
        const books = sources["./national-books.ts"];
        const lines = books.split("\n").filter((line) => /^\s+debtService:/.test(line));
        expect(lines).toEqual(["    debtService: position.debt * position.books.rates.effective,"]);
    });
});
describe("what the agencies say", () => {
    const opening = { score: 20, burden: 0.03, projected: 1.07 };
    it("names the reading that moved the rating furthest", () => {
        expect(ratingCause(opening, { burden: 0.09, projected: 1.1, governance: 0, crisis: 0 }, true)).toBe("interest");
        expect(ratingCause(opening, { burden: 0.03, projected: 1.5, governance: 0, crisis: 0 }, true)).toBe("path");
        expect(ratingCause(opening, { burden: 0.03, projected: 1.07, governance: 1, crisis: 0 }, true)).toBe("limit");
    });
    it("says whose borrowing it was, and never names an agency", () => {
        const action = reviewRating({ score: 20, outlook: "negative", negativeSince: 0 }, 18.5, 26).action;
        const line = ratingActionSentence("the United States", action, "path", "on the books this administration inherited");
        expect(line).toBe("The rating agencies cut the United States from AA+ to AA, citing where the debt is headed over the next decade on the books this administration inherited.");
        const warned = reviewRating({ score: 20, outlook: "stable" }, 19.5, 26).action;
        expect(ratingActionSentence("the United States", warned, "interest")).toBe("The rating agencies put the United States' AA+ rating on negative outlook, citing the rising cost of interest on the debt.");
        expect(line).not.toMatch(/Moody|Fitch|S&P|Standard/);
    });
});
// A government the markets have shut out cannot borrow to give. Every rung that
// spends reserves abroad is refused to it, whatever its reserves say.
describe("borrowing capacity", () => {
    const streams = createRngStreams(FOUNDED.seed);
    const actor = "BRA";
    const target = "ARG";
    const reserveFunded = [rungDefinition("assistance", 1), rungDefinition("assistance", 2), rungDefinition("assistance", 3)];
    function rated(campaign, letter) {
        const runtime = campaign.nations[actor];
        const rich = { ...runtime.stats.economy, sovereignRating: letter, reserves: 1_000_000, gdp: Math.max(runtime.stats.economy.gdp, 50_000) };
        return { ...campaign, nations: { ...campaign.nations, [actor]: { ...runtime, stats: { ...runtime.stats, economy: rich } } } };
    }
    it("refuses aid and guarantees to a government rated B or worse", () => {
        for (const letter of ["B", "CCC"]) {
            expect(borrowingCapacity(rated(FOUNDED, letter), actor)).toBe(0);
            for (const rung of reserveFunded) {
                const check = rung.gate({ campaign: rated(FOUNDED, letter), actor, target, streams });
                expect(check.ok, `${rung.id} at ${letter}`).toBe(false);
                expect(check.missingCapability, rung.id).toBe(CREDIT_TO_LEND);
            }
        }
        expect(borrowingCapacity(rated(FOUNDED, "BB"), actor)).toBe(1);
        // Relief answers a need, so the recipient is living through a flood.
        const flood = { id: `condition:flood:${target}:0`, nation: target, kind: "flood", scope: "region", severity: 0.5, startedTurn: 0, status: "active", beats: [] };
        const flooded = { ...rated(FOUNDED, "BB"), conditions: { ...FOUNDED.conditions, [flood.id]: flood } };
        expect(rungDefinition("assistance", 1).gate({ campaign: flooded, actor, target, streams }).ok).toBe(true);
    });
    it("refuses them to a government in a fiscal crisis, however it is rated", () => {
        const crisis = { id: `condition:fiscal-crisis:${actor}:0`, nation: actor, kind: "fiscal-crisis", scope: "nation", severity: 0.5, startedTurn: 0, status: "active", beats: [] };
        const inCrisis = { ...rated(FOUNDED, "BB"), conditions: { ...FOUNDED.conditions, [crisis.id]: crisis } };
        expect(borrowingCapacity(inCrisis, actor)).toBe(0);
        expect(rungDefinition("assistance", 1).gate({ campaign: inCrisis, actor, target, streams }).ok).toBe(false);
    });
});
// The books open on what the World Bank publishes where it publishes it, and on
// the engine's labeled rules where it does not, and a reader can tell which.
describe("the published figures the books open on", () => {
    it("opens the United States at AA+, the agencies' own average, inside the letter the dataset authors", () => {
        expect(openingScore("USA", "AA")).toBe(20);
        expect(FOUNDED.books["USA"].rating.score).toBe(20);
        expect(FOUNDED.nations["USA"].stats.economy.sovereignRating).toBe("AA");
    });
    it("reads a government's foreign-currency share and interest where they are published, and the rule where not", () => {
        const mexico = FOUNDED.nations["MEX"];
        expect(nonErodibleShareOf(mexico)).toBeCloseTo(FISCAL_ANCHORS.MEX.foreignCurrencyShare.value, 9);
        expect(openingRate("DEU", "AAA")).toBeCloseTo(FISCAL_ANCHORS.DEU.effectiveRate.value, 9);
        const unpublished = Object.values(FOUNDED.nations).find((runtime) => !publishesFiscalFigures(runtime.base.id));
        expect(unpublished).toBeDefined();
        expect(nonErodibleShareOf(unpublished)).toBe(nonErodibleShare(unpublished.base.bands.wealthTier));
        expect(selectSovereign(FOUNDED, unpublished.base.id).publishedFigures).toBe(false);
        expect(selectSovereign(FOUNDED, "MEX").publishedFigures).toBe(true);
    });
    it("turns a foreign stock over once per its published maturity", () => {
        expect(foreignRollover("JPN")).toBeCloseTo(1 / FISCAL_ANCHORS.JPN.maturityYears.value, 9);
    });
});
