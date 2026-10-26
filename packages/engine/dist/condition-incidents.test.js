// One bad afternoon on the condition pipeline, and the words a hazard is called.
//
// The two belong in one file because they are the same claim from two sides: an
// incident is a condition with a different lifetime and no second record kind,
// and a hurricane is a cyclone with a different word and no second noun table.
import { describe, expect, it } from "vitest";
import { addDays } from "./clock.js";
import { foundedForBalance } from "./balance-harness.js";
import { composeArticle } from "./article.js";
import { incidentArticle } from "./article-incidents.js";
import { cycloneBasinOf, hazardLabel, hazardNoun } from "./condition-impacts.js";
import { INCIDENT_KINDS, isIncidentKind } from "./condition-kinds.js";
import { openCondition, unrestOnsetReason } from "./condition-onset.js";
import { conditionPhase } from "./conditions.js";
import { apply } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import { selectActiveConditions } from "./state.js";
const USA = nationA.id;
function open(campaign, kind) {
    const candidate = { nation: USA, kind, chance: 1 };
    const stream = createRngStreams(campaign.seed).stream("condition-open", USA, kind, campaign.turn);
    return openCondition(campaign, candidate, stream);
}
function store(campaign, condition) {
    return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}
function tick(campaign) {
    return conditionPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
}
function conditionItems(campaign) {
    return campaign.feed.filter((item) => item.kind === "condition");
}
describe("an incident is a condition with a shorter lifetime", () => {
    it("names only the kinds that are over the moment they happen", () => {
        expect([...INCIDENT_KINDS]).toEqual(["tornado", "heat-wave", "mass-casualty-attack"]);
        expect(isIncidentKind("tornado")).toBe(true);
        expect(isIncidentKind("winter-storm")).toBe(false);
        expect(isIncidentKind("flood")).toBe(false);
        expect(isIncidentKind("recession")).toBe(false);
    });
    it("marks the record at onset, because the lifetime is what a Desk row reads", () => {
        const tornado = open(buildCampaign(), "tornado");
        expect(tornado.lifetime).toBe("incident");
        expect(open(buildCampaign(), "flood").lifetime).toBeUndefined();
    });
    it("resolves on the next tick and bills nothing for the week after", () => {
        const opened = buildCampaign();
        const tornado = { ...open(opened, "tornado"), severity: 0.9 };
        const staged = { ...store(opened, tornado), turn: opened.turn + 1 };
        const before = staged.nations[USA].stats.politics.regimeStability;
        const after = tick(staged);
        const resolved = after.conditions[tornado.id];
        expect(resolved.status).toBe("resolved");
        expect(resolved.endedTurn).toBe(staged.turn);
        expect(selectActiveConditions(after).some((entry) => entry.id === tornado.id)).toBe(false);
        // Nothing was charged: its whole bill was charged on the week it arrived.
        expect(after.nations[USA].stats.politics.regimeStability).toBe(before);
    });
    it("does not run for a second week even at full severity", () => {
        const opened = buildCampaign();
        const tornado = { ...open(opened, "tornado"), severity: 1 };
        const after = tick({ ...store(opened, tornado), turn: opened.turn + 1 });
        expect(after.conditions[tornado.id].severity).toBe(0);
    });
    it("files one item for the incident and none for its close", () => {
        const opened = buildCampaign();
        const tornado = { ...open(opened, "tornado"), severity: 0.9 };
        const staged = { ...store(opened, tornado), turn: opened.turn + 1 };
        const filed = conditionItems(staged).length;
        const after = tick(staged);
        expect(conditionItems(after).length).toBe(filed);
    });
    it("uses the condition record and no parallel store", () => {
        const opened = buildCampaign();
        const tornado = open(opened, "tornado");
        const staged = store(opened, tornado);
        expect(Object.keys(staged.conditions)).toContain(tornado.id);
        // The record is a NationCondition, which is the whole claim: one store, one
        // id scheme and one reader for a file and an afternoon alike.
        expect(staged.conditions[tornado.id].kind).toBe("tornado");
    });
});
describe("what a condition item tells the wire about itself", () => {
    const opened = buildCampaign();
    const flood = { ...open(opened, "flood"), severity: 0.6 };
    const running = tick({ ...store(opened, flood), turn: opened.turn + 1 });
    const item = conditionItems(running).at(-1);
    it("carries where in its own arc the week stands", () => {
        expect(["onset", "worsening", "easing", "over"]).toContain(item.facts?.phase);
    });
    it("carries a dateline when the condition landed in a place", () => {
        if (flood.city || flood.state)
            expect(item.facts?.dateline).toBeTruthy();
    });
    it("tags an incident so the composer can find its own register", () => {
        // Driven through the phase's own onset queue on the real dataset, because
        // the tag is written at filing and a hand-stored record never files.
        const onset = firstIncidentOnItsOwn();
        expect(onset.facts?.topicTags).toContain("incident");
        expect(onset.facts?.phase).toBe("onset");
        expect(onset.facts?.dateline).toBeTruthy();
    });
});
/**
 * The first incident a real campaign files, found by running the weeks.
 *
 * A term of condition phases on the shipped dataset, which opens four to eight
 * home conditions a year and a third of them incidents, so one arrives well
 * inside the window. Driven rather than staged: the tag under test is written
 * when an item is filed, and a record put straight into the store is never
 * filed at all.
 */
function firstIncidentOnItsOwn() {
    let working = foundedForBalance("incident-register").campaign;
    for (let week = 0; week < 208; week += 1) {
        working = { ...working, turn: working.turn + 1, calendar: addDays(working.calendar, 7) };
        working = tick(working);
        const found = conditionItems(working).find((item) => item.facts?.topicTags?.includes("incident"));
        if (found)
            return found;
    }
    throw new Error("no incident opened at home inside a term, which the home rate says cannot happen");
}
describe("the incident register", () => {
    const base = {
        turn: 4,
        kind: "condition",
        visibility: "public",
        headline: "United States is struck by a tornado in Oklahoma City, Oklahoma.",
        facts: { phase: "onset", dateline: "Oklahoma City", topicTags: ["incident"] },
    };
    it("writes an incident piece that does not hedge about how things are developing", () => {
        const piece = incidentArticle(base);
        expect(piece.headline).toBe(base.headline);
        expect(piece.body).toHaveLength(4);
        expect(piece.body.join(" ")).toMatch(/Oklahoma City/);
        expect(piece.body.join(" ")).not.toMatch(/developing/);
    });
    it("writes nothing for an ordinary condition, so the standing register still runs", () => {
        expect(incidentArticle({ ...base, facts: { phase: "onset" } })).toBeUndefined();
    });
    it("writes nothing for any phase but the onset: one piece per incident", () => {
        expect(incidentArticle({ ...base, facts: { ...base.facts, phase: "over" } })).toBeUndefined();
    });
    it("reaches the composer, which asks it before its own register", () => {
        const article = composeArticle(base, { playerNation: USA, playerNationName: "the United States" });
        expect(article.paragraphs[0]).toMatch(/struck by a tornado/);
    });
});
describe("one basin-aware source for what a hazard is called", () => {
    it("says hurricane on US ground", () => {
        expect(hazardNoun("cyclone", { lat: 38.9, lon: -77 })).toBe("a hurricane");
        expect(hazardLabel("cyclone", { lat: 38.9, lon: -77 })).toBe("Hurricane");
        // With no country in hand the answer is the United States', because every
        // sentence with no country in it is about American ground.
        expect(hazardNoun("cyclone")).toBe("a hurricane");
    });
    it("says typhoon in the western Pacific and cyclone in the Indian Ocean", () => {
        expect(hazardNoun("cyclone", { lat: 35.7, lon: 139.7 })).toBe("a typhoon");
        expect(hazardNoun("cyclone", { lat: 14.6, lon: 121 })).toBe("a typhoon");
        expect(hazardNoun("cyclone", { lat: 20.6, lon: 78.9 })).toBe("a cyclone");
        expect(hazardNoun("cyclone", { lat: -25.3, lon: 133.8 })).toBe("a cyclone");
    });
    it("places each coast in the basin whose weather service names its storms", () => {
        expect(cycloneBasinOf({ lat: 25.8, lon: -80.2 })).toBe("atlantic");
        expect(cycloneBasinOf({ lat: 19.4, lon: -99.1 })).toBe("atlantic");
        expect(cycloneBasinOf({ lat: 35.7, lon: 139.7 })).toBe("northwest-pacific");
        expect(cycloneBasinOf({ lat: -18.9, lon: 47.5 })).toBe("indian");
    });
    it("gives every other kind one noun and one label, whatever the basin", () => {
        for (const kind of ["flood", "tornado", "winter-storm", "heat-wave", "recession"]) {
            expect(hazardNoun(kind, { lat: 35.7, lon: 139.7 })).toBe(hazardNoun(kind));
            expect(hazardLabel(kind, { lat: 35.7, lon: 139.7 })).toBe(hazardLabel(kind));
        }
    });
    it("writes the basin's own word into the onset sentence", () => {
        const opened = buildCampaign();
        // The engine fixture's nation sits at 10N, 20E, which is the Indian Ocean
        // basin — so it gets a cyclone, and that is the point: the word follows the
        // country rather than the table.
        expect(open(opened, "cyclone").beats[0].description).toMatch(/a cyclone/);
        expect(open(opened, "tornado").beats[0].description).toMatch(/a tornado/);
        const { campaign: us } = foundedForBalance("hazard-noun");
        const struck = openCondition(us, { nation: "USA", kind: "cyclone", chance: 1 }, createRngStreams(us.seed).stream("condition-open", "USA", "cyclone", us.turn));
        expect(struck.beats[0].description).toMatch(/hurricane/);
    });
});
describe("an unrest onset names who is angry and why", () => {
    const { campaign: founded } = foundedForBalance("unrest-reason");
    const harm = { createdTurn: founded.turn, cause: "plant-closed", weight: 0.6, valence: -1, decayRate: 0.02, reason: "The plant closed and nobody came." };
    const opening = { ...founded, cohorts: { ...founded.cohorts, "income-struggling": [harm] } };
    it("names nobody while the administration has hurt nobody", () => {
        expect(unrestOnsetReason(founded)).toBeUndefined();
    });
    it("builds a stamp against the group the administration has hurt most", () => {
        const stamp = unrestOnsetReason(opening);
        expect(stamp.question).toBe("unrest-onset");
        expect(stamp.actor).toBeTruthy();
        expect(stamp.visibility).toBe("public");
        expect(stamp.terms.map((term) => term.key).sort()).toEqual(["driving-act", "most-hurt-cohort"]);
    });
    it("names the harm that group remembers as the subject", () => {
        const stamp = unrestOnsetReason(opening);
        expect(stamp.subject).toBe(harm.reason);
    });
    it("never claims the street stayed home, because the hazard has already fired", () => {
        const stamp = unrestOnsetReason(opening);
        expect(stamp.acts).toBe(true);
        expect(stamp.threshold).toBe(0);
        expect(stamp.score).toBeGreaterThanOrEqual(0);
    });
    it("puts the stamp on the onset packet, as the reason of record", () => {
        const home = opening.founding.nation;
        const runtime = opening.nations[home];
        const streets = {
            ...opening,
            nations: {
                ...opening.nations,
                [home]: {
                    ...runtime,
                    stats: {
                        ...runtime.stats,
                        politics: { ...runtime.stats.politics, protestPressure: 1, legitimacy: 0 },
                    },
                },
            },
        };
        // Walked until the hazard fires, because the rate stays a hazard: nothing
        // here decides the onset, it only explains one.
        let working = streets;
        for (let week = 0; week < 60; week += 1) {
            working = { ...working, turn: working.turn + 1, calendar: addDays(working.calendar, 7) };
            const packets = conditionPhase(working);
            const onset = packets.find((packet) => packet.provenance?.systems?.includes("unrest") && packet.provenance.entities?.includes(home));
            if (onset) {
                expect(onset.provenance?.decision?.question).toBe("unrest-onset");
                expect(onset.provenance?.decision?.terms.length).toBe(2);
                return;
            }
            working = packets.reduce((state, packet) => apply(state, packet), working);
        }
        throw new Error("no unrest opened at home in sixty weeks on a country at maximum protest pressure");
    });
});
