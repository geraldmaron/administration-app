import { describe, expect, it } from "vitest";
import { ENGAGEMENT_KINDS, INSTRUMENT_RUNGS, TREATY_TERMS } from "@admin/engine";
import { ACT_GOALS, ACT_OPTIONS, actHref, actOption, familiesOfGoal, goalOfRung, isActGoal, optionForRung, optionsForGoal } from "./catalogue";
// The act workspace's catalogue is the engine's own tables sorted by what the
// President wants. These hold the sorting rule and the completeness of it: a
// rung, a meeting or a treaty the engine has must be reachable under exactly
// one goal.
describe("the catalogue of acts on a foreign government", () => {
    it("lists every instrument rung except the superseded generic tariff, under its goal", () => {
        for (const rung of INSTRUMENT_RUNGS.filter((entry) => entry.id !== "economic-2")) {
            const matches = ACT_OPTIONS.filter((option) => option.ref.kind === "instrument" && option.ref.instrument === rung.instrument && option.ref.rung === rung.rung && option.ref.regimeAct === undefined);
            expect(matches).toHaveLength(1);
            expect(matches[0]?.goal).toBe(goalOfRung(rung.instrument, rung.rung));
            expect(matches[0]?.name).toBe(rung.name);
            expect(matches[0]?.id).toBe(rung.id);
        }
    });
    it("puts every kind of meeting, every kind of treaty and every kind of aid under building ties", () => {
        const ties = optionsForGoal("ties");
        for (const kind of ENGAGEMENT_KINDS)
            expect(ties.some((option) => option.ref.kind === "engagement" && option.ref.engagement === kind)).toBe(true);
        for (const kind of Object.keys(TREATY_TERMS))
            expect(ties.some((option) => option.ref.kind === "treaty" && option.ref.treaty === kind)).toBe(true);
        expect(ties.filter((option) => option.ref.kind === "instrument").every((option) => option.ref.kind === "instrument" && option.ref.instrument === "assistance")).toBe(true);
    });
    it("sorts the economic ladder into trade below the sanctions and pressure from them up", () => {
        expect([1, 2].map((rung) => goalOfRung("economic", rung))).toEqual(["trade", "trade"]);
        expect([3, 4, 5].map((rung) => goalOfRung("economic", rung))).toEqual(["pressure", "pressure", "pressure"]);
        expect(goalOfRung("diplomatic", 1)).toBe("pressure");
        expect(goalOfRung("covert", 5)).toBe("covert");
        expect(goalOfRung("military", 1)).toBe("force");
    });
    it("puts the sector tariff under trade and the vote for force under force", () => {
        expect(actOption("tariff")?.goal).toBe("trade");
        expect(actOption("authorization")?.goal).toBe("force");
    });
    it("gives every option a unique id that finds it again, and leaves no goal empty", () => {
        const ids = ACT_OPTIONS.map((option) => option.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const option of ACT_OPTIONS)
            expect(actOption(option.id)).toBe(option);
        for (const goal of ACT_GOALS)
            expect(optionsForGoal(goal).length).toBeGreaterThan(0);
        expect(actOption("no-such-act")).toBeUndefined();
    });
    it("reads each goal's options as named runs, gentlest first, and a ladder in its own order", () => {
        expect(familiesOfGoal("ties").map((family) => family.family)).toEqual(["meet", "sign", "assist"]);
        expect(familiesOfGoal("pressure").map((family) => family.family)).toEqual(["diplomatic", "justice", "economic"]);
        expect(familiesOfGoal("force").map((family) => family.family)).toEqual(["military", "congress"]);
        const military = familiesOfGoal("force")[0].options.filter((option) => option.ref.kind !== "instrument" || option.ref.regimeAct === undefined).map((option) => (option.ref.kind === "instrument" ? option.ref.rung : 0));
        expect(military).toEqual([1, 2, 3, 4, 5]);
    });
    it("offers indictment and capture as acts of their own that ride the covert regime slot", () => {
        expect(actOption("indict")?.goal).toBe("pressure");
        expect(actOption("capture")?.goal).toBe("force");
        expect(actOption("capture")?.ref).toEqual({ kind: "instrument", instrument: "covert", rung: 5, regimeAct: "capture" });
        expect(optionForRung("covert", 5)?.id).toBe("covert-5");
    });
    it("finds the option an old instrument address named", () => {
        expect(optionForRung("covert", 3)?.goal).toBe("covert");
        expect(optionForRung("covert", 3)?.ref).toEqual({ kind: "instrument", instrument: "covert", rung: 3 });
    });
    it("routes generic tariff choices into the goods-based tariff without listing a bypass", () => {
        expect(actOption("economic-2")).toBe(actOption("tariff"));
        expect(optionForRung("economic", 2)).toBe(actOption("tariff"));
        expect(ACT_OPTIONS.some((option) => option.id === "economic-2")).toBe(false);
    });
    it("knows a goal from anything else in the address", () => {
        expect(isActGoal("force")).toBe(true);
        expect(isActGoal("military")).toBe(false);
        expect(isActGoal(undefined)).toBe(false);
    });
    it("addresses the workspace with the goal an option implies and the configuration it carries", () => {
        expect(actHref("VEN")).toBe("/world/nation/VEN/act");
        expect(actHref("VEN", { goal: "trade" })).toBe("/world/nation/VEN/act?goal=trade");
        expect(actHref("VEN", { option: "military-2", count: 4 })).toBe("/world/nation/VEN/act?goal=force&option=military-2&count=4");
        expect(actHref("CHN", { option: "tariff", sector: "steel", rate: 25 })).toBe("/world/nation/CHN/act?goal=trade&option=tariff&sector=steel&rate=25");
    });
});
