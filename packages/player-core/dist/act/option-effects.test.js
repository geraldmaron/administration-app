import { describe, expect, it } from "vitest";
import { ENGAGEMENT_TERMS, TREATY_TERMS } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { actOption } from "./catalogue";
import { parseActConfig, actSearchOf } from "./config";
import { EFFECT_SCALE, optionEffects } from "./option-effects";
import { actWorkspace } from "./workspace";
const campaign = openingCampaign({ seedText: "act-workspace" });
const CHN = "CHN";
const allOptions = (view) => view.families.flatMap((family) => family.options);
describe("what each option moves", () => {
    it("draws every option on the one scale a mutual defense treaty sets", () => {
        expect(EFFECT_SCALE).toBe(Math.max(...Object.values(TREATY_TERMS.alliance.effect).map(Math.abs)));
        const alliance = optionEffects(campaign, CHN, actOption("treaty-alliance"));
        expect(Math.max(...alliance.marks.map((mark) => mark.share))).toBe(1);
        const call = optionEffects(campaign, CHN, actOption("engagement-call"));
        const callTrust = call.marks.find((mark) => mark.key === "ourTrust");
        expect(callTrust.share).toBeLessThan(alliance.marks.find((mark) => mark.key === "ourTrust").share);
        expect(callTrust.word).toMatch(/^Rises /);
    });
    it("reads a meeting off the engine's own terms, and still says what a locked one would do", () => {
        const view = actWorkspace(campaign, CHN, { goal: "ties" });
        const declaration = allOptions(view).find((entry) => entry.option.id === "engagement-declaration");
        expect(declaration.preview.state).toBe("held");
        const aims = declaration.effects.marks.find((mark) => mark.key === "alignment");
        expect(aims.delta).toBeGreaterThan(0);
        expect(aims.delta).toBeLessThanOrEqual(ENGAGEMENT_TERMS.declaration.warmth.alignment * 1.2);
        expect(declaration.effects.when).toBe("If they accept");
    });
    it("reads an aid rung off its success effects, their side only where only their side moves", () => {
        const relief = optionEffects(campaign, CHN, actOption("assistance-1"));
        expect(relief.when).toBe("If it works");
        expect(relief.marks.find((mark) => mark.key === "theirTrust")?.good).toBe(true);
        expect(relief.marks.some((mark) => mark.key === "ourTrust")).toBe(false);
    });
});
describe("what a locked option waits on", () => {
    const view = actWorkspace(campaign, CHN, { goal: "ties" });
    const entry = (id) => allOptions(view).find((option) => option.option.id === id);
    it("names the treaty's floor on our own trust, where it stands, and the open acts that build it", () => {
        const trade = entry("treaty-trade");
        expect(trade.preview.state).toBe("held");
        const [requirement] = trade.prerequisite.requirements;
        expect(requirement.reading).toBe("ourTrust");
        expect(requirement.need).toBe(TREATY_TERMS.trade.minTrust);
        expect(requirement.have).toBeLessThan(requirement.need);
        expect(requirement.met).toBe(false);
        const builders = trade.prerequisite.builders;
        expect(builders.length).toBeGreaterThan(0);
        expect(builders.every((builder) => entry(builder.option.id).preview.state === "open")).toBe(true);
        expect(builders.every((builder) => (builder.steps.ourTrust ?? 0) > 0)).toBe(true);
        expect(trade.prerequisite.line).toContain(builders[0].option.name);
    });
    it("says a summit's call for tension is not something to build", () => {
        const calm = actWorkspace(campaign, "GBR", { goal: "ties" });
        const summit = allOptions(calm).find((option) => option.option.id === "engagement-summit");
        expect(summit.prerequisite?.buildable).toBe(false);
        expect(summit.prerequisite?.builders).toEqual([]);
    });
    it("leaves an open option without a prerequisite", () => {
        expect(entry("engagement-call").prerequisite).toBeUndefined();
    });
});
describe("comparing options and returning to a locked one", () => {
    it("keeps the compared options and the option to return to in the address", () => {
        const config = parseActConfig({ goal: "ties", compare: "engagement-call,treaty-trade,nonsense,engagement-call", then: "treaty-trade" });
        expect(config.compare).toEqual(["engagement-call", "treaty-trade"]);
        expect(config.then).toBe("treaty-trade");
        expect(parseActConfig({ then: "nonsense" }).then).toBeUndefined();
        expect(actSearchOf(config)).toMatchObject({ compare: "engagement-call,treaty-trade", then: "treaty-trade" });
    });
    it("reads each compared option against doing nothing, in the order they were added", () => {
        const view = actWorkspace(campaign, CHN, { goal: "ties", compare: ["treaty-trade", "engagement-call"], then: "treaty-trade" });
        expect(view.compared.map((entry) => entry.option.id)).toEqual(["treaty-trade", "engagement-call"]);
        expect(view.compared[1].assessment.rows[0].label).toBe("What it does");
        expect(view.compared[0].prerequisite).toBeDefined();
        expect(view.then?.option.id).toBe("treaty-trade");
    });
});
describe("what force rungs start", () => {
    const opening = openingCampaign({ seedText: "act-workspace" });
    const BLR = "BLR";
    it("reads the military pressure an exercise puts on the pair, written on our side of it", () => {
        const marks = optionEffects(opening, BLR, actOption("military-1"))?.marks ?? [];
        expect(marks.find((mark) => mark.key === "threat")?.delta).toBeGreaterThan(0);
    });
    it("says when a deployment starts the War Powers clock", () => {
        const notes = optionEffects(opening, BLR, actOption("military-2"))?.notes ?? [];
        expect(notes.some((note) => note.startsWith("Starts the War Powers clock"))).toBe(true);
    });
});
