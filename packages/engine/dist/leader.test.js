import { describe, expect, it } from "vitest";
import { US_ID, CHARTER_USA_CONSTITUTION, Person, leaderBackgrounds, leaderRoutes, ageBandFor, parsePortraitRef, } from "@admin/world";
import { LEADER_PORTRAIT_REF, composeLeader, defaultLeaderDraft, deriveLeaderAttributes, deriveLeaderTraits, ideologyConviction, leaderPersonId, } from "./leader.js";
import { birthplacePool } from "./people.js";
const LEAD_ROLE = CHARTER_USA_CONSTITUTION.cabinetRoles[0];
const CENTRIST = { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 };
function draft(overrides = {}) {
    return { ...defaultLeaderDraft(), name: "Ada Verrin", ...overrides };
}
function compose(overrides = {}) {
    const result = composeLeader(draft(overrides), US_ID, "United States", LEAD_ROLE);
    if (!result.ok)
        throw new Error(`expected a composed leader, got: ${result.reason}`);
    return result;
}
describe("composeLeader", () => {
    it("produces a person the world schema accepts, like any minister", () => {
        const { person } = compose();
        expect(() => Person.parse(person)).not.toThrow();
        expect(person.id).toBe(leaderPersonId(US_ID));
        expect(person.name).toBe("Ada Verrin");
        expect(person.nationality).toBe(US_ID);
        expect(person.portraitRef).toBe(LEADER_PORTRAIT_REF);
    });
    it("is eligible for its own chair and nothing else, so it cannot be appointed under itself", () => {
        const { person } = compose();
        expect(person.eligibleRoles).toEqual([LEAD_ROLE]);
    });
    // The founding screen draws these readings live while the player is still
    // choosing. A roll would make that preview a lie.
    it("is fully deterministic — the same biography always composes the same person", () => {
        const a = compose({ name: "Ada Verrin", age: 55 });
        const b = compose({ name: "Ada Verrin", age: 55 });
        expect(a.person).toEqual(b.person);
    });
    it("refuses an unnamed leader with a sentence, not an error string", () => {
        const result = composeLeader(draft({ name: "   " }), US_ID, "United States", LEAD_ROLE);
        expect(result.ok).toBe(false);
        if (result.ok)
            throw new Error("unreachable");
        expect(result.reason).not.toMatch(/error|invalid|undefined/i);
        expect(result.reason).toMatch(/name/i);
    });
    it("refuses an age no such career could have reached the chair at", () => {
        const background = leaderBackgrounds[0];
        const result = composeLeader(draft({ age: background.ageRange.min - 5 }), US_ID, "United States", LEAD_ROLE);
        expect(result.ok).toBe(false);
        if (result.ok)
            throw new Error("unreachable");
        expect(result.reason).toContain(String(background.ageRange.min));
    });
    it("writes a bio long enough for the schema out of the career and the route", () => {
        // The cabinet secretary's line names the country, which is the case the
        // article rule is about.
        const { person } = compose({ backgroundId: "path-cabinet", age: 60 });
        expect(person.bio.length).toBeGreaterThanOrEqual(60);
        expect(person.bio).toContain("United States");
        expect(person.bio).not.toContain("United States's");
        expect(person.bio).toContain("the United States'");
        expect(person.bio).not.toMatch(/(^|[^e]) United States/);
    });
});
describe("the President's own identity", () => {
    it("is from the home state the player names, and otherwise from wherever the name lands", () => {
        const { person } = compose({ homeState: "OH" });
        expect(person.birthplace).toMatch(/, Ohio$/);
        const unstated = compose();
        expect(birthplacePool(US_ID)).toContain(unstated.person.birthplace);
    });
    it("names the state itself where the dataset names no city in it", () => {
        const { person } = compose({ homeState: "WY" });
        expect(person.birthplace).toBe("Wyoming");
    });
    it("refuses a home state that is not on the map", () => {
        const result = composeLeader(draft({ homeState: "ZZ" }), US_ID, "United States", LEAD_ROLE);
        expect(result.ok).toBe(false);
    });
    it("draws a face for the presentation the player states, at the President's own age", () => {
        const { person } = compose({ presentation: "feminine", age: 66 });
        const face = parsePortraitRef(person.portraitRef);
        expect(face.gender).toBe("feminine");
        expect(face.ageBand).toBe(ageBandFor(66));
        // Deterministic: the same draft draws the same face.
        expect(compose({ presentation: "feminine", age: 66 }).person.portraitRef).toBe(person.portraitRef);
    });
    it("keeps a face the player picked, except for its age, and refuses one that contradicts the presentation", () => {
        const picked = "npc/latin-america/masculine/early/tone-3/business/short/black/none/none/v2";
        const { person } = compose({ presentation: "masculine", portraitRef: picked, age: 58 });
        const face = parsePortraitRef(person.portraitRef);
        expect(face.heritage).toBe("latin-america");
        expect(face.skinTone).toBe("tone-3");
        expect(face.ageBand).toBe(ageBandFor(58));
        const clash = composeLeader(draft({ presentation: "feminine", portraitRef: picked }), US_ID, "United States", LEAD_ROLE);
        expect(clash.ok).toBe(false);
        const nonsense = composeLeader(draft({ portraitRef: "not-a-face" }), US_ID, "United States", LEAD_ROLE);
        expect(nonsense.ok).toBe(false);
    });
    it("stays the monogram when the player states neither a face nor a presentation", () => {
        expect(compose().person.portraitRef).toBe(LEADER_PORTRAIT_REF);
    });
});
describe("the readings a biography is worth", () => {
    it("keeps every attribute inside 0..1 for every background and route pairing", () => {
        for (const background of leaderBackgrounds) {
            for (const route of leaderRoutes) {
                for (const age of [background.ageRange.min, background.ageRange.max]) {
                    for (const extreme of [-1, 0, 1]) {
                        const attributes = deriveLeaderAttributes({
                            age,
                            ideology: {
                                economicLeftRight: extreme,
                                authLibertarian: extreme,
                                nationalistGlobalist: extreme,
                            },
                        }, background, route);
                        for (const value of Object.values(attributes)) {
                            expect(value).toBeGreaterThanOrEqual(0);
                            expect(value).toBeLessThanOrEqual(1);
                        }
                    }
                }
            }
        }
    });
    // The point of authoring backgrounds instead of shipping stat sliders: no
    // life is simply better than another. If one ever dominates on all five, the
    // choice has collapsed into a right answer.
    it("has no background that beats another on every reading at once", () => {
        const route = leaderRoutes[0];
        const keys = ["competence", "loyalty", "ambition", "integrity", "charisma"];
        for (const a of leaderBackgrounds) {
            for (const b of leaderBackgrounds) {
                if (a.id === b.id)
                    continue;
                const dominates = keys.every((key) => a.base[key] > b.base[key]);
                expect(dominates, `${a.name} dominates ${b.name} on every reading`).toBe(false);
            }
        }
        // And the same holds once a route is applied to both.
        for (const a of leaderBackgrounds) {
            for (const b of leaderBackgrounds) {
                if (a.id === b.id)
                    continue;
                const left = deriveLeaderAttributes({ age: a.ageRange.min, ideology: CENTRIST }, a, route);
                const right = deriveLeaderAttributes({ age: b.ageRange.min, ideology: CENTRIST }, b, route);
                expect(keys.every((key) => left[key] > right[key])).toBe(false);
            }
        }
    });
    it("reads conviction off the distance from the center, not off the direction", () => {
        expect(ideologyConviction(CENTRIST)).toBe(0);
        expect(ideologyConviction({ economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 })).toBe(1);
        expect(ideologyConviction({ economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 })).toBe(1);
    });
    it("pays conviction in integrity and charges it in competence", () => {
        const background = leaderBackgrounds[0];
        const route = leaderRoutes[0];
        const centrist = deriveLeaderAttributes({ age: background.ageRange.min, ideology: CENTRIST }, background, route);
        const convicted = deriveLeaderAttributes({
            age: background.ageRange.min,
            ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 },
        }, background, route);
        expect(convicted.integrity).toBeGreaterThan(centrist.integrity);
        expect(convicted.competence).toBeLessThan(centrist.competence);
    });
    it("never hands out more than three traits, and never the same one twice", () => {
        for (const background of leaderBackgrounds) {
            for (const route of leaderRoutes) {
                const traits = deriveLeaderTraits({ economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 }, background, route);
                expect(traits.length).toBeLessThanOrEqual(3);
                expect(new Set(traits).size).toBe(traits.length);
            }
        }
    });
});
describe("defaultLeaderDraft", () => {
    it("opens unnamed, so a founding cannot be sealed on a name nobody chose", () => {
        expect(defaultLeaderDraft().name).toBe("");
    });
    it("opens on a real background and route at a plausible age for it", () => {
        const opening = defaultLeaderDraft();
        const background = leaderBackgrounds.find((b) => b.id === opening.backgroundId);
        expect(background).toBeDefined();
        expect(leaderRoutes.some((r) => r.id === opening.routeId)).toBe(true);
        expect(opening.age).toBeGreaterThanOrEqual(background.ageRange.min);
        expect(opening.age).toBeLessThanOrEqual(background.ageRange.max);
    });
    it("refuses a background id the dataset never authored", () => {
        const result = composeLeader(draft({ backgroundId: "path-nonexistent" }), US_ID, "United States", LEAD_ROLE);
        expect(result.ok).toBe(false);
    });
    it("refuses a route id the dataset never authored", () => {
        const result = composeLeader(draft({ routeId: "route-nonexistent" }), US_ID, "United States", LEAD_ROLE);
        expect(result.ok).toBe(false);
    });
    it("stamps a US president with the ticket they chose, not the one their economics implies", () => {
        const left = composeLeader(draft({ party: "democrat", ideology: { economicLeftRight: -0.6, authLibertarian: 0, nationalistGlobalist: 0 } }), US_ID, "United States", LEAD_ROLE, CHARTER_USA_CONSTITUTION.parties ?? []);
        const right = composeLeader(draft({ party: "republican", ideology: { economicLeftRight: 0.6, authLibertarian: 0, nationalistGlobalist: 0 } }), US_ID, "United States", LEAD_ROLE, CHARTER_USA_CONSTITUTION.parties ?? []);
        const crossed = composeLeader(draft({
            party: "democrat",
            ideology: { economicLeftRight: 0.6, authLibertarian: 0, nationalistGlobalist: 0 },
        }), US_ID, "United States", LEAD_ROLE, CHARTER_USA_CONSTITUTION.parties ?? []);
        const independent = composeLeader(draft({ party: "independent" }), US_ID, "United States", LEAD_ROLE, CHARTER_USA_CONSTITUTION.parties ?? []);
        expect(left.ok && left.person.party).toBe("party-usa-democrat");
        expect(right.ok && right.person.party).toBe("party-usa-republican");
        expect(crossed.ok && crossed.person.party).toBe("party-usa-democrat");
        expect(independent.ok && independent.person.party).toBe("party-usa-independent");
    });
});
describe("where the president is from", () => {
    const places = new Set(birthplacePool(US_ID));
    it("answers the question every other dossier in the game answers", () => {
        const { person } = compose({ name: "Ada Verrin" });
        expect(person.birthplace).toBeDefined();
        expect(places.has(person.birthplace)).toBe(true);
    });
    // The founding screen draws this while the player is still typing, and the
    // sealed campaign draws it again on every dossier afterwards.
    it("is composed, not rolled: the same name always comes from the same town", () => {
        expect(compose({ name: "Ada Verrin", age: 68 }).person.birthplace).toBe(compose({ name: "Ada Verrin", age: 50 }).person.birthplace);
    });
    // Keyed on the name because it is the one thing the player states that is
    // theirs alone. Keyed on the career instead, every prosecutor who ever took
    // the chair would have grown up in the same town.
    it("does not follow the career, so two prosecutors are not from one place", () => {
        const route = leaderRoutes[0];
        const background = leaderBackgrounds[0];
        const homes = new Set(["Ada Verrin", "Marcus Hale", "Ruth Okonjo", "Delia Frame", "Sam Oyelaran", "Nina Castellan"].map((name) => compose({ name, routeId: route.id, backgroundId: background.id }).person.birthplace));
        expect(homes.size).toBeGreaterThan(3);
    });
});
