import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { apply } from "./effects.js";
import { createSave, loadSave } from "./save.js";
import { dispositionTarget } from "./congress.js";
import { dismissMinister } from "./appointments.js";
import { selectCabinetHolder } from "./state-selectors.js";
import { isMatterOpen, matterSource, oversightRipeningPhase, selectOpenMatters, selectOversightPressure, } from "./oversight.js";
import { attorneyGeneralRole, counselDismissalEffects, projectCounselObstruction, selectOpenSpecialCounsel, specialCounselPhase, superviseSpecialCounsel, } from "./special-counsel.js";
const seed = makeCampaignSeed("special-counsel-seed");
function foundedCampaign() {
    const pool = generateFoundingPool(seed, worldDataset);
    const nation = worldDataset.nations.find((n) => n.playable);
    const charter = worldDataset.charters[0];
    const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0);
    const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]));
    const choices = {
        nationId: nation.id,
        nationName: nation.identity.name,
        name: "Test President",
        title: "President",
        charterId: charter.id,
        cradleId: cradle.id,
        flag: defaultFlagDesign,
        compactIds: [],
        cabinet,
        leader: { ...defaultLeaderDraft(), name: "Test President" },
    };
    return sealFounding(seed, worldDataset, choices);
}
const campaign = foundedCampaign();
/** A removal notice's own aftermath: public, obstructed, and reported on. */
function ripeMatter(overrides = {}) {
    return {
        id: "matter:ig:INST-DHS:4",
        origin: { kind: "inspector-general", institution: "INST-DHS" },
        direction: "received",
        subject: "the removal of the inspector general at the Department of Homeland Security while an audit was open",
        openedTurn: 4,
        stage: "reported",
        public: true,
        obstructed: true,
        beats: [],
        ...overrides,
    };
}
function withMatters(state, matters) {
    return { ...state, oversight: { ...state.oversight, matters } };
}
function runPhase(state, phase) {
    return phase(state).reduce((acc, packet) => apply(acc, packet), state);
}
describe("the counsel the Attorney General appoints", () => {
    it("is appointed out of a matter that is public, obstructed and reported, and names it", () => {
        const predicate = ripeMatter();
        const appointed = runPhase(withMatters(campaign, [predicate]), specialCounselPhase);
        const counsel = selectOpenSpecialCounsel(appointed);
        expect(counsel).toHaveLength(1);
        expect(counsel[0].origin).toEqual({ kind: "special-counsel", predicate: predicate.id });
        expect(counsel[0].subject).toContain(predicate.subject);
        expect(counsel[0].direction).toBe("received");
        // No quiet window. The department is appointing a prosecutor because it can
        // no longer be seen handling this itself.
        expect(counsel[0].public).toBe(true);
        expect(matterSource(counsel[0])).toBe("The Office of the Special Counsel");
    });
    it("notifies the Judiciary Committee the day it is made", () => {
        const appointed = runPhase(withMatters(campaign, [ripeMatter()]), specialCounselPhase);
        const notice = appointed.feed.find((item) => item.headline.includes("special counsel"));
        expect(notice?.headline).toContain("Committee on the Judiciary");
        expect(notice?.visibility).toBe("public");
    });
    it("waits for the bar rather than for a suspicion", () => {
        for (const unripe of [
            ripeMatter({ stage: "gathering" }),
            ripeMatter({ obstructed: false }),
            ripeMatter({ public: false }),
            ripeMatter({ direction: "directed" }),
            ripeMatter({ stage: "closed", closedTurn: 20 }),
        ]) {
            expect(specialCounselPhase(withMatters(campaign, [unripe]))).toEqual([]);
        }
    });
    it("appoints one at a time, and never twice out of the same matter", () => {
        const predicate = ripeMatter();
        const once = runPhase(withMatters(campaign, [predicate]), specialCounselPhase);
        const again = runPhase({ ...once, turn: once.turn + 1 }, specialCounselPhase);
        expect(selectOpenSpecialCounsel(again)).toHaveLength(1);
        // And with the first one finished, the same predicate does not get a second.
        const finished = withMatters(again, [
            predicate,
            ...selectOpenSpecialCounsel(again).map((matter) => ({ ...matter, stage: "closed", closedTurn: 30 })),
        ]);
        expect(specialCounselPhase({ ...finished, turn: 31 })).toEqual([]);
    });
    it("is not appointed at all with nobody in the Attorney General's chair", () => {
        const role = attorneyGeneralRole();
        const vacant = {
            ...withMatters(campaign, [ripeMatter()]),
            player: {
                ...campaign.player,
                cabinet: Object.fromEntries(Object.entries(campaign.player.cabinet).filter(([seat]) => seat !== role)),
            },
        };
        expect(specialCounselPhase(vacant)).toEqual([]);
    });
    it("runs on the same clock as everything else on the board", () => {
        let state = runPhase(withMatters(campaign, [ripeMatter()]), specialCounselPhase);
        const id = selectOpenSpecialCounsel(state)[0].id;
        const seen = [];
        for (let week = 0; week < 30; week += 1) {
            state = { ...state, turn: state.turn + 1 };
            state = oversightRipeningPhase(state).reduce((acc, packet) => apply(acc, packet), state);
            const current = state.oversight.matters.find((matter) => matter.id === id);
            if (seen.at(-1) !== current.stage)
                seen.push(current.stage);
        }
        expect(seen).toEqual(["opened", "gathering", "reported", "closed"]);
    });
});
describe("what a counsel costs that an ordinary inquiry does not", () => {
    it("weighs more on the chamber at the same stage", () => {
        const ordinary = ripeMatter({ id: "matter:ig:INST-DHS:9", obstructed: false });
        const counsel = {
            ...ordinary,
            id: "matter:counsel:9|matter:ig:INST-DHS:4",
            origin: { kind: "special-counsel", predicate: "matter:ig:INST-DHS:4" },
        };
        const underOrdinary = selectOversightPressure(withMatters(campaign, [ordinary]));
        const underCounsel = selectOversightPressure(withMatters(campaign, [counsel]));
        expect(underCounsel).toBeGreaterThan(underOrdinary);
        // Modest, not a different currency: the facts that got it appointed are
        // still what most of the pressure is made of.
        expect(underCounsel).toBeLessThan(underOrdinary * 2);
        expect(dispositionTarget(withMatters(campaign, [counsel]))).toBeLessThan(dispositionTarget(withMatters(campaign, [ordinary])));
    });
});
describe("the one move the President has left", () => {
    const appointed = runPhase(withMatters(campaign, [ripeMatter()]), specialCounselPhase);
    const role = attorneyGeneralRole();
    it("prices emptying the chair before it is emptied", () => {
        const price = projectCounselObstruction(appointed, role);
        expect(price?.counsel).toHaveLength(1);
        expect(price?.reasoning).toContain("does not close it");
        // And says nothing about a seat that has no counsel behind it.
        expect(projectCounselObstruction(campaign, role)).toBeUndefined();
        const otherSeat = Object.keys(appointed.player.cabinet).find((seat) => seat !== role);
        expect(projectCounselObstruction(appointed, otherSeat)).toBeUndefined();
    });
    it("marks the counsel obstructed for good, and does not stop it", () => {
        const attorneyGeneral = selectCabinetHolder(appointed, role);
        const fired = dismissMinister(appointed, role);
        if (!fired.ok)
            throw new Error("the Attorney General should be dismissible");
        const after = apply(appointed, fired.packet);
        const counsel = selectOpenSpecialCounsel(after)[0];
        expect(counsel.obstructed).toBe(true);
        expect(isMatterOpen(counsel)).toBe(true);
        expect(counsel.beats.at(-1).description).toContain(attorneyGeneral.base.name);
        expect(after.congress.disposition).toBeLessThan(appointed.congress.disposition);
        expect(selectOversightPressure(after)).toBeGreaterThan(selectOversightPressure(appointed));
        expect(after.feed.at(-1).headline).toContain("Committee on the Judiciary");
        expect(fired.packet.narration.summary).toContain("The counsel does not stop.");
    });
    it("costs nothing extra on any other chair, or on the same chair with nothing sitting", () => {
        const otherSeat = Object.keys(appointed.player.cabinet).find((seat) => seat !== role);
        expect(counselDismissalEffects(appointed, otherSeat, "Somebody")).toEqual([]);
        expect(counselDismissalEffects(campaign, role, "Somebody")).toEqual([]);
    });
    it("leaves no presidential route to closing the matter itself", () => {
        const fired = dismissMinister(appointed, role);
        if (!fired.ok)
            throw new Error("the Attorney General should be dismissible");
        const after = apply(appointed, fired.packet);
        // Weeks later, with the chair still empty, the counsel is still on the board.
        let state = after;
        for (let week = 0; week < 8; week += 1) {
            state = { ...state, turn: state.turn + 1 };
            state = oversightRipeningPhase(state).reduce((acc, packet) => apply(acc, packet), state);
        }
        expect(selectOpenMatters(state).some((matter) => matter.origin.kind === "special-counsel")).toBe(true);
    });
});
describe("the save", () => {
    it("carries a sitting counsel forward without a new field to carry it in", () => {
        const appointed = runPhase(withMatters(campaign, [ripeMatter()]), specialCounselPhase);
        const reloaded = loadSave(createSave(appointed));
        expect(reloaded.oversight).toEqual(appointed.oversight);
        expect(selectOpenSpecialCounsel(reloaded)).toHaveLength(1);
    });
});
describe("supervision by the Attorney General under 28 C.F.R. 600.7", () => {
    const sitting = () => selectOpenSpecialCounsel(runPhase(withMatters(campaign, [ripeMatter()]), specialCounselPhase))[0];
    function withAttorneyGeneral(state, integrity, loyalty, trait) {
        const id = state.player.cabinet[attorneyGeneralRole()];
        const person = state.people[id];
        return { ...state, people: { ...state.people, [id]: { ...person, base: { ...person.base, integrity, loyalty, traits: [trait] } } } };
    }
    function seated(trait) {
        const counsel = sitting();
        const state = withAttorneyGeneral(withMatters(campaign, [ripeMatter(), counsel]), trait === "principled" ? 1 : 0.05, trait === "principled" ? 0.2 : 1, trait);
        return { state, counsel };
    }
    it("refuses a counsel that is not sitting", () => {
        const result = superviseSpecialCounsel(campaign, { kind: "remove", matterId: "matter:nothing", ground: "misconduct" });
        expect(result.ok).toBe(false);
    });
    it("has a principled Attorney General decline to remove a counsel looking into the administration, leaving the counsel sitting", () => {
        const { state, counsel } = seated("principled");
        const result = superviseSpecialCounsel(state, { kind: "remove", matterId: counsel.id, ground: "policy-violation" });
        if (!result.ok)
            throw new Error(result.reason);
        expect(result.packet.effects.some((effect) => effect.kind === "congress")).toBe(false);
        const after = apply(state, result.packet);
        expect(selectOpenSpecialCounsel(after)).toHaveLength(1);
        expect(after.congress.disposition).toBe(state.congress.disposition);
    });
    it("has a deferential Attorney General remove the counsel for a listed cause, which closes the matter, marks it obstructed and tells the Hill", () => {
        const { state, counsel } = seated("corrupt");
        const result = superviseSpecialCounsel(state, { kind: "remove", matterId: counsel.id, ground: "conflict-of-interest" });
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(state, result.packet);
        expect(selectOpenSpecialCounsel(after)).toHaveLength(0);
        const closed = after.oversight.matters.find((matter) => matter.id === counsel.id);
        expect(closed.obstructed).toBe(true);
        expect(closed.public).toBe(true);
        expect(closed.beats.at(-1).description).toContain("Judiciary Committees");
        expect(after.congress.disposition).toBeLessThan(state.congress.disposition);
    });
    it("prices a countermand below a removal and leaves the counsel sitting", () => {
        const { state, counsel } = seated("corrupt");
        const countermand = superviseSpecialCounsel(state, { kind: "countermand", matterId: counsel.id });
        const removal = superviseSpecialCounsel(state, { kind: "remove", matterId: counsel.id, ground: "misconduct" });
        if (!countermand.ok || !removal.ok)
            throw new Error("both acts should be answered");
        const countermanded = apply(state, countermand.packet);
        expect(selectOpenSpecialCounsel(countermanded)).toHaveLength(1);
        expect(countermanded.congress.disposition).toBeGreaterThan(apply(state, removal.packet).congress.disposition);
        expect(countermanded.oversight.matters.find((matter) => matter.id === counsel.id).beats.at(-1).description).toContain("tell Congress when the investigation ends");
    });
    it("reads the authoritative chair, not a stale acting record", () => {
        const { state, counsel } = seated("corrupt");
        const role = attorneyGeneralRole();
        const cabinet = Object.fromEntries(Object.entries(state.player.cabinet).filter(([seat]) => seat !== role));
        const stale = { ...state, player: { ...state.player, cabinet }, actings: { ...state.actings, [role]: state.player.cabinet[role] } };
        expect(superviseSpecialCounsel(stale, { kind: "countermand", matterId: counsel.id }).ok).toBe(false);
    });
    it("has no answer with no Attorney General in post", () => {
        const { state, counsel } = seated("corrupt");
        const role = attorneyGeneralRole();
        const vacant = { ...state, player: { ...state.player, cabinet: Object.fromEntries(Object.entries(state.player.cabinet).filter(([seat]) => seat !== role)) } };
        expect(superviseSpecialCounsel(vacant, { kind: "countermand", matterId: counsel.id }).ok).toBe(false);
    });
});
