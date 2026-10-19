import { describe, expect, it } from "vitest";
import { personPoolSpecs, worldDataset } from "@admin/world";
import { hasMilitaryCareer } from "./bio.js";
import { MILITARY_CAREER_LINES } from "./bio-career-lines.js";
import { composeDossier } from "./dossier.js";
import { generateNationPool, generateWorldPool } from "./people.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
const spec = personPoolSpecs.find((entry) => entry.nation === "USA");
const pool = generateNationPool(spec, "United States", createRngStreams(makeCampaignSeed("dossier-test-seed")));
const withTraits = (person, traits) => ({ ...person, traits });
describe("the dossier composer", () => {
    it("writes a full record for everyone in the pool", () => {
        for (const person of pool) {
            const sections = composeDossier(person, "United States");
            expect(sections.length, person.id).toBeGreaterThanOrEqual(4);
            for (const section of sections) {
                expect(section.heading.length, person.id).toBeGreaterThan(0);
                expect(section.body.length, `${person.id} / ${section.heading}`).toBeGreaterThan(40);
            }
        }
    });
    // Composed on demand rather than stored, so the same person read at founding
    // and read again forty turns later has to come out identically — there is no
    // seed threaded through to make that true, only the person's own id.
    it("returns the same record every time it is asked", () => {
        for (const person of pool.slice(0, 12)) {
            expect(composeDossier(person, "United States")).toEqual(composeDossier(person, "United States"));
        }
    });
    it("never leaves a trait on the record unaccounted for", () => {
        for (const person of pool) {
            if (person.traits.length === 0)
                continue;
            const temperament = composeDossier(person, "United States").find((s) => s.heading === "Temperament");
            expect(temperament, person.id).toBeDefined();
            // Two traits are both voiced; one that dropped out would be a tag on the
            // cabinet screen with nothing behind it.
            const sentences = temperament.body.split(". ").length;
            expect(sentences, `${person.id} voices ${person.traits.length} traits`).toBeGreaterThanOrEqual(person.traits.length);
        }
    });
    it("keys origins to the politics the person already carries", () => {
        const base = pool[0];
        const left = composeDossier({ ...base, ideology: { ...base.ideology, economicLeftRight: -0.8 } }, "United States");
        const right = composeDossier({ ...base, ideology: { ...base.ideology, economicLeftRight: 0.8 } }, "United States");
        expect(left[0].body).not.toBe(right[0].body);
    });
    it("voices a trait's own line rather than a generic one", () => {
        const person = pool[0];
        const corrupt = composeDossier(withTraits(person, ["corrupt"]), "United States").find((s) => s.heading === "Temperament");
        const principled = composeDossier(withTraits(person, ["principled"]), "United States").find((s) => s.heading === "Temperament");
        expect(corrupt.body).not.toBe(principled.body);
    });
    it("reads standing off loyalty and ambition together", () => {
        const person = pool[0];
        const standing = (loyalty, ambition) => composeDossier({ ...person, loyalty, ambition }, "United States").find((s) => s.heading === "Where they stand").body;
        const bodies = new Set([standing(0.9, 0.9), standing(0.1, 0.9), standing(0.9, 0.1), standing(0.1, 0.1)]);
        expect(bodies.size).toBe(4);
    });
    it("refuses a seat it has no career writing for", () => {
        expect(() => composeDossier(pool[0], "United States", "role-postmaster-general")).toThrow(/no career lines/);
    });
    // A bench eight deep per seat, five sections each, three of them selected by
    // the person's own readings: two ministers up for the same chair should not
    // be handed the same life.
    it("does not repeat a whole record between two candidates for one seat", () => {
        const bySeat = new Map();
        for (const person of pool) {
            const seat = person.eligibleRoles[0];
            const record = composeDossier(person, "United States")
                .map((section) => section.body)
                .join(" ");
            bySeat.set(seat, [...(bySeat.get(seat) ?? []), record]);
        }
        // No seat excused: the three seated one to a chair now carry a career bank
        // a line deep per chair, so the rule binds on all of them. See bio.test.ts.
        for (const [seat, records] of bySeat) {
            expect(new Set(records).size, `${seat} repeats a record`).toBe(records.length);
        }
    });
    // The "road here" section reads a career line the same way the card bio
    // does — gated off from a candidate whose generated career never earned it
    // — so the long-form record can't tell the player a different life story
    // than the two-sentence card already did. See MILITARY_CAREER_LINES.
    it("never lets the road-here section claim a service record the person's career doesn't carry", () => {
        const worldPool = generateWorldPool(worldDataset.nations, personPoolSpecs, createRngStreams(makeCampaignSeed("dossier-military-gap-seed")), worldDataset.charters);
        for (const person of worldPool) {
            const role = person.eligibleRoles[0];
            const restricted = MILITARY_CAREER_LINES[role];
            if (!restricted || hasMilitaryCareer(person.career))
                continue;
            const road = composeDossier(person, "x").find((s) => s.heading === "The road here");
            for (const line of restricted) {
                expect(road.body, `${role} ${person.id}`).not.toContain(line);
            }
        }
    });
});
// The finding this closes: two overrulings cost a Secretary four points of
// loyalty, and four points of loyalty rewrote the sentence his file opened on.
// Twenty-six points replaced the event he was remembered for — an event dated
// to before the administration existed. `standing()` is a step function on live
// loyalty and `standoutAttribute` ranked loyalty alongside the four readings no
// campaign can write, so the present was editing the past.
describe("a person's past is not rewritten by the present", () => {
    const PAST = ["Origins", "The road here", "On the record", "Temperament"];
    const LOYALTY_SWEEP = [0, 0.1, 0.25, 0.4, 0.5, 0.62, 0.75, 0.9, 1];
    function sweptDossiers(person) {
        return LOYALTY_SWEEP.map((loyalty) => composeDossier({ ...person, loyalty }, "United States"));
    }
    it("holds every past-tense section still across the whole loyalty range", () => {
        for (const person of pool.slice(0, 40)) {
            const swept = sweptDossiers(person);
            for (const heading of PAST) {
                const bodies = new Set(swept.map((sections) => sections.find((s) => s.heading === heading)?.body ?? ""));
                expect(bodies.size, `${person.id} / ${heading}`).toBe(1);
            }
        }
    });
    it("lets the present-tense standing line move, because that is what it is for", () => {
        const moved = pool
            .slice(0, 40)
            .filter((person) => new Set(sweptDossiers(person).map((s) => s.find((x) => x.heading === "Where they stand")?.body)).size > 1);
        expect(moved.length).toBeGreaterThan(0);
    });
    // The lede is taken from this section, so it may not claim a career, a span of
    // years, or a thing the person did — those are assertions the record has to
    // support and loyalty is not a record.
    it("words the standing line as a reading of the chair rather than of a career", () => {
        const careerClaims = /\b(career|for six years|three reshuffles|has served three|switched patrons|the better part of a term)\b/i;
        for (const person of pool) {
            const line = composeDossier(person, "United States").find((s) => s.heading === "Where they stand")?.body ?? "";
            expect(careerClaims.test(line), `${person.id}: ${line}`).toBe(false);
        }
    });
});
