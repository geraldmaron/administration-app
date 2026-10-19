import { describe, expect, it } from "vitest";
import { requestForceAuthorization } from "./__fixtures__/issued-acts.js";
import { buildCampaign, nationA, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { CHAMBERS, congressPhase, dispositionTarget, floorThreshold, majorityOf, openingCongress, projectConfirmation, recordUnilateralForce, supermajorityOf, warPowersStanding, WAR_POWERS_WINDOW_TURNS, } from "./congress.js";
import { countVote, countVoteAgainst, countVoteAgainstByCaucus, independentsSitWith } from "./congress-votes.js";
import { issueForceAuthorization, outstandingIssuedAuthorizationActs, projectForceAuthorization, resolveDueAuthorizations, } from "./force-authorization.js";
import { likelihoodFromUnitInterval } from "./assessments.js";
import { recordForceIntroduction } from "./war-powers-report.js";
import { DEFAULT_ADMINISTRATION_PARTY } from "./party.js";
import { apply } from "./effects.js";
import { advanceUntilAttention } from "./advance.js";
import { defaultTurnPhases } from "./turn-loop.js";
import { computeRemovalPressure } from "./removal.js";
import { selectAuthorizationAgainst } from "./state.js";
const TARGET = "ALP";
const withCongress = (campaign, changes) => ({
    ...campaign,
    congress: { ...campaign.congress, ...changes },
});
const unilateral = (campaign, target, turn) => withCongress(campaign, {
    unauthorized: [
        ...campaign.congress.unauthorized,
        { id: `unauthorized:${target}:${turn}`, target, turn, rung: 5, description: "test" },
    ],
});
/** The other half of what a real introduction writes: the reporting obligation. */
const introduced = (campaign, target) => apply(campaign, {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    narration: { summary: "Forces introduced." },
    effects: [...recordForceIntroduction(campaign, campaign.founding.nation, target, 5, "Strikes.")],
});
describe("the chambers", () => {
    it("seats every member on one side or another", () => {
        const congress = openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
        for (const chamber of CHAMBERS) {
            const held = congress.chambers[chamber];
            expect(held.administration + held.opposition + held.independent, chamber).toBe(held.seats);
        }
    });
    it("stores the sealed administration party on the Congress record", () => {
        expect(openingCongress(nationA, 1, "democrat", "democrat").administrationParty).toBe("democrat");
        expect(openingCongress(nationA, 1, "republican", "republican").administrationParty).toBe("republican");
        expect(openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY).administrationParty).not.toBeUndefined();
    });
    it("counts a majority and a two-thirds bar the way a chamber actually does", () => {
        expect(majorityOf(435)).toBe(218);
        expect(majorityOf(100)).toBe(51);
        expect(supermajorityOf(435)).toBe(290);
        expect(supermajorityOf(100)).toBe(67);
    });
    it("needs sixty for an ordinary Senate bill and fifty-one for revenue or a disapproval", () => {
        const congress = openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
        expect(floorThreshold(congress, "senate", "ordinary")).toBe(60);
        expect(floorThreshold(congress, "senate", "reconciliation")).toBe(51);
        expect(floorThreshold(congress, "senate", "privileged")).toBe(51);
        expect(floorThreshold(congress, "house", "ordinary")).toBe(218);
    });
    it("wins more votes for a president the Hill likes", () => {
        const congress = openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
        const liked = countVote({ ...congress, disposition: 0.9 }, "house", 0, majorityOf(435));
        const loathed = countVote({ ...congress, disposition: 0.1 }, "house", 0, majorityOf(435));
        expect(liked.yeas).toBeGreaterThan(loathed.yeas);
        expect(liked.yeas + liked.nays).toBe(435);
    });
    // The president's own party is the first place a presidency is refused. If
    // administration seats were automatic yeas, every vote would be a headcount
    // taken at the founding and never taken again.
    it("does not hand a president their own caucus unconditionally", () => {
        const congress = openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
        const abandoned = countVote({ ...congress, disposition: 0 }, "house", 0, majorityOf(435));
        expect(abandoned.yeas).toBeLessThan(congress.chambers.house.administration);
    });
});
describe("a question put against the President, counted by caucus", () => {
    const senate = (administration, opposition, independent) => {
        const congress = openingCongress(nationA, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
        return {
            ...congress,
            disposition: 0,
            chambers: { ...congress.chambers, senate: { seats: administration + opposition + independent, administration, opposition, independent } },
        };
    };
    it("counts the President's own caucus only at the share the caller says breaks", () => {
        const holding = countVoteAgainstByCaucus(senate(45, 53, 2), "senate", 0.3, supermajorityOf(100), undefined, 0);
        expect(holding.byCaucus.administration).toEqual({ seats: 45, yeas: 0 });
        expect(holding.byCaucus.opposition).toEqual({ seats: 53, yeas: 53 });
        expect(holding.passed).toBe(false);
        const breaking = countVoteAgainstByCaucus(senate(45, 53, 2), "senate", 0.3, supermajorityOf(100), undefined, 0.4);
        expect(breaking.byCaucus.administration.yeas).toBe(18);
        expect(breaking.yeas).toBe(breaking.byCaucus.administration.yeas + breaking.byCaucus.opposition.yeas + breaking.byCaucus.independent.yeas);
        expect(breaking.yeas + breaking.nays).toBe(100);
    });
    it("seats the independents with the Democrats, whichever side that is", () => {
        expect(independentsSitWith("democrat")).toBe("administration");
        expect(independentsSitWith("republican")).toBe("opposition");
        const democratic = countVoteAgainstByCaucus(senate(45, 51, 4), "senate", 0, supermajorityOf(100), undefined, 0);
        const republican = countVoteAgainstByCaucus({ ...senate(45, 51, 4), administrationParty: "republican", caucusAnchor: "republican" }, "senate", 0, supermajorityOf(100), undefined, 0);
        expect(democratic.byCaucus.independent.yeas).toBe(0);
        expect(republican.byCaucus.independent.yeas).toBe(4);
    });
    it("leaves the override count to its own arithmetic, where a soured room takes the President's own party with it", () => {
        const soured = senate(45, 53, 2);
        const override = countVoteAgainst(soured, "senate", 0.3, supermajorityOf(100));
        // Every count is tallied by bloc now, the override included: what separates
        // the two questions is the share the President's own caucus votes at, not
        // whether anybody wrote the tallies down.
        expect(override.byCaucus.administration.seats).toBe(45);
        expect(override.byCaucus.administration.yeas).toBeGreaterThan(0);
        // At a room of zero the override band defects a third of the President's
        // seats; a question about the President himself does not, until the caller
        // says the caucus breaks.
        expect(override.yeas).toBeGreaterThan(countVoteAgainstByCaucus(soured, "senate", 0.3, supermajorityOf(100), undefined, 0).yeas);
    });
});
describe("the war powers", () => {
    it("leaves the small rungs alone entirely", () => {
        const campaign = buildCampaign();
        for (const rung of [1, 2]) {
            expect(warPowersStanding(campaign, TARGET, rung).kind, `rung ${rung}`).toBe("not-applicable");
        }
    });
    // A blockade closes a coast by force: hostilities, not posture.
    it("reads a blockade as a use of force a president answers for", () => {
        expect(warPowersStanding(buildCampaign(), TARGET, 3).kind).toBe("unilateral");
    });
    it("lets a president introduce forces once on their own authority", () => {
        expect(warPowersStanding(buildCampaign(), TARGET, 5).kind).toBe("unilateral");
    });
    // The defect this pins: nothing stopped a president taking the top
    // military rung against a different country every week for a year.
    it("refuses a second front opened without a vote", () => {
        const campaign = unilateral(buildCampaign(), TARGET, 3);
        const standing = warPowersStanding(campaign, "OTH", 5);
        expect(standing.kind).toBe("requires-authorization");
    });
    it("refuses sustaining the first one inside the sixty-day clock", () => {
        const campaign = unilateral(buildCampaign(), TARGET, 1);
        expect(warPowersStanding(campaign, TARGET, 5).kind).toBe("requires-authorization");
    });
    // The record of an action stops standing in for the introduction after the
    // window, which is what makes the office's own authority a limit on tempo
    // rather than a single lifetime use. It is not an amnesty: a real
    // introduction leaves a reporting obligation as well as a record, and that
    // obligation is what closes the ladder from here on — see the sixty-day
    // cases in war-powers-report.test.ts.
    it("stops counting a record with no live obligation behind it after the window", () => {
        const campaign = unilateral(buildCampaign(), TARGET, 1);
        const midway = { ...campaign, turn: 1 + WAR_POWERS_WINDOW_TURNS - 1 };
        expect(warPowersStanding(midway, TARGET, 5).kind).toBe("requires-authorization");
        const after = { ...campaign, turn: 1 + WAR_POWERS_WINDOW_TURNS };
        expect(warPowersStanding(after, TARGET, 5).kind).toBe("unilateral");
    });
    // The inversion this pins: a president who struck, absorbed
    // nine weeks of a colder Hill and waited used to get the top of the ladder
    // back for free against a new capital. In production an introduction writes
    // both records at once, so this is the sequence a player actually reaches.
    it("does not hand the ladder back for waiting out a clock that ended in an obligation", () => {
        const struck = introduced(unilateral(buildCampaign(), TARGET, 1), TARGET);
        const after = withWeeksElapsed(struck, WAR_POWERS_WINDOW_TURNS);
        expect(warPowersStanding(after, TARGET, 5).kind).toBe("requires-authorization");
        const elsewhere = warPowersStanding(after, "OTH", 5);
        expect(elsewhere.kind).toBe("requires-authorization");
        if (elsewhere.kind !== "requires-authorization")
            return;
        expect(elsewhere.reason).toContain("termination");
    });
    it("opens the rung again once Congress has voted for it", () => {
        const campaign = unilateral(buildCampaign(), TARGET, 3);
        const granted = withCongress(campaign, {
            disposition: 0.95,
            authorizations: [
                {
                    id: "aumf:test",
                    title: "Authorization",
                    target: TARGET,
                    enactedTurn: 1,
                    expiresTurn: 60,
                    vote: [],
                },
            ],
        });
        expect(warPowersStanding(granted, TARGET, 5).kind).toBe("authorized");
    });
    it("charges the president for acting alone, and Congress remembers it", () => {
        const campaign = buildCampaign();
        const before = campaign.player.metrics.standing;
        const next = apply(campaign, {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: "Forces committed without a vote." },
            effects: [...recordUnilateralForce(campaign, TARGET, 5, "test")],
        });
        expect(next.player.metrics.standing).toBeLessThan(before);
        expect(next.congress.disposition).toBeLessThan(campaign.congress.disposition);
        expect(next.congress.unauthorized).toHaveLength(1);
    });
    it("makes repeated unauthorized action compound into removal pressure", () => {
        const campaign = buildCampaign();
        const once = unilateral(campaign, TARGET, 2);
        const thrice = unilateral(unilateral(once, "OTH", 3), "THR", 4);
        const charter = { name: "Test", removalMechanism: "impeachment" };
        expect(computeRemovalPressure(thrice, charter)).toBeGreaterThan(computeRemovalPressure(once, charter));
        expect(computeRemovalPressure(once, charter)).toBeGreaterThan(computeRemovalPressure(campaign, charter));
    });
});
describe("asking Congress", () => {
    it("projects likelihood without requiring the yeas on the ordinary forecast", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.95 });
        const projection = projectForceAuthorization(campaign, TARGET);
        expect(projection.votes.map((vote) => vote.chamber)).toEqual([...CHAMBERS]);
        expect(projection.wouldPass).toBe(true);
        expect(projection.forecast.likelihood).toBe(likelihoodFromUnitInterval(projection.successChance));
        expect(projection.reasoning).not.toMatch(/\d+\s+for/);
    });
    it("issues a pending act, then resolves on the due date against the live chamber", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.95 });
        const issued = issueForceAuthorization(campaign, TARGET);
        expect(issued.ok).toBe(true);
        if (!issued.ok)
            return;
        expect(issued.act.status).toBe("awaiting-response");
        expect(issued.act.forecast.likelihood).toBe(likelihoodFromUnitInterval(issued.act.chance));
        const pending = apply(campaign, issued.packet);
        expect(outstandingIssuedAuthorizationActs(pending)).toHaveLength(1);
        expect(selectAuthorizationAgainst(pending, TARGET)).toBeUndefined();
        expect(issueForceAuthorization(pending, TARGET).ok).toBe(false);
        const resolved = resolveDueAuthorizations({ ...pending, calendar: issued.act.dueDate });
        expect(selectAuthorizationAgainst(resolved.campaign, TARGET)).toBeDefined();
        expect(outstandingIssuedAuthorizationActs(resolved.campaign)).toHaveLength(0);
        expect(resolved.campaign.issuedActs?.[issued.act.id]?.status).toBe("resolved");
    });
    it("stops a run once on the day Congress's answer comes back, and not again after", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.95 });
        const issued = issueForceAuthorization(campaign, TARGET);
        if (!issued.ok)
            throw new Error(issued.reason);
        const run = advanceUntilAttention(apply(campaign, issued.packet), { phases: defaultTurnPhases, horizonDays: 14 });
        expect(run.stopReason).toBe("attention");
        expect(run.stop.presented.map((matter) => matter.id)).toEqual([`issued-aumf:${issued.act.id}`]);
        expect(run.campaign.calendar).toEqual(issued.act.dueDate);
        const next = advanceUntilAttention(run.campaign, { phases: defaultTurnPhases, horizonDays: 7 });
        expect(next.stop.presented.some((matter) => matter.id === `issued-aumf:${issued.act.id}`)).toBe(false);
    });
    it("holds the vote immediately through the issue-then-resolve helper used by tests", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.95 });
        const result = requestForceAuthorization(campaign, TARGET);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        expect(selectAuthorizationAgainst(apply(campaign, result.packet), TARGET)).toBeDefined();
    });
    it("leaves a refused president weaker than one who never asked", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0 });
        const projection = projectForceAuthorization(campaign, TARGET);
        expect(projection.wouldPass).toBe(false);
        const result = requestForceAuthorization(campaign, TARGET);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        expect(selectAuthorizationAgainst(after, TARGET)).toBeUndefined();
        expect(after.player.metrics.standing).toBeLessThan(campaign.player.metrics.standing);
    });
    it("refuses to authorize the same war twice", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.95 });
        const first = requestForceAuthorization(campaign, TARGET);
        expect(first.ok).toBe(true);
        if (!first.ok)
            return;
        expect(requestForceAuthorization(apply(campaign, first.packet), TARGET).ok).toBe(false);
    });
});
describe("the Senate's own business", () => {
    it("weighs the nominee as well as the president", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.45 });
        const nominee = Object.keys(campaign.people)[0];
        const projection = projectConfirmation(campaign, "role-treasury-minister", nominee);
        expect(projection.vote.chamber).toBe("senate");
        expect(projection.vote.required).toBe(51);
        expect(projection.vote.yeas + projection.vote.nays).toBe(100);
    });
});
describe("the Hill's mood", () => {
    it("drifts toward its reading of the presidency rather than snapping to it", () => {
        const campaign = withCongress(buildCampaign(), { disposition: 0.1 });
        const target = dispositionTarget(campaign);
        expect(target).toBeGreaterThan(0.1);
        const after = apply(campaign, congressPhase(campaign)[0]);
        expect(after.congress.disposition).toBeGreaterThan(0.1);
        expect(after.congress.disposition).toBeLessThan(target);
    });
    it("is worse for a president who has been telling it rather than asking it", () => {
        const campaign = buildCampaign();
        const gone_around = unilateral(unilateral(campaign, TARGET, 2), "OTH", 3);
        expect(dispositionTarget(gone_around)).toBeLessThan(dispositionTarget(campaign));
    });
});
it("distinguishes the forty-eight hour reporting duty from the sixty-day termination window", () => {
    const standing = warPowersStanding(buildCampaign(), TARGET, 4);
    if (standing.kind !== "unilateral")
        throw new Error("An unauthorized limited strike must have unilateral standing");
    expect(standing.reason).toContain("forty-eight hours");
    expect(standing.reason).toContain("sixty-day termination");
    expect(standing.reason).not.toContain("report to Congress within sixty days");
});
