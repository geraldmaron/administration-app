import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { apply } from "./effects.js";
import { createSave, loadSave } from "./save.js";
import { dispositionTarget } from "./congress.js";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import { igRemovalNoticeTurns, INSPECTED_INSTITUTIONS, foundingOversight, isMatterOpen, matterRipensTurn, matterSource, oversightRipeningPhase, selectInspector, selectMatter, selectMattersFor, selectOpenMatters, selectOversightPressure, } from "./oversight.js";
import { auditWarrant, fileInspectorRemovalNotice, inspectorGeneralPhase, projectInspectorRemoval, selectRemovableInspectors, } from "./inspectors-general.js";
import { committeeForInstitution, committeeForOrderDomain, committeeInquiryPhase, committeeIsInvestigating, selectInquiriesFor, } from "./committee-inquiry.js";
import { selectLiveScandals } from "./press-scandal.js";
import { COMMITTEE_IDS } from "./committees.js";
const seed = makeCampaignSeed("oversight-seed");
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
/** An institution bent far enough that its own auditor would open a file. */
function politicized(state, institution) {
    const runtime = state.institutions[institution];
    return {
        ...state,
        institutions: {
            ...state.institutions,
            [institution]: { ...runtime, politicization: 0.8, integrity: 0.4, oversightPressure: 0.5 },
        },
    };
}
/** Run a phase and fold whatever it produced, the way the turn loop does. */
function runPhase(state, phase) {
    return phase(state).reduce((acc, packet) => apply(acc, packet), state);
}
describe("the auditors the President inherits", () => {
    it("seats one in every standing executive body and none in the other branches", () => {
        const seated = foundingOversight(1);
        expect(INSPECTED_INSTITUTIONS.length).toBeGreaterThan(10);
        expect(Object.keys(seated.inspectors).sort()).toEqual([...INSPECTED_INSTITUTIONS].sort());
        for (const id of INSPECTED_INSTITUTIONS) {
            const def = INSTITUTION_CATALOG.find((candidate) => candidate.id === id);
            expect(def.parent).toBeUndefined();
            expect(["presidency", "legislature", "judiciary", "state-government"]).not.toContain(def.kind);
        }
        expect(seated.matters).toEqual([]);
    });
    it("opens no audit on a government that is running as it was founded", () => {
        for (const institution of INSPECTED_INSTITUTIONS) {
            expect(auditWarrant(campaign.institutions[institution])).toBeLessThan(0.45);
        }
        expect(inspectorGeneralPhase(campaign)).toEqual([]);
    });
    it("opens one on a body the administration has visibly bent, and only one a week", () => {
        const bent = politicized(politicized(campaign, "INST-DOJ"), "INST-DHS");
        const after = runPhase(bent, inspectorGeneralPhase);
        const opened = selectOpenMatters(after);
        expect(opened).toHaveLength(1);
        expect(opened[0].origin).toEqual({ kind: "inspector-general", institution: "INST-DHS" });
        expect(opened[0].direction).toBe("received");
        // Inside the building: an audit costs the President nothing on the week it
        // opens, because nobody outside it knows.
        expect(opened[0].public).toBe(false);
        expect(selectOversightPressure(after)).toBe(0);
    });
    it("does not open a second file on a body it is already auditing", () => {
        const bent = politicized(campaign, "INST-DOJ");
        const once = runPhase(bent, inspectorGeneralPhase);
        const twice = runPhase({ ...once, turn: once.turn + 1 }, inspectorGeneralPhase);
        expect(selectMattersFor(twice, "INST-DOJ")).toHaveLength(1);
    });
});
describe("an audit the President cannot stop", () => {
    const bent = politicized(campaign, "INST-DOJ");
    const opened = runPhase(bent, inspectorGeneralPhase);
    const matter = selectMattersFor(opened, "INST-DOJ")[0];
    it("ripens on its own clock through to a public report and a closed file", () => {
        let state = opened;
        const seen = [];
        for (let week = 0; week < 30; week += 1) {
            state = runPhase({ ...state, turn: state.turn + 1 }, oversightRipeningPhase);
            const current = selectMatter(state, matter.id);
            if (seen.at(-1) !== current.stage)
                seen.push(current.stage);
        }
        expect(seen).toEqual(["opened", "gathering", "reported", "closed"]);
        const finished = selectMatter(state, matter.id);
        expect(finished.public).toBe(true);
        expect(finished.finding).toContain("Office of Inspector General");
        expect(finished.closedTurn).toBeDefined();
        expect(matterRipensTurn(finished)).toBeUndefined();
    });
    it("costs the administration nothing until the report is filed, and then costs it", () => {
        let state = opened;
        let atGathering = 0;
        let atReported = 0;
        for (let week = 0; week < 20; week += 1) {
            state = runPhase({ ...state, turn: state.turn + 1 }, oversightRipeningPhase);
            const stage = selectMatter(state, matter.id).stage;
            if (stage === "gathering")
                atGathering = selectOversightPressure(state);
            if (stage === "reported")
                atReported = selectOversightPressure(state);
        }
        // Gathering is not public on an audit, so the Hill cannot read it yet.
        expect(atGathering).toBe(0);
        expect(atReported).toBeGreaterThan(0);
    });
    it("refuses to let any writer take a public fact back", () => {
        let state = opened;
        for (let week = 0; week < 20; week += 1) {
            state = runPhase({ ...state, turn: state.turn + 1 }, oversightRipeningPhase);
            if (selectMatter(state, matter.id).public)
                break;
        }
        const wasPublic = selectMatter(state, matter.id);
        expect(wasPublic.public).toBe(true);
        const tidied = apply(state, {
            source: "action",
            actor: "player",
            turn: state.turn,
            narration: { summary: "An attempt to unpublish a finding." },
            effects: [{ kind: "oversight", matters: [{ ...wasPublic, public: false }] }],
        });
        expect(selectMatter(tidied, matter.id).public).toBe(true);
    });
});
describe("removing one", () => {
    it("takes thirty days in writing, and the office stays occupied until they run out", () => {
        const filed = fileInspectorRemovalNotice(campaign, "INST-DOJ", "loss of confidence");
        expect(filed.ok).toBe(true);
        if (!filed.ok)
            return;
        const noticed = apply(campaign, filed.packet);
        const inspector = selectInspector(noticed, "INST-DOJ");
        expect(inspector.noticeFiledTurn).toBe(campaign.turn);
        expect(inspector.noticeReasons).toEqual(["loss of confidence"]);
        expect(inspector.removedTurn).toBeUndefined();
        // Still in post the week before the notice runs out.
        const almost = runPhase({ ...noticed, turn: noticed.turn + igRemovalNoticeTurns() - 1 }, inspectorGeneralPhase);
        expect(selectInspector(almost, "INST-DOJ").removedTurn).toBeUndefined();
        const emptied = runPhase({ ...noticed, turn: noticed.turn + igRemovalNoticeTurns() }, inspectorGeneralPhase);
        expect(selectInspector(emptied, "INST-DOJ").removedTurn).toBe(noticed.turn + igRemovalNoticeTurns());
        expect(selectRemovableInspectors(emptied).map((one) => one.institution)).not.toContain("INST-DOJ");
    });
    it("refuses a notice with no reasons, and a second notice on the same office", () => {
        expect(fileInspectorRemovalNotice(campaign, "INST-DOJ", "   ").ok).toBe(false);
        const first = fileInspectorRemovalNotice(campaign, "INST-DOJ", "loss of confidence");
        if (!first.ok)
            throw new Error("the first notice should have been accepted");
        const noticed = apply(campaign, first.packet);
        expect(fileInspectorRemovalNotice(noticed, "INST-DOJ", "again").ok).toBe(false);
    });
    it("does not stop an audit that is running — it makes it public and permanent", () => {
        const bent = politicized(campaign, "INST-DOJ");
        const opened = runPhase(bent, inspectorGeneralPhase);
        const before = selectMattersFor(opened, "INST-DOJ")[0];
        expect(before.public).toBe(false);
        expect(selectOversightPressure(opened)).toBe(0);
        const projection = projectInspectorRemoval(opened, "INST-DOJ");
        expect(projection.obstructs).toBe(true);
        expect(projection.openMatters).toHaveLength(1);
        const filed = fileInspectorRemovalNotice(opened, "INST-DOJ", "loss of confidence");
        if (!filed.ok)
            throw new Error("the notice should have been accepted");
        const after = apply(opened, filed.packet);
        const matter = selectMatter(after, before.id);
        expect(isMatterOpen(matter)).toBe(true);
        expect(matter.obstructed).toBe(true);
        expect(matter.public).toBe(true);
        expect(selectOversightPressure(after)).toBeGreaterThan(selectOversightPressure(opened));
    });
    it("charges the Hill more for a notice filed mid-audit than for one filed into a quiet office", () => {
        const quiet = fileInspectorRemovalNotice(campaign, "INST-DOJ", "loss of confidence");
        const bent = politicized(campaign, "INST-DOJ");
        const opened = runPhase(bent, inspectorGeneralPhase);
        const midAudit = fileInspectorRemovalNotice(opened, "INST-DOJ", "loss of confidence");
        if (!quiet.ok || !midAudit.ok)
            throw new Error("both notices should have been accepted");
        expect(apply(opened, midAudit.packet).congress.disposition).toBeLessThan(apply(campaign, quiet.packet).congress.disposition);
    });
});
describe("Congress investigating", () => {
    function covertOutcome(state, actor, flag, rung = 5, landed = true) {
        const target = flag.split(":").at(-1);
        return apply(state, {
            source: "action",
            actor,
            turn: state.turn,
            narration: { summary: "Covert action resolved." },
            commitment: { instrument: "covert", rung, target, landed },
            effects: landed ? [{ kind: "flag", set: [flag] }] : [],
        });
    }
    it("routes a body to the panel that confirms it, and a component to its parent's", () => {
        expect(committeeForInstitution("INST-DOD")).toBe("CMTE-ARMED");
        expect(committeeForInstitution("INST-DOJ")).toBe("CMTE-JUDICIARY");
        expect(committeeForInstitution("INST-USSS")).toBe("CMTE-HOMELAND");
        expect(committeeForOrderDomain("security")).toBeDefined();
        expect(committeeForOrderDomain("civil")).toBeDefined();
    });
    it("opens nothing while there is nothing to open a file on", () => {
        expect(committeeInquiryPhase(campaign)).toEqual([]);
    });
    it("opens a file on a story the press is already running, without discovering it itself", () => {
        // Most real inquiries begin with a reporter rather than a subpoena, and
        // until the press and the committees were joined these two halves ran past
        // each other: a story could run for six weeks while every panel behaved as
        // though nothing had been printed, so a scandal cost approval and never
        // once cost the President a hearing.
        const scandalous = {
            ...campaign,
            congress: { ...campaign.congress, disposition: 0.15, committees: {} },
            player: {
                ...campaign.player,
                flags: { ...campaign.player.flags, "scandal:the-unminuted-meeting": true },
            },
        };
        const live = selectLiveScandals(scandalous);
        expect(live.length).toBeGreaterThan(0);
        const investigating = runPhase(scandalous, committeeInquiryPhase);
        const opened = [...COMMITTEE_IDS].flatMap((id) => selectInquiriesFor(investigating, id));
        const fromTheStory = opened.find((matter) => matter.subject === live[0].subject);
        expect(fromTheStory).toBeDefined();
        // Only the loudest story, and only one file. A panel that opened one on
        // every running story would turn a bad month into a permanent docket.
        const again = runPhase(investigating, committeeInquiryPhase);
        const twice = [...COMMITTEE_IDS]
            .flatMap((id) => selectInquiriesFor(again, id))
            .filter((matter) => matter.subject === live[0].subject);
        expect(twice).toHaveLength(1);
    });
    it("opens a file on a president who removed the auditor mid-audit", () => {
        const bent = politicized(campaign, "INST-DOJ");
        const opened = runPhase(bent, inspectorGeneralPhase);
        const filed = fileInspectorRemovalNotice(opened, "INST-DOJ", "loss of confidence");
        if (!filed.ok)
            throw new Error("the notice should have been accepted");
        // A panel that is with the administration does not investigate it, whatever
        // has happened, so the claim under test needs a chamber that is not.
        const obstructed = apply(opened, filed.packet);
        const hostile = {
            ...obstructed,
            congress: { ...obstructed.congress, disposition: 0.15, committees: {} },
        };
        const investigating = runPhase(hostile, committeeInquiryPhase);
        const inquiry = selectInquiriesFor(investigating, "CMTE-JUDICIARY")[0];
        expect(inquiry).toBeDefined();
        expect(inquiry.public).toBe(true);
        expect(inquiry.subject).toContain("inspector general");
        expect(committeeIsInvestigating(investigating, "CMTE-JUDICIARY")).toBe(true);
        expect(matterSource(inquiry)).toContain("Committee");
        // And never twice on the same fact.
        const again = runPhase({ ...investigating, turn: investigating.turn + 1 }, committeeInquiryPhase);
        expect(selectInquiriesFor(again, "CMTE-JUDICIARY")).toHaveLength(1);
    });
    it("does not open a file when the panel is with the administration", () => {
        const bent = politicized(campaign, "INST-DOJ");
        const opened = runPhase(bent, inspectorGeneralPhase);
        const filed = fileInspectorRemovalNotice(opened, "INST-DOJ", "loss of confidence");
        if (!filed.ok)
            throw new Error("the notice should have been accepted");
        const obstructed = apply(opened, filed.packet);
        const friendly = {
            ...obstructed,
            congress: { ...obstructed.congress, disposition: 0.9, committees: {} },
        };
        expect(committeeInquiryPhase(friendly)).toEqual([]);
    });
    it("opens a file on a contested executive order, in the jurisdiction that would carry it out", () => {
        const signed = {
            ...campaign,
            congress: { ...campaign.congress, disposition: 0.1, committees: {} },
            orders: [
                {
                    id: "order-border-controls:3",
                    order: "order-border-controls",
                    turn: 3,
                    contested: true,
                    challengeChance: 0.6,
                },
            ],
        };
        const investigating = runPhase(signed, committeeInquiryPhase);
        const inquiry = selectOpenMatters(investigating)[0];
        expect(inquiry.origin.kind).toBe("committee");
        expect(inquiry.subject).toContain("the authority claimed for");
        expect(selectOversightPressure(investigating)).toBe(0); // an opened file is not yet worth anything
    });
    it("opens a file on covert action taken on the President's own authority", () => {
        const hostile = {
            ...campaign,
            congress: { ...campaign.congress, disposition: 0.1, committees: {} },
        };
        const covert = covertOutcome(hostile, "player", "destabilized:ALP");
        const investigating = runPhase(covert, committeeInquiryPhase);
        const inquiry = selectOpenMatters(investigating)[0];
        expect(inquiry.origin).toEqual({ kind: "committee", committee: "CMTE-INTEL" });
        expect(inquiry.id).toContain("covert:destabilized:ALP");
        expect(inquiry.subject).toContain("covert action");
    });
    it("does not attribute an NPC's regime action or surveillance to the President", () => {
        const hostile = {
            ...campaign,
            congress: { ...campaign.congress, disposition: 0.1, committees: {} },
        };
        const destabilized = covertOutcome(hostile, "world", "destabilized:ALP");
        const surveilled = covertOutcome(destabilized, "world", "surveilling:FRA:ALP", 1);
        expect(surveilled.player.flags["destabilized:ALP"]).toBe(true);
        expect(surveilled.player.flags["surveilling:FRA:ALP"]).toBe(true);
        expect(committeeInquiryPhase(surveilled)).toEqual([]);
    });
    it("does not infer presidential regime action from an unattributed old flag or a failed attempt", () => {
        const hostile = {
            ...campaign,
            congress: { ...campaign.congress, disposition: 0.1, committees: {} },
            player: { ...campaign.player, flags: { ...campaign.player.flags, "destabilized:ALP": true } },
        };
        expect(committeeInquiryPhase(hostile)).toEqual([]);
        const attempted = covertOutcome(hostile, "player", "destabilized:ALP", 5, false);
        const opened = selectOpenMatters(runPhase(attempted, committeeInquiryPhase));
        expect(opened.every((matter) => !matter.id.includes("covert:destabilized:ALP"))).toBe(true);
    });
    it("opens a file on surveillance ordered by the President", () => {
        const hostile = {
            ...campaign,
            congress: { ...campaign.congress, disposition: 0.1, committees: {} },
        };
        const surveilled = covertOutcome(hostile, "player", `surveilling:${campaign.founding.nation}:ALP`, 1);
        const inquiry = selectOpenMatters(runPhase(surveilled, committeeInquiryPhase))[0];
        expect(inquiry.origin).toEqual({ kind: "committee", committee: "CMTE-INTEL" });
        expect(inquiry.id).toContain(`covert:surveilling:${campaign.founding.nation}:ALP`);
        expect(inquiry.subject).toContain("covert action");
    });
});
describe("what being investigated costs", () => {
    it("colds the chamber's mood while a matter is public, and stops when it stops", () => {
        const reported = {
            id: "matter:committee:CMTE-JUDICIARY:4|test",
            origin: { kind: "committee", committee: "CMTE-JUDICIARY" },
            direction: "received",
            subject: "a test matter",
            openedTurn: 4,
            stage: "reported",
            public: true,
            obstructed: false,
            beats: [],
        };
        const under = { ...campaign, oversight: { ...campaign.oversight, matters: [reported] } };
        expect(dispositionTarget(under)).toBeLessThan(dispositionTarget(campaign));
        const settled = {
            ...under,
            oversight: { ...under.oversight, matters: [{ ...reported, stage: "closed", closedTurn: campaign.turn }] },
        };
        expect(dispositionTarget(settled)).toBe(dispositionTarget(campaign));
    });
    it("goes on counting an obstruction after the file closes, and the inquiry itself does not", () => {
        const obstructed = {
            id: "matter:ig:INST-DOJ:4",
            origin: { kind: "inspector-general", institution: "INST-DOJ" },
            direction: "received",
            subject: "a test matter",
            openedTurn: 4,
            stage: "closed",
            closedTurn: campaign.turn,
            public: true,
            obstructed: true,
            beats: [],
        };
        const remembered = { ...campaign, oversight: { ...campaign.oversight, matters: [obstructed] } };
        expect(selectOversightPressure(remembered)).toBeGreaterThan(0);
        // Half a fictional year later it is spent.
        expect(selectOversightPressure({ ...remembered, turn: campaign.turn + 40 })).toBe(0);
    });
    it("charges nothing for oversight the administration directed itself", () => {
        const directed = {
            id: "matter:ig:INST-DOJ:4",
            origin: { kind: "inspector-general", institution: "INST-DOJ" },
            direction: "directed",
            subject: "a review the President ordered",
            openedTurn: 4,
            stage: "reported",
            public: true,
            obstructed: false,
            beats: [],
        };
        const own = { ...campaign, oversight: { ...campaign.oversight, matters: [directed] } };
        expect(selectOversightPressure(own)).toBe(0);
    });
});
describe("the save", () => {
    it("carries the board forward whole", () => {
        const bent = politicized(campaign, "INST-DOJ");
        const opened = runPhase(bent, inspectorGeneralPhase);
        const reloaded = loadSave(createSave(opened));
        expect(reloaded.oversight).toEqual(opened.oversight);
    });
});
