import { describe, expect, it } from "vitest";
import { Person } from "@admin/world";
import { person } from "./__fixtures__/campaign.js";
import { DISPOSITION_AXES, DISPOSITION_CENTER, DISPOSITION_READERS, rapportCenterOf, axisLean, dispositionOf, ideologyGap, leaderRapport, personalAffinity, traitPull, } from "./person-disposition.js";
// Every field mid-scale, no ideology and no traits: nothing near a clamp, so a
// step in any one field shows up in every axis that reads it.
const plain = Person.parse({
    ...person,
    competence: 0.5,
    loyalty: 0.5,
    ambition: 0.5,
    integrity: 0.5,
    charisma: 0.5,
    ideology: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
    traits: [],
});
const withTraits = (traits) => ({ ...plain, traits: [...traits] });
const withIdeology = (ideology) => ({ ...plain, ideology: { ...plain.ideology, ...ideology } });
// Each row is one field stepped up from `plain`, and the axes it must move and
// which way. Every axis not named must not move at all, which is the half that
// keeps one field from reaching an outcome through an axis nobody listed.
const STEPS = [
    { name: "loyalty", changed: { ...plain, loyalty: 0.7 }, moves: { deference: 1 } },
    { name: "integrity", changed: { ...plain, integrity: 0.7 }, moves: { principle: 1, craft: 1 } },
    { name: "ambition", changed: { ...plain, ambition: 0.7 }, moves: { boldness: 1 } },
    { name: "competence", changed: { ...plain, competence: 0.7 }, moves: { craft: 1 } },
    { name: "charisma", changed: { ...plain, charisma: 0.7 }, moves: { craft: 1 } },
    { name: "authority", changed: withIdeology({ authLibertarian: 0.5 }), moves: { forceAppetite: 1 } },
    { name: "nationalism", changed: withIdeology({ nationalistGlobalist: 0.5 }), moves: { forceAppetite: 1 } },
    { name: "economics", changed: withIdeology({ economicLeftRight: 0.5 }), moves: {} },
    { name: "loyal", changed: withTraits(["loyal"]), moves: { deference: 1 } },
    { name: "pragmatic", changed: withTraits(["pragmatic"]), moves: { deference: 1 } },
    { name: "principled", changed: withTraits(["principled"]), moves: { principle: 1 } },
    { name: "corrupt", changed: withTraits(["corrupt"]), moves: { principle: -1 } },
    { name: "cautious", changed: withTraits(["cautious"]), moves: { boldness: -1 } },
    { name: "ambitious", changed: withTraits(["ambitious"]), moves: { boldness: 1 } },
    { name: "hawkish", changed: withTraits(["hawkish"]), moves: { forceAppetite: 1 } },
    { name: "dovish", changed: withTraits(["dovish"]), moves: { forceAppetite: -1 } },
    { name: "charismatic", changed: withTraits(["charismatic"]), moves: { craft: 1 } },
    { name: "reclusive", changed: withTraits(["reclusive"]), moves: { craft: -1 } },
];
describe("the five readings", () => {
    it("move with exactly the fields each one reads, the way it reads them", () => {
        const before = dispositionOf(plain);
        for (const step of STEPS) {
            const after = dispositionOf(step.changed);
            for (const axis of DISPOSITION_AXES) {
                const sign = Math.sign(after[axis] - before[axis]);
                expect(sign, `${step.name} on ${axis}`).toBe(step.moves[axis] ?? 0);
            }
        }
    });
    it("never fall as an attribute they add rises, across the whole range", () => {
        const grid = Array.from({ length: 11 }, (_, i) => i / 10);
        const rising = [
            ["loyalty", "deference"],
            ["integrity", "principle"],
            ["integrity", "craft"],
            ["ambition", "boldness"],
            ["competence", "craft"],
            ["charisma", "craft"],
        ];
        for (const [field, axis] of rising) {
            const readings = grid.map((value) => dispositionOf({ ...withTraits(["principled", "cautious"]), [field]: value })[axis]);
            readings.slice(1).forEach((reading, i) => expect(reading, `${field} → ${axis}`).toBeGreaterThanOrEqual(readings[i]));
        }
    });
    it("keep the shares inside 0..1 at the extremes", () => {
        const highest = Person.parse({ ...plain, loyalty: 1, integrity: 1, ambition: 1, competence: 1, charisma: 1, traits: ["loyal", "pragmatic", "principled", "ambitious", "charismatic"] });
        const lowest = Person.parse({ ...plain, loyalty: 0, integrity: 0, ambition: 0, competence: 0, charisma: 0, traits: ["corrupt", "cautious", "reclusive"] });
        for (const reading of [dispositionOf(highest), dispositionOf(lowest)]) {
            for (const axis of ["deference", "principle", "boldness", "craft"]) {
                expect(reading[axis]).toBeGreaterThanOrEqual(0);
                expect(reading[axis]).toBeLessThanOrEqual(1);
            }
        }
    });
    it("read a person without changing them, and the same way every time", () => {
        const frozen = Object.freeze({ ...plain, traits: Object.freeze(["hawkish"]) });
        expect(dispositionOf(frozen)).toEqual(dispositionOf(frozen));
    });
});
describe("the centers", () => {
    // The typical occupant of each of the sixteen cabinet seats below the
    // President, read off the dataset's role windows and trait odds, and the
    // median taken per axis. Pinned so a role-profile edit that moves the middle
    // of the cabinet is a visible change rather than a silent retune of every
    // term centered on it.
    it("are the median typical cabinet member", () => {
        expect(DISPOSITION_CENTER).toEqual({
            deference: 0.5327,
            principle: 0.528,
            boldness: 0.4415,
            forceAppetite: 0.5,
            craft: 0.595,
        });
    });
    it("put the typical pair of governments at the middle of rapport", () => {
        expect(rapportCenterOf()).toBe(0.1);
    });
    it("make a lean the reading less the center, to four places", () => {
        const hawk = withTraits(["hawkish", "loyal"]);
        for (const axis of DISPOSITION_AXES) {
            const expected = Math.round((dispositionOf(hawk)[axis] - DISPOSITION_CENTER[axis]) * 10000) / 10000;
            expect(axisLean(hawk, axis), axis).toBe(expected);
        }
        expect(axisLean(withTraits(["hawkish"]), "forceAppetite")).toBe(0.35);
        expect(axisLean(withTraits(["dovish"]), "forceAppetite")).toBe(-0.35);
    });
});
describe("how two people get on", () => {
    it("measures the issues as the mean gap across the three axes", () => {
        const left = { economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 };
        const right = { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 };
        expect(ideologyGap(left, left)).toBe(0);
        expect(ideologyGap(left, right)).toBe(1);
        expect(ideologyGap(left, { ...left, economicLeftRight: 1 })).toBeCloseTo(1 / 3, 12);
    });
    it("lets temperaments clash and click", () => {
        expect(traitPull(withTraits(["hawkish"]), withTraits(["dovish"]))).toBe(-0.35);
        expect(traitPull(withTraits(["principled"]), withTraits(["principled"]))).toBe(0.2);
        expect(traitPull(withTraits(["cautious"]), withTraits(["reclusive"]))).toBe(0);
    });
    it("adds the two into one affinity at the scale the caller reads the gap at", () => {
        const a = withIdeology({ economicLeftRight: 0.3 });
        const b = { ...withIdeology({ economicLeftRight: -0.3 }), traits: ["principled"] };
        const c = { ...a, traits: ["principled"] };
        expect(personalAffinity(c, b, 6)).toBe(1 - ideologyGap(c.ideology, b.ideology) * 6 + 0.2);
    });
    it("centers leader rapport, keeps it symmetric and inside -1..1", () => {
        expect(leaderRapport(plain, plain)).toBe(0.9);
        const far = withIdeology({ economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 });
        const near = withIdeology({ economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 });
        expect(leaderRapport(far, near)).toBe(-1);
        const hawk = { ...far, traits: ["hawkish"] };
        const dove = { ...withIdeology({ economicLeftRight: 0.6 }), traits: ["dovish"] };
        expect(leaderRapport(hawk, dove)).toBe(leaderRapport(dove, hawk));
    });
});
describe("the reader budget", () => {
    it("names every axis, and lists counsel as the one reader of force appetite", () => {
        expect(Object.keys(DISPOSITION_READERS).sort()).toEqual([...DISPOSITION_AXES].sort());
        expect(DISPOSITION_READERS.forceAppetite).toContain("counsel-instinct.ts");
    });
});
