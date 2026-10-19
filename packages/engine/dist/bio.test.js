import { describe, expect, it } from "vitest";
import { personPoolSpecs, roleProfileByRole, worldDataset } from "@admin/world";
import { assignCareerLines, BIO_ROLES, birthYear, careerBankDepth, careerGateFor, careerLinesFor, composeBio, hasMilitaryCareer, } from "./bio.js";
import { ATTRIBUTE_LINES } from "./bio-attribute-lines.js";
import { CONTESTED_CAREER_LINES, MILITARY_CAREER_LINES, REIGNING_CAREER_LINES } from "./bio-career-lines.js";
import { generateNationPool, generateWorldPool } from "./people.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
const ROLE = "role-foreign-minister";
// "Unremarkable" is a per-seat fact, not a fixed 0.5: a treasury minister is
// drawn from 0.55–0.95 competence, so 0.6 is a weak one. A subject with nothing
// to say about it therefore sits mid-band on every reading for its own seat.
function midBand(role) {
    const ranges = roleProfileByRole.get(role).attributes;
    const mid = (key) => (ranges[key].min + ranges[key].max) / 2;
    return {
        competence: mid("competence"),
        loyalty: mid("loyalty"),
        ambition: mid("ambition"),
        integrity: mid("integrity"),
        charisma: mid("charisma"),
    };
}
function subject(overrides = {}) {
    return {
        id: "PER-TEST-1",
        role: ROLE,
        nationName: "United States",
        traits: [],
        index: 0,
        careerOffset: 0,
        ...midBand(ROLE),
        ...overrides,
    };
}
/** The closing sentence a composed bio ended on. */
const verdictOf = (bio) => bio.split(". ").slice(1).join(". ");
/** Whether a bio closed on a line from one particular cell of the bank. */
function closesOn(bio, key, direction) {
    return ATTRIBUTE_LINES[key][direction].includes(verdictOf(bio));
}
describe("the bio composer", () => {
    // The composer throws on an unknown seat rather than falling back to a
    // template, so adding a role profile without adding its career lines fails
    // here instead of shipping fifteen people who all say the same thing.
    it("can write a bio for every seat the world has a role profile for", () => {
        for (const role of roleProfileByRole.keys()) {
            expect(BIO_ROLES).toContain(role);
            expect(() => composeBio(subject({ role }))).not.toThrow();
        }
    });
    it("refuses a seat it has no writing for", () => {
        expect(() => composeBio(subject({ role: "role-postmaster-general" }))).toThrow(/no career lines/);
    });
    // Asserted as membership of a cell rather than as one pinned sentence: the
    // closing line is drawn from a bank of six by a hash of the person's own id,
    // so pinning a string would be pinning the hash rather than the rule.
    it("names whichever reading is most unusual for the seat, in the direction it landed", () => {
        expect(closesOn(composeBio(subject({ integrity: 0.05 })), "integrity", "low")).toBe(true);
        expect(closesOn(composeBio(subject({ integrity: 0.95 })), "integrity", "high")).toBe(true);
        expect(closesOn(composeBio(subject({ competence: 0.7, ambition: 0.95 })), "ambition", "high")).toBe(true);
    });
    // Six per cell rather than one, because the closing sentence used to be ten
    // strings for the whole world: two ministers with nothing in common closed on
    // the identical line whenever the same reading stood out for both.
    it("does not close two different people on the same sentence for the same reading", () => {
        const closings = Array.from({ length: 12 }, (_, i) => verdictOf(composeBio(subject({ id: `PER-TEST-${i}`, integrity: 0.05 }))));
        expect(new Set(closings).size).toBeGreaterThan(3);
        // ...and the same person always closes the same way.
        expect(verdictOf(composeBio(subject({ id: "PER-TEST-7", integrity: 0.05 })))).toBe(closings[7]);
    });
    // The first version of this measured every attribute against a flat 0.5 and
    // produced a cabinet where all six ministers said the same sentence: role
    // competence is authored high, so raw distance from 0.5 always picked it, and
    // the player seats the most competent candidate for every chair by
    // definition. Read against the seat's own band, high-but-expected competence
    // loses to a loyalty that is genuinely low for the chair.
    it("prefers the reading that is unusual for the seat over the one that is merely large", () => {
        // Competence 0.85 in a 0.5–0.9 band is high but ordinary; loyalty 0.4 in a
        // 0.35–0.8 band is near the floor. Under a flat 0.5 midpoint competence
        // would win this by 0.35 to 0.10.
        const bio = composeBio(subject({ competence: 0.85, loyalty: 0.4 }));
        expect(closesOn(bio, "loyalty", "low")).toBe(true);
        expect(closesOn(bio, "competence", "high")).toBe(false);
    });
    it("keeps a whole cabinet of best-in-class appointees from saying the same thing", () => {
        const spec = personPoolSpecs.find((entry) => entry.nation === "USA") ?? personPoolSpecs[0];
        const pool = generateNationPool(spec, "United States", createRngStreams(makeCampaignSeed("bio-test-seed")));
        // Exactly what founding does: the most competent candidate for every chair.
        const appointed = [...new Set(pool.map((person) => person.eligibleRoles[0]))].map((role) => pool
            .filter((person) => person.eligibleRoles[0] === role)
            .sort((a, b) => b.competence - a.competence)[0]);
        const verdicts = appointed.map((person) => person.bio.split(". ").slice(1).join(". "));
        expect(new Set(verdicts).size).toBeGreaterThan(1);
    });
    it("keeps the nation adjectival, so a pool with no nation name still reads as a sentence", () => {
        const line = composeBio(subject({ nationName: "", careerOffset: 0 }));
        expect(line).toContain("Twenty years in the foreign service");
        expect(line).not.toContain("{nation}");
    });
    it("gives every candidate for one seat a different opening", () => {
        for (const offset of [0, 1, 2]) {
            const depth = careerBankDepth(ROLE);
            const openings = Array.from({ length: depth }, (_, index) => composeBio(subject({ index, careerOffset: offset })).split(".")[0]);
            expect(new Set(openings).size).toBe(depth);
        }
    });
});
describe("the generated pool", () => {
    const spec = personPoolSpecs.find((entry) => entry.nation === "USA") ?? personPoolSpecs[0];
    const pool = generateNationPool(spec, "United States", createRngStreams(makeCampaignSeed("bio-test-seed")));
    it("writes prose rather than a template for everyone in it", () => {
        expect(pool.length).toBeGreaterThan(0);
        for (const person of pool) {
            expect(person.bio.length).toBeGreaterThanOrEqual(60);
            // A templated bio reads "name, em dash, seat, candidate"; this is prose.
            expect(person.bio).not.toContain(person.name);
            expect(person.bio).not.toMatch(/candidate\.$/);
        }
    });
    it("does not repeat a bio between two candidates for the same seat", () => {
        const bySeat = new Map();
        for (const person of pool) {
            const seat = person.eligibleRoles[0];
            bySeat.set(seat, [...(bySeat.get(seat) ?? []), person.bio]);
        }
        // No seat is excused. Fifty governors, sixty bureau chiefs and thirty-four
        // committee chairs used to be, on the grounds that they are seated one to a
        // chair rather than shortlisted — but a player reads one dossier after
        // another, and four governors to a sentence is the same defect arriving
        // more slowly. Each of those three banks now carries a line per chair.
        for (const [seat, bios] of bySeat) {
            expect(new Set(bios).size, `${seat} repeats a bio`).toBe(bios.length);
        }
    });
    it("deals the same cast, told the same way, for the same seed", () => {
        const again = generateNationPool(spec, "United States", createRngStreams(makeCampaignSeed("bio-test-seed")));
        expect(again.map((person) => person.bio)).toEqual(pool.map((person) => person.bio));
    });
});
describe("the military career-line gate", () => {
    it("never hands a civilian candidate a line that claims service", () => {
        for (const [role, restricted] of Object.entries(MILITARY_CAREER_LINES)) {
            for (let index = 0; index < careerBankDepth(role); index += 1) {
                const bio = composeBio(subject({ role, index, hasMilitaryBackground: false }));
                for (const line of restricted) {
                    expect(bio, `${role} index ${index}`).not.toContain(line);
                }
            }
        }
    });
    it("still allows every line, including the gated ones, for a candidate with the background", () => {
        // The gate excludes a line for candidates who cannot have earned it — it
        // never removes a line from the bank itself.
        for (const [role, restricted] of Object.entries(MILITARY_CAREER_LINES)) {
            const found = new Set();
            for (let index = 0; index < careerBankDepth(role); index += 1) {
                const bio = composeBio(subject({ role, index, hasMilitaryBackground: true }));
                for (const line of restricted)
                    if (bio.includes(line))
                        found.add(line);
            }
            expect(found.size, role).toBe(restricted.size);
        }
    });
    // A single-subject walk (composeBio) only avoids contradicting its own
    // candidate; it does not, by itself, keep two candidates on the same
    // shortlist from landing on the same line once a background gates some
    // lines off for some of them. assignCareerLines is what the generator
    // actually calls for a whole shortlist, and it has to hold up under every
    // mix of military and civilian candidates a shortlist could deal, not just
    // the ones a single seed happens to produce.
    it("assigns every candidate on a shortlist a distinct, eligible line under any military/civilian mix", () => {
        for (const [role, restricted] of Object.entries(MILITARY_CAREER_LINES)) {
            for (let mask = 0; mask < 256; mask += 1) {
                const isMilitary = Array.from({ length: 8 }, (_, i) => ((mask >> i) & 1) === 1);
                for (const offset of [0, 5, 11]) {
                    const lines = assignCareerLines(role, offset, isMilitary);
                    expect(new Set(lines).size, `${role} mask ${mask} offset ${offset}`).toBe(lines.length);
                    isMilitary.forEach((military, i) => {
                        if (!military)
                            expect(restricted.has(lines[i]), `${role} mask ${mask} index ${i}`).toBe(false);
                    });
                }
            }
        }
    });
});
describe("the generated world pool", () => {
    it("never lets a cabinet candidate's bio claim a service record their own career doesn't carry", () => {
        const pool = generateWorldPool(worldDataset.nations, personPoolSpecs, createRngStreams(makeCampaignSeed("military-gap-seed")), worldDataset.charters);
        for (const person of pool) {
            const role = person.eligibleRoles[0];
            const restricted = MILITARY_CAREER_LINES[role];
            if (!restricted || hasMilitaryCareer(person.career))
                continue;
            for (const line of restricted) {
                expect(person.bio, `${role} ${person.id}`).not.toContain(line);
            }
        }
    });
    it("still keeps every candidate for one of those seats on a different line", () => {
        const pool = generateWorldPool(worldDataset.nations, personPoolSpecs, createRngStreams(makeCampaignSeed("military-gap-seed")), worldDataset.charters);
        const bySeat = new Map();
        for (const person of pool) {
            const role = person.eligibleRoles[0];
            if (!(role in MILITARY_CAREER_LINES))
                continue;
            const seat = `${person.nationality}/${role}`;
            bySeat.set(seat, [...(bySeat.get(seat) ?? []), person.bio]);
        }
        for (const [seat, bios] of bySeat) {
            expect(new Set(bios).size, `${seat} repeats a bio`).toBe(bios.length);
        }
    });
});
describe("birthYear", () => {
    it("derives calendar birth year from age at campaign year", () => {
        expect(birthYear({ age: 55 }, 2027)).toBe(1972);
        expect(birthYear({ age: 42 }, 2027)).toBe(1985);
    });
});
describe("the bench", () => {
    // No cast is seeded as a justice — the court draws its nine from the general
    // population — so the profile-driven walk above never covers these two keys.
    // The judge dossier reads them directly, and the first justice ever opened
    // threw for exactly that gap.
    it("has authored career lines for both seats the judge dossier reads", () => {
        for (const role of ["role-chief-justice", "role-associate-justice"]) {
            expect(BIO_ROLES).toContain(role);
            expect(() => composeBio(subject({ role }))).not.toThrow();
        }
    });
});
// A leader's past has to be one their government could have given them. The
// leader table says what each government is; the gate reads it.
describe("career lines against the government a leader heads", () => {
    const reigning = [...REIGNING_CAREER_LINES["role-monarch"]];
    const contested = (role) => [...CONTESTED_CAREER_LINES[role]];
    it("never tells a crown prince who governs under a reigning King that he took the crown", () => {
        expect(careerGateFor("SAU", "role-monarch")).toEqual({ reigning: false, contested: false });
        const bank = careerLinesFor("role-monarch", false, "SAU");
        for (const line of reigning)
            expect(bank).not.toContain(line);
        expect(bank.some((line) => line.includes("throne"))).toBe(true);
    });
    it("keeps the crowning for a King who reigns", () => {
        expect(careerGateFor("JOR", "role-monarch").reigning).toBe(true);
        expect(careerLinesFor("role-monarch", false, "JOR")).toEqual(expect.arrayContaining(reigning));
    });
    it("gives no party-state leader a campaign, a convention or a by-election", () => {
        for (const [nation, role] of [["CHN", "role-president"], ["VNM", "role-prime-minister"], ["RUS", "role-president"]]) {
            const bank = careerLinesFor(role, false, nation);
            for (const line of contested(role))
                expect(bank, `${nation} ${line}`).not.toContain(line);
            expect(bank.length, nation).toBeGreaterThanOrEqual(3);
        }
        expect(careerLinesFor("role-president", false, "FRA")).toEqual(expect.arrayContaining(contested("role-president")));
    });
    it("leaves every chair the table does not describe on its whole bank", () => {
        expect(careerGateFor("SAU", "role-foreign-minister")).toBeUndefined();
        expect(careerGateFor("USA", "role-president")).toBeUndefined();
        expect(careerLinesFor("role-monarch")).toEqual(expect.arrayContaining(reigning));
    });
    it("writes the drawn cast's bios off the gated banks", () => {
        const pool = generateWorldPool(worldDataset.nations, personPoolSpecs, createRngStreams(makeCampaignSeed("gated-bios")), worldDataset.charters);
        const saudiLead = pool.filter((person) => person.nationality === "SAU" && person.eligibleRoles[0] === "role-monarch");
        expect(saudiLead.length).toBeGreaterThan(0);
        for (const person of saudiLead)
            for (const line of reigning)
                expect(person.bio.startsWith(line), person.bio).toBe(false);
        const gatedSubject = { ...subject({ role: "role-president" }), government: careerGateFor("CHN", "role-president") };
        for (let index = 0; index < 12; index += 1) {
            const bio = composeBio({ ...gatedSubject, index });
            for (const line of contested("role-president"))
                expect(bio.startsWith(line)).toBe(false);
        }
    });
});
