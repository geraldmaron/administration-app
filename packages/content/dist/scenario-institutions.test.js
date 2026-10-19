import { describe, expect, it } from "vitest";
import { previewBoards } from "./preview-board.js";
import { effectiveWeight } from "./scenario-cast.js";
import { auditReachability } from "./scenario-reachability.js";
import { auditInstitutionGates, institutionReading, institutionStateMet, institutionStrainValue, } from "./scenario-institutions.js";
import { ScenarioCondition } from "./scenario.js";
// The board spread the gate is measured against: index 4 is `underStrain`,
// the government whose branch has been hollowed out.
const boards = previewBoards({});
const fresh = boards[0];
const hollowed = boards[4];
function gate(overrides = {}) {
    return { kind: "institutionState", institution: "INST-DOD", field: "delivery", atMost: 0.6, ...overrides };
}
function findingsFor(conditions, boosts) {
    const found = [];
    auditInstitutionGates({ id: "probe", conditions, boosts, replies: [] }, found);
    return found.map((finding) => finding.kind);
}
describe("institutionState: the schema", () => {
    it("parses a gate on a body the catalog carries", () => {
        expect(ScenarioCondition.parse(gate())).toMatchObject({ kind: "institutionState", institution: "INST-DOD" });
    });
    it("refuses an institution id the catalog does not carry", () => {
        expect(() => ScenarioCondition.parse(gate({ institution: "INST-MINISTRY-OF-MAGIC" }))).toThrow();
    });
    it("refuses a field outside the five the runtime carries", () => {
        expect(() => ScenarioCondition.parse({ ...gate(), field: "openDocket" })).toThrow();
    });
});
describe("institutionState: what it reads", () => {
    it("reads every field off a live board", () => {
        for (const field of ["delivery", "politicization", "backlog", "vacantDays", "openMatters"]) {
            expect(typeof institutionReading(fresh, "INST-DOD", field)).toBe("number");
        }
    });
    it("counts the oversight matters open into this body, and only those", () => {
        const matter = (id, institution, stage) => ({
            id,
            origin: { kind: "inspector-general", institution },
            direction: "received",
            subject: "a contract nobody competed",
            openedTurn: 1,
            stage,
            public: true,
            obstructed: false,
            beats: [],
        });
        const watched = {
            ...fresh,
            oversight: {
                ...fresh.oversight,
                matters: [
                    matter("matter:a", "INST-DOD", "gathering"),
                    matter("matter:b", "INST-DOD", "closed"),
                    matter("matter:c", "INST-DOJ", "gathering"),
                ],
            },
        };
        expect(institutionReading(watched, "INST-DOD", "openMatters")).toBe(1);
    });
    it("is not met on a board that carries no runtime for the body", () => {
        const empty = { ...fresh, institutions: {} };
        expect(institutionStateMet(empty, gate())).toBe(false);
    });
    // The whole point of the gate: the same condition answers differently once
    // the administration has hollowed the agency out.
    it("is false on a fresh branch and true once the branch has been hollowed", () => {
        expect(institutionStateMet(fresh, gate())).toBe(false);
        expect(institutionStateMet(hollowed, gate())).toBe(true);
    });
});
describe("institutionStrain: the boost", () => {
    it("is zero for a scenario naming no institution", () => {
        expect(institutionStrainValue(hollowed, [{ kind: "turn" }])).toBe(0);
    });
    it("climbs as the body comes apart", () => {
        expect(institutionStrainValue(hollowed, [gate()])).toBeGreaterThan(institutionStrainValue(fresh, [gate()]));
    });
    it("makes the scenario likelier on the board it is about", () => {
        const def = { conditions: [gate()], weight: 1, boosts: [{ source: "institutionStrain", factor: 1 }] };
        const counterpart = fresh.founding.nation;
        expect(effectiveWeight(hollowed, def, counterpart)).toBeGreaterThan(effectiveWeight(fresh, def, counterpart));
    });
});
describe("institutionState: the reachability rules", () => {
    it("errors on a 0..1 field bounded above one", () => {
        expect(findingsFor([gate({ field: "politicization", atLeast: 40, atMost: undefined })])).toContain("institution-bounds-scale");
    });
    it("errors on a count field bounded on the nought-to-one scale", () => {
        expect(findingsFor([gate({ field: "backlog", atLeast: 0.4, atMost: undefined })])).toContain("institution-bounds-scale");
    });
    it("passes both fields written on their own scale", () => {
        expect(findingsFor([gate({ field: "politicization", atLeast: 0.3, atMost: undefined })])).toEqual([]);
        expect(findingsFor([gate({ field: "backlog", atLeast: 40, atMost: undefined })])).toEqual([]);
    });
    it("errors on an institution outside the catalog, for content built outside the type", () => {
        expect(findingsFor([{ ...gate(), institution: "INST-NOWHERE" }])).toContain("unknown-institution");
    });
    it("warns when vacancy-gated content waits on no removal", () => {
        expect(findingsFor([gate({ field: "vacantDays", atLeast: 30, atMost: undefined })])).toContain("institution-vacancy-gate-unfounded");
    });
    it("stays quiet once the same gate waits on the deed that empties the chair", () => {
        expect(findingsFor([
            gate({ field: "vacantDays", atLeast: 30, atMost: undefined }),
            { kind: "flag", flag: "the-secretary-was-fired", is: true },
        ])).toEqual([]);
    });
    it("warns on politicization asked of an insulated body past what a campaign reaches", () => {
        expect(findingsFor([gate({ institution: "INST-FED", field: "politicization", atLeast: 0.6, atMost: undefined })])).toContain("institution-politicization-unreachable");
    });
    it("does not warn at the same bound on a body the President runs directly", () => {
        expect(findingsFor([gate({ field: "politicization", atLeast: 0.6, atMost: undefined })])).toEqual([]);
    });
    it("errors on a strain boost with no institution to read strain off", () => {
        expect(findingsFor([{ kind: "turn" }], [{ source: "institutionStrain", factor: 1 }])).toContain("inert-boost");
    });
    it("accepts the boost beside the gate it belongs to", () => {
        expect(findingsFor([gate()], [{ source: "institutionStrain", factor: 1 }])).toEqual([]);
    });
});
// The proof the memory demands: not that the rules are right about a document,
// but that a scenario gated this way is actually dealt on a board a campaign
// produces.
describe("institutionState: the gate reaches a player", () => {
    const def = {
        id: "institution-gate-probe",
        class: "institution",
        severity: "serious",
        dilemmaShape: "containment",
        subject: "A department that cannot deliver what it was told to",
        cast: { pick: "none" },
        conditions: [gate()],
        boosts: [{ source: "institutionStrain", factor: 1 }],
        weight: 1,
        locus: { site: "capital", descriptor: "the department's own operations floor" },
        opening: [
            {
                speaker: { kind: "cabinet", roleHint: "defense" },
                text: "The order went out four weeks ago and the department has not moved on it, and the people who would have are gone.",
            },
        ],
        replies: [
            {
                id: "staff-it",
                tone: "firm",
                text: "Fill the chairs this month, and say publicly that the department will be staffed to do the work.",
                commitment: {
                    kind: "position",
                    cost: { standing: -0.05 },
                    remembered: "The chairs were filled and the government said out loud that the work would be staffed for.",
                    rejoinder: {
                        speaker: { kind: "narrator" },
                        text: "The names went up inside a month, and the backlog they inherited is still the backlog for a while yet.",
                    },
                },
            },
            {
                id: "live-with-it",
                tone: "conciliatory",
                text: "Leave the department as it is, and route the work to whoever can still carry it.",
                commitment: {
                    kind: "position",
                    cost: { stability: -0.02 },
                    remembered: "The department was left as it was and the work went to whoever was still there to do it.",
                    rejoinder: {
                        speaker: { kind: "cabinet", roleHint: "interior" },
                        text: "The work is getting done somewhere else now, by people who were already carrying their own, and they have said so.",
                    },
                },
            },
        ],
    };
    it("is live on the board it was written for", () => {
        expect(auditReachability([def])).toEqual([]);
    });
});
