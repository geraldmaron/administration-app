import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { dismissMinister, selectChairRunner } from "./appointments.js";
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
    it("serves the Service, the Board and an adjudicating commission from one call", () => {
        const bars = [
            ["INST-IRS", "targeting"],
            ["INST-FED", "monetary"],
            ["INST-NLRB", "enforcement-posture"],
        ];
        for (const [institution, kind] of bars) {
            const memorandum = directiveRefusal(def(institution), kind);
            expect(memorandum, `${institution} should refuse ${kind}`).toBeDefined();
            expect(memorandum.reason.length).toBeGreaterThan(40);
            expect(memorandum.authority).not.toEqual("");
            expect(memorandum.signedBy).not.toEqual("");
        }
    });
    it("leaves a directive to Justice to the Attorney General's judgment rather than refusing it as if a statute barred it", () => {
        for (const id of ["INST-DOJ", "INST-FBI", "INST-DEA", "INST-ATF", "INST-USMS"]) {
            expect(directiveRefusal(def(id), "investigation"), id).toBeUndefined();
            expect(directiveRefusal(def(id), "targeting"), id).toBeUndefined();
        }
    });
    it("lets the President supervise an at-will commission's policy, and bars one whose members keep their protection", () => {
        for (const id of ["INST-FTC", "INST-CFPB"]) {
            expect(directiveRefusal(def(id), "enforcement-posture"), id).toBeUndefined();
        }
        for (const id of ["INST-SEC", "INST-FCC", "INST-CFTC", "INST-NLRB"]) {
            expect(directiveRefusal(def(id), "enforcement-posture"), id).toBeDefined();
        }
    });
    it("cites the taxpayer-specific bar at the IRS and the Federal Reserve Act at the Board", () => {
        expect(directiveRefusal(def("INST-IRS"), "targeting").authority).toContain("7217");
        expect(directiveRefusal(def("INST-FED"), "monetary").authority).toContain("Federal Reserve Act");
    });
    it("builds an adjudicating commission's memorandum out of its own catalog entry", () => {
        const memorandum = directiveRefusal(def("INST-NLRB"), "enforcement-posture");
        expect(memorandum.reason).toContain("National Labor Relations Board");
        expect(memorandum.reason).toContain("5-year terms");
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
        let campaign = foundedForBalance("directives-per-body").campaign;
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
                const unstaffedJustice = !result.ok && result.reason.includes("Attorney General's authority");
                expect(result.ok || unstaffedJustice).toBe(true);
            }
        }
    });
});
describe("casework at Justice goes through the Attorney General", () => {
    const AG_ROLE = "role-attorney-general";
    function withAttorneyGeneral(seed, traits) {
        const { campaign } = foundedForBalance(seed);
        const id = campaign.player.cabinet[AG_ROLE];
        const person = campaign.people[id];
        return {
            ...campaign,
            people: {
                ...campaign.people,
                [id]: { ...person, base: { ...person.base, integrity: traits.integrity, loyalty: traits.loyalty, traits: [traits.trait] } },
            },
        };
    }
    it("has a principled Attorney General decline to point the department at a named person, and signs the refusal as a judgment", () => {
        const campaign = withAttorneyGeneral("directives-ag-principled", { integrity: 1, loyalty: 0.2, trait: "principled" });
        const after = issue(campaign, { institution: "INST-DOJ", kind: "targeting", subject: "a senator who opposed the bill" });
        const [directive] = selectDirectives(after);
        expect(directive.status).toEqual("refused");
        expect(directive.memorandum.signedBy).toEqual("The Attorney General");
        expect(directive.memorandum.reason).toContain("no statute entitles the President");
        expect(directive.judgment.acts).toBe(false);
        expect(after.institutions["INST-DOJ"].politicization).toBeGreaterThan(campaign.institutions["INST-DOJ"].politicization);
    });
    it("has a deferential Attorney General open the file, and the bend and the scrutiny land on the department", () => {
        const campaign = withAttorneyGeneral("directives-ag-deferential", { integrity: 0.05, loyalty: 1, trait: "corrupt" });
        const first = issue(campaign, { institution: "INST-DOJ", kind: "investigation", subject: "a donor" });
        const [directive] = selectDirectives(first);
        expect(directive.status).toEqual("carried");
        expect(directive.memorandum).toBeUndefined();
        expect(directive.judgment.acts).toBe(true);
        expect(first.institutions["INST-DOJ"].politicization).toBeCloseTo(campaign.institutions["INST-DOJ"].politicization + directiveMove("investigation").politicization, 3);
        expect(first.oversight.matters).toHaveLength(0);
        const second = issue({ ...first, turn: first.turn + 1 }, { institution: "INST-DOJ", kind: "investigation", subject: "a publisher" });
        expect(second.oversight.matters).toHaveLength(1);
        expect(second.oversight.matters[0].direction).toEqual("received");
    });
    it("weighs the same instruction harder the longer the record of such instructions", () => {
        let campaign = withAttorneyGeneral("directives-ag-record", { integrity: 0.5, loyalty: 0.6, trait: "principled" });
        const stamps = [];
        for (const subject of ["a", "b", "c", "d"]) {
            campaign = { ...campaign, turn: campaign.turn + 1 };
            campaign = issue(campaign, { institution: "INST-DOJ", kind: "investigation", subject });
            stamps.push(selectDirectives(campaign).at(-1).judgment.score);
        }
        expect([...stamps].sort((x, y) => y - x)).toEqual(stamps);
        expect(stamps[3]).toBeLessThan(stamps[0]);
    });
    it("pauses casework at Justice when nobody holds the Attorney General's authority, even with a stale acting record", () => {
        const { campaign } = foundedForBalance("directives-ag-vacant");
        const dismissed = dismissMinister(campaign, AG_ROLE);
        if (!dismissed.ok)
            throw new Error(dismissed.reason);
        const after = apply(campaign, dismissed.packet);
        expect(after.actings?.[AG_ROLE]).toBeDefined();
        const { actingLeader: _l, actingExpiresDay: _e, ...rest } = after.institutions["INST-DOJ"];
        const lapsed = { ...after, institutions: { ...after.institutions, "INST-DOJ": { ...rest, vacancy: true } } };
        expect(selectChairRunner(lapsed, AG_ROLE)).toBeUndefined();
        const result = issueDirective(lapsed, { institution: "INST-DOJ", kind: "targeting", subject: "a political opponent" });
        expect(result.ok).toBe(false);
    });
    it("still bars the IRS outright and never lets the judgment route reach it", () => {
        const after = issue(foundedForBalance("directives-irs").campaign, { institution: "INST-IRS", kind: "targeting", subject: "a taxpayer" });
        const [directive] = selectDirectives(after);
        expect(directive.status).toEqual("refused");
        expect(directive.memorandum.authority).toContain("7217");
        expect(directive.judgment).toBeUndefined();
    });
});
describe("a commission whose chair serves at the President's pleasure", () => {
    it("carries a policy instruction instead of refusing it", () => {
        const { campaign } = foundedForBalance("directives-commission");
        const after = issue(campaign, { institution: "INST-FTC", kind: "enforcement-posture", subject: "a lighter touch on mergers" });
        expect(selectDirectives(after)[0].status).not.toEqual("refused");
        expect(after.institutions["INST-FTC"].politicization).toBeCloseTo(campaign.institutions["INST-FTC"].politicization, 5);
    });
    it("offers no named-matter instruction to a commission, whose matters are decided by its own vote", () => {
        const { campaign } = foundedForBalance("directives-commission-casework");
        const result = issueDirective(campaign, { institution: "INST-FTC", kind: "targeting", subject: "a named firm" });
        expect(result.ok).toBe(false);
    });
});
