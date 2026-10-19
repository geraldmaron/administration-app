import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NATION_LEADER_CONSTRAINTS, ROYAL_HOUSES, ageBandFor, cabinetWomenShareFor, carriesLeaderSurname, carriesRealName, hasGenderedSurnames, leadNameGroup, faceForPerson, nameCultureFor, nameGroupById, namesByFather, nationCabinetRoles, nationLeadRole, nationNameBank, parsePortraitRef, personPoolSpecs, readName, royalHouseFor, surnameFor, worldDataset, } from "@admin/world";
import { generateWorldPool } from "./people.js";
import { personIdFor } from "./person-id.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
// The leaders abroad are fictional and faithful: each government's leader is
// an invented person who shares the real one's sex, age band, title and party,
// named the way their country names people, in a cabinet that seats women at
// the rate the real one does. This holds the drawn cast to the leader table
// (packages/world/sources/leader-table, vendored as NATION_LEADER_CONSTRAINTS)
// over several seeds; scripts/verify-leader-fidelity.mjs holds the same cast
// to the sources' real names, which cannot be written into a test.
const SEEDS = ["fidelity-a", "fidelity-b", "fidelity-c"];
const ROWS = Object.values(NATION_LEADER_CONSTRAINTS);
const pools = new Map();
beforeAll(() => {
    for (const seed of SEEDS) {
        pools.set(seed, generateWorldPool(worldDataset.nations, personPoolSpecs, createRngStreams(makeCampaignSeed(seed)), worldDataset.charters));
    }
});
const genderOf = (person) => parsePortraitRef(person.portraitRef).gender;
const bandOf = (age) => (age >= 80 ? "80+" : `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`);
const leadBench = (pool, nation) => pool.filter((person) => person.nationality === nation && person.eligibleRoles[0] === nationLeadRole(nation));
describe("every foreign leader against the leader table", () => {
    it("draws each incumbent at the table's sex, age band and governing party, for all 195 governments", () => {
        for (const [seed, pool] of pools) {
            const byId = new Map(pool.map((person) => [person.id, person]));
            for (const row of ROWS) {
                const nation = row.nation;
                const incumbent = byId.get(personIdFor(nation, nationLeadRole(nation), 0));
                const where = `${seed} ${nation}`;
                expect(genderOf(incumbent) === "feminine" ? "F" : "M", where).toBe(row.sex);
                expect(bandOf(incumbent.age), where).toBe(row.ageBand);
                expect(incumbent.party, where).toBe(row.partyless ? undefined : row.governing[0]);
            }
        }
    });
    it("draws every successor on a lead bench at the table's sex and party, so a death seats no one off the table", () => {
        const pool = pools.get(SEEDS[0]);
        for (const row of ROWS) {
            for (const person of leadBench(pool, row.nation)) {
                expect(genderOf(person) === "feminine" ? "F" : "M", person.id).toBe(row.sex);
                expect(person.party, person.id).toBe(row.partyless ? undefined : row.governing[0]);
            }
        }
    });
    /**
     * A face is drawn from its person's own record, so an incumbent's portrait
     * carries the sex the leader table gives them and is drawn at their own age:
     * nothing is matched against a catalogue that might lack the right face.
     */
    it("draws every incumbent a face of their own sex, from their own record", () => {
        const pool = pools.get(SEEDS[0]);
        for (const row of ROWS) {
            const incumbent = pool.find((person) => person.id === personIdFor(row.nation, nationLeadRole(row.nation), 0));
            const facets = parsePortraitRef(incumbent.portraitRef);
            expect(facets.ageBand).toBe(ageBandFor(incumbent.age));
            const face = faceForPerson(incumbent);
            expect(face, incumbent.id).toBeDefined();
            expect(face.presentation, incumbent.id).toBe(facets.gender);
        }
    });
});
describe("the cabinets abroad", () => {
    it("seats no woman anywhere in the Saudi government, over every seed", () => {
        for (const [seed, pool] of pools) {
            const government = pool.filter((person) => person.nationality === "SAU" && person.eligibleRoles[0] !== "role-journalist");
            expect(government.length).toBeGreaterThan(30);
            expect(government.filter((person) => genderOf(person) !== "masculine").map((person) => person.name), seed).toEqual([]);
        }
    });
    it("draws the world's cabinet chairs at the women's share the table records, within sampling tolerance", () => {
        let expected = 0;
        let variance = 0;
        let observed = 0;
        for (const pool of pools.values()) {
            for (const person of pool) {
                const nation = person.nationality;
                if (!NATION_LEADER_CONSTRAINTS[nation])
                    continue;
                if (!nationCabinetRoles(nation).slice(1).includes(person.eligibleRoles[0]))
                    continue;
                const share = cabinetWomenShareFor(nation);
                expected += share;
                variance += share * (1 - share);
                if (genderOf(person) === "feminine")
                    observed += 1;
            }
        }
        expect(expected).toBeGreaterThan(400);
        expect(Math.abs(observed - expected)).toBeLessThan(4 * Math.sqrt(variance));
    });
    it("draws no androgynous presentation abroad, where the record counts women and men only", () => {
        const pool = pools.get(SEEDS[0]);
        expect(pool.filter((person) => person.nationality !== "USA" && genderOf(person) === "androgynous")).toEqual([]);
    });
});
/**
 * The traditions the W2 review found crossed, and the ones each of those
 * nations' people actually carry, stated here rather than read off the banks:
 * a bank that named Ukraine from Russia's names would pass a test that defined
 * a tradition as whatever group the bank holds. Every other nation is held to
 * the research record's list (name-traditions.tsv) by the leader-fidelity gate.
 */
const CROSSED = {
    RUS: { traditions: ["russian"] },
    BLR: { traditions: ["russian"] },
    UKR: { traditions: ["ukrainian"] },
    KAZ: { traditions: ["kazakh"] },
    UZB: { traditions: ["uzbek"] },
    TJK: { traditions: ["tajik"] },
    KGZ: { traditions: ["kyrgyz"] },
    TKM: { traditions: ["turkmen"] },
    MYS: { traditions: ["malay", "han"], lead: "malay" },
    BRN: { traditions: ["malay"] },
    ETH: { traditions: ["ethiopian"] },
    ERI: { traditions: ["tigrinya"] },
    ZAF: { traditions: ["nguni", "sotho-tswana", "afrikaans", "anglo"], lead: "nguni" },
    NGA: { traditions: ["hausa", "yoruba", "igbo"], lead: "yoruba" },
    MMR: { traditions: ["burmese"] },
    SAU: { traditions: ["gulf-arabic"] },
    QAT: { traditions: ["gulf-arabic"] },
    KWT: { traditions: ["gulf-arabic"] },
    OMN: { traditions: ["gulf-arabic"] },
    MAR: { traditions: ["maghrebi"] },
    MRT: { traditions: ["mauritanian"] },
    TCD: { traditions: ["chadian"] },
    COM: { traditions: ["comorian"] },
    MDV: { traditions: ["maldivian"] },
    SRB: { traditions: ["serbian"] },
    MKD: { traditions: ["macedonian", "albanian"] },
    COG: { traditions: ["congolese"] },
    GAB: { traditions: ["gabonese"] },
    CAF: { traditions: ["centrafrican"] },
    GNQ: { traditions: ["equatoguinean"] },
};
/** A drawn name read back into the given traditions: the lead chair into its lead tradition, a monarch into the house. */
function readInto(person, traditions, lead) {
    const nation = person.nationality;
    const culture = nameCultureFor(nation);
    const gender = genderOf(person);
    const role = person.eligibleRoles[0];
    const groups = nationLeadRole(nation) === role && lead ? [lead] : traditions;
    return readName(person.name, groups, gender, (group, drawn) => surnameFor(nation, culture, drawn, gender), royalHouseFor(nation, role));
}
/** A drawn name read back into one tradition of its own nation's bank. */
function readAs(person) {
    const nation = person.nationality;
    return readInto(person, nationNameBank(nation, nameCultureFor(nation)).groups, leadNameGroup(nation));
}
describe("the names the world is given", () => {
    const foreign = () => [...pools.values()].flatMap((pool) => pool.filter((person) => person.nationality !== "USA"));
    const everyone = () => [...pools.values()].flat();
    it("names every person from one tradition of their country's bank, never a given name from one and a surname from another", () => {
        const unread = foreign().filter((person) => readAs(person) === undefined);
        expect(unread.map((person) => `${person.nationality} ${person.eligibleRoles[0]} ${person.name}`)).toEqual([]);
    });
    it("names the nations the review found crossed only from the traditions their people carry", () => {
        for (const [nation, row] of Object.entries(CROSSED)) {
            const traditions = row.traditions.map((id) => nameGroupById(id));
            const lead = row.lead ? nameGroupById(row.lead) : undefined;
            const people = foreign().filter((person) => person.nationality === nation);
            expect(people.length, nation).toBeGreaterThan(20);
            const crossed = people.filter((person) => readInto(person, traditions, lead) === undefined);
            expect(crossed.map((person) => `${nation} ${person.name}`)).toEqual([]);
        }
    });
    it("names Russia and Ukraine, and each Central Asian republic, from its own people's names", () => {
        for (const [nation, id] of [["RUS", "russian"], ["UKR", "ukrainian"], ["KAZ", "kazakh"], ["TJK", "tajik"], ["UZB", "uzbek"], ["KGZ", "kyrgyz"], ["TKM", "turkmen"]]) {
            const people = foreign().filter((person) => person.nationality === nation && !royalHouseFor(nation, person.eligibleRoles[0]));
            expect(people.length, nation).toBeGreaterThan(20);
            for (const person of people)
                expect(readAs(person)?.group.id, `${nation} ${person.name}`).toBe(id);
        }
    });
    it("writes each tradition's names in its own order, with its own joining words", () => {
        const of = (nation) => foreign().filter((person) => person.nationality === nation && !royalHouseFor(nation, person.eligibleRoles[0]));
        for (const person of of("CHN"))
            expect(person.name.startsWith(`${readAs(person).second} `), person.name).toBe(true);
        for (const person of of("BRN"))
            expect(person.name, person.name).toMatch(genderOf(person) === "feminine" ? / binti / : / bin /);
        for (const person of of("MRT"))
            expect(person.name, person.name).toMatch(genderOf(person) === "feminine" ? / Mint / : / Ould /);
        // Ethiopia's second name is the father's: the men's given names the bank counted.
        const ethiopian = nameGroupById("ethiopian");
        expect(ethiopian.form).toBe("patronymic");
        const fathers = new Set(ethiopian.surname);
        for (const person of of("ETH"))
            expect(fathers.has(readAs(person).second), person.name).toBe(true);
        for (const person of of("MMR"))
            expect(person.name, person.name).not.toMatch(/\b(?:John|Peter|Tony|William|Robert|Smith)\b/);
    });
    it("names each monarch and heir for the house, and a nation of several traditions' lead chair for the one that holds it", () => {
        for (const pool of pools.values()) {
            for (const [nation, house] of Object.entries(ROYAL_HOUSES)) {
                const bench = leadBench(pool, nation);
                expect(bench.length, nation).toBeGreaterThan(0);
                for (const person of bench) {
                    expect(person.name.endsWith(` ${house.house}`), `${nation} ${person.name}`).toBe(true);
                    if (house.nasab)
                        expect(person.name, `${nation} ${person.name}`).toMatch(/ bin /);
                }
            }
            for (const nation of ["ZAF", "MYS", "NGA"]) {
                for (const person of leadBench(pool, nation))
                    expect(readAs(person)?.group.id, `${nation} ${person.name}`).toBe(CROSSED[nation].lead);
            }
        }
    });
    it("gives every surname the form its carrier's sex takes, where the language inflects it", () => {
        const disagreeing = foreign().filter((person) => {
            const nation = person.nationality;
            const culture = nameCultureFor(nation);
            if (!hasGenderedSurnames(nation, culture))
                return false;
            const read = readAs(person);
            if (!read)
                return true;
            const forms = (gender) => new Set(read.group.surname.map((base) => surnameFor(nation, culture, base, gender)));
            return genderOf(person) === "feminine"
                ? forms("masculine").has(read.second) && !forms("feminine").has(read.second)
                : forms("feminine").has(read.second) && !forms("masculine").has(read.second);
        });
        expect(disagreeing.map((person) => `${person.nationality} ${person.name}`)).toEqual([]);
        const women = foreign().filter((person) => person.nationality === "RUS" && genderOf(person) === "feminine");
        expect(women.length).toBeGreaterThan(0);
    });
    it("names Iceland's people for a parent: -dóttir for a daughter, -son for a son", () => {
        const icelanders = foreign().filter((person) => person.nationality === "ISL");
        for (const person of icelanders) {
            expect(person.name, person.id).toMatch(genderOf(person) === "feminine" ? /dóttir$/ : /son$/);
        }
    });
    it("carries no officeholder's name anywhere in the cast, the American bench included", () => {
        expect(everyone().filter((person) => carriesRealName(person.name)).map((person) => `${person.nationality} ${person.name}`)).toEqual([]);
        expect(everyone().filter((person) => person.nationality === "USA").length).toBeGreaterThan(500);
    });
    it("gives no one outside a royal house the rare family name of anyone who has led their country", () => {
        const carrying = foreign().filter((person) => {
            const nation = person.nationality;
            if (royalHouseFor(nation, person.eligibleRoles[0]))
                return false;
            const read = readAs(person);
            return !namesByFather(read.group.form) && carriesLeaderSurname(nation, read.second);
        });
        expect(carrying.map((person) => `${person.nationality} ${person.name}`)).toEqual([]);
    });
});
describe("one draw per person", () => {
    afterEach(() => {
        vi.resetModules();
        vi.doUnmock("@admin/world");
    });
    /**
     * The same world drawn with the table switched off. Traits are drawn after
     * the age and the portrait's heritage after the ticket, so if holding an
     * incumbent to their band and their party took one draw more or one draw
     * fewer, both would come out different; they come out the same.
     */
    it("holds a leader to the table without moving any draw after the ones it sets", async () => {
        vi.doMock("@admin/world", async (importOriginal) => {
            const original = await importOriginal();
            return {
                ...original,
                NATION_LEADER_CONSTRAINTS: {},
                leaderConstraintFor: () => undefined,
                nationGenderPriorFor: () => undefined,
                genderWeightsFor: (nation, role, party) => nation === "USA" ? original.genderWeightsFor(nation, role, party) : original.PortraitGenderPresentation.options.map((value) => ({ value, weight: original.GENDER_WEIGHTS[value] })),
            };
        });
        vi.resetModules();
        const unconstrained = await import("./people.js");
        const free = unconstrained.generateWorldPool(worldDataset.nations, personPoolSpecs, createRngStreams(makeCampaignSeed(SEEDS[0])), worldDataset.charters);
        const freeById = new Map(free.map((person) => [person.id, person]));
        let heldToTable = 0;
        for (const row of ROWS) {
            const id = personIdFor(row.nation, nationLeadRole(row.nation), 0);
            const held = pools.get(SEEDS[0]).find((person) => person.id === id);
            const loose = freeById.get(id);
            expect(held.traits, id).toEqual(loose.traits);
            expect(parsePortraitRef(held.portraitRef).heritage, id).toBe(parsePortraitRef(loose.portraitRef).heritage);
            if (held.age !== loose.age || held.party !== loose.party || held.portraitRef !== loose.portraitRef)
                heldToTable += 1;
        }
        // The comparison is only a proof if the table actually moved something.
        expect(heldToTable).toBeGreaterThan(150);
    });
});
