import { describe, expect, it } from "vitest";
import { ALL_NAME_BANKS, nameGroupById, nationNameBank } from "./name-cultures.js";
import { composeName, readName, royalName, ROYAL_HOUSES } from "./name-forms.js";
import { REGIONAL_NAME_BANKS } from "./name-banks-regional.js";
import { nameCultureFor } from "./people.js";
import { NATION_LEADER_CONSTRAINTS } from "./nation-leaders.generated.js";
describe("how a tradition writes a name", () => {
    it("puts each form's words in its order", () => {
        expect(composeName(undefined, "Given", "Family", "masculine")).toBe("Given Family");
        expect(composeName("family-given", "Given", "Family", "feminine")).toBe("Family Given");
        expect(composeName("malay-patronymic", "Given", "Father", "masculine")).toBe("Given bin Father");
        expect(composeName("malay-patronymic", "Given", "Father", "feminine")).toBe("Given binti Father");
        expect(composeName("mauritanian-patronymic", "Given", "Father", "feminine")).toBe("Given Mint Father");
        expect(royalName({ house: "Al Example", nasab: true }, "Given", "Father")).toBe("Given bin Father Al Example");
        expect(royalName({ house: "Example", nasab: false }, "Given", "Father")).toBe("Given Example");
    });
    it("reads a written name back into its tradition, and refuses one no tradition can write", () => {
        const han = nameGroupById("han");
        // A syllable can be a family name and a given name both; pick one that is only each.
        const given = han.given.masculine.find((name) => !han.surname.includes(name));
        const family = han.surname.find((name) => !han.given.masculine.includes(name));
        const name = composeName(han.form, given, family, "masculine");
        const read = readName(name, [han], "masculine", (_group, drawn) => drawn);
        expect(read?.given).toBe(given);
        expect(read?.second).toBe(family);
        expect(readName(`${given} ${family}`, [han], "masculine", (_group, drawn) => drawn)).toBeUndefined();
    });
    it("seats a royal house only where the lead chair is a monarch's or an heir's", () => {
        for (const nation of Object.keys(ROYAL_HOUSES)) {
            const row = NATION_LEADER_CONSTRAINTS[nation];
            expect(row.regime, nation).toMatch(/monarchy/);
        }
    });
});
describe("the traditions split out of shared banks", () => {
    it("names Russia without the Ukrainian family names it once shared a bank with", () => {
        const russian = ALL_NAME_BANKS.russian.groups[0];
        expect(russian.surname.filter((name) => /(?:enko|chuk|uk)$/.test(name))).toEqual([]);
        expect(nationNameBank("UKR", nameCultureFor("UKR")).groups.map((group) => group.id)).toEqual(["ukrainian"]);
    });
    it("gives every split tradition an id and the floors every bank keeps", () => {
        for (const [culture, bank] of Object.entries(REGIONAL_NAME_BANKS)) {
            for (const group of bank.groups) {
                expect(group.id, culture).toBeDefined();
                expect(group.given.masculine.length, culture).toBeGreaterThanOrEqual(60);
                expect(group.given.feminine.length, culture).toBeGreaterThanOrEqual(60);
                expect(group.surname.length, culture).toBeGreaterThanOrEqual(60);
            }
        }
    });
    it("writes the table's surname rule as the lead tradition's form", () => {
        expect(nameGroupById("malay").form).toBe("malay-patronymic");
        expect(nameGroupById("han").form).toBe("family-given");
        expect(nameGroupById("tigrinya").form).toBe("patronymic");
        expect(nameGroupById("mauritanian").form).toBe("mauritanian-patronymic");
        expect(NATION_LEADER_CONSTRAINTS.MYS.nameForm).toBe("malay-patronymic");
        expect(NATION_LEADER_CONSTRAINTS.CHN.nameForm).toBe("family-given");
        // Hungarian writes the family name first; every English-language page, and every screen here, writes it last.
        expect(NATION_LEADER_CONSTRAINTS.HUN.nameForm).toBe("given-family");
    });
});
