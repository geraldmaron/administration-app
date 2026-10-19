import { describe, expect, it } from "vitest";
import { REPORT_WINDOW_DAYS, TERMINATION_WINDOW_DAYS, certifyExtension, expiredObligations, fileWarPowersReport, recordForceIntroduction, selectObligations, selectUnfiledObligations, terminateForce, terminationClockRuns, terminationDaysRemaining, terminationStartDay, warPowersReportPhase, } from "./war-powers-report.js";
import { forceIsPermitted, warPowersStanding } from "./congress.js";
import { apply } from "./effects.js";
import { addDays } from "./clock.js";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
const TARGET = "ALP";
const ELSEWHERE = "OTH";
/** Nine weeks is sixty-three days, which is the first week past the sixty. */
const WEEKS_PAST_SIXTY_DAYS = 9;
function authorized(campaign, target) {
    return {
        ...campaign,
        congress: {
            ...campaign.congress,
            authorizations: [
                {
                    id: `aumf:${target}:1`,
                    title: `Authorization for Use of Military Force Against ${target}`,
                    target,
                    enactedTurn: 1,
                    expiresTurn: campaign.turn + 52,
                    vote: [],
                },
            ],
        },
    };
}
function introduce(campaign, rung = 4) {
    const effects = recordForceIntroduction(campaign, "USA", "ALP", rung, "Strikes.");
    if (effects.length === 0)
        throw new Error("expected an obligation to open");
    return apply(campaign, {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: { summary: "Forces introduced." },
        effects,
    });
}
describe("the forty-eight hour obligation", () => {
    it("opens on an introduction of forces whether or not Congress authorized it", () => {
        const campaign = buildCampaign();
        const next = introduce(campaign);
        const obligation = selectObligations(next)[0];
        expect(obligation.kind).toBe("hostilities");
        expect(obligation.dueDay - obligation.openedDay).toBe(REPORT_WINDOW_DAYS);
    });
    it("writes nothing for another capital's use of force", () => {
        const campaign = buildCampaign();
        expect(recordForceIntroduction(campaign, "ALP", "USA", 5, "Theirs.")).toHaveLength(0);
    });
    it("marks a missed deadline, and costs the Hill for it", () => {
        const campaign = introduce(buildCampaign());
        const later = withWeeksElapsed(campaign, 1);
        const packets = warPowersReportPhase(later);
        expect(packets).toHaveLength(1);
        const settled = packets.reduce((state, packet) => apply(state, packet), later);
        expect(selectObligations(settled)[0]?.missed).toBe(true);
        expect(settled.congress.disposition).toBeLessThan(later.congress.disposition);
        // Marked once, not billed every week afterward.
        expect(warPowersReportPhase(settled)).toHaveLength(0);
    });
});
describe("filing", () => {
    it("takes the authority, the scope and an estimate, and refuses a report missing any of them", () => {
        const campaign = introduce(buildCampaign());
        const id = selectObligations(campaign)[0].id;
        expect(fileWarPowersReport(campaign, id, "", "Limited strikes.", 3).ok).toBe(false);
        expect(fileWarPowersReport(campaign, id, "Article II.", "", 3).ok).toBe(false);
        expect(fileWarPowersReport(campaign, id, "Article II.", "Limited strikes.", 0).ok).toBe(false);
        const filed = fileWarPowersReport(campaign, id, "Article II.", "Limited strikes on air defenses.", 3);
        expect(filed.ok).toBe(true);
        if (!filed.ok)
            return;
        const next = apply(campaign, filed.packet);
        expect(selectUnfiledObligations(next)).toHaveLength(0);
        expect(selectObligations(next)[0]?.filing?.estimatedWeeks).toBe(3);
        expect(next.congress.disposition).toBeGreaterThan(campaign.congress.disposition);
    });
    it("runs the termination clock from the day the report was owed when none is filed", () => {
        const campaign = introduce(buildCampaign());
        const obligation = selectObligations(campaign)[0];
        expect(terminationDaysRemaining(campaign, obligation)).toBe(TERMINATION_WINDOW_DAYS + REPORT_WINDOW_DAYS);
        const late = withWeeksElapsed(campaign, 4);
        const stillCounting = terminationDaysRemaining(late, selectObligations(late)[0]);
        expect(stillCounting).toBe(TERMINATION_WINDOW_DAYS + REPORT_WINDOW_DAYS - 28);
    });
    it("runs it from the filing day when the report goes in early, because the statute takes whichever is earlier", () => {
        const campaign = introduce(buildCampaign());
        const id = selectObligations(campaign)[0].id;
        const filed = fileWarPowersReport(campaign, id, "Article II.", "Limited strikes.", 3);
        if (!filed.ok)
            throw new Error(filed.reason);
        const next = apply(campaign, filed.packet);
        const obligation = selectObligations(next)[0];
        expect(terminationStartDay(obligation)).toBe(obligation.openedDay);
        expect(terminationDaysRemaining(next, obligation)).toBe(TERMINATION_WINDOW_DAYS);
    });
    it("does not let a late report move the start later than the day it was owed", () => {
        const campaign = introduce(buildCampaign());
        const id = selectObligations(campaign)[0].id;
        const late = withWeeksElapsed(campaign, 2);
        const filed = fileWarPowersReport(late, id, "Article II.", "Limited strikes.", 3);
        if (!filed.ok)
            throw new Error(filed.reason);
        const obligation = selectObligations(apply(late, filed.packet))[0];
        expect(terminationStartDay(obligation)).toBe(obligation.dueDay);
    });
});
describe("the thirty-day certification", () => {
    it("is refused while the sixty days still have room, and stands once they do not", () => {
        const campaign = introduce(buildCampaign());
        const id = selectObligations(campaign)[0].id;
        expect(certifyExtension(campaign, id, "Necessity.").ok).toBe(false);
        const late = withWeeksElapsed(campaign, 8);
        const certified = certifyExtension(late, id, "The force cannot be withdrawn safely inside the window.");
        expect(certified.ok).toBe(true);
        if (!certified.ok)
            return;
        const next = apply(late, certified.packet);
        expect(terminationDaysRemaining(next, selectObligations(next)[0])).toBeGreaterThan(terminationDaysRemaining(late, selectObligations(late)[0]));
    });
});
describe("the sixty days end in an obligation, not an opening", () => {
    function runOut(rung = 4) {
        const campaign = introduce(buildCampaign(), rung);
        return withWeeksElapsed(campaign, WEEKS_PAST_SIXTY_DAYS);
    }
    it("stands the force up as a live obligation to terminate once the window has run", () => {
        const late = runOut();
        expect(terminationDaysRemaining(late, selectObligations(late)[0])).toBeLessThan(0);
        expect(expiredObligations(late)).toHaveLength(1);
    });
    // The inversion this replaces: running the clock out used to hand the top of
    // the ladder back, so a president who struck, waited nine weeks and aimed at
    // the next capital paid nothing for the first action's never being voted on.
    it("does not reopen the ladder anywhere while an expired obligation stands", () => {
        const late = runOut();
        expect(forceIsPermitted(late, TARGET, 5)).toBe(false);
        expect(forceIsPermitted(late, ELSEWHERE, 5)).toBe(false);
        expect(warPowersStanding(late, TARGET, 5).kind).toBe("requires-authorization");
    });
    it("bills the week of continuing, and bills more the week after", () => {
        const late = runOut();
        const packets = warPowersReportPhase(late);
        const sustained = packets.filter((packet) => packet.narration.summary.includes("past the sixty days"));
        expect(sustained).toHaveLength(1);
        const settled = packets.reduce((state, packet) => apply(state, packet), late);
        expect(settled.player.metrics.standing).toBeLessThan(late.player.metrics.standing);
        expect(settled.congress.disposition).toBeLessThan(late.congress.disposition);
        const muchLater = withWeeksElapsed(settled, 10);
        const first = standingCharged(warPowersReportPhase(settled));
        const tenth = standingCharged(warPowersReportPhase(muchLater));
        expect(tenth).toBeGreaterThan(first);
    });
    // The office-day cut runs this phase mid-week; the one-shot week runs it on
    // the closing day. Both must bill the same week at the same scale, including
    // the weeks the clock runs out partway through.
    it("bills a week the same on whichever office day the phase runs", () => {
        const opened = introduce(buildCampaign());
        for (let weeks = WEEKS_PAST_SIXTY_DAYS - 1; weeks <= WEEKS_PAST_SIXTY_DAYS + 3; weeks += 1) {
            const closing = withWeeksElapsed(opened, weeks);
            const billed = standingCharged(warPowersReportPhase(closing));
            for (let day = 1; day < 7; day += 1) {
                const midweek = { ...closing, calendar: addDays(closing.calendar, day - 7) };
                expect(standingCharged(warPowersReportPhase(midweek))).toBe(billed);
            }
        }
    });
    it("stops the moment the force comes out, and gives the ladder back", () => {
        const late = runOut();
        const id = selectObligations(late)[0].id;
        const brought = terminateForce(late, id);
        expect(brought.ok).toBe(true);
        if (!brought.ok)
            return;
        expect(brought.packet.narration.summary).toContain("past the sixty days");
        const out = apply(late, brought.packet);
        expect(selectObligations(out)[0].terminated?.day).toBeGreaterThan(0);
        expect(expiredObligations(out)).toHaveLength(0);
        expect(standingCharged(warPowersReportPhase(out))).toBe(0);
        // Complying is what gives the latitude back — which is the whole
        // correction. Waiting the clock out used to do it and now does not.
        expect(forceIsPermitted(out, ELSEWHERE, 5)).toBe(true);
        expect(terminateForce(out, id).ok).toBe(false);
    });
    it("stops the moment Congress votes for it, which is what the vote buys", () => {
        const voted = authorized(runOut(), TARGET);
        expect(expiredObligations(voted)).toHaveLength(0);
        expect(standingCharged(warPowersReportPhase(voted))).toBe(0);
        expect(warPowersStanding(voted, TARGET, 5).kind).toBe("authorized");
        expect(forceIsPermitted(voted, ELSEWHERE, 5)).toBe(true);
    });
});
describe("the clock attaches where the statute attaches it", () => {
    it("runs on an introduction into hostilities with nothing authorizing it", () => {
        const campaign = introduce(buildCampaign(), 4);
        expect(terminationClockRuns(campaign, selectObligations(campaign)[0])).toBe(true);
    });
    // Section 1544(b) is keyed to a 1543(a)(1) hostilities report. A forward
    // deployment is reportable under (a)(2) and no window is set for it, so a
    // ring under it would teach a rule that does not exist.
    it("does not run on a forward deployment, which owes the report and no window", () => {
        const campaign = introduce(buildCampaign(), 2);
        const obligation = selectObligations(campaign)[0];
        expect(obligation.kind).toBe("equipped-for-combat");
        expect(terminationClockRuns(campaign, obligation)).toBe(false);
        expect(expiredObligations(withWeeksElapsed(campaign, WEEKS_PAST_SIXTY_DAYS))).toEqual([]);
    });
    it("stops running against a target Congress has authorized force against", () => {
        const campaign = introduce(buildCampaign(), 4);
        expect(terminationClockRuns(authorized(campaign, TARGET), selectObligations(campaign)[0])).toBe(false);
    });
    it("refuses a certification where no window is running to extend", () => {
        const deployment = introduce(buildCampaign(), 2);
        const late = withWeeksElapsed(deployment, 8);
        const refused = certifyExtension(late, selectObligations(late)[0].id, "Necessity.");
        expect(refused.ok).toBe(false);
        if (refused.ok)
            return;
        expect(refused.reason).toContain("not one");
    });
});
/** The standing a set of phase packets takes off the ledger, as a positive figure. */
function standingCharged(packets) {
    return packets.reduce((total, packet) => {
        for (const effect of packet.effects) {
            if (effect.kind === "metric" && typeof effect.deltas.standing === "number")
                total -= effect.deltas.standing;
        }
        return total;
    }, 0);
}
