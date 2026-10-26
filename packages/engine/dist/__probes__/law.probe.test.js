import { beforeAll, describe, expect, it } from "vitest";
import { foundedForBalance, playCampaign } from "../balance-harness.js";
import { imposeTariff } from "../tariff-orders.js";
import { TARIFF_STATUTES } from "../tariff-statutes.js";
import { apply } from "../effects.js";
import { campaignTurnPhases } from "../turn-phases.js";
import { advanceOneDay } from "../day-step.js";
import { withDueCaseDefaults } from "../case-defaults.js";
import { availableOrders, EXECUTIVE_ORDERS, executiveOrder, firstOrderSubject, projectOrder, signOrder } from "../orders.js";
import { selectLegalExposures } from "../legal-exposure.js";
import { docketTerm } from "../background-docket.js";
import { COURT_TIMING_DAYS } from "../court-procedure.js";
import { createRngStreams } from "../rng.js";
import { removeOfficer } from "../career-incumbents.js";
import { proposeRescission } from "../appropriation.js";
import { pendingImpoundments, selectImpoundments } from "../impoundment.js";
import { sessionDayDate } from "../congressional-session.js";
import { addDays, daysBetween } from "../clock.js";
import { selectBudget, selectSpendableBudget } from "../budget.js";
import { selectInspector } from "../oversight.js";
import { superviseSpecialCounsel } from "../special-counsel.js";
import { actingClassOf, dismissMinister, selectAppointableFor } from "../appointments.js";
import { institutionForRole } from "../institutions.js";
import { answerLowerOrderReview } from "../judicial-review.js";
import { institutionDef } from "../institutions.js";
import { directiveRefusal } from "../directives.js";
import { conclusoryAccount, fileInspectorRemovalNotice, selectRemovableInspectors } from "../inspectors-general.js";
import { underDeclaredEmergency } from "../emergency.js";
import { supermajorityOf, majorityOf } from "../congress.js";
import { REPORT_WINDOW_DAYS, TERMINATION_WINDOW_DAYS, EXTENSION_DAYS } from "../war-powers-report.js";
// Law probes. Each asserts the realistic expectation, so a failure is a
// reproduced break. Run: npx vitest run src/__probes__/law.probe.test.ts
function runDays(start, phases, days, each) {
    let w = start;
    for (let d = 1; d <= days; d++) {
        w = advanceOneDay(withDueCaseDefaults(w), phases);
        if (each)
            w = each(w, d);
    }
    return w;
}
const FORCED = { stream: () => ({ next: () => 0 }) };
describe("controls the engine holds (sanity: these should pass)", () => {
    it("War Powers Resolution constants: 48 hours, 60 days, 30 certified days", () => {
        expect(REPORT_WINDOW_DAYS).toBe(2);
        expect(TERMINATION_WINDOW_DAYS).toBe(60);
        expect(EXTENSION_DAYS).toBe(30);
    });
    it("override, conviction and treaty bars are two thirds of 435 and 100; passage is a majority", () => {
        expect(supermajorityOf(100)).toBe(67);
        expect(supermajorityOf(435)).toBe(290);
        expect(majorityOf(100)).toBe(51);
    });
    it("the IRS audit directive is refused (26 U.S.C. 7217 is a real statutory bar)", () => {
        expect(directiveRefusal(institutionDef("INST-IRS"), "targeting")).toBeDefined();
    });
});
describe("tariffs: Section 122 clock and the courts", () => {
    let imposedWorld;
    let afterExpiry;
    let ended;
    beforeAll(() => {
        const { campaign, charter } = foundedForBalance("law-probe-1");
        const phases = campaignTurnPhases(charter, true);
        const r = imposeTariff(campaign, "s122", "CHN", "semiconductors", 0.15);
        if (!r.ok)
            throw new Error(r.reason);
        imposedWorld = apply(campaign, r.packet);
        afterExpiry = { reimposed: false, reason: "", liveAtDay160: -1 };
        ended = runDays(imposedWorld, phases, 330, (state, d) => {
            if (d === 160) {
                const again = imposeTariff(state, "s122", "CHN", "semiconductors", 0.15);
                afterExpiry = { reimposed: again.ok, reason: again.ok ? "" : again.reason,
                    liveAtDay160: Object.values(state.trade.measures).filter((m) => m.statute === "s122" && m.liftedTurn === undefined).length };
            }
            return state;
        });
    }, 300000);
    it("BREAK T1: after the 150 days lapse only Congress can extend Section 122, so an immediate re-imposition must be refused", () => {
        // 19 U.S.C. 2132(a)/(f): 150 days unless extended by Act of Congress. The game's own courtNote says the same.
        expect(afterExpiry.liveAtDay160).toBe(0);
        expect(afterExpiry.reimposed, "re-imposed a fresh 15% Section 122 tariff on day 160").toBe(false);
    });
    it("reports court proceedings and cases after 330 days under a 15% Section 122 tariff (report only)", () => {
        // The tariff table says 'Expect a lawsuit' for s338 and calls s122 untested; Learning Resources (2026-02-20) was a challenge to tariffs.
        const proceedings = ended.judiciary.proceedings ?? [];
        console.log("[law:T2] proceedings", proceedings.length, "by subject", proceedings.map((p) => p.subject.kind), "cases", Object.keys(ended.judiciary.cases ?? {}).length);
        expect(proceedings.every((p) => p.subject.kind !== undefined)).toBe(true);
    });
    // Owner ruling on BL-190 (2026-10-25), option (a): a tariff line carries its
    // authority and citation and no challenge odds; trade measures do not enter
    // the litigation mechanism.
    it("T2: each tariff line carries its statute and citation, and no proceeding opens for it", () => {
        const lines = Object.values(ended.trade.measures).filter((m) => m.origin === "us" && m.kind === "tariff");
        expect(lines.length, "the probe's tariff is on the record").toBeGreaterThan(0);
        for (const line of lines) {
            expect(line.statute, line.id).toBeDefined();
            expect(TARIFF_STATUTES[line.statute].cite, line.id).toMatch(/U\.S\.C\./);
        }
        const presidential = (ended.judiciary.proceedings ?? []).filter((p) => p.subject.kind === "executive-order" || p.subject.kind === "statutory-authority");
        expect(presidential, "no proceeding answers the tariff").toEqual([]);
        expect(selectLegalExposures(ended, executiveOrder), "no exposure answers the tariff").toEqual([]);
    });
});
describe("executive-branch removal law after Trump v. Slaughter (2026-06-29)", () => {
    // Owner ruling 2026-10-25: only the holdings move a commission to at will
    // (the FTC in Slaughter, the CFPB in Seila Law). The SEC and its peers keep
    // their protection, and a removal there goes through as a legal exposure the
    // administration is favored to win.
    it("BREAK R1: the FTC and the CFPB are at will; the SEC's protection stands, and removing its chair is a contested exposure, not a refusal", () => {
        const sec = institutionDef("INST-SEC").offices[0];
        const ftc = institutionDef("INST-FTC").offices[0];
        const cfpb = institutionDef("INST-CFPB").offices[0];
        expect([ftc.removal, cfpb.removal]).toEqual(["at-will", "at-will"]);
        expect(sec).toMatchObject({ removal: "for-cause", removalContested: true });
        const { campaign } = foundedForBalance("law-probe-1");
        const removed = removeOfficer(campaign, "INST-SEC");
        if (!removed.ok)
            throw new Error(removed.reason);
        const exposure = selectLegalExposures(apply(campaign, removed.packet), executiveOrder).find((e) => e.origin.kind === "removal");
        expect(exposure?.meritsChance, "merits favor the administration").toBeLessThan(0.5);
    });
    it("BREAK R2: the President may direct an at-will commission's enforcement posture; a protected commission and the Fed's monetary policy are shielded", () => {
        expect(directiveRefusal(institutionDef("INST-FTC"), "enforcement-posture")).toBeUndefined();
        expect(directiveRefusal(institutionDef("INST-SEC"), "enforcement-posture")).toBeDefined();
    });
    it("BREAK R3: a directive to DOJ is a norm, not a statutory bar; it should route to the Attorney General's willingness, not auto-refuse", () => {
        expect(directiveRefusal(institutionDef("INST-DOJ"), "investigation")).toBeUndefined();
    });
    it("BREAK R4: an inspector general removal needs a case-specific rationale (5 U.S.C. 403(b) as amended 2022); a bare sentence is refused and a conclusion with no record behind it is filed as deficient", () => {
        const { campaign } = foundedForBalance("law-probe-1");
        const ig = selectRemovableInspectors(campaign)[0];
        expect(ig, "a seated inspector general at founding").toBeDefined();
        const bare = fileInspectorRemovalNotice(campaign, ig.institution, "changing priorities");
        expect(bare.ok, "accepted a boilerplate sentence").toBe(false);
        const conclusion = fileInspectorRemovalNotice(campaign, ig.institution, conclusoryAccount("changing priorities", "", campaign.turn));
        if (!conclusion.ok)
            throw new Error(conclusion.reason);
        const filed = apply(campaign, conclusion.packet);
        expect(selectInspector(filed, ig.institution).noticeDeficiencies, "the deficiency is on the record").toEqual(["conclusory", "no-such-record"]);
        expect(campaign.congress.disposition - filed.congress.disposition, "a deficient notice costs the Hill more").toBeGreaterThan(0.05 + 0.06 - 1e-9);
    });
});
describe("special counsel and acting officers", () => {
    it("BREAK X2: the Attorney General, not the President, supervises, countermands and removes a special counsel (28 C.F.R. 600.7), through the Attorney General's own judgment", () => {
        const { campaign } = foundedForBalance("law-probe-1");
        const counsel = { id: "matter:counsel:1|matter:ig:INST-DHS:1", origin: { kind: "special-counsel", predicate: "matter:ig:INST-DHS:1" }, direction: "received",
            subject: "an obstruction", openedTurn: 1, stage: "gathering", public: true, obstructed: false, beats: [] };
        const sitting = { ...campaign, oversight: { ...campaign.oversight, matters: [counsel] } };
        const removed = superviseSpecialCounsel(sitting, { kind: "remove", matterId: counsel.id, ground: "misconduct" });
        if (!removed.ok)
            throw new Error(removed.reason);
        expect(removed.packet.provenance?.decision?.question, "the Attorney General's weighing is on the packet").toBe("certify-order");
        expect(superviseSpecialCounsel(sitting, { kind: "countermand", matterId: counsel.id }).ok).toBe(true);
    });
    it("BREAK X3: only a first assistant, a confirmed officer or a senior employee may act (5 U.S.C. 3345)", () => {
        const { campaign } = foundedForBalance("law-probe-1");
        const role = "role-treasury-minister";
        const def = institutionForRole(role);
        const dismissed = dismissMinister(campaign, role);
        if (!dismissed.ok)
            throw new Error(dismissed.reason);
        const bench = selectAppointableFor(apply(campaign, dismissed.packet), role, true);
        const state = apply(campaign, dismissed.packet);
        expect(actingClassOf(state, def, bench[0])).toBe("first-assistant");
        const outsider = Object.values(state.people).find((p) => p.alive && p.currentRole === undefined && !p.base.eligibleRoles.some((r) => r === role));
        expect(actingClassOf(state, def, outsider), "an outsider is not eligible").toBeUndefined();
    });
});
describe("emergencies and Congress's checks", () => {
    it("BREAK E1: the Emergency Powers Limitation Act sunsets declared emergencies at 90 days, and once enacted that must bind", () => {
        const { campaign } = foundedForBalance("law-probe-1");
        const declared = { id: "emergency:nation:unrest:1", scope: { kind: "nation" }, cause: "unrest",
            declaredTurn: 1, renewedTurn: 1, reason: "Probe emergency." };
        const act = { id: "bill:act-emergency-powers-limitation:1", act: "act-emergency-powers-limitation",
            title: "The Emergency Powers Limitation Act", sponsor: "opposition", introducedTurn: 1,
            status: "law", passage: [], resolvedTurn: 2 };
        const base = { ...campaign, turn: 1, emergencies: { [declared.id]: declared }, bills: { ...campaign.bills, [act.id]: act } };
        expect(underDeclaredEmergency(base)).toBe(true);
        const day120 = { ...base, turn: 1 + 18 }; // 18 weeks = 126 days > 90
        expect(underDeclaredEmergency(day120), "emergency still active at day 126 under the enacted act").toBe(false);
    });
    it("BREAK C1: a rescission message withholds the money for 45 days of continuous session, 45 calendar days under pro forma practice, then releases it by default", () => {
        const { campaign, charter } = foundedForBalance("law-probe-1");
        const phases = campaignTurnPhases(charter, true);
        const sent = proposeRescission(campaign, { account: "military", portion: 0.5 });
        if (!sent.ok)
            throw new Error(sent.reason);
        const held = apply(campaign, sent.packet);
        expect(pendingImpoundments(held)).toHaveLength(1);
        expect(selectSpendableBudget(held).military).toBeLessThan(selectBudget(held).military);
        const status = {};
        const last = runDays(held, phases, 72, (state, day) => {
            status[day] = selectImpoundments(state)[0].status;
            return state;
        });
        // Owner ruling 2026-10-25: pro forma sittings keep a recess in continuous
        // session, as in current practice, so the 45 days of continuous session are
        // 45 calendar days from the message's date (a message sent before the
        // week's sitting is dated at the sitting). The clock is read once a week,
        // so the release lands in the week the 45th day falls in.
        const transmitted = selectImpoundments(held)[0].transmitted;
        const fortyFifth = sessionDayDate(transmitted, 45);
        expect(fortyFifth, "45 days of continuous session are 45 calendar days").toEqual(addDays(transmitted, 45));
        const dueDay = daysBetween(campaign.calendar, fortyFifth);
        expect(status[20]).toBe("pending");
        expect(status[dueDay - 1], "released before the 45th day").toBe("pending");
        const releasedOn = Object.entries(status).find(([, value]) => value === "released")?.[0];
        console.log("[law:C1] message dated", transmitted, "45th day of session on campaign day", dueDay, "released on campaign day", releasedOn);
        expect(Number(releasedOn), "released on the 45th day or in the week after").toBeGreaterThanOrEqual(dueDay);
        expect(Number(releasedOn)).toBeLessThanOrEqual(dueDay + 7);
        expect(selectSpendableBudget(last).military, "the money is spendable again").toBe(selectBudget(last).military);
    }, 300000);
});
describe("litigation realism", () => {
    it("reports each order's challenge chance (report only)", () => {
        // Real: immigration and emergency-funding orders were challenged within days in 2017, 2019 and 2025 (unverified count; CASA, 2025-06-27, arose from one).
        const { campaign, charter } = foundedForBalance("law-probe-1");
        const chances = Object.fromEntries(EXECUTIVE_ORDERS.map((o) => [o.id, projectOrder(campaign, charter, o).challengeChance]));
        console.log("[law:L1] challenge chance by order", chances);
        expect(Object.keys(chances).length).toBe(EXECUTIVE_ORDERS.length);
    });
    // One number today stands for both whether anyone sues and whether the act
    // is lawful (orders.ts challengeChance from overreach). A universal 0.75
    // filing floor is not calibrated either.
    // Ordering target. Filing reads salience, injury, plaintiffs and venue; the
    // merits read overreach, the ground and precedent.
    it("L1: a high-salience lawful order is sued more often than a court would strike it, and filing ignores lawfulness", () => {
        const { campaign, charter } = foundedForBalance("law-probe-1");
        for (const id of ["order-border-controls", "order-entry-suspension"]) {
            const p = projectOrder(campaign, charter, executiveOrder(id));
            console.log("[law:L1]", id, "filing", p.challengeChance, "merits", p.meritsChance);
            expect(p.challengeChance, `${id} filing above merits`).toBeGreaterThan(p.meritsChance);
        }
        const quiet = projectOrder(campaign, charter, executiveOrder("order-regulatory-review"));
        const loud = projectOrder(campaign, charter, executiveOrder("order-border-controls"));
        expect(quiet.challengeChance).toBeLessThan(loud.challengeChance);
        const order = executiveOrder("order-border-controls");
        const reaching = projectOrder(campaign, charter, { ...order, overreach: 0.9 });
        expect(reaching.filing.chance, "filing does not read overreach").toBe(loud.filing.chance);
        expect(reaching.meritsChance).toBeGreaterThan(loud.meritsChance);
    });
    it("BREAK L2: an immigration order draws a state plaintiff (state AG coalitions) when opposition governors sit", () => {
        const { campaign, charter } = foundedForBalance("law-probe-1");
        const res = signOrder(campaign, charter, "order-border-controls", FORCED);
        if (!res.ok)
            throw new Error(res.reason);
        const opened = res.packet.effects.find((e) => e.kind === "courtProceeding");
        const oppositionGovernors = Object.values(campaign.states).filter((s) => s.governor?.party && s.governor.party !== campaign.congress.administrationParty).length;
        expect(oppositionGovernors).toBeGreaterThan(0);
        const names = opened?.set.matter?.parties.map((p) => p.name).join("|") ?? "";
        expect(names, "plaintiffs on the opened proceeding").toMatch(/State of|Attorney General|Commonwealth/);
    });
    // Interim relief comes in days to weeks (Fed. R. Civ. P. 65(b) limits a TRO
    // to 14 days; recalled, not opened this session). A deadline is not a
    // minimum wait, so the 90-day cert petition window sets no floor on a denial;
    // the cert-timing check waits on verified Supreme Court rules.
    it("BREAK L3: an interim-relief decision within 3 weeks of filing (procedural stages compressed to one turn each)", () => {
        const { campaign, charter } = foundedForBalance("law-probe-2");
        const phases = campaignTurnPhases(charter, true);
        const res = signOrder(campaign, charter, "order-border-controls", FORCED);
        if (!res.ok)
            throw new Error(res.reason);
        let w = apply(campaign, res.packet);
        const t0 = w.turn;
        let answered = false;
        w = runDays(w, phases, 7 * 16, (s) => {
            const p = s.judiciary.proceedings?.find((x) => x.subject.kind === "executive-order");
            if (p && !answered && p.stage === "appeal" && p.lower?.holding === "struck-down" && !p.governmentReview) {
                const a = answerLowerOrderReview(s, p.id, "seek-with-stay");
                if (a.ok) {
                    answered = true;
                    return apply(s, a.packet);
                }
            }
            return s;
        });
        const history = w.judiciary.proceedings.find((x) => x.subject.kind === "executive-order").history;
        const interim = history.find((h) => /interim relief|stays the unimplemented|pauses/.test(h.account));
        const panel = history.find((h) => /panel (sets aside|sustains)|panel sustains|panel sets/.test(h.account));
        const final = history.find((h) => h.stage === "final");
        console.log("history weeks", history.map((h) => `${h.turn - t0}:${h.stage}`).join(" "));
        expect(interim, "an interim-relief decision").toBeDefined();
        expect(interim.turn - t0, "weeks from filing to interim ruling").toBeLessThanOrEqual(3);
        console.log("[law:L3] weeks from circuit judgment to final", panel && final ? final.turn - panel.turn : "n/a");
    }, 300000);
    // Band target, from Sup. Ct. R. 13.1 and 13.5 (90 days plus up to 60 to
    // petition, deadlines rather than waits), 15.3 (30 days to respond) and 15.5
    // (distribution at least 14 days after the response), opened 2026-10-25.
    it("L3 cert timing: circuit judgment to the cert decision falls inside the band the Supreme Court Rules bound", () => {
        const { campaign, charter } = foundedForBalance("law-probe-2");
        const phases = campaignTurnPhases(charter, true);
        const res = signOrder(campaign, charter, "order-border-controls", FORCED);
        if (!res.ok)
            throw new Error(res.reason);
        let found;
        runDays(apply(campaign, res.packet), phases, 7 * 110, (s) => {
            const p = s.judiciary.proceedings?.find((x) => x.subject.kind === "executive-order");
            if (p && p.stage === "appeal" && p.lower?.holding === "struck-down" && !p.governmentReview) {
                const a = answerLowerOrderReview(s, p.id, "seek");
                if (a.ok)
                    return apply(s, a.packet);
            }
            const panel = p?.history.find((h) => /Circuit panel (sets aside|sustains)/.test(h.account));
            const cert = p?.history.find((h) => /Supreme Court grants review|Review was denied|Supreme Court review was denied/.test(h.account) || (h.stage === "final" && panel && h.turn > panel.turn));
            if (!found && panel && cert)
                found = { panel: panel.turn, cert: cert.turn };
            return s;
        });
        console.log("[law:L3 cert] weeks from circuit judgment to cert decision", found ? found.cert - found.panel : "no circuit judgment in 110 weeks");
        if (!found)
            return;
        const weeks = found.cert - found.panel;
        expect(weeks).toBeGreaterThanOrEqual(Math.ceil(COURT_TIMING_DAYS.certDisposition.min / 7));
        expect(weeks).toBeLessThanOrEqual(Math.ceil(COURT_TIMING_DAYS.certDisposition.max / 7));
    }, 900000);
    // A total-volume floor counts one dispute up to three times (a proceeding,
    // its case and an oversight matter) and, on the reckless proxy, measured a
    // term in which no order was signed. Report distinct disputes by origin
    // instead: those that answer a presidential act, and those that do not.
    it("reports distinct legal disputes by origin over a reckless proxy term (report only)", () => {
        let last;
        const out = playCampaign("law-probe-3", "reckless", 208, "republican", undefined, { observeWeek: (s) => { last = s; } });
        const s = last;
        const proceedings = s.judiciary.proceedings ?? [];
        const presidential = new Set(["executive-order", "statutory-authority"]);
        const origin = (p) => JSON.stringify(p.subject);
        const distinct = new Set(proceedings.map(origin));
        const exogenous = new Set(proceedings.filter((p) => !presidential.has(p.subject.kind)).map(origin));
        console.log("[law:L4] TERM", out.turnsPlayed, "weeks: orders signed", s.orders.length, "distinct disputes", distinct.size, "not answering a presidential act", exogenous.size, "cases", Object.keys(s.judiciary.cases ?? {}).length, "oversight matters", s.oversight.matters.length, "laws", Object.values(s.bills).filter((b) => b.status === "law").length);
        expect(distinct.size).toBeLessThanOrEqual(proceedings.length);
    }, 600000);
    // L4 as rewritten in Wave 0: exposures per actual act, and distinct
    // exogenous matters, never a total-volume floor. The term signs an
    // available order every three weeks, the way a reckless President would.
    it("L4/§13.12: a term that signs orders carries one exposure per act, files in proportion to the odds, and brings an aggregate docket", () => {
        const totals = { signed: 0, filed: 0, expected: 0, variance: 0, terms: 0, rulings: 0 };
        for (const seed of ["law-probe-4a", "law-probe-4b"]) {
            const { campaign, charter } = foundedForBalance(seed);
            const phases = campaignTurnPhases(charter, true);
            let next = 0;
            const end = runDays(campaign, phases, 7 * 104, (s, d) => {
                if (d % 21 !== 0)
                    return s;
                const offered = availableOrders(s);
                const order = offered[next++ % Math.max(1, offered.length)];
                if (!order)
                    return s;
                const r = signOrder(s, charter, order.id, createRngStreams(s.seed), firstOrderSubject(s, order.id));
                return r.ok ? apply(s, r.packet) : s;
            });
            const exposures = selectLegalExposures(end, executiveOrder).filter((e) => e.origin.kind === "executive-order");
            expect(exposures.length, "one exposure per signed order").toBe(end.orders.length);
            const reps = exposures.flatMap((e) => e.representations);
            expect(new Set(reps).size, "no representation counted under two origins").toBe(reps.length);
            totals.signed += end.orders.length;
            totals.filed += end.orders.filter((o) => o.contested).length;
            totals.expected += end.orders.reduce((sum, o) => sum + (o.challengeChance ?? 0), 0);
            totals.variance += end.orders.reduce((sum, o) => sum + (o.challengeChance ?? 0) * (1 - (o.challengeChance ?? 0)), 0);
            const years = [...new Set([campaign.calendar.year - 1, campaign.calendar.year, end.calendar.year - 1])];
            totals.terms += years.filter((y) => docketTerm(end, y).filings > 3000).length;
            totals.rulings += end.judiciary.cases.filter((c) => c.subject?.kind === "background-docket").length;
        }
        console.log("[law:L4] signed", totals.signed, "filed", totals.filed, "expected", totals.expected.toFixed(2), "docket terms", totals.terms, "consequential rulings recorded", totals.rulings);
        expect(totals.signed).toBeGreaterThan(20);
        expect(Math.abs(totals.filed - totals.expected), "filings in proportion to the odds").toBeLessThanOrEqual(3 * Math.sqrt(totals.variance) + 1);
        expect(totals.terms).toBeGreaterThan(0);
    }, 2400000);
});
