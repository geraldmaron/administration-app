import { beforeAll, describe, expect, it } from "vitest";
import { apply, judicialReviewPhase, conclusoryAccount, fileInspectorRemovalNotice, institutionDef, inspectorNoticeCost, issueDirective, signFinding } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { CONTESTED_REMOVAL_WORDS, removableOfficers, removalPacket, removalSuits, removalTerms, REMOVAL_CAUSES, vacancyBoard } from "./appointments-pipeline";
import { appointmentDesk, deskDefaults, deskPlan } from "../appointments/desk";
import { DIRECTIVE_KIND_LABELS, directivePacket, directivePreview, directiveTargets } from "./directive-composer";
import { committeeNoticePacket, inquiryPins, inquiryPipeline, inspectorNoticePacket, inspectorNoticeTerms, inspectorsBoard, noticesOwed } from "./oversight-board";
function issued(campaign, subject) {
    return apply(campaign, directivePacket(campaign, "INST-IRS", "investigation", subject));
}
let opening;
/** Two refused instructions at the Service: the second opens the Treasury inspector general's file. */
let audited;
beforeAll(() => {
    opening = openingCampaign();
    audited = issued(issued(opening, "a named donor's returns"), "a named critic's returns");
}, 60_000);
describe("directive composer", () => {
    it("offers only bodies that hold a function an instruction could be addressed to, each with its kinds", () => {
        const targets = directiveTargets(opening);
        expect(targets.length).toBeGreaterThan(0);
        expect(targets.every((target) => target.kinds.length > 0)).toBe(true);
        expect(targets.find((target) => target.institution === "INST-FED")?.kinds).toContain("monetary");
        expect(Object.keys(DIRECTIVE_KIND_LABELS).sort()).toEqual(["enforcement-posture", "investigation", "monetary", "sanctions-tempo", "targeting"]);
    });
    it("previews a statutory bar with the memorandum and the rise the refusal writes, as the act writes them", () => {
        const preview = directivePreview(opening, "INST-IRS", "investigation", "");
        expect(preview.ok && preview.status).toBe("refused");
        if (!preview.ok)
            return;
        expect(preview.memorandum?.authority).toContain("7217");
        const after = apply(opening, directivePacket(opening, "INST-IRS", "investigation", "a named donor's returns"));
        expect(after.institutions["INST-IRS"]?.politicization).toBe(preview.politicization.after);
        expect(after.institutions["INST-IRS"]?.oversightPressure).toBe(preview.oversight.after);
        expect(preview.opensInquiry).toBe(false);
    });
    it("warns that the second refusal at one body opens an inquiry, and the inquiry opens", () => {
        const once = issued(opening, "a named donor's returns");
        const preview = directivePreview(once, "INST-IRS", "targeting", "a named critic");
        expect(preview.ok && preview.opensInquiry).toBe(true);
        expect(inquiryPipeline(audited).stages[0]?.matters).toHaveLength(1);
    });
    it("refuses an instruction with nothing to say, in the engine's words", () => {
        expect(issueDirective(opening, { institution: "INST-IRS", kind: "investigation", subject: " " }).ok).toBe(false);
        expect(() => directivePacket(opening, "INST-IRS", "investigation", " ")).toThrow(/has to say/);
    });
});
describe("inquiry pipeline and pins", () => {
    it("reads an open matter at its stage, unseen by the public, with its next move dated", () => {
        const [row] = inquiryPipeline(audited).stages.flatMap((stage) => stage.matters);
        expect(row?.stage).toBe("opened");
        expect(row?.public).toBe(false);
        expect(row?.received).toBe(true);
        expect(row?.nextMove).toBeTruthy();
        expect(inquiryPipeline(opening).stages.every((stage) => stage.matters.length === 0)).toBe(true);
    });
    it("pins the audited agency at its headquarters", () => {
        const pins = inquiryPins(audited);
        expect(pins).toHaveLength(1);
        expect(pins[0]?.institution).toBe("INST-TREASURY");
        expect(Number.isFinite(pins[0]?.lon)).toBe(true);
        expect(inquiryPins(opening)).toEqual([]);
    });
});
describe("inspectors", () => {
    it("lists every inspector general, those with audits running first", () => {
        const board = inspectorsBoard(audited);
        expect(board[0]?.institution).toBe("INST-TREASURY");
        expect(board[0]?.openMatters).toBe(1);
        expect(board.every((row) => row.posture === "in-post")).toBe(true);
    });
    it("prices a notice off the packet the filing commits, and says which audit it obstructs", () => {
        const terms = inspectorNoticeTerms(audited, "INST-TREASURY");
        if ("refusal" in terms)
            throw new Error(terms.refusal);
        expect(terms.dispositionBefore - terms.dispositionAfter).toBeCloseTo(inspectorNoticeCost(true, true), 3);
        expect(terms.obstructs).toHaveLength(1);
        const filed = apply(audited, inspectorNoticePacket(audited, "INST-TREASURY", "Lost confidence"));
        expect(filed.congress.disposition).toBe(terms.dispositionAfter);
        expect(inspectorsBoard(filed).find((row) => row.institution === "INST-TREASURY")?.posture).toBe("notice-filed");
        expect("refusal" in inspectorNoticeTerms(filed, "INST-TREASURY")).toBe(true);
    });
    it("refuses a notice with no reasons, in the engine's words", () => {
        expect(fileInspectorRemovalNotice(opening, "INST-TREASURY", conclusoryAccount("", "", opening.turn)).ok).toBe(false);
        expect(() => inspectorNoticePacket(opening, "INST-TREASURY", "")).toThrow(/reasons/);
    });
});
describe("notices owed", () => {
    it("lists a finding whose notice was withheld, and clears it once the committees are told", () => {
        const target = Object.keys(opening.nations).find((id) => id !== opening.founding.nation);
        const signed = signFinding(opening, "Disrupt a weapons shipment", target, "written", "withheld", "The operation is under way and a leak would end it.");
        if (!signed.ok)
            throw new Error(signed.reason);
        const withheld = apply(opening, signed.packet);
        const [owed] = noticesOwed(withheld);
        expect(owed?.objective).toBe("Disrupt a weapons shipment");
        const told = apply(withheld, committeeNoticePacket(withheld, owed.id, "The operation has concluded."));
        expect(noticesOwed(told)).toEqual([]);
        expect(noticesOwed(opening)).toEqual([]);
    });
});
describe("appointments pipeline", () => {
    it("offers an open circuit seat through the existing Senate appointment action", () => {
        const occupied = Object.values(opening.institutions).find((runtime) => runtime.lowerBenchSeat && !runtime.vacancy);
        expect(occupied).toBeDefined();
        const vacant = { ...opening, institutions: { ...opening.institutions,
                [occupied.id]: { ...occupied, vacancy: true, vacantDays: 7 } } };
        const row = vacancyBoard(vacant).open.find((entry) => entry.institution === occupied.id);
        expect(row).toBeDefined();
        const seat = appointmentDesk(vacant).seats.find((entry) => entry.office === row.office);
        expect(seat.recommended).toBeDefined();
        const plan = deskPlan(vacant, [{ office: seat.office, person: seat.recommended }]);
        expect(plan.lines).toHaveLength(1);
        const nominated = plan.packets.reduce(apply, vacant);
        expect(Object.values(nominated.nominations).some((entry) => entry.office === row.office)).toBe(true);
        expect(vacancyBoard(nominated).open.some((entry) => entry.institution === occupied.id)).toBe(false);
    });
    it("lists the open seats nobody has been sent up for, and fills them with the names the desk recommends", () => {
        const desk = appointmentDesk(opening);
        const picks = deskDefaults(desk);
        const plan = deskPlan(opening, picks);
        expect(plan.lines.length + plan.refused.length).toBe(picks.length);
        expect(plan.packets).toHaveLength(plan.lines.length);
        const filled = plan.packets.reduce(apply, opening);
        const sent = new Set(plan.lines.map((line) => line.office));
        expect(appointmentDesk(filled).seats.some((seat) => sent.has(seat.office))).toBe(false);
    });
    it("prices each cause of a for-cause removal off its own packet", () => {
        // A contested commission seat is removable without a stated cause (DECISIONS 4.14), so the refusal is read off a protected one.
        const officer = removableOfficers(opening).find((row) => row.removal === "for-cause" && institutionDef(row.institution)?.offices[0]?.removalContested !== true);
        if (!officer)
            return;
        const rises = REMOVAL_CAUSES.map((cause) => {
            const terms = removalTerms(opening, officer.institution, cause);
            if ("refusal" in terms)
                throw new Error(terms.refusal);
            return terms.politicization.after - terms.politicization.before;
        });
        expect(new Set(rises.map((rise) => rise.toFixed(3))).size).toBe(REMOVAL_CAUSES.length);
        expect("refusal" in removalTerms(opening, officer.institution)).toBe(true);
        const contested = removableOfficers(opening).find((row) => institutionDef(row.institution)?.offices[0]?.removalContested === true);
        if (contested)
            expect("refusal" in removalTerms(opening, contested.institution)).toBe(false);
    });
    it("leaves no fixed-term office and no cabinet chair among the removable officers", () => {
        const officers = removableOfficers(opening);
        expect(officers.length).toBeGreaterThan(0);
        expect(officers.every((row) => row.removal !== "term-protected")).toBe(true);
    });
});
describe("a removal from a protected commission seat on the officers board", () => {
    const SEC = "INST-SEC";
    const removed = () => apply(opening, removalPacket(opening, SEC));
    const advanced = (state, weeks) => {
        const phase = judicialReviewPhase(charterOf(state));
        let next = state;
        for (let week = 0; week < weeks; week += 1)
            next = { ...phase(next).reduce(apply, next), turn: next.turn + 1 };
        return next;
    };
    it("says what removing a protected commissioner risks in court, and says nothing for an at-will seat", () => {
        const officers = removableOfficers(opening);
        const sec = officers.find((row) => row.institution === SEC);
        if (sec)
            expect(sec.contested).toBe(CONTESTED_REMOVAL_WORDS);
        expect(officers.filter((row) => institutionDef(row.institution)?.offices[0]?.removalContested !== true).every((row) => row.contested === undefined)).toBe(true);
        expect(CONTESTED_REMOVAL_WORDS).toMatch(/Trump v\. Slaughter/);
    });
    it("shows one row per removal, from the member's decision to the case in court", () => {
        if (!removableOfficers(opening).some((row) => row.institution === SEC))
            return;
        const after = removed();
        const rows = removalSuits(after);
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe("deciding");
        const later = removalSuits(advanced(after, 6))[0];
        expect(["in-court", "declined"]).toContain(later.status);
        if (later.status === "in-court") {
            expect(later.caseId).toMatch(/^removal:INST-SEC:/);
            expect(later.reading).toMatch(/suing to get the seat back/);
        }
        expect(removalSuits(opening)).toEqual([]);
    });
});
