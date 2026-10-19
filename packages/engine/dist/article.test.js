import { describe, expect, it } from "vitest";
import { composeArticle } from "./article.js";
import { feedTopics } from "./feed.js";
import { PRESS_OUTLETS } from "./press.js";
const item = (over = {}) => ({
    turn: 4,
    kind: "press",
    visibility: "public",
    headline: "The ministry confirms the shipment was turned back at the border.",
    ...over,
});
const KINDS = [
    "press", "player-action", "npc-action", "operator", "drift",
    "conflict", "condition", "governance", "pursuit", "bloc",
];
describe("the article composer", () => {
    it("writes a whole piece behind every kind of dispatch", () => {
        for (const kind of KINDS) {
            const article = composeArticle(item({ kind }));
            expect(article.outlet.length, kind).toBeGreaterThan(0);
            expect(article.outletId, kind).toBeDefined();
            expect(PRESS_OUTLETS.map((outlet) => outlet.name), kind).toContain(article.outlet);
            // A thin item reads short: as many paragraphs as it has particulars for,
            // never padded out to a set length.
            expect(article.paragraphs.length, kind).toBeGreaterThanOrEqual(1);
            expect(article.paragraphs.length, kind).toBeLessThanOrEqual(4);
            for (const paragraph of article.paragraphs)
                expect(paragraph.length, kind).toBeGreaterThan(20);
        }
    });
    // The defect this guards: paragraphs of atmosphere that never mention the
    // event, and so read identically under any headline. An
    // item carrying no particulars has only the headline to be specific with, so
    // that is what it must reach for rather than filling the space with mood.
    it("carries the event into the body when the item gave it nothing else", () => {
        for (const kind of KINDS) {
            if (kind === "operator")
                continue; // an operator piece is written from its theme and host, which a bare item has neither of
            const body = composeArticle(item({ kind })).paragraphs.join(" ");
            expect(body, kind).toContain("the shipment was turned back at the border");
        }
    });
    // ...and having been given a name, it develops the story instead of saying
    // the headline again in longer words, which is the failure mode that reads
    // as filler even though it is technically specific.
    it("does not restate the headline once it has a particular to work with", () => {
        const article = composeArticle(item({ facts: { subject: "Logan Hall" } }));
        expect(article.paragraphs.join(" ")).not.toContain("the shipment was turned back at the border");
        expect(article.paragraphs.join(" ")).toContain("Hall");
    });
    it("does not file the same piece under two different events", () => {
        const one = composeArticle(item({ headline: "The ministry confirms the shipment was turned back." }));
        const two = composeArticle(item({ headline: "The chancellor resigns without giving a reason." }));
        expect(one.paragraphs).not.toEqual(two.paragraphs);
    });
    // Facts are optional on a FeedItem, so the composer has to be worth reading
    // without them and better with them — never inventing one it was not given.
    it("names the subject and the figure when the item carries them", () => {
        const article = composeArticle(item({ facts: { subject: "Logan Hall", figure: "roughly 400 tonnes", stake: "what it costs to be seen refusing." } }));
        const whole = [article.standfirst, ...article.paragraphs].join(" ");
        expect(whole).toContain("Logan Hall");
        expect(whole).toMatch(/Hall|400 tonnes/);
    });
    it("invents no figure when the item carries none", () => {
        const article = composeArticle(item());
        expect(article.paragraphs.join(" ")).not.toMatch(/\d+ (tonnes|percent|million|billion)/);
    });
    // An intelligence read is not a newspaper and must not borrow its furniture,
    // least of all a closing paragraph promising publication of the one document
    // guaranteed never to get any.
    it("does not address a readership that is not cleared to exist", () => {
        const secret = composeArticle(item({ visibility: "intelligence" }));
        const body = secret.paragraphs.join(" ");
        expect(body).not.toContain("Why it matters");
        expect(body).toContain("Assessment");
        expect(body).not.toContain("will be published");
    });
    // A committee has no career to lose. Running an institution through the
    // person bank produced "Committee has not resigned", which is a template
    // announcing it was handed something it was not written for.
    it("does not write about an institution as though it were a person", () => {
        const body = composeArticle(item({ facts: { subject: "the Emergency Committee" } })).paragraphs.join(" ");
        expect(body).not.toMatch(/\bCommittee has not resigned\b/);
        expect(body).not.toMatch(/^Committee\b/m);
        expect(body).toContain("Emergency Committee");
    });
    // A nation is a party to a story, not its subject. Defaulting the subject to
    // the acting country put "China's account was unhelpful" on the page.
    it("does not promote a country into the subject's chair", () => {
        const article = composeArticle(item({ kind: "npc-action", actor: "CHN", target: "VNM" }), { actor: "China", target: "Vietnam" });
        const body = article.paragraphs.join(" ");
        expect(body).not.toMatch(/China(?:'s)? (?:has not resigned|account)/);
        expect(body).toContain("China");
    });
    // Composed on read rather than stored, so a dispatch opened now and reopened
    // three turns later has to be the same piece.
    it("returns the same piece every time it is asked", () => {
        expect(composeArticle(item())).toEqual(composeArticle(item()));
    });
    it("keeps the headline it was filed under", () => {
        expect(composeArticle(item()).headline).toBe(item().headline);
    });
    it("does not publish what was never for publication", () => {
        const secret = composeArticle(item({ visibility: "intelligence" }));
        expect(secret.outlet).not.toBe(composeArticle(item()).outlet);
        expect(secret.byline).toContain("Not for publication");
    });
    // A masthead would say this and a headline row cannot: whether the thing
    // reported is aimed at the government the reader is running.
    it("closes differently when the player's own nation is the target", () => {
        const aimed = item({ kind: "npc-action", actor: "CHN", target: "USA" });
        const at = composeArticle(aimed, { playerNation: "USA" });
        const about = composeArticle(aimed, { playerNation: "ALP" });
        expect(at.paragraphs.at(-1)).not.toBe(about.paragraphs.at(-1));
        expect(at.paragraphs.at(-1)).toBe("The reply, or the choice not to make one, is the President's.");
    });
    it("names countries rather than printing their ids", () => {
        const article = composeArticle(item({ actor: "COD", target: "USA" }), {
            actor: "Democratic Republic of the Congo",
            target: "United States",
            playerNation: "USA",
        });
        expect(article.standfirst).toContain("Democratic Republic of the Congo");
        expect(article.standfirst).not.toContain("COD");
        expect(article.standfirst).not.toContain("USA");
    });
    it("frames indirect dispatches around the player's national interest", () => {
        const article = composeArticle(item({
            kind: "operator",
            target: "BGD",
            headline: "Smugglers are moving drugs and guns through Bangladesh faster than its ports can search them.",
        }), {
            target: "Bangladesh",
            playerNation: "USA",
            playerNationName: "United States",
        });
        expect(article.standfirst).toContain("Bangladesh");
        expect(article.standfirst).toMatch(/trafficking network/i);
        expect(article.relevance).toContain("The United States is not the target");
        expect(article.relevance).toMatch(/Diplomacy cannot reach it/);
        const body = article.paragraphs.join(" ");
        expect(body).toMatch(/smuggling network/i);
        expect(body).toMatch(/crime in Bangladesh rises/);
        // An operator item carries no source, so the piece claims none.
        expect(body).not.toMatch(/declined to comment|returned a call|ministries/i);
        expect(article.paragraphs.at(-1)).toMatch(/nobody to negotiate with/i);
    });
    it("frames operator currency pressure with market voice", () => {
        const article = composeArticle(item({
            kind: "operator",
            target: "EGY",
            headline: "Traders are betting heavily against Egypt's currency, and there is nobody to call about it.",
        }), {
            target: "Egypt",
            playerNation: "USA",
            playerNationName: "United States",
        });
        expect(article.standfirst).toMatch(/run on the currency in Egypt/i);
        expect(article.relevance).toMatch(/economic pressure or covert action/);
        const body = article.paragraphs.join(" ");
        expect(body).toMatch(/Egypt's currency/);
        expect(body).toMatch(/prices in Egypt climb faster/);
        expect(body).not.toMatch(/wheat|Gulf|treasury stayed/i);
    });
    it("writes operator insurgency, cyber, and pmc dispatches from what each costs its host", () => {
        const cases = [
            {
                target: "IRQ",
                name: "Iraq",
                headline: "Armed rebels hold ground inside Iraq and have turned down every offer of talks.",
                standfirst: /insurgency in Iraq/i,
                body: /rebels who will not negotiate/i,
                close: /force, covert action or economic pressure/i,
            },
            {
                target: "RUS",
                name: "Russia",
                headline: "Hackers working out of Russia have broken into computer systems they should not be able to reach.",
                standfirst: /intrusion crew in Russia/i,
                body: /counterintelligence is weaker/i,
                close: /covert action or economic pressure/i,
            },
            {
                target: "ARE",
                name: "United Arab Emirates",
                headline: "A hired army registered in the United Arab Emirates is taking jobs nobody will admit to paying for.",
                standfirst: /private army in the United Arab Emirates/i,
                body: /legitimacy/i,
                close: /force, covert action or economic pressure/i,
            },
        ];
        const names = { playerNation: "USA", playerNationName: "United States" };
        for (const sample of cases) {
            const article = composeArticle(item({ kind: "operator", target: sample.target, headline: sample.headline }), { ...names, target: sample.name });
            expect(article.paragraphs).toHaveLength(3);
            expect(article.standfirst).toMatch(sample.standfirst);
            expect(article.paragraphs.join(" ")).toMatch(sample.body);
            expect(article.paragraphs.at(-1)).toMatch(sample.close);
            expect(article.paragraphs.join(" ")).not.toMatch(/declined to comment|returned a call|ministries/i);
        }
    });
    it("uses the instrument and outcome when the item carries them", () => {
        const article = composeArticle(item({
            kind: "npc-action",
            actor: "CAN",
            target: "VNM",
            facts: { instrument: "Trade Advisory", stake: "the measure is in force" },
        }), { actor: "Canada", target: "Vietnam", playerNation: "USA", playerNationName: "United States" });
        expect(article.standfirst).toBe("Canada: a warning to its own companies, aimed at Vietnam.");
        expect(article.paragraphs[0]).toBe("The measure is in force.");
        // The catalogue's label for the rung never reaches the page: the piece says
        // what the move was in the words a reader uses.
        expect(`${article.standfirst} ${article.paragraphs.join(" ")} ${article.relevance}`).not.toMatch(/Trade Advisory/);
        // Nothing in the item ties the United States to it, so the piece claims no stake.
        expect(article.relevance).toBeUndefined();
    });
    it("does not collapse two instruments into the same standfirst", () => {
        const names = {
            actor: "United Arab Emirates",
            target: "United States",
            playerNation: "USA",
            playerNationName: "United States",
        };
        const tariff = composeArticle(item({
            kind: "npc-action",
            actor: "ARE",
            target: "USA",
            facts: { instrument: "Tariff Increase", stake: "the measure is in force" },
        }), names);
        const advisory = composeArticle(item({
            kind: "npc-action",
            actor: "ARE",
            target: "USA",
            facts: { instrument: "Trade Advisory", stake: "the approach is on the record" },
        }), names);
        expect(tariff.standfirst).not.toBe(advisory.standfirst);
        expect(tariff.standfirst).toMatch(/higher tariffs/i);
        expect(advisory.standfirst).toMatch(/warning to its own companies/i);
    });
    it("names the program a foreign government reset, not a bare stance word", () => {
        const article = composeArticle(item({
            kind: "governance",
            actor: "ITA",
            headline: "Italy adopts continuity as its trade program.",
            facts: {
                instrument: "Trade program",
                stake: "The schedules you inherited, renewed without comment.",
            },
        }), { actor: "Italy", playerNation: "USA", playerNationName: "United States" });
        expect(article.standfirst).toMatch(/Italy is resetting its trade program/i);
        expect(article.paragraphs[0]).toMatch(/schedules you inherited/i);
        expect(article.relevance).toContain("Italy");
    });
    it("tells two different weeks apart", () => {
        expect(composeArticle(item({ turn: 4 })).byline).not.toBe(composeArticle(item({ turn: 9 })).byline);
    });
    it("does not echo the headline's closing sentence into the standfirst", () => {
        const stake = "Vietnam rebuffs the approach and nothing moves";
        const article = composeArticle(item({
            kind: "npc-action",
            actor: "CAN",
            target: "VNM",
            headline: `Canada attempts Trade Advisory against Vietnam. ${stake}.`,
            facts: { instrument: "Trade Advisory", stake },
        }), { actor: "Canada", target: "Vietnam", playerNation: "USA", playerNationName: "United States" });
        expect(article.standfirst.toLowerCase()).not.toContain("rebuffs the approach");
        expect(article.paragraphs.join(" ").toLowerCase()).not.toContain("rebuffs the approach");
        expect(article.standfirst).toBe("Canada: a warning to its own companies, aimed at Vietnam.");
    });
    it("leads on a stake the headline has not already said", () => {
        const article = composeArticle(item({
            kind: "npc-action",
            actor: "CAN",
            target: "VNM",
            headline: "Canada issues Trade Advisory against Vietnam, and it lands.",
            facts: { instrument: "Trade Advisory", stake: "the measure is in force" },
        }), { actor: "Canada", target: "Vietnam", playerNation: "USA", playerNationName: "United States" });
        expect(article.paragraphs[0]).toBe("The measure is in force.");
    });
    it("prints an authored dateline in the byline", () => {
        const article = composeArticle(item({ facts: { dateline: "Geneva" } }));
        expect(article.byline).toMatch(/Filed from Geneva, week 4\.$/);
        expect(article.byline).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+\. /);
    });
    it("falls back to a week-only byline when no dateline was handed over", () => {
        expect(composeArticle(item()).byline).toMatch(/Filed in week 4\.$/);
        // A screen that knows the date hands it over, and the byline carries the
        // same day the page's own heading does rather than a turn count.
        expect(composeArticle(item(), {}, { filedOn: "April 14, 2028" }).byline).toMatch(/Filed on April 14, 2028\.$/);
    });
    it("does not collapse two kinds into the same standfirst or body graf on a bare headline", () => {
        const headline = "The ministry confirms the shipment was turned back at the border.";
        const articles = KINDS.map((kind) => composeArticle(item({ kind, headline })));
        const standfirsts = articles.map((article) => article.standfirst);
        expect(new Set(standfirsts).size).toBe(KINDS.length);
        const paragraphs = articles.flatMap((article) => article.paragraphs);
        expect(new Set(paragraphs).size).toBe(paragraphs.length);
    });
    it("prints dateline on intelligence reads without promising publication", () => {
        const article = composeArticle(item({ visibility: "intelligence", facts: { dateline: "Langley" } }));
        expect(article.byline).toBe("Circulated from Langley, week 4. Not for publication.");
    });
    it("uses authored topic tags for wire classification", () => {
        expect(feedTopics(item({ facts: { topicTags: ["Trade", "Asia"] } }))).toEqual(["Trade", "Asia"]);
        expect(feedTopics(item({ kind: "press" }))).toContain("Media");
    });
    it("picks a stable masthead for authored topic tags", () => {
        const tagged = item({ facts: { topicTags: ["Trade"] } });
        expect(composeArticle(tagged).outlet).toBe(composeArticle(tagged).outlet);
    });
    it("frames the standfirst of the administration's own act through the masthead's disposition", () => {
        const ordered = item({ kind: "player-action", actor: "USA" });
        const names = { playerNation: "USA", playerNationName: "United States" };
        const plain = composeArticle(ordered, names);
        const hostile = composeArticle(ordered, names, { outletDisposition: 0.15 });
        expect(hostile.standfirst).not.toBe(plain.standfirst);
        expect(hostile.standfirst.length).toBeGreaterThan(plain.standfirst.length);
    });
    // The voice lines are a masthead's view of what the administration did, so a
    // story the administration is not in carries none: the deck in the owner's
    // capture read "the administration has not commented" over unrest in Barbados.
    it("puts no view of the administration over a story it is not in", () => {
        const unrest = item({ kind: "condition", target: "BRB", headline: "Barbados is struck by civil unrest in part of the country." });
        const names = { target: "Barbados", playerNation: "USA", playerNationName: "United States" };
        const plain = composeArticle(unrest, names);
        expect(composeArticle(unrest, names, { outletDisposition: 0.15 }).standfirst).toBe(plain.standfirst);
        expect(plain.standfirst).not.toMatch(/administration|White House|officials/i);
    });
});
describe("a piece about this administration's own week", () => {
    it("does not tell the player they are not named in a move they ordered", () => {
        const article = composeArticle(item({
            kind: "npc-action",
            actor: "USA",
            target: "VEN",
            facts: { instrument: "Limited Strike", stake: "the target is gone" },
        }), { actor: "United States", target: "Venezuela", playerNation: "USA", playerNationName: "United States" });
        expect(article.relevance).not.toMatch(/not named in the move/i);
        expect(article.relevance).toContain("You ordered an air strike");
        expect(article.relevance).toContain("Venezuela");
        expect(article.relevance).toContain("air strike against Venezuela");
    });
    it("gives a country the article a sentence needs, at both ends of one", () => {
        const article = composeArticle(item({
            kind: "npc-action",
            actor: "ARE",
            target: "USA",
            facts: { instrument: "Tariff Increase", stake: "importers are paying the new rate" },
        }), { actor: "United Arab Emirates", target: "United States", playerNation: "USA", playerNationName: "United States" });
        const prose = [article.standfirst, article.relevance, ...article.paragraphs].join(" ");
        expect(prose).toMatch(/the United Arab Emirates|The United Arab Emirates/);
        // Never the bare name mid-sentence, and never a lower-case article opening one.
        expect(prose).not.toMatch(/(^|\. )the [A-Z]/);
        for (const match of prose.matchAll(/United Arab Emirates/g)) {
            expect(prose.slice(Math.max(0, match.index - 4), match.index)).toMatch(/[Tt]he $/);
        }
    });
});
describe("news from home", () => {
    const home = { playerNation: "USA", playerNationName: "United States" };
    const flood = item({ kind: "condition", target: "USA", headline: "Flooding in the United States is worsening." });
    it("reads a disaster at home as the country's own news", () => {
        const article = composeArticle(flood, { ...home, target: "United States" });
        const prose = [article.standfirst, article.relevance, ...article.paragraphs].join(" ");
        expect(article.domestic).toBe(true);
        expect(article.relevance).toMatch(/at home/i);
        expect(prose).not.toMatch(/named target|aimed squarely|absorb the shock locally|which instrument/i);
    });
    it("writes all six sections for home, not for a foreign capital", () => {
        const domestic = composeArticle(flood, { ...home, target: "United States" });
        const abroad = composeArticle({ ...flood, target: "ALP" }, { ...home, target: "Alpina" });
        expect(abroad.domestic).toBe(false);
        expect(domestic.standfirst).not.toBe(abroad.standfirst);
        expect(domestic.relevance).not.toBe(abroad.relevance);
        domestic.paragraphs.forEach((paragraph, index) => expect(paragraph, `paragraph ${index}`).not.toBe(abroad.paragraphs[index]));
        expect(domestic.paragraphs[0]).toBe("Flooding at home has gotten worse.");
        expect(abroad.paragraphs[0]).toBe("Flooding in Alpina has gotten worse.");
    });
    // A save written before scope was inferred carries the old shapes: the
    // decision's record aimed at the player's own nation with no actor, and a
    // framing filed the same way. Nothing new is stored, so they read domestic.
    it("reads an item filed before scope was inferred as domestic", () => {
        const legacy = item({ kind: "player-action", target: "USA", headline: "The school board dispute" });
        const current = item({ kind: "player-action", actor: "USA", headline: "The school board dispute" });
        expect(composeArticle(legacy, home).domestic).toBe(true);
        const ours = composeArticle(current, home);
        expect(ours.domestic).toBe(true);
        expect(ours.relevance).toContain("You decided this");
        expect(composeArticle(legacy, home).paragraphs.at(-1)).not.toMatch(/aimed squarely/);
    });
    it("does not read a foreign government's move on the President as domestic", () => {
        const aimed = item({ kind: "npc-action", actor: "CHN", target: "USA" });
        expect(composeArticle(aimed, { ...home, actor: "China", target: "United States" }).domestic).toBe(false);
    });
});
describe("a country named as the subject", () => {
    it("names Saudi Arabia, not a person called Arabia", () => {
        const retaliation = item({ headline: "Saudi Arabia retaliates against American chemicals.", facts: { subject: "Saudi Arabia" } });
        const article = composeArticle(retaliation, { playerNation: "USA", playerNationName: "United States" });
        const prose = [article.standfirst, ...article.paragraphs].join(" ");
        expect(prose).toContain("Saudi Arabia");
        expect(prose.replace(/Saudi Arabia/g, "")).not.toMatch(/\bArabia\b/);
        expect(prose).not.toMatch(/has not resigned|career|Nobody at Saudi Arabia/);
    });
});
describe("the banks invent no day of the week", () => {
    // Every draw is keyed on the item's turn and headline, so walking both
    // reaches every line of every bank for every kind and scope. Fixed headlines,
    // because a key that carries the turn twice lands on half a four-line bank.
    const OPERATOR_HEADLINES = [
        "Smugglers are moving drugs and guns through Bangladesh faster than its ports can search them.",
        "Armed rebels hold ground inside Iraq and have turned down every offer of talks.",
        "Hackers working out of Russia have broken into computer systems they should not be able to reach.",
        "A hired army registered in the United Arab Emirates is taking jobs nobody will admit to paying for.",
        "Traders are betting heavily against Egypt's currency, and there is nobody to call about it.",
    ];
    const HEADLINES = [
        "The ministry confirms the shipment was turned back at the border.",
        "A second statement follows the first.",
        "Officials decline to comment.",
        "The vote is delayed again.",
        "A report lands on the desk.",
        "The committee meets in private.",
        "Prices move before the announcement.",
        "A letter is made public.",
    ];
    const WEEKDAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/;
    it("files no line that says which weekday something happened on", () => {
        const facts = [{}, { subject: "Logan Hall", stake: "what it costs", figure: "400 tonnes" }, { instrument: "Tariff Increase", stake: "the measure is in force" }];
        const offenders = new Set();
        for (let turn = 1; turn <= 12; turn += 1) {
            for (const kind of KINDS) {
                const headlines = kind === "operator" ? OPERATOR_HEADLINES : HEADLINES;
                for (const headline of headlines) {
                    for (const fact of facts) {
                        for (const [actor, target] of [[undefined, "USA"], ["CHN", "VNM"], ["USA", undefined]]) {
                            for (const visibility of ["public", "intelligence"]) {
                                const piece = composeArticle(item({ turn, kind, headline, visibility, facts: fact, ...(actor ? { actor: actor } : {}), ...(target ? { target: target } : {}) }), { actor: actor === "CHN" ? "China" : undefined, target: target === "VNM" ? "Vietnam" : undefined, playerNation: "USA", playerNationName: "United States" });
                                for (const text of [piece.standfirst, piece.relevance ?? "", ...piece.paragraphs])
                                    if (WEEKDAY.test(text))
                                        offenders.add(text);
                            }
                        }
                    }
                }
            }
        }
        expect([...offenders]).toEqual([]);
    });
});
