import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { addDays, apply, campaignDay, commitReply, createRngStreams, createSave, draftSurveillanceProduct, loadSave, localeAct, localeActCost, projectReply } from "@admin/engine";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { REPORT_SCENARIO_FIXTURES } from "./__fixtures__/report-scenarios.js";
import { auditScenario } from "./scenario-audit.js";
import { bindCounterpart, castScenario, castStillBound, rememberReply } from "./scenario-cast.js";
import { ScenarioDef as ScenarioSchema } from "./scenario.js";
import { reportBoards } from "./preview-board-report.js";
import { inactionPacket } from "./scenario-memory.js";
import { reportTokens } from "./scenario-report.js";
const base = FIXTURE_SCENARIOS[0];
function issued(campaign, target, id) {
    return {
        id, tasking: "task-report-probe", element: "IC-CIA",
        discipline: "humint", target, targetKind: "foreign-nation", question: "What is the current posture?",
        day: campaignDay(campaign), date: campaign.calendar, weight: 0.8, summary: "A sourced warning reached the President.",
        status: "findings", confidence: "high", exposed: false,
        findings: [{ topic: "external-intent", observation: "The other cabinet is preparing an overt move.", source: "A corroborated liaison report", asOfDay: campaignDay(campaign) }],
    };
}
function withReports(campaign, reports, shares = []) {
    return { ...campaign, security: { ...campaign.security, intelligence: {
                ...campaign.security.intelligence, archive: reports, shares,
            } } };
}
function definition(bind = "target", shared = false) {
    return {
        ...base, id: `report-probe-${bind}`, cast: { pick: "collectionReport", bind },
        conditions: [{ kind: "collectionReport", targetKind: "foreign-nation", topic: "external-intent", confidence: "moderate", shared }],
        subject: "The report {{reportId}} names {{reportTarget}}.",
        opening: [{ speaker: { kind: "narrator" }, text: "{{reportFinding}} The source is {{reportSource}}. Confidence is {{reportConfidence}}." }],
        replies: base.replies.map((reply) => ({ ...reply, press: undefined })),
    };
}
describe("issued report scenario binding", () => {
    const campaign = sealedCampaign("issued-report-gate");
    const target = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
    it("pins the issued finding and a deterministic occurrence to its report", () => {
        const report = issued(campaign, target, "report-a");
        const state = withReports(campaign, [report]);
        const def = definition();
        const cast = castScenario(state, def);
        expect(bindCounterpart(state, def)).toBe(target);
        expect(cast.occurrence).toBe("report-probe-target@report:report-a");
        expect(cast.script.subject).toContain("report-a");
        expect(cast.script.opening[0]?.text).toContain("A corroborated liaison report");
        expect(cast.report).toMatchObject({ id: "report-a", confidence: "high", exposed: false, target });
        const nextDay = { ...state, calendar: addDays(state.calendar, 1) };
        const later = withReports(nextDay, [issued(nextDay, target, "report-b"), report]);
        expect(castStillBound(later, cast)).toBe(true);
        expect(castScenario(later, def)?.occurrence).toBe("report-probe-target@report:report-b");
        expect(castStillBound({ ...state, calendar: addDays(state.calendar, 28) }, cast)).toBe(false);
    });
    it("pins the recipient of a shared report and keeps its answer classified", () => {
        const report = issued(campaign, target, "report-shared");
        const recipient = Object.keys(campaign.nations).find((id) => id !== target && id !== campaign.founding.nation);
        const share = { id: "share-a", reportId: report.id, recipient, day: report.day, date: report.date, report };
        const state = withReports(campaign, [report], [share]);
        const def = definition("recipient", true);
        const cast = castScenario(state, def);
        expect(cast.counterpart).toBe(recipient);
        expect(cast.occurrence).toContain("report-shared:share-a");
        expect(cast.report?.share?.recipient).toBe(recipient);
        expect(cast.script.visibility).toBe("intelligence");
        const silence = inactionPacket(state, cast);
        expect(silence.provenance?.visibility).toBe("intelligence");
        expect(silence.effects.some((effect) => effect.kind === "feed")).toBe(false);
        const answer = commitReply(state, cast.script, cast.script.options[0], createRngStreams(state.seed));
        expect(answer.ok).toBe(true);
        if (answer.ok)
            expect(answer.packet.provenance?.visibility).toBe("intelligence");
        const packet = { source: "conversation", actor: "player", turn: state.turn, narration: { summary: "The President answered." }, effects: [] };
        const effects = rememberReply(state, packet, cast, def.replies[0].id).effects;
        const items = effects.flatMap((effect) => effect.kind === "feed" ? effect.items : []);
        expect(items).toHaveLength(1);
        expect(items[0]?.visibility).toBe("intelligence");
        expect(castStillBound(withReports(state, [report]), cast)).toBe(false);
    });
    it("binds a shared scenario only to findings disclosed to that recipient", () => {
        const report = issued(campaign, target, "report-partial");
        const recipient = Object.keys(campaign.nations).find((id) => id !== target && id !== campaign.founding.nation);
        const undisclosed = report.findings[0];
        const disclosed = { topic: "stability", observation: "A different finding was sent.", source: "a dated source", asOfDay: report.day };
        const full = { ...report, findings: [undisclosed, disclosed] };
        const partial = { ...full, summary: "Selected findings from the issued report.", findings: [disclosed], gaps: [] };
        const share = { id: "share-partial", reportId: report.id, recipient, day: report.day, date: report.date, report: partial };
        const state = withReports(campaign, [full], [share]);
        expect(castScenario(state, definition("recipient", true))).toBeUndefined();
        const allowed = { ...definition("recipient", true), id: "report-disclosed", conditions: [{ kind: "collectionReport",
                    targetKind: "foreign-nation", topic: "stability", confidence: "moderate", shared: true }] };
        const bound = castScenario(state, allowed)?.report;
        expect(bound?.findings).toEqual([disclosed]);
        expect(bound?.share?.partial).toBe(true);
        expect(reportTokens(state, bound).reportGaps).toContain("not provided");
    });
    it("audits mismatched binders and authored press disclosure", () => {
        const def = definition("recipient", false);
        const unsafe = { ...def, replies: def.replies.map((reply) => ({ ...reply, press: "The classified report says the cabinet is preparing to move." })) };
        const kinds = auditScenario(unsafe).map((finding) => finding.kind);
        expect(kinds).toContain("ungrounded-report");
        expect(kinds).toContain("classified-report-disclosure");
    });
    it("parses and binds both sourced decision fixtures with production-shaped report data", () => {
        const report = issued(campaign, target, "report-fixture");
        const recipient = Object.keys(campaign.nations).find((id) => id !== target && id !== campaign.founding.nation);
        const share = { id: "share-fixture", reportId: report.id, recipient, day: report.day, date: report.date, report };
        for (const def of REPORT_SCENARIO_FIXTURES) {
            expect(ScenarioSchema.safeParse(def).success, def.id).toBe(true);
            expect(auditScenario(def).filter((finding) => finding.severity === "error"), def.id).toEqual([]);
            expect(auditScenario(def).filter((finding) => finding.kind === "foreign-cast-no-transmission"), def.id).toEqual([]);
            const state = withReports(campaign, [report], def.cast.pick === "collectionReport" && def.cast.bind === "recipient" ? [share] : []);
            const cast = castScenario(state, def);
            expect(cast, def.id).toBeDefined();
            expect([cast.script.subject, ...cast.script.opening.map((beat) => beat.text)].join(" ")).not.toContain("{{");
        }
    });
    it("builds reachable boards from issued foreign and typed wildfire reports", () => {
        const foreign = REPORT_SCENARIO_FIXTURES[0];
        const domestic = {
            ...foreign, id: "report-wildfire-probe", class: "disaster",
            cast: { pick: "collectionReport", bind: "home" },
            conditions: [{ kind: "collectionReport", targetKind: "domestic-state", topic: "domestic-security",
                    basis: "state-condition", condition: "wildfire", confidence: "low" }],
        };
        const boards = reportBoards([foreign, domestic]);
        expect(boards).toHaveLength(2);
        expect(castScenario(boards[0], foreign)?.report?.topic).toBe("external-intent");
        expect(castScenario(boards[1], domestic)?.report?.condition).toBe("wildfire");
    });
    it("binds an issued no-result report without turning the absence into reassurance", () => {
        const report = { ...issued(campaign, target, "report-empty"), status: "no-result",
            confidence: "low", findings: [], gaps: ["Collection cannot establish that unobserved activity is absent."],
            summary: "The operation returned no usable result; the absence of reporting is not reassurance." };
        const def = { ...definition(), id: "report-no-result", subject: "{{reportSummary}}",
            conditions: [{ kind: "collectionReport", targetKind: "foreign-nation", status: "no-result" }],
            opening: [{ speaker: { kind: "narrator" }, text: "{{reportSummary}} The recorded gap is {{reportGaps}}" }] };
        const cast = castScenario(withReports(campaign, [report]), def);
        expect(cast?.report).toMatchObject({ id: "report-empty", status: "no-result", findings: [], gaps: report.gaps });
        expect(cast?.script.opening[0]?.text).toContain("absence of reporting is not reassurance");
        expect(auditScenario(def).filter((finding) => finding.kind === "ungrounded-report")).toEqual([]);
        const invented = { ...def, opening: [{ speaker: { kind: "narrator" }, text: "{{reportFinding}} The source is {{reportSource}}." }] };
        expect(auditScenario(invented).map((finding) => finding.kind)).toContain("ungrounded-report");
        expect(castScenario(reportBoards([def])[0], def)?.report?.status).toBe("no-result");
    });
    it("requires a real open tasking before offering to close a no-result report", () => {
        const def = { ...definition(), id: "report-open-tasking", class: "technology",
            conditions: [{ kind: "collectionReport", targetKind: "foreign-nation", status: "no-result", activeTasking: true }],
            opening: [{ speaker: { kind: "narrator" }, text: "{{reportSummary}} {{reportGaps}}" }] };
        const board = reportBoards([def])[0];
        const cast = castScenario(board, def);
        const taskingId = cast.report.tasking;
        expect(board.security.intelligence.taskings[taskingId]?.closedDay).toBeUndefined();
        const missing = { ...board, security: { ...board.security, intelligence: { ...board.security.intelligence,
                    taskings: Object.fromEntries(Object.entries(board.security.intelligence.taskings).filter(([id]) => id !== taskingId)) } } };
        expect(castScenario(missing, def)).toBeUndefined();
        expect(castStillBound(missing, cast)).toBe(false);
        const closed = { ...board, security: { ...board.security, intelligence: { ...board.security.intelligence,
                    taskings: { ...board.security.intelligence.taskings, [taskingId]: { ...board.security.intelligence.taskings[taskingId], closedDay: campaignDay(board) } } } } };
        expect(castScenario(closed, def)).toBeUndefined();
        expect(castStillBound(closed, cast)).toBe(false);
        const surveillance = draftSurveillanceProduct(board, cast.counterpart, campaignDay(board), "surveillance-action-product", false);
        expect(surveillance.status).toBe("no-result");
        expect(castScenario(withReports(board, [surveillance]), def)).toBeUndefined();
    });
    it("executes a report-pinned collection task through the real tasking boundary", () => {
        const report = issued(campaign, target, "report-task-source");
        const state = withReports(campaign, [report]);
        const baseDef = definition();
        const def = { ...baseDef, replies: baseDef.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, collection: { action: "task", element: "IC-DIA", discipline: "all-source",
                            question: "What other reporting bears on this foreign government?" } } } : reply) };
        const cast = castScenario(state, def);
        const option = cast.script.options[0];
        const projection = projectReply(state, cast.script, option, createRngStreams(state.seed));
        expect(projection.available).toBe(true);
        const result = commitReply(state, cast.script, option, createRngStreams(state.seed));
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.packet.effects).toContainEqual(expect.objectContaining({ kind: "intelligence",
            tasking: expect.objectContaining({ element: "IC-DIA", target, targetKind: "foreign-nation" }) }));
    });
    it("signs federal relief only for a pinned governor request and active wildfire", () => {
        const baseDef = definition();
        const def = { ...baseDef, id: "report-relief-request", class: "disaster",
            cast: { pick: "collectionReport", bind: "home" },
            conditions: [{ kind: "collectionReport", targetKind: "domestic-state", topic: "domestic-security",
                    basis: "governor-request", condition: "wildfire", confidence: "low" }],
            replies: baseDef.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, cost: {}, relief: true } } : reply) };
        const state = reportBoards([def])[0];
        const cast = castScenario(state, def);
        const option = cast.script.options[0];
        const billId = Object.values(state.bills).find((bill) => bill.act === "act-disaster-recovery").id;
        const withoutLaw = { ...state, bills: { ...state.bills,
                [billId]: { ...state.bills[billId], status: "dead" } } };
        const unbound = castScenario(withoutLaw, def).script.options[0];
        expect(projectReply(withoutLaw, cast.script, unbound, createRngStreams(state.seed)).available).toBe(false);
        expect(commitReply(withoutLaw, cast.script, unbound, createRngStreams(state.seed)).ok).toBe(false);
        expect(projectReply(state, cast.script, option, createRngStreams(state.seed)).available).toBe(true);
        const result = commitReply(state, cast.script, option, createRngStreams(state.seed));
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.packet.effects).toContainEqual(expect.objectContaining({ kind: "order",
            set: expect.objectContaining({ order: "order-relief-program", subject: expect.objectContaining({ cause: "wildfire" }) }) }));
    });
    it.each(["relief", "review"])("executes the pinned state %s act at its real price", (act) => {
        const baseDef = definition();
        const def = { ...baseDef, id: `report-locale-${act}`, class: "disaster",
            cast: { pick: "collectionReport", bind: "home" },
            conditions: [{ kind: "collectionReport", targetKind: "domestic-state", topic: "domestic-security",
                    basis: "governor-request", condition: "wildfire", confidence: "low" }],
            replies: baseDef.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, cost: {}, localeAct: act } } : reply) };
        const state = reportBoards([def])[0];
        const cast = castScenario(state, def);
        const option = cast.script.options[0];
        const projection = projectReply(state, cast.script, option, createRngStreams(state.seed));
        expect(projection.available).toBe(true);
        expect(projection.cost.treasury).toBe(-localeActCost(state, localeAct(act)));
        const result = commitReply(state, cast.script, option, createRngStreams(state.seed));
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(result.packet.effects).toContainEqual(expect.objectContaining({ kind: "state", state: cast.report.target }));
        expect(result.packet.effects).toContainEqual(expect.objectContaining({ kind: "metric",
            deltas: expect.objectContaining({ treasury: -localeActCost(state, localeAct(act)) }) }));
    });
    it.each([
        ["issued-report-decisions-2026-10-12", "issued-report-decisions-2026-10-12-0001"],
        ["issued-report-decisions-2026-10-12", "issued-report-decisions-2026-10-12-0002"],
        ["issued-report-decisions-2026-10-12", "issued-report-decisions-2026-10-12-0003"],
        ["issued-empty-surveillance-2026-10-12", "issued-empty-surveillance-2026-10-12-0001"],
    ])("commits every authored option from %s/%s and preserves its report across a save", (job, item) => {
        const file = new URL(`./__fixtures__/authored-regressions/${item}.out.json`, import.meta.url);
        const [def] = ScenarioSchema.array().parse(JSON.parse(readFileSync(file, "utf8")));
        expect(def).toBeDefined();
        const board = reportBoards([def])[0];
        const cast = castScenario(board, def);
        expect(cast).toBeDefined();
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(board))));
        expect(castStillBound(restored, cast)).toBe(true);
        expect(castStillBound({ ...restored, calendar: addDays(restored.calendar, 28) }, cast)).toBe(false);
        for (const option of cast.script.options) {
            const streams = createRngStreams(board.seed);
            const projection = projectReply(board, cast.script, option, streams);
            expect(projection.available, `${def.id}/${option.id}`).toBe(true);
            const committed = commitReply(board, cast.script, option, createRngStreams(board.seed));
            expect(committed.ok, `${def.id}/${option.id}`).toBe(true);
            if (!committed.ok)
                continue;
            const remembered = rememberReply(apply(board, committed.packet), committed.packet, cast, option.id);
            const saved = loadSave(JSON.parse(JSON.stringify(createSave(apply(board, remembered)))));
            expect(saved.player.flags[`scenario-answer:${def.id}:${option.id}`], `${def.id}/${option.id}`).toBe(true);
        }
    });
});
