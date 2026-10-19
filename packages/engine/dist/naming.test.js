import { afterEach, describe, expect, it, vi } from "vitest";
import { ROYAL_HOUSES, nameCultureFor, nameGroupById, nationNameBank, surnameFor } from "@admin/world";
import { drawName, newNameLedger } from "./naming.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
const feminine = (nation, surname) => surnameFor(nation, nameCultureFor(nation), surname, "feminine");
const masculine = (nation, surname) => surnameFor(nation, nameCultureFor(nation), surname, "masculine");
describe("a surname in the form its carrier takes", () => {
    it.each([
        ["RUS", "Ivanov", "Ivanova"],
        ["RUS", "Kalinin", "Kalinina"],
        ["UKR", "Shevchenko", "Shevchenko"],
        ["UKR", "Voloshyn", "Voloshyna"],
        ["POL", "Kowalski", "Kowalska"],
        ["POL", "Nowak", "Nowak"],
        ["CZE", "Novák", "Nováková"],
        ["CZE", "Novotný", "Novotná"],
        ["CZE", "Svoboda", "Svobodová"],
        ["CZE", "Hájek", "Hájková"],
        ["CZE", "Vaněk", "Vaňková"],
        ["CZE", "Němec", "Němcová"],
        ["CZE", "Havel", "Havlová"],
        ["CZE", "Krejčí", "Krejčí"],
        ["LTU", "Petrauskas", "Petrauskienė"],
        ["LTU", "Marcinkevičius", "Marcinkevičienė"],
        ["LVA", "Bērziņš", "Bērziņa"],
        ["LVA", "Jansons", "Jansone"],
        ["LVA", "Briedis", "Briede"],
        ["GRC", "Papadopoulos", "Papadopoulou"],
        ["GRC", "Ioannidis", "Ioannidi"],
        ["CYP", "Nicolaides", "Nicolaidou"],
        ["GRC", "Georgiou", "Georgiou"],
        ["BGR", "Georgiev", "Georgieva"],
        ["MKD", "Georgievski", "Georgievska"],
        ["AZE", "Aliyev", "Aliyeva"],
        ["KAZ", "Akhmetov", "Akhmetova"],
        ["UKR", "Kovalskyi", "Kovalska"],
        ["UKR", "Chornyi", "Chorna"],
        ["UKR", "Kovalchuk", "Kovalchuk"],
        ["TKM", "Atayew", "Atayewa"],
        ["TJK", "Saidzoda", "Saidzoda"],
    ])("%s: %s becomes %s for a woman, and stays itself for a man", (nation, base, form) => {
        expect(feminine(nation, base)).toBe(form);
        expect(masculine(nation, base)).toBe(base);
    });
    it("leaves a language that does not inflect surnames alone", () => {
        expect(feminine("DEU", "Becker")).toBe("Becker");
        expect(feminine("TUR", "Yılmaz")).toBe("Yılmaz");
    });
    it("builds an Icelander's surname on the father's name, as a son or a daughter", () => {
        expect(masculine("ISL", "Jóns")).toBe("Jónsson");
        expect(feminine("ISL", "Jóns")).toBe("Jónsdóttir");
        expect(feminine("ISL", "Árna")).toBe("Árnadóttir");
    });
});
describe("the bank a nation is named from", () => {
    const bank = (nation) => nationNameBank(nation, nameCultureFor(nation));
    it("names a Pakistani only from the Muslim run of the south-asian bank", () => {
        const [muslim, ...rest] = bank("PAK").groups;
        expect(rest).toEqual([]);
        expect(muslim.surname).toContain("Qureshi");
        expect(muslim.surname).not.toContain("Sharma");
        expect(muslim.given.masculine).not.toContain("Rahul");
    });
    it("splits India's bank by tradition, and keeps Kaur off a surname a man could draw", () => {
        const groups = bank("IND").groups;
        expect(groups).toHaveLength(3);
        for (const group of groups)
            expect(group.surname).not.toContain("Kaur");
    });
    it("gives Sweden -sson, Norway and Denmark -sen, and Iceland patronymics of its own", () => {
        const surnames = (nation) => bank(nation).groups.flatMap((group) => group.surname);
        expect(surnames("SWE").some((name) => name.endsWith("sen"))).toBe(false);
        expect(surnames("NOR").some((name) => name.endsWith("sson"))).toBe(false);
        expect(surnames("DNK").some((name) => name.endsWith("sson"))).toBe(false);
        expect(surnames("SWE").some((name) => /dottir$/.test(name))).toBe(false);
        expect(bank("ISL").groups[0].given.feminine).toContain("Guðrún");
    });
});
describe("drawName", () => {
    afterEach(() => {
        vi.resetModules();
        vi.doUnmock("@admin/world");
    });
    const subject = { nation: "TUR", culture: "turkish", gender: "masculine" };
    const draw = (fn) => fn(createRngStreams(makeCampaignSeed("guard")).stream("names", "TUR", "role-president", 0), subject, newNameLedger());
    it("refuses a name the real-name guard flags, and draws another from the same stream", async () => {
        const unguarded = draw(drawName);
        vi.doMock("@admin/world", async (importOriginal) => ({
            ...(await importOriginal()),
            carriesRealName: (name) => name === unguarded,
        }));
        vi.resetModules();
        const { drawName: guarded } = await import("./naming.js");
        const second = draw(guarded);
        expect(second).not.toBe(unguarded);
        expect(draw(guarded)).toBe(second);
    });
    it("never falls back to a flagged name, even when every attempt is flagged but one", async () => {
        const allowed = new Set();
        vi.doMock("@admin/world", async (importOriginal) => ({
            ...(await importOriginal()),
            carriesRealName: (name) => {
                if (allowed.size === 0 && name.endsWith("Kaya"))
                    allowed.add(name);
                return !allowed.has(name);
            },
        }));
        vi.resetModules();
        const { drawName: guarded } = await import("./naming.js");
        const name = draw(guarded);
        expect(allowed.has(name)).toBe(true);
    });
});
describe("a name in the order and form its tradition writes it", () => {
    const stream = (seed) => createRngStreams(makeCampaignSeed(seed)).stream("names", "X", "role-x", 0);
    const drawn = (subject, seed = "forms") => drawName(stream(seed), subject, newNameLedger());
    it("writes a Chinese name family name first", () => {
        const han = nameGroupById("han");
        for (const seed of ["a", "b", "c", "d"]) {
            const name = drawn({ nation: "CHN", culture: "han", gender: "masculine" }, seed);
            expect(han.surname, name).toContain(name.split(" ")[0]);
            expect(han.given.masculine, name).toContain(name.split(" ").slice(1).join(" "));
        }
    });
    it("names a Malay by the father, with bin for a son and binti for a daughter", () => {
        expect(drawn({ nation: "BRN", culture: "malay", gender: "masculine" })).toMatch(/^\S+ bin \S+$/);
        expect(drawn({ nation: "BRN", culture: "malay", gender: "feminine" })).toMatch(/^\S+ binti \S+$/);
    });
    it("names a Mauritanian Ould or Mint and the father's name", () => {
        expect(drawn({ nation: "MRT", culture: "mauritanian", gender: "masculine" })).toMatch(/ Ould /);
        expect(drawn({ nation: "MRT", culture: "mauritanian", gender: "feminine" })).toMatch(/ Mint /);
    });
    it("names a Gulf monarch for his father and the house, and a European one for the house alone", () => {
        const gulf = drawn({ nation: "SAU", culture: "gulf-arabic", gender: "masculine", royalHouse: ROYAL_HOUSES.SAU });
        expect(gulf).toMatch(/^\S+ bin \S+ Al Saud$/);
        expect(drawn({ nation: "MCO", culture: "french", gender: "masculine", royalHouse: ROYAL_HOUSES.MCO })).toMatch(/^\S+ Grimaldi$/);
    });
});
describe("the leader-surname guard", () => {
    afterEach(() => {
        vi.resetModules();
        vi.doUnmock("@admin/world");
    });
    const draw = (fn, subject) => fn(createRngStreams(makeCampaignSeed("surnames")).stream("names", subject.nation, "role-x", 0), subject, newNameLedger());
    it("refuses a family name one of the country's leaders carried, and draws another", async () => {
        const subject = { nation: "POL", culture: "polish", gender: "masculine" };
        const unguarded = draw(drawName, subject);
        const family = unguarded.split(" ").slice(1).join(" ");
        vi.doMock("@admin/world", async (importOriginal) => ({
            ...(await importOriginal()),
            carriesLeaderSurname: (nation, surname) => nation === "POL" && surname === family,
        }));
        vi.resetModules();
        const { drawName: guarded } = await import("./naming.js");
        expect(draw(guarded, subject).endsWith(` ${family}`)).toBe(false);
    });
    // A father's given name is not a family name, so a patronymic tradition is
    // never refused one: two Ethiopians whose fathers share a name are not kin.
    it("leaves a father's name and a royal house alone", async () => {
        vi.doMock("@admin/world", async (importOriginal) => ({
            ...(await importOriginal()),
            carriesLeaderSurname: () => true,
        }));
        vi.resetModules();
        const { drawName: guarded } = await import("./naming.js");
        const ethiopian = draw(guarded, { nation: "ETH", culture: "ethiopian", gender: "masculine" });
        expect(nameGroupById("ethiopian").surname).toContain(ethiopian.split(" ").slice(1).join(" "));
        expect(draw(guarded, { nation: "QAT", culture: "gulf-arabic", gender: "masculine", royalHouse: ROYAL_HOUSES.QAT })).toMatch(/ Al Thani$/);
    });
});
