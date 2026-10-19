import { describe, expect, it } from "vitest";
import { PersonTrait } from "@admin/world";
import { ATTRIBUTE_CONSEQUENCE, IDEOLOGY_CONSEQUENCE, TRAIT_EFFECT, attributeConsequence, attributeIsRead, traitEffect, } from "./attribute-consequence";
const ALL_TRAITS = PersonTrait.options;
const ATTRIBUTES = ["competence", "loyalty", "integrity", "charisma", "ambition"];
// Every kind `personStanding` (person-dossier.ts) can assign. Hand-written rather
// than imported, so a kind silently dropped from the union does not also
// silently drop the row that was supposed to check it.
const SUBJECTS = [
    "president",
    "cabinet",
    "available",
    "former",
    "justice",
    "hill",
    "governor",
    "agency",
    "foreign-leader",
    "foreign",
    "deceased",
];
/**
 * Words that belong to a mechanic outside this subject's scope. A sentence
 * carrying one of these is describing a rule that does not run for this kind
 * of file — the bug where a Hill leader's file read the cabinet's
 * dismissal and leak language) restated as a table a proof can drift-test.
 */
const OUT_OF_SCOPE = {
    justice: ["cabinet", "dismiss", "leak", "faction"],
    hill: ["cabinet", "dismiss", "leak", "strike"],
    governor: ["cabinet", "dismiss", "leak", "faction", "lobby"],
    agency: ["cabinet", "dismiss", "leak", "faction", "lobby"],
    foreign: ["cabinet", "dismiss", "leak", "faction", "lobby"],
    "foreign-leader": ["cabinet", "dismiss", "leak", "faction", "lobby"],
    deceased: ["cabinet", "dismiss", "leak", "faction", "lobby"],
};
/** The engine functions a subject's sentences may cite. Empty where nothing reads the attribute. */
const READ_BY_ALLOWED = {
    justice: ["justiceStrikePropensity"],
    hill: ["figureTarget", "caucusTarget", "projectLobbying"],
    "foreign-leader": ["leaderOffset", "liveTemperament"],
};
describe("what each of a person's readings moves", () => {
    it("has one entry per attribute for every standing kind, over the fixed table", () => {
        for (const key of ATTRIBUTES) {
            for (const subject of SUBJECTS) {
                expect(ATTRIBUTE_CONSEQUENCE[key][subject], `${key}/${subject}`).toBeDefined();
                expect(attributeConsequence(key, subject).length, `${key}/${subject}`).toBeGreaterThan(0);
            }
        }
    });
    it("names no rule outside a kind's own scope", () => {
        for (const key of ATTRIBUTES) {
            for (const subject of SUBJECTS) {
                const forbidden = OUT_OF_SCOPE[subject] ?? [];
                const text = attributeConsequence(key, subject).toLowerCase();
                for (const word of forbidden) {
                    expect(text.includes(word), `${key}/${subject} names "${word}": ${text}`).toBe(false);
                }
            }
        }
    });
    it("carries the engine function's name on every sentence that names a rule", () => {
        for (const key of ATTRIBUTES) {
            for (const subject of SUBJECTS) {
                const line = ATTRIBUTE_CONSEQUENCE[key][subject];
                const allowed = READ_BY_ALLOWED[subject];
                if (!line.readBy)
                    continue;
                expect(allowed, `${key}/${subject} carries readBy but the subject allows none`).toBeDefined();
                for (const id of line.readBy) {
                    expect(allowed, `${key}/${subject}`).toContain(id);
                }
            }
        }
    });
    it("tells available and former officers the cabinet copy applies only if seated", () => {
        for (const key of ATTRIBUTES) {
            expect(attributeConsequence(key, "available").startsWith("If you appoint them: ")).toBe(true);
            expect(attributeConsequence(key, "former").startsWith("If you appoint them: ")).toBe(true);
        }
    });
    it("reads a justice's competence and integrity as one skill, never a lean", () => {
        expect(ATTRIBUTE_CONSEQUENCE.competence.justice.readBy).toEqual(["justiceStrikePropensity"]);
        expect(ATTRIBUTE_CONSEQUENCE.integrity.justice.readBy).toEqual(["justiceStrikePropensity"]);
        expect(ATTRIBUTE_CONSEQUENCE.loyalty.justice.readBy).toBeUndefined();
        expect(ATTRIBUTE_CONSEQUENCE.charisma.justice.readBy).toBeUndefined();
        expect(ATTRIBUTE_CONSEQUENCE.ambition.justice.readBy).toBeUndefined();
    });
    it("reads a foreign head of government's file off their country, not off them", () => {
        for (const key of ATTRIBUTES) {
            expect(attributeConsequence(key, "foreign-leader")).toContain("country");
        }
    });
    // The engine reads three of a foreign leader's readings into the offset their
    // government's temperament carries while they lead; the file says which,
    // by how much, and names the two readers.
    it("names the offset as the reader of a foreign leader's ambition, integrity and loyalty", () => {
        for (const key of ["ambition", "integrity", "loyalty"]) {
            expect(attributeIsRead(key, "foreign-leader"), key).toBe(true);
            expect(ATTRIBUTE_CONSEQUENCE[key]["foreign-leader"].readBy, key).toEqual(["leaderOffset", "liveTemperament"]);
            expect(attributeConsequence(key, "foreign-leader"), key).toMatch(/by up to \d+ points either way/);
            expect(attributeConsequence(key, "foreign-leader"), key).toContain("never move it more than 10 points");
        }
        expect(attributeConsequence("ambition", "foreign-leader")).toContain("by up to 4 points");
        expect(attributeConsequence("integrity", "foreign-leader")).toContain("by up to 6 points");
        expect(attributeConsequence("loyalty", "foreign-leader")).toContain("by up to 4 points");
    });
});
describe("what each temperament trait moves", () => {
    it("has a consumer sentence for every trait the schema allows", () => {
        expect(ALL_TRAITS.length).toBeGreaterThan(0);
        for (const trait of ALL_TRAITS) {
            expect(TRAIT_EFFECT[trait], trait).toBeDefined();
            expect(traitEffect(trait).length, trait).toBeGreaterThan(0);
        }
    });
    it("has no entry for a word that is not in the schema's own enum", () => {
        expect(Object.keys(TRAIT_EFFECT).sort()).toEqual([...ALL_TRAITS].sort());
    });
});
describe("what ideology moves", () => {
    it("is said once, and names what reads it", () => {
        expect(IDEOLOGY_CONSEQUENCE.length).toBeGreaterThan(0);
        expect(IDEOLOGY_CONSEQUENCE).toContain("justice");
    });
    // Cabinet unity is the mean loyalty of the secretaries; no rule reads ideology into it.
    it("does not claim ideology sets how united the cabinet is", () => {
        expect(IDEOLOGY_CONSEQUENCE).not.toMatch(/united/);
    });
});
// Each of these sentences once claimed a rule the engine does not run.
describe("claims the engine does not back", () => {
    it("never says a secretary's department delivery rests on their competence", () => {
        expect(attributeConsequence("competence", "cabinet")).not.toMatch(/department gets done/);
        expect(attributeConsequence("competence", "cabinet")).toContain("Agriculture and Transportation");
    });
    it("says the ten-point floor holds only the slow political wear, and that going against advice is the main driver", () => {
        const line = attributeConsequence("loyalty", "cabinet");
        expect(line).not.toMatch(/never drops more than/);
        expect(line).toMatch(/weekly slip stops ten points below/);
        expect(line).toMatch(/Going against their advice lowers it the most/);
    });
    it("tells the President nothing reads their loyalty or ambition", () => {
        for (const key of ["loyalty", "ambition"])
            expect(attributeIsRead(key, "president"), key).toBe(false);
        expect(attributeConsequence("loyalty", "president")).not.toMatch(/counts toward how united/);
    });
    it("says the loyal, pragmatic and ambitious traits move nothing but the cabinet chart", () => {
        for (const trait of ["loyal", "pragmatic", "ambitious"]) {
            expect(traitEffect(trait), trait).toContain("doesn't change what happens");
        }
    });
});
// A foreign head of government's file said all five readings were the
// country's temperament and then told the player to plan around their
// ambition; a justice's said nothing reads their loyalty, charisma or
// ambition. The files a player opens most often from the world map.
describe("a reading nothing reads", () => {
    it("is never one a file asks the player to plan around", () => {
        for (const key of ["competence", "charisma"])
            expect(attributeIsRead(key, "foreign-leader"), key).toBe(false);
        for (const key of ["loyalty", "charisma", "ambition"])
            expect(attributeIsRead(key, "justice"), key).toBe(false);
        for (const key of ["competence", "integrity"])
            expect(attributeIsRead(key, "justice"), key).toBe(true);
        for (const key of ATTRIBUTES)
            expect(attributeIsRead(key, "cabinet"), key).toBe(true);
    });
    it("agrees with the sentence the row itself prints", () => {
        for (const key of ATTRIBUTES) {
            for (const subject of SUBJECTS) {
                const saysUnread = /This trait doesn't affect anything|not on this personal trait/.test(attributeConsequence(key, subject));
                expect(attributeIsRead(key, subject), `${key} ${subject}`).toBe(!saysUnread);
            }
        }
    });
});
