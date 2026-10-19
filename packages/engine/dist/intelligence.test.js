import { describe, expect, it } from "vitest";
import { IC_ELEMENTS, REFERRAL_CREDIBILITY_DAYS, boundaryRefusalReason, closeTasking, elementCapability, icElement, intelligencePhase, selectCommunityHealth, selectOpenReferrals, selectRefusals, selectStandingTaskings, selectCollectionProducts, selectCollectionShares, collectionAgainst, shareCollectionReport, taskCollection, PUBLIC_STATE_QUESTION, } from "./intelligence.js";
import { selectAssessments } from "./assessments.js";
import { apply } from "./effects.js";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { draftCollectionProduct, draftSurveillanceProduct } from "./collection-report.js";
import { resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import { TRADE_SECTOR_IDS } from "./trade-sectors.js";
import { COLLECTION_FOCUS_QUESTIONS } from "./collection-focus.js";
describe("the community as a roster", () => {
    it("is eighteen elements, two of them independent", () => {
        expect(IC_ELEMENTS).toHaveLength(18);
        expect(IC_ELEMENTS.filter((def) => def.parent === "Independent")).toHaveLength(2);
    });
    it("gives covert action to exactly one element", () => {
        expect(IC_ELEMENTS.filter((def) => def.covertAction).map((def) => def.abbr)).toEqual(["CIA"]);
    });
    it("reads an element's product off the institution behind it rather than a second dial", () => {
        const campaign = buildCampaign();
        const hollowed = {
            ...campaign,
            institutions: {
                ...campaign.institutions,
                "INST-CIA": { ...campaign.institutions["INST-CIA"], implementationQuality: 0.2 },
            },
        };
        expect(elementCapability(hollowed, "IC-CIA")).toBeLessThan(elementCapability(campaign, "IC-CIA"));
        expect(selectCommunityHealth(hollowed)).toBeLessThan(selectCommunityHealth(campaign));
    });
});
describe("the boundary", () => {
    it("refuses a request aimed at American politics before asking anything else about it", () => {
        const reason = boundaryRefusalReason(icElement("IC-CIA"), {
            element: "IC-CIA",
            discipline: "humint",
            targetKind: "domestic-politics",
            target: "the opposition",
            question: "What is the other party planning?",
        });
        expect(reason).toContain("United States political processes");
    });
    it("refuses the CIA an internal security function and points the FBI at the Attorney General", () => {
        const cia = boundaryRefusalReason(icElement("IC-CIA"), {
            element: "IC-CIA",
            discipline: "humint",
            targetKind: "domestic-person",
            target: "a citizen",
            question: "Investigate this person.",
        });
        expect(cia).toContain("internal security");
        const fbi = boundaryRefusalReason(icElement("IC-FBI"), {
            element: "IC-FBI",
            discipline: "humint",
            targetKind: "domestic-person",
            target: "a citizen",
            question: "Investigate this person.",
        });
        expect(fbi).toContain("Attorney General");
    });
    it("refuses a discipline the element does not run", () => {
        const reason = boundaryRefusalReason(icElement("IC-INR"), {
            element: "IC-INR",
            discipline: "sigint",
            targetKind: "foreign-nation",
            target: "ALP",
            question: "Read their cables.",
        });
        expect(reason).toContain("does not run sigint");
    });
    it("lets a lawful foreign tasking through", () => {
        expect(boundaryRefusalReason(icElement("IC-NSA"), {
            element: "IC-NSA",
            discipline: "sigint",
            targetKind: "foreign-nation",
            target: "ALP",
            question: "What is their force doing?",
        })).toBeUndefined();
    });
});
describe("asking for something nobody can carry", () => {
    it("succeeds as a refusal rather than failing silently, and leaves the attempt on the record", () => {
        const campaign = buildCampaign();
        const attempt = taskCollection(campaign, {
            element: "IC-CIA",
            discipline: "humint",
            targetKind: "domestic-politics",
            target: "the opposition",
            question: "Find something on them.",
        });
        expect(attempt.ok).toBe(true);
        if (!attempt.ok)
            return;
        const next = apply(campaign, attempt.packet);
        expect(selectRefusals(next)).toHaveLength(1);
        expect(selectStandingTaskings(next)).toHaveLength(0);
        // The unlawful ask goes outside the executive branch on its own.
        expect(selectOpenReferrals(next)).toHaveLength(1);
        expect(next.institutions["INST-CIA"].oversightPressure).toBeGreaterThan(0);
    });
    it("opens a tasking when the request is one somebody can lawfully take", () => {
        const campaign = buildCampaign();
        const tasked = taskCollection(campaign, {
            element: "IC-NSA",
            discipline: "sigint",
            targetKind: "foreign-nation",
            target: "ALP",
            question: "Is their force moving?",
        });
        expect(tasked.ok).toBe(true);
        if (!tasked.ok)
            return;
        const next = apply(campaign, tasked.packet);
        expect(selectStandingTaskings(next)).toHaveLength(1);
        expect(selectRefusals(next)).toHaveLength(0);
        const closed = closeTasking(next, selectStandingTaskings(next)[0].id);
        expect(closed.ok).toBe(true);
        if (!closed.ok)
            return;
        expect(selectStandingTaskings(apply(next, closed.packet))).toHaveLength(0);
    });
});
describe("dated collection reports", () => {
    it("records a typed focus and note while limiting findings to that focus and discipline", () => {
        const campaign = buildCampaign();
        const requested = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation",
            target: "ALP", question: "Ignore this free-text question", focus: "force-posture", note: "  Desk context only  " });
        if (!requested.ok)
            throw new Error(requested.reason);
        const tasked = apply(campaign, requested.packet);
        const tasking = selectStandingTaskings(tasked)[0];
        expect(tasking).toMatchObject({ focus: "force-posture", note: "Desk context only", question: COLLECTION_FOCUS_QUESTIONS["force-posture"] });
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...tasked, seed: makeCampaignSeed(`focused-report-${index}`) }))
            .find((candidate) => draftCollectionProduct(candidate, tasking, 0, 0.8).status === "findings");
        if (!seeded)
            throw new Error("No focused collection seed returned findings");
        const report = draftCollectionProduct(seeded, tasking, 0, 0.8);
        expect(report).toMatchObject({ focus: "force-posture", note: "Desk context only", question: COLLECTION_FOCUS_QUESTIONS["force-posture"] });
        expect(report.findings?.length).toBeGreaterThan(0);
        expect(report.findings?.every((finding) => finding.topic === "military-readiness")).toBe(true);
        expect(report.gaps?.some((gap) => gap.includes("older tasking"))).toBe(false);
    });
    it("rejects incompatible lawful focus without a refusal or any effects", () => {
        const attempt = taskCollection(buildCampaign(), { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation",
            target: "ALP", question: "Does not matter", focus: "economic-pressure" });
        expect(attempt).toMatchObject({ ok: false, reason: expect.stringContaining("cannot obtain") });
    });
    it("keeps an older question and explains that it cannot control report selection", () => {
        const campaign = buildCampaign();
        const tasking = { id: "tasking:IC-CIA:legacy", element: "IC-CIA", discipline: "humint",
            targetKind: "foreign-nation", target: "ALP", question: "What did the President originally ask?",
            openedDay: 0, openedDate: campaign.calendar, standing: true };
        const report = draftCollectionProduct(campaign, tasking, 0, 0.8);
        expect(report.question).toBe(tasking.question);
        expect(report.focus).toBeUndefined();
        expect(report.gaps?.some((gap) => gap.includes("older tasking") && gap.includes("does not select findings"))).toBe(true);
        expect(report.findings?.every((finding) => ["external-intent", "stability"].includes(finding.topic))).toBe(true);
    });
    it("allows only the public-state focus for domestic-state collection", () => {
        const campaign = buildCampaign();
        const target = Object.keys(campaign.states)[0];
        const incompatible = taskCollection(campaign, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state",
            target, question: PUBLIC_STATE_QUESTION, focus: "overview" });
        expect(incompatible.ok).toBe(false);
        const accepted = taskCollection(campaign, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state",
            target, question: "Free text cannot broaden it", focus: "domestic-public-conditions", note: "  Routine note  " });
        if (!accepted.ok)
            throw new Error(accepted.reason);
        const tasking = selectStandingTaskings(apply(campaign, accepted.packet))[0];
        expect(tasking).toMatchObject({ focus: "domestic-public-conditions", note: "Routine note", question: COLLECTION_FOCUS_QUESTIONS["domestic-public-conditions"] });
    });
    it("lets DHS I&A snapshot public state conditions and requests without resident collection", () => {
        const base = buildCampaign();
        const state = Object.keys(base.states)[0];
        const original = base.states[state];
        const campaign = { ...base, states: { ...base.states, [state]: { ...original, claims: [{ signature: "relief:unrest", openedTurn: base.turn, expiresTurn: base.turn + 5, weight: 0.5, reason: "The governor publicly requests help with unrest." }] } } };
        const request = taskCollection(campaign, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state", target: state, question: PUBLIC_STATE_QUESTION });
        if (!request.ok)
            throw new Error(request.reason);
        const tasked = apply(campaign, request.packet);
        const filed = intelligencePhase(tasked).reduce((current, packet) => apply(current, packet), tasked);
        const report = selectCollectionProducts(filed)[0];
        expect(report).toMatchObject({ element: "IC-DHS", discipline: "osint", targetKind: "domestic-state", target: state, status: "findings", weight: 0 });
        expect(report.findings?.[0]?.source).toBe("governor request record");
        expect(report.findings?.[0]?.observation).toContain("publicly requests help");
        expect(report.gaps?.[0]).toContain("do not establish private conduct");
        expect(report.exposed).toBeUndefined();
        const changed = { ...filed, states: { ...filed.states, [state]: { ...filed.states[state], claims: [] } } };
        expect(selectCollectionProducts(changed)[0]).toEqual(report);
        expect(selectCollectionProducts(loadSave(createSave(changed)))[0]).toEqual(report);
    });
    it("limits public state analysis to DHS I&A open sources and a known state", () => {
        const campaign = buildCampaign();
        expect(taskCollection(campaign, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state", target: "NO-STATE", question: "What is public?" }).ok).toBe(false);
        const wrong = taskCollection(campaign, { element: "IC-FBI", discipline: "humint", targetKind: "domestic-state", target: Object.keys(campaign.states)[0], question: "Who is in the crowd?" });
        if (!wrong.ok)
            throw new Error(wrong.reason);
        const next = apply(campaign, wrong.packet);
        expect(selectRefusals(next)).toHaveLength(1);
        expect(selectStandingTaskings(next)).toHaveLength(0);
        const political = taskCollection(campaign, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state", target: Object.keys(campaign.states)[0], question: "Track the opposition in this state." });
        if (!political.ok)
            throw new Error(political.reason);
        expect(selectRefusals(apply(campaign, political.packet))).toHaveLength(1);
    });
    it("snapshots the actual target and visibility of an active foreign pursuit", () => {
        const base = buildCampaign();
        const pursuit = { id: "pursuit:ALP:USA:1", actor: "ALP", target: base.founding.nation,
            aim: "security", openedTurn: 1, commitment: 0.4, progress: 0.1, rungReached: 1, overt: false,
            lastActedTurn: base.turn, status: "active", beats: [] };
        const working = { ...base, pursuits: { [pursuit.id]: pursuit } };
        const tasking = { id: "tasking:IC-CIA:0", element: "IC-CIA", discipline: "humint",
            targetKind: "foreign-nation", target: "ALP", question: "Who is being pressed?", openedDay: 0,
            openedDate: base.calendar, standing: true };
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...working, seed: makeCampaignSeed(`pursuit-report-${index}`) }))
            .find((candidate) => draftCollectionProduct(candidate, tasking, 0, 0.8).status === "findings");
        if (!seeded)
            throw new Error("No collection seed returned findings");
        const report = draftCollectionProduct(seeded, tasking, 0, 0.8);
        const intent = report.findings?.find((item) => item.topic === "external-intent");
        expect(intent?.basis).toEqual({ kind: "pursuit", id: pursuit.id, target: base.founding.nation, overt: false, lastActedTurn: base.turn });
        expect(intent?.observation).toContain(base.nations[base.founding.nation].base.identity.name);
        expect(intent?.observation).not.toContain(pursuit.id);
    });
    it("files only assessed border evidence and preserves the selected disclosure after the incident changes", () => {
        const base = buildCampaign();
        const target = "ALP";
        const recipient = "BEE";
        const incidentId = `border-incident:${target}:${recipient}:${base.turn}`;
        const noPressure = { tensionBefore: 0, militaryThreatBefore: 0, tensionAdded: 0, militaryThreatAdded: 0 };
        const unresolved = { id: incidentId, parties: [target, recipient], openedTurn: base.turn,
            revision: 0, pressure: [noPressure, noPressure] };
        const tasking = { id: "tasking:border-review", element: "IC-NSA", discipline: "sigint",
            targetKind: "foreign-nation", target, question: "What does the border review show?",
            focus: "external-intent", openedDay: 0, openedDate: base.calendar, standing: true };
        const before = { ...base, borderIncidents: { [incidentId]: unresolved } };
        expect(Array.from({ length: 20 }, (_, index) => draftCollectionProduct({ ...before,
            seed: makeCampaignSeed(`border-unresolved-${index}`) }, tasking, 0, 0.8))
            .flatMap((report) => report.findings ?? []).some((entry) => entry.basis?.kind === "border-incident")).toBe(false);
        const assessed = { ...unresolved, revision: 1, assessment: { turn: base.turn,
                finding: "likely-inadvertent", confidence: "moderate",
                evidence: ["available orders logs contain no order to open fire", "radio records show confused position reports"] } };
        const working = { ...before, borderIncidents: { [incidentId]: assessed } };
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...working,
            seed: makeCampaignSeed(`border-assessed-${index}`) }))
            .find((candidate) => draftCollectionProduct(candidate, tasking, 0, 0.8).findings
            ?.some((entry) => entry.basis?.kind === "border-incident"));
        if (!seeded)
            throw new Error("No seed filed the assessed incident");
        const issued = draftCollectionProduct(seeded, tasking, 0, 0.8);
        const report = { ...issued, summary: "Private second fact in the report summary.", findings: [
                ...(issued.findings ?? []), { topic: "stability", observation: "A second private fact.",
                    source: "separate source", asOfDay: issued.day },
            ] };
        const selected = report.findings?.findIndex((entry) => entry.basis?.kind === "border-incident") ?? -1;
        expect(selected).toBeGreaterThanOrEqual(0);
        const finding = report.findings[selected];
        expect(finding.basis).toEqual({ kind: "border-incident", id: incidentId, parties: [target, recipient],
            assessmentTurn: base.turn, finding: "likely-inadvertent", confidence: "moderate" });
        expect(finding.observation).toContain("inadvertent fire likely");
        expect(finding.observation).toContain("do not establish who fired first");
        const existing = Object.values(seeded.relationships)[0];
        const eligible = { ...seeded, nations: { ...seeded.nations, [recipient]: seeded.nations[target] },
            relationships: { ...seeded.relationships, [`${base.founding.nation}:${recipient}`]: { ...existing,
                    from: base.founding.nation, to: recipient, trust: 0.5 } },
            security: { ...seeded.security, intelligence: { ...seeded.security.intelligence, archive: [report] } } };
        const sent = shareCollectionReport(eligible, report.id, [recipient], [selected]);
        if (!sent.ok)
            throw new Error(sent.reason);
        const received = apply(eligible, sent.packet);
        const revised = { ...received, borderIncidents: { [incidentId]: { ...assessed, revision: 2,
                    assessment: { turn: base.turn, finding: "undetermined",
                        confidence: "low", evidence: [] } } } };
        const uncertain = draftCollectionProduct(revised, tasking, 0, 0.8).findings
            ?.find((entry) => entry.basis?.kind === "border-incident");
        expect(uncertain?.observation).toContain("cannot establish who fired first or whether either command ordered it");
        expect(uncertain?.observation).not.toContain("inadvertent fire likely");
        const saved = loadSave(createSave(revised));
        expect(selectCollectionShares(saved)[0].report.findings).toEqual([finding]);
        expect(selectCollectionShares(saved)[0].disclosedFindingIndexes).toEqual([selected]);
        expect(selectCollectionShares(saved)[0].report.summary).toBe("Selected findings from the issued report.");
    });
    it("rotates bounded foreign take across eligible pursuits without rerolling an issued report", () => {
        const base = buildCampaign();
        const targets = ["USA", "T01", "T02", "T03", "T04", "T05"];
        const home = base.nations["USA"];
        const nations = { ...base.nations, ...Object.fromEntries(targets.slice(1).map((target) => [target, { ...home, base: { ...home.base, id: target,
                        identity: { ...home.base.identity, name: `Test government ${target}` } } }])) };
        const pursuits = Object.fromEntries(targets.map((target, index) => {
            const pursuit = { id: `pursuit:ALP:${target}:${index}`, actor: "ALP", target,
                aim: "security", openedTurn: 1, commitment: 0.4, progress: 0.1, rungReached: 1,
                overt: false, lastActedTurn: base.turn, status: "active", beats: [] };
            return [pursuit.id, pursuit];
        }));
        const working = { ...base, nations, pursuits };
        const tasking = { id: "tasking:rotating-humint", element: "IC-CIA", discipline: "humint",
            targetKind: "foreign-nation", target: "ALP", question: "What is changing?", openedDay: 0,
            openedDate: base.calendar, standing: true };
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...working, seed: makeCampaignSeed(`rotating-report-${index}`) }))
            .find((candidate) => Array.from({ length: 12 }, (_, cycle) => draftCollectionProduct(candidate, tasking, cycle * 28, 0.8))
            .filter((report) => report.status === "findings").length >= 8);
        if (!seeded)
            throw new Error("No collection seed returned enough reporting cycles");
        const reports = Array.from({ length: 12 }, (_, cycle) => draftCollectionProduct(seeded, tasking, cycle * 28, 0.8));
        const reported = reports.filter((report) => report.status === "findings");
        expect(reported.every((report) => (report.findings?.length ?? 0) <= 4)).toBe(true);
        expect(new Set(reported.flatMap((report) => report.findings ?? []).filter((finding) => finding.basis?.kind === "pursuit")
            .map((finding) => finding.basis?.kind === "pursuit" ? finding.basis.id : ""))).toEqual(new Set(Object.keys(pursuits)));
        expect(draftCollectionProduct(seeded, tasking, 0, 0.8)).toEqual(reports[0]);
        const issued = apply(seeded, { source: "simulate", actor: "world", turn: seeded.turn,
            narration: { summary: "The tasking filed." },
            effects: [{ kind: "intelligence", product: reported[0] }] });
        expect(loadSave(createSave(issued)).security.intelligence.archive?.[0]).toEqual(reported[0]);
    });
    it("does not strand equal-sized topics when a report can carry one finding", () => {
        const base = buildCampaign();
        const home = base.nations["USA"];
        const third = "T01";
        const nations = { ...base.nations, [third]: { ...home, base: { ...home.base, id: third,
                    identity: { ...home.base.identity, name: "Test government T01" } } } };
        const pursuits = Object.fromEntries((["USA", third]).map((target, index) => {
            const pursuit = { id: `pursuit:ALP:${target}:${index}`, actor: "ALP", target,
                aim: "security", openedTurn: 1, commitment: 0.4, progress: 0.1, rungReached: 1,
                overt: false, lastActedTurn: base.turn, status: "active", beats: [] };
            return [pursuit.id, pursuit];
        }));
        const unrest = { id: "condition:unrest:ALP:1", nation: "ALP",
            kind: "unrest", scope: "nation", severity: 0.6, startedTurn: 1, status: "active", beats: [] };
        const tasking = { id: "tasking:single-humint", element: "IC-CIA", discipline: "humint",
            targetKind: "foreign-nation", target: "ALP", question: "What is changing?", openedDay: 0,
            openedDate: base.calendar, standing: true };
        const working = { ...base, nations, pursuits, conditions: { ...base.conditions, [unrest.id]: unrest } };
        const read = (campaign) => Array.from({ length: 40 }, (_, cycle) => draftCollectionProduct(campaign, tasking, cycle * 28, 0.35))
            .flatMap((report) => report.findings ?? []).map((finding) => finding.observation);
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...working, seed: makeCampaignSeed(`equal-topic-rotation-${index}`) }))
            .find((campaign) => new Set(read(campaign)).size === 4);
        if (!seeded)
            throw new Error("No seed covered all four eligible findings");
        const observations = read(seeded);
        expect(new Set(observations).size).toBe(4);
    });
    it("rotates later public state requests into a bounded domestic report", () => {
        const base = buildCampaign();
        const state = Object.keys(base.states)[0];
        const claims = Array.from({ length: 7 }, (_, index) => ({ signature: `request:${index}`, openedTurn: base.turn,
            expiresTurn: base.turn + 10, weight: 0.5, reason: `Public request ${index}` }));
        const campaign = { ...base, states: { ...base.states, [state]: { ...base.states[state], claims } } };
        const tasking = { id: "tasking:public-requests", element: "IC-DHS", discipline: "osint",
            targetKind: "domestic-state", target: state, question: PUBLIC_STATE_QUESTION, openedDay: 0,
            openedDate: base.calendar, standing: true };
        const reports = Array.from({ length: 3 }, (_, cycle) => draftCollectionProduct(campaign, tasking, cycle * 28, 0));
        expect(reports.every((report) => report.findings?.length === 4)).toBe(true);
        expect(new Set(reports.flatMap((report) => report.findings ?? []).map((finding) => finding.observation)).size).toBe(7);
    });
    it("keeps each discipline inside its allowed topics", () => {
        const base = buildCampaign();
        const tasking = { id: "tasking:discipline", element: "IC-CIA", discipline: "humint",
            targetKind: "foreign-nation", target: "ALP", question: "What is changing?", openedDay: 0,
            openedDate: base.calendar, standing: true };
        const campaign = { ...base, seed: makeCampaignSeed("discipline-pool") };
        for (const discipline of ["humint", "sigint", "geoint", "masint", "osint", "finint", "all-source"]) {
            const report = draftCollectionProduct(campaign, { ...tasking, discipline }, 0, 0.8);
            const allowed = {
                humint: ["external-intent", "stability"], sigint: ["external-intent", "military-readiness"],
                geoint: ["military-readiness"], masint: ["military-readiness"],
                osint: ["stability", "financial-pressure"], finint: ["financial-pressure"],
                "all-source": ["external-intent", "military-readiness", "financial-pressure", "stability"],
            }[discipline];
            expect(report.findings?.every((finding) => allowed.includes(finding.topic)) ?? true).toBe(true);
            expect(report.findings?.every((finding) => finding.topic !== "domestic-security") ?? true).toBe(true);
        }
    });
    it("does not leak a concealed pursuit through open-source or financial collection", () => {
        const base = buildCampaign();
        const pursuit = { id: "pursuit:ALP:USA:private", actor: "ALP",
            target: base.founding.nation, aim: "security", openedTurn: 1, commitment: 0.4,
            progress: 0.1, rungReached: 1, overt: false, lastActedTurn: base.turn,
            status: "active", beats: [] };
        const campaign = { ...base, pursuits: { [pursuit.id]: pursuit }, seed: makeCampaignSeed("private-pursuit-filter") };
        const tasking = { id: "tasking:private-filter", element: "IC-CIA",
            targetKind: "foreign-nation", target: "ALP", question: "What is changing?",
            openedDay: 0, openedDate: base.calendar, standing: true };
        for (const discipline of ["osint", "finint"]) {
            const reports = Array.from({ length: 20 }, (_, cycle) => draftCollectionProduct(campaign, { ...tasking, discipline }, cycle * 28, 0.8));
            const findings = reports.flatMap((report) => report.findings ?? []);
            expect(findings.length).toBeGreaterThan(0);
            expect(findings.every((finding) => finding.basis?.kind !== "pursuit" && finding.topic !== "external-intent")).toBe(true);
        }
    });
    it("can report an active foreign support commitment without claiming a hidden aim", () => {
        const base = buildCampaign();
        const aid = { id: "commitment:aid:ALP:USA:1", kind: "aid", actor: "ALP",
            target: { kind: "nation", id: "USA" }, resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 20 },
            source: { kind: "budgetLine", line: "foreignAffairs" }, startedTurn: 1, review: "standing", status: "active",
            rationale: "Budgeted support." };
        const campaign = { ...base, commitments: { ...base.commitments, [aid.id]: aid } };
        const tasking = { id: "tasking:foreign-support", element: "IC-CIA", discipline: "humint",
            targetKind: "foreign-nation", target: "ALP", question: "What is changing?", openedDay: 0,
            openedDate: base.calendar, standing: true };
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...campaign, seed: makeCampaignSeed(`support-report-${index}`) }))
            .find((candidate) => draftCollectionProduct(candidate, tasking, 0, 0.8).status === "findings");
        if (!seeded)
            throw new Error("No support collection seed returned findings");
        const reports = Array.from({ length: 4 }, (_, cycle) => draftCollectionProduct(seeded, tasking, cycle * 28, 0.8));
        const support = reports.flatMap((report) => report.findings ?? []).find((finding) => finding.source === "active foreign support commitment record");
        expect(support?.observation).toContain("aid commitment to United States");
        expect(support?.observation).toContain("does not establish an unannounced objective");
        expect(support?.basis).toBeUndefined();
    });
    it("rotates live retaliation into financial reports, then leaves a lifted measure only in the archive", () => {
        const base = buildCampaign();
        const measures = Object.fromEntries(TRADE_SECTOR_IDS.slice(0, 6).map((sector, index) => {
            const measure = { id: `retaliation:test:${index}`, kind: "tariff", sector,
                target: "ALP", actor: "ALP", rate: (index + 1) / 10,
                imposedTurn: base.turn, imposedDate: base.calendar, authority: "INST-USTR", origin: "retaliation" };
            return [measure.id, measure];
        }));
        const lifted = { ...Object.values(measures)[0], id: "retaliation:lifted", rate: 0.9,
            liftedTurn: base.turn };
        const future = { ...Object.values(measures)[0], id: "retaliation:future", rate: 0.95,
            imposedTurn: base.turn + 1 };
        const working = { ...base, trade: { ...base.trade, measures: { ...base.trade.measures, ...measures,
                    [lifted.id]: lifted, [future.id]: future } } };
        const tasking = { id: "tasking:retaliation", element: "IC-TREASURY", discipline: "finint",
            targetKind: "foreign-nation", target: "ALP", question: "What pressure is active?",
            openedDay: 0, openedDate: base.calendar, standing: true };
        const seeded = Array.from({ length: 100 }, (_, index) => ({ ...working, seed: makeCampaignSeed(`retaliation-report-${index}`) }))
            .find((campaign) => Array.from({ length: 8 }, (_, cycle) => draftCollectionProduct(campaign, tasking, cycle * 28, 0.8))
            .flatMap((report) => report.findings ?? []).filter((finding) => finding.source === "active trade measure register").length >= 6);
        if (!seeded)
            throw new Error("No retaliation collection seed returned enough reports");
        const reports = Array.from({ length: 8 }, (_, cycle) => draftCollectionProduct(seeded, tasking, cycle * 28, 0.8));
        const tradeFindings = reports.flatMap((report) => report.findings ?? []).filter((finding) => finding.source === "active trade measure register");
        expect(new Set(tradeFindings.map((finding) => finding.observation)).size).toBe(6);
        expect(tradeFindings.every((finding) => !finding.observation.includes("90%") && !finding.observation.includes("95%"))).toBe(true);
        const first = reports.find((report) => report.status === "findings");
        const issued = apply(seeded, { source: "simulate", actor: "world", turn: seeded.turn,
            narration: { summary: "The financial tasking filed." }, effects: [{ kind: "intelligence", product: first }] });
        const removed = { ...issued, trade: { ...issued.trade, measures: Object.fromEntries(Object.entries(issued.trade.measures).map(([id, measure]) => [id,
                    id === Object.keys(measures)[0] ? { ...measure, liftedTurn: issued.turn } : measure])) } };
        const later = Array.from({ length: 8 }, (_, cycle) => draftCollectionProduct(removed, tasking, (cycle + 1) * 28, 0.8))
            .flatMap((report) => report.findings ?? []).filter((finding) => finding.source === "active trade measure register");
        expect(later.length).toBeGreaterThan(0);
        expect(later.some((finding) => finding.observation.includes("10%"))).toBe(false);
        expect(selectCollectionProducts(loadSave(createSave(removed)))[0]).toEqual(first);
    });
    it("refuses a person target that names no open case before promising an answer", () => {
        const result = taskCollection(buildCampaign(), { element: "IC-CIA", discipline: "humint", targetKind: "foreign-person", target: "a minister", question: "What do they intend?" });
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toContain("open case");
    });
    it("reissues a real covert watch with a distinct report on the same turn", () => {
        const campaign = buildCampaign();
        const request = { actor: campaign.founding.nation, target: "ALP", instrument: "covert", rung: 1 };
        const seeded = Array.from({ length: 200 }, (_, index) => ({ ...campaign, seed: makeCampaignSeed(`covert-watch-${index}`) }))
            .find((candidate) => {
            const result = resolveAction(candidate, request, createRngStreams(candidate.seed));
            return result.ok && result.success;
        });
        if (!seeded)
            throw new Error("No seeded covert watch landed");
        const first = resolveAction(seeded, request, createRngStreams(seeded.seed));
        if (!first.ok)
            throw new Error(first.reason);
        const afterFirst = apply(seeded, first.packet);
        const second = resolveAction(afterFirst, request, createRngStreams(afterFirst.seed));
        if (!second.ok)
            throw new Error(second.reason);
        const afterSecond = apply(afterFirst, second.packet);
        const reports = selectCollectionProducts(afterSecond);
        expect(reports).toHaveLength(2);
        expect(new Set(reports.map((report) => report.id)).size).toBe(2);
        expect(reports.every((report) => report.status === "findings" || report.status === "no-result")).toBe(true);
    });
    it("a real watch can be exposed or fail and still file findings, or return no usable result", () => {
        const base = buildCampaign();
        const target = "ALP";
        const runtime = base.nations[target];
        const relation = Object.values(base.relationships)[0];
        const defended = { ...base, nations: { ...base.nations, [target]: { ...runtime, stats: { ...runtime.stats, security: { ...runtime.stats.security, counterIntel: 1 } } } }, relationships: { ...base.relationships, [`${target}:${base.founding.nation}`]: { ...relation, from: target, to: base.founding.nation } } };
        const request = { actor: base.founding.nation, target, instrument: "covert", rung: 1 };
        let usefulExposed = false;
        let usefulFailed = false;
        let noResult = false;
        for (let index = 0; index < 1000 && !(usefulExposed && usefulFailed && noResult); index++) {
            const candidate = { ...defended, seed: makeCampaignSeed(`watch-outcome-${index}`) };
            const result = resolveAction(candidate, request, createRngStreams(candidate.seed));
            if (!result.ok)
                continue;
            const report = selectCollectionProducts(apply(candidate, result.packet))[0];
            usefulExposed ||= result.success && report?.exposed === true && report.status === "findings";
            if (!result.success && report?.status === "findings") {
                usefulFailed = true;
                expect(result.packet.narration?.summary).toContain("limited reporting reached the desk");
                const replay = resolveAction(candidate, request, createRngStreams(candidate.seed));
                expect(replay).toEqual(result);
                if (replay.ok)
                    expect(selectCollectionProducts(apply(candidate, replay.packet))[0]).toEqual(report);
            }
            noResult ||= report?.status === "no-result";
        }
        expect(usefulExposed).toBe(true);
        expect(usefulFailed).toBe(true);
        expect(noResult).toBe(true);
    });
    it("loads v63 generic collection notes without inventing findings", () => {
        const campaign = buildCampaign();
        const report = draftSurveillanceProduct(campaign, "ALP", 0, "legacy-note", false);
        const { status: _status, confidence: _confidence, findings: _findings, gaps: _gaps, targetKind: _targetKind, exposed: _exposed, ...legacy } = report;
        const { archive: archivedReports, shares: sharedReports, ...intelligence } = campaign.security.intelligence;
        void archivedReports;
        void sharedReports;
        const old = { ...campaign, security: { ...campaign.security, intelligence: { ...intelligence, products: { [legacy.tasking]: legacy } } } };
        const loaded = loadSave({ schemaVersion: 63, campaign: old });
        expect(selectCollectionProducts(loaded)).toEqual([legacy]);
        expect(selectCollectionProducts(loaded)[0]?.findings).toBeUndefined();
    });
    it("keeps foreign collection independent of exposure", () => {
        const campaign = buildCampaign();
        const clear = draftSurveillanceProduct(campaign, "ALP", 0, "foreign-example", false);
        const exposed = draftSurveillanceProduct(campaign, "ALP", 0, "foreign-example", true);
        expect(exposed.findings).toEqual(clear.findings);
        expect(exposed.exposed).toBe(true);
    });
    it("archives an issued snapshot after the tasking closes", () => {
        const campaign = buildCampaign();
        const request = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation", target: "ALP", question: "What is changing?" });
        if (!request.ok)
            throw new Error(request.reason);
        const tasked = apply(campaign, request.packet);
        const filed = intelligencePhase(tasked).reduce((state, packet) => apply(state, packet), tasked);
        const report = selectCollectionProducts(filed)[0];
        expect(report.status === "findings" || report.status === "no-result").toBe(true);
        expect(report.gaps?.length).toBeGreaterThan(0);
        const close = closeTasking(filed, selectStandingTaskings(filed)[0].id);
        if (!close.ok)
            throw new Error(close.reason);
        const closed = apply(filed, close.packet);
        expect(selectCollectionProducts(closed)).toEqual([report]);
        expect(Object.keys(closed.security.intelligence.products)).toHaveLength(0);
        expect(collectionAgainst(closed, "ALP", ["IC-NSA"])).toHaveLength(0);
        expect(collectionAgainst(withWeeksElapsed(filed, 5), "ALP", ["IC-NSA"])).toHaveLength(0);
        expect(loadSave(createSave(closed)).security.intelligence.archive).toEqual([report]);
    });
    it("shares only a chosen report and cannot grant the same recipient twice", () => {
        const campaign = buildCampaign();
        const request = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation", target: "ALP", question: "What is changing?" });
        if (!request.ok)
            throw new Error(request.reason);
        const tasked = apply(campaign, request.packet);
        const filed = intelligencePhase(tasked).reduce((state, packet) => apply(state, packet), tasked);
        const report = selectCollectionProducts(filed)[0];
        const recipient = "BEE";
        const existing = Object.values(filed.relationships)[0];
        const eligible = { ...filed, nations: { ...filed.nations, [recipient]: filed.nations["ALP"] }, relationships: { ...filed.relationships, [`${campaign.founding.nation}:${recipient}`]: { ...existing, from: campaign.founding.nation, to: recipient, trust: 0.5 } } };
        const sent = shareCollectionReport(eligible, report.id, [recipient]);
        expect(sent.ok).toBe(true);
        if (!sent.ok)
            return;
        const next = apply(eligible, sent.packet);
        expect(selectCollectionShares(next)[0]?.report).toEqual(report);
        expect(selectCollectionShares(apply(next, sent.packet))).toHaveLength(1);
        const repeated = shareCollectionReport(next, report.id, [recipient]);
        expect(repeated.ok).toBe(true);
        if (repeated.ok)
            expect(repeated.packet.effects).toHaveLength(0);
    });
    it("sends only the selected finding in a partial disclosure", () => {
        const campaign = buildCampaign();
        const request = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation", target: "ALP", question: "What is changing?" });
        if (!request.ok)
            throw new Error(request.reason);
        const tasked = apply(campaign, request.packet);
        const filed = intelligencePhase(tasked).reduce((state, packet) => apply(state, packet), tasked);
        const original = selectCollectionProducts(filed)[0];
        const findings = [
            { topic: "external-intent", observation: "Disclose this fact.", source: "A dated source", asOfDay: original.day },
            { topic: "stability", observation: "Keep this fact private.", source: "Another dated source", asOfDay: original.day },
        ];
        const report = { ...original, status: "findings", summary: "Both facts appear in this secret summary.", findings,
            gaps: ["A private gap about the second fact."] };
        const recipient = "BEE";
        const existing = Object.values(filed.relationships)[0];
        const eligible = { ...filed, nations: { ...filed.nations, [recipient]: filed.nations["ALP"] },
            relationships: { ...filed.relationships, [`${campaign.founding.nation}:${recipient}`]: { ...existing, from: campaign.founding.nation, to: recipient, trust: 0.5 } },
            security: { ...filed.security, intelligence: { ...filed.security.intelligence, archive: [report] } } };
        const invalid = shareCollectionReport(eligible, report.id, [recipient], [2]);
        expect(invalid.ok).toBe(false);
        const sent = shareCollectionReport(eligible, report.id, [recipient], [0]);
        expect(sent.ok).toBe(true);
        if (!sent.ok)
            return;
        const received = selectCollectionShares(apply(eligible, sent.packet))[0].report;
        expect(received.findings).toEqual([findings[0]]);
        expect(received.summary).not.toContain("secret summary");
        expect(received.gaps).toEqual([]);
        expect(selectCollectionProducts(eligible)[0]).toEqual(report);
        const first = loadSave(createSave(apply(eligible, sent.packet)));
        const repeated = shareCollectionReport(first, report.id, [recipient], [0]);
        expect(repeated.ok).toBe(true);
        if (repeated.ok)
            expect(repeated.packet.effects).toHaveLength(0);
        const more = shareCollectionReport(first, report.id, [recipient], [0, 1]);
        expect(more.ok).toBe(true);
        if (!more.ok)
            return;
        const second = loadSave(createSave(apply(first, more.packet)));
        const receipts = selectCollectionShares(second);
        expect(receipts).toHaveLength(2);
        expect(receipts.map((share) => share.report.findings)).toEqual([[findings[0]], [findings[1]]]);
        expect(receipts.map((share) => share.disclosedFindingIndexes)).toEqual([[0], [1]]);
        expect(shareCollectionReport(second, report.id, [recipient], [1]).ok).toBe(true);
        const last = shareCollectionReport(second, report.id, [recipient], [1]);
        if (last.ok)
            expect(last.packet.effects).toHaveLength(0);
    });
});
describe("the referral clock", () => {
    it("moves on its own days rather than on anything the administration does", () => {
        const campaign = buildCampaign();
        const attempt = taskCollection(campaign, {
            element: "IC-CIA",
            discipline: "humint",
            targetKind: "domestic-politics",
            target: "the opposition",
            question: "Find something on them.",
        });
        if (!attempt.ok)
            throw new Error("expected the refusal to be recorded");
        const opened = apply(campaign, attempt.packet);
        expect(intelligencePhase(opened)).toHaveLength(0);
        const later = withWeeksElapsed(opened, Math.ceil(REFERRAL_CREDIBILITY_DAYS / 7) + 1);
        const packets = intelligencePhase(later);
        expect(packets).toHaveLength(1);
        const settled = packets.reduce((state, packet) => apply(state, packet), later);
        expect(settled.security.intelligence.referrals[0]?.stage).toBe("transmitted");
        // Reaching the committees costs the administration with the Hill.
        expect(settled.congress.disposition).toBeLessThan(later.congress.disposition);
    });
});
// Assessments used to be pull-only: `commissionAssessment` had exactly one
// caller, an "Ask the community" button behind a question picker and a country
// picker. So the epistemics this engine is proudest of arrived only when the
// player thought to go and ask, which in a world that never pressed them was
// never.
describe("what the community writes without being asked", () => {
    function pressed(campaign, lastActedTurn) {
        const pursuit = {
            id: "pursuit:ALP:USA:1",
            actor: "ALP",
            target: campaign.founding.nation,
            aim: "security",
            openedTurn: 1,
            commitment: 0.4,
            progress: -0.1,
            rungReached: 3,
            overt: true,
            lastActedTurn,
            status: "active",
            beats: [],
        };
        return { ...campaign, pursuits: { [pursuit.id]: pursuit } };
    }
    it("writes an intent judgment on a government pressing the United States", () => {
        const campaign = buildCampaign();
        const working = pressed(campaign, campaign.turn);
        const settled = intelligencePhase(working).reduce((state, packet) => apply(state, packet), working);
        const issued = selectAssessments(settled).filter((assessment) => assessment.question === "intent" && assessment.target === "ALP");
        expect(issued).toHaveLength(1);
        expect(issued[0].judgment.length).toBeGreaterThan(0);
    });
    it("does not rewrite the same judgment every week", () => {
        const campaign = buildCampaign();
        const working = pressed(campaign, campaign.turn);
        const settled = intelligencePhase(working).reduce((state, packet) => apply(state, packet), working);
        expect(intelligencePhase(settled)).toHaveLength(0);
    });
    it("stays quiet about a government that has not moved on the United States lately", () => {
        const campaign = buildCampaign();
        const stale = pressed(campaign, campaign.turn - 6);
        expect(intelligencePhase(stale)).toHaveLength(0);
    });
});
