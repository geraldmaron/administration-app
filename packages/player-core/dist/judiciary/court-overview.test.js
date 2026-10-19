import { describe, expect, it } from "vitest";
import { DISTRICT_FORUM_READINGS } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { benchReading } from "./courts";
import { courtOverview } from "./court-overview";
const opening = openingCampaign();
const forum = DISTRICT_FORUM_READINGS.find((entry) => entry.state === "Ohio");
function proceeding(id, stage) {
    return { id, subject: { kind: "state-election-access", state: "OH", electionTurn: 40 },
        matter: { title: `Election access ${id}`, parties: [{ name: "Voter", role: "plaintiff" }],
            injury: "The accessible equipment was absent.", jurisdiction: "Federal district court.", question: "Was access denied?",
            authority: "Federal election law.", disputedFacts: "Equipment available.", reliefSought: "Install equipment.", affected: "Voters." },
        filedTurn: 20, stage, nextTurn: 21, history: [],
        lowerForum: { id: forum.id, court: forum.court, circuit: forum.circuit, sourceDate: "2026-10-11",
            authorized: forum.authorized, activeRepublican: forum.activeRepublican,
            activeDemocratic: forum.activeDemocratic, vacancies: forum.vacancies } };
}
function opinion(id, votes = []) {
    return { id, subject: { kind: "state-election-access", state: "OH", electionTurn: 40 }, question: "Was access denied?",
        ground: "forbidden", filedTurn: 20, dueTurn: 21, ruledTurn: 22, holding: "struck-down", votes,
        opinion: { majority: "The equipment is required." } };
}
describe("courtOverview", () => {
    it("keeps a live case linked without inventing its circuit before the forum is recorded", () => {
        const withoutForum = { ...proceeding("forum-pending", "threshold"), lowerForum: undefined };
        const campaign = { ...opening, judiciary: { ...opening.judiciary, proceedings: [withoutForum] } };
        const overview = courtOverview(campaign);
        expect(overview.unassignedCases).toEqual([
            expect.objectContaining({ title: "Election access forum-pending", href: expect.stringContaining("forum-pending") }),
        ]);
        expect(overview.circuits.every((circuit) => circuit.cases.length === 0)).toBe(true);
        expect(overview.pipeline.filed).toBe(1);
    });
    it("counts each live case once at its current stage and a decided case once", () => {
        const stages = ["threshold", "interim", "circuit-merits", "appeal", "supreme-merits", "remand"];
        const rows = stages.map((stage, index) => proceeding(`stage:${index}`, stage));
        const emergency = { ...proceeding("stay:pending", "appeal"), stayApplication: { status: "pending",
                requestedTurn: 21, factors: { merits: 0, irreparableHarm: 0, harmToOthers: 0, publicInterest: 0, modeledGrantChance: 0.5 } } };
        const completed = proceeding("decided", "final");
        const campaign = { ...opening, judiciary: { ...opening.judiciary,
                proceedings: [...rows, emergency, completed, completed], cases: [opinion("decided"), opinion("legacy")] } };
        const pipeline = courtOverview(campaign).pipeline;
        expect(pipeline).toEqual({ filed: 2, injunction: 1, circuit: 1, emergency: 1, review: 2, decision: 2 });
        expect(Object.values(pipeline).reduce((sum, value) => sum + value, 0)).toBe(9);
    });
    it("places a live case in its recorded circuit and computes agreement only from shared frozen votes", () => {
        const seats = benchReading(opening).seats.filter((seat) => seat.personId);
        const [a, b, c] = seats;
        if (!a?.personId || !b?.personId || !c?.personId)
            throw new Error("Opening Supreme bench is incomplete");
        const campaign = { ...opening, judiciary: { ...opening.judiciary,
                proceedings: [proceeding("filed-in-ohio", "interim")],
                cases: [opinion("votes:one", [
                        { justice: a.personId, seat: a.seat, vote: "strike" },
                        { justice: b.personId, seat: b.seat, vote: "strike" },
                    ]), opinion("votes:two", [
                        { justice: a.personId, seat: a.seat, vote: "strike" },
                        { justice: b.personId, seat: b.seat, vote: "uphold" },
                    ])] } };
        const overview = courtOverview(campaign);
        expect(overview.circuits.find((entry) => entry.name === forum.circuit)?.cases).toEqual([
            expect.objectContaining({ title: "Election access filed-in-ohio", state: "OH", href: expect.stringContaining("filed-in-ohio") }),
        ]);
        expect(overview.agreement.pairs.find((pair) => pair.first === a.personId && pair.second === b.personId))
            .toMatchObject({ together: 1, shared: 2 });
        expect(overview.agreement.pairs.find((pair) => pair.first === a.personId && pair.second === c.personId))
            .toMatchObject({ together: 0, shared: 0 });
        const justice = overview.agreement.justices.find((entry) => entry.id === a.personId);
        const provenance = opening.institutions[a.institution]?.judicialProvenance;
        expect(justice?.age).toBe(opening.people[a.personId]?.base.age);
        expect(justice?.tenure).toBe(provenance ? opening.calendar.year - provenance.serviceStartYear : undefined);
    });
});
