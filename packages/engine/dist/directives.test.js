import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { INSTITUTION_CATALOG, institutionDef } from "./institutions.js";
import { selectOversightPressure } from "./oversight.js";
import { directiveMove, REFUSALS_BEFORE_MATTER, REFUSAL_POLITICIZATION_RISE, directableKinds, directiveRefusal, directivesFor, foundingDirectives, issueDirective, inspectingBody, refusalMemorandumText, selectDirectives, selectRefusedDirectives, } from "./directives.js";
function issue(campaign, request) {
    const result = issueDirective(campaign, request);
    if (!result.ok)
        throw new Error(`expected the directive to be issued: ${result.reason}`);
    return apply(campaign, result.packet);
}
const def = (id) => institutionDef(id);
describe("the refusal function", () => {
    it("serves the Bureau, the Service, the Board and an independent commission from one call", () => {
        const bars = [
            ["INST-FBI", "investigation"],
            ["INST-IRS", "targeting"],
            ["INST-FED", "monetary"],
            ["INST-SEC", "enforcement-posture"],
        ];
        for (const [institution, kind] of bars) {
            const memorandum = directiveRefusal(def(institution), kind);
            expect(memorandum, `${institution} should refuse ${kind}`).toBeDefined();
            expect(memorandum.reason.length).toBeGreaterThan(40);
            expect(memorandum.authority).not.toEqual("");
            expect(memorandum.signedBy).not.toEqual("");
        }
    });
    it("rests the law enforcement family on one authority rather than five", () => {
        const family = ["INST-DOJ", "INST-FBI", "INST-DEA", "INST-ATF", "INST-USMS"];
        const reasons = new Set(family.map((id) => directiveRefusal(def(id), "investigation").reason));
        expect(reasons.size).toEqual(1);
    });
    it("cites the taxpayer-specific bar at the IRS and the Federal Reserve Act at the Board", () => {
        expect(directiveRefusal(def("INST-IRS"), "targeting").authority).toContain("7217");
        expect(directiveRefusal(def("INST-FED"), "monetary").authority).toContain("Federal Reserve Act");
    });
    it("builds an independent commission's memorandum out of its own catalog entry", () => {
        const memorandum = directiveRefusal(def("INST-FTC"), "enforcement-posture");
        expect(memorandum.reason).toContain("Federal Trade Commission");
        expect(memorandum.reason).toContain("7-year terms");
        expect(memorandum.reason).toContain("removable only for cause");
    });
    it("lets an executive body take the instructions its statute leaves with the President", () => {
        expect(directiveRefusal(def("INST-EPA"), "enforcement-posture")).toBeUndefined();
        expect(directiveRefusal(def("INST-ICE"), "enforcement-posture")).toBeUndefined();
        expect(directiveRefusal(def("INST-CBP"), "enforcement-posture")).toBeUndefined();
        expect(directiveRefusal(def("INST-OFAC"), "sanctions-tempo")).toBeUndefined();
        expect(directiveRefusal(def("INST-IRS"), "enforcement-posture")).toBeUndefined();
    });
    it("prints the statutory reason verbatim in the memorandum", () => {
        const campaign = buildCampaign();
        const result = issueDirective(campaign, {
            institution: "INST-IRS",
            kind: "targeting",
            subject: "the returns of a sitting senator",
        });
        if (!result.ok)
            throw new Error(result.reason);
        const reason = directiveRefusal(def("INST-IRS"), "targeting").reason;
        expect(result.packet.narration?.summary).toContain(reason);
    });
});
describe("issuing", () => {
    it("rejects an instruction addressed to a body that holds no such function", () => {
        const result = issueDirective(buildCampaign(), {
            institution: "INST-ED",
            kind: "monetary",
            subject: "the policy rate",
        });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toContain("no such function");
    });
    it("rejects a directive that says nothing", () => {
        const result = issueDirective(buildCampaign(), {
            institution: "INST-EPA",
            kind: "enforcement-posture",
            subject: "   ",
        });
        expect(result.ok).toBe(false);
    });
    it("carries an EPA instruction and files it on the agency and in the store", () => {
        const after = issue(buildCampaign(), {
            institution: "INST-EPA",
            kind: "enforcement-posture",
            subject: "coal ash enforcement",
        });
        const [directive] = selectDirectives(after);
        expect(directive.status).toEqual("carried");
        expect(after.institutions["INST-EPA"].directives).toEqual([directive.id]);
        expect(directivesFor(after, "INST-EPA")).toHaveLength(1);
    });
    it("slow-walks a semi-autonomous body rather than refusing it a lawful instruction", () => {
        const after = issue(buildCampaign(), {
            institution: "INST-FBI",
            kind: "enforcement-posture",
            subject: "public corruption cases nationwide",
        });
        expect(selectDirectives(after)[0].status).toEqual("slow-walked");
    });
    it("charges the directed body politicization and oversight for a refusal", () => {
        const before = buildCampaign();
        const opening = before.institutions["INST-FED"];
        const after = issue(before, {
            institution: "INST-FED",
            kind: "monetary",
            subject: "a cut before the midterms",
        });
        const runtime = after.institutions["INST-FED"];
        const move = directiveMove("monetary");
        expect(runtime.politicization).toBeCloseTo(opening.politicization + move.politicization, 3);
        expect(runtime.oversightPressure).toBeCloseTo(opening.oversightPressure + move.oversight, 3);
        expect(move.politicization).toBeGreaterThan(REFUSAL_POLITICIZATION_RISE);
    });
    it("moves nothing in the world when the Federal Reserve is pressed", () => {
        const before = buildCampaign();
        const after = issue(before, {
            institution: "INST-FED",
            kind: "monetary",
            subject: "a cut before the midterms",
        });
        expect(after.nations).toEqual(before.nations);
        expect(after.player.metrics).toEqual(before.player.metrics);
        expect(selectRefusedDirectives(after)).toHaveLength(1);
    });
});
describe("the second refusal", () => {
    it("opens no matter on the first one", () => {
        const after = issue(buildCampaign(), {
            institution: "INST-IRS",
            kind: "targeting",
            subject: "a donor to the other party",
        });
        expect(after.oversight.matters).toHaveLength(0);
    });
    it("opens a matter pointed at the administration on the second at one body", () => {
        let campaign = buildCampaign();
        campaign = issue(campaign, { institution: "INST-IRS", kind: "targeting", subject: "a donor" });
        campaign = { ...campaign, turn: campaign.turn + 1 };
        campaign = issue(campaign, { institution: "INST-IRS", kind: "investigation", subject: "a publisher" });
        expect(selectRefusedDirectives(campaign)).toHaveLength(REFUSALS_BEFORE_MATTER);
        const [matter] = campaign.oversight.matters;
        expect(matter).toBeDefined();
        expect(matter.direction).toEqual("received");
        expect(matter.origin).toEqual({ kind: "inspector-general", institution: "INST-TREASURY" });
        expect(matter.subject).toContain("Internal Revenue Service");
        expect(matter.public).toBe(false);
    });
    it("does not open a second matter on the third refusal", () => {
        let campaign = buildCampaign();
        for (const subject of ["a donor", "a publisher", "a mayor"]) {
            campaign = issue(campaign, { institution: "INST-IRS", kind: "targeting", subject });
            campaign = { ...campaign, turn: campaign.turn + 1 };
        }
        expect(campaign.oversight.matters).toHaveLength(1);
    });
    it("counts refusals per body rather than across the government", () => {
        let campaign = buildCampaign();
        campaign = issue(campaign, { institution: "INST-IRS", kind: "targeting", subject: "a donor" });
        campaign = issue(campaign, { institution: "INST-FBI", kind: "investigation", subject: "a rival" });
        expect(campaign.oversight.matters).toHaveLength(0);
    });
    it("files the matter at the department whose auditor covers the bureau", () => {
        expect(inspectingBody(def("INST-IRS"))).toEqual("INST-TREASURY");
        expect(inspectingBody(def("INST-FBI"))).toEqual("INST-DOJ");
        expect(inspectingBody(def("INST-ICE"))).toEqual("INST-DHS");
        expect(inspectingBody(def("INST-FED"))).toEqual("INST-FED");
    });
    it("reaches the standing oversight reading once the matter is public", () => {
        let campaign = buildCampaign();
        campaign = issue(campaign, { institution: "INST-IRS", kind: "targeting", subject: "a donor" });
        campaign = { ...campaign, turn: campaign.turn + 1 };
        campaign = issue(campaign, { institution: "INST-IRS", kind: "investigation", subject: "a publisher" });
        expect(selectOversightPressure(campaign)).toEqual(0);
        const known = campaign.oversight.matters.map((matter) => ({
            ...matter,
            public: true,
            stage: "reported",
        }));
        expect(selectOversightPressure({ ...campaign, oversight: { ...campaign.oversight, matters: known } })).toBeGreaterThan(0);
    });
});
describe("the record", () => {
    it("reads an administration that has never given an instruction as having none", () => {
        const campaign = buildCampaign();
        expect(campaign.directives).toBeUndefined();
        expect(selectDirectives(campaign)).toEqual([]);
        expect(foundingDirectives()).toEqual({});
    });
    it("keeps a refusal rather than letting a retry clear it", () => {
        let campaign = buildCampaign();
        campaign = issue(campaign, { institution: "INST-FED", kind: "monetary", subject: "a cut" });
        campaign = { ...campaign, turn: campaign.turn + 1 };
        campaign = issue(campaign, { institution: "INST-FED", kind: "monetary", subject: "a cut" });
        expect(selectRefusedDirectives(campaign)).toHaveLength(2);
    });
    it("prints an empty memorandum for a directive that was carried", () => {
        const after = issue(buildCampaign(), {
            institution: "INST-EPA",
            kind: "enforcement-posture",
            subject: "coal ash enforcement",
        });
        expect(refusalMemorandumText(selectDirectives(after)[0])).toEqual("");
    });
});
describe("the save step", () => {
    it("opens every institution with no directive ids and no investigations field", () => {
        const campaign = buildCampaign();
        for (const runtime of Object.values(campaign.institutions)) {
            expect(runtime.directives).toEqual([]);
            expect("investigations" in runtime).toBe(false);
        }
    });
});
describe("what a body can be told to do at all", () => {
    it("offers nothing at a body that holds no directable function", () => {
        expect(directableKinds("INST-ED")).toEqual([]);
    });
    it("offers nothing for an id outside the catalog", () => {
        expect(directableKinds("INST-NOWHERE")).toEqual([]);
    });
    it("offers the enforcement kinds at a law-enforcement body", () => {
        expect(directableKinds("INST-FBI")).toContain("investigation");
        expect(directableKinds("INST-FBI")).toContain("targeting");
    });
    it("offers the rate only where somebody actually sets it", () => {
        expect(directableKinds("INST-FED")).toContain("monetary");
        for (const def of INSTITUTION_CATALOG) {
            if (def.id === "INST-FED")
                continue;
            expect(directableKinds(def.id)).not.toContain("monetary");
        }
    });
    // The whole point of the selector: a screen that offers only these can never
    // draw a control whose one possible answer is that there was nobody to ask.
    it("never offers an instruction addressed to nobody", () => {
        const campaign = buildCampaign();
        for (const def of INSTITUTION_CATALOG) {
            if (!campaign.institutions[def.id])
                continue;
            for (const kind of directableKinds(def.id)) {
                const result = issueDirective(campaign, { institution: def.id, kind, subject: "a named subject" });
                expect(result.ok).toBe(true);
            }
        }
    });
});
