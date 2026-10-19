import { personDossier } from "./person-dossier";
import { relationshipScopes } from "./relationship-scopes";
import { expect, it } from "vitest";
import { EMPTY_TIE } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { connectionsForPerson, connectionLine } from "./person-network";
it("public graph labels, ordering and counts do not depend on hidden traits", () => {
    const base = openingCampaign();
    const changed = { ...base, people: Object.fromEntries(Object.entries(base.people).map(([id, runtime]) => [id, { ...runtime, base: { ...runtime.base, ideology: { economicLeftRight: 1, authLibertarian: -1, nationalistGlobalist: 1 }, traits: [], ambition: 1, loyalty: 0, integrity: 0, competence: 1 }, tie: { ...(runtime.tie ?? EMPTY_TIE), rapport: 0, trust: 0 } }])) };
    expect(JSON.stringify(relationshipScopes(changed))).toBe(JSON.stringify(relationshipScopes(base)));
    for (const subject of base.congress.members.slice(0, 20)) {
        const before = connectionsForPerson(base, subject.person);
        expect(JSON.stringify(connectionsForPerson(changed, subject.person))).toBe(JSON.stringify(before));
        expect(before.every((row) => connectionLine(row).includes("A likely contact from their past"))).toBe(true);
    }
});
it("draws observed direction/date separately from inferred biography and never calls dialogue a vote commitment", () => {
    const base = openingCampaign();
    const [from, to] = base.congress.members.slice(0, 2).map((member) => member.person);
    const campaign = { ...base, congress: { ...base.congress, lobbying: [{ id: "observed", member: to, approach: "call", turn: 1, landed: true, account: "Recorded issue conversation", cooperation: [{ from: from, to: to, actId: "act-equal-protection", date: base.calendar, accepted: true, account: "Accepted issue dialogue; no vote was promised." }] }] } };
    const outward = connectionsForPerson(campaign, from).find((row) => row.otherId === to);
    const inward = connectionsForPerson(campaign, to).find((row) => row.otherId === from);
    expect(outward.observed?.direction).toBe("outgoing");
    expect(inward.observed?.direction).toBe("incoming");
    expect(outward.observed?.date).toEqual(base.calendar);
    expect(connectionLine(outward)).toContain("They reached out to work on an issue together");
    expect(connectionLine(outward)).toContain("no vote was promised");
});
it("identifies an ordinary elected member by the actual seat without fabricating officer influence", () => {
    const campaign = openingCampaign();
    const member = campaign.congress.members.find((entry) => !campaign.congress.leadership.some((officer) => officer.person === entry.person) && !Object.values(campaign.congress.committees).some((seat) => seat.chair === entry.person || seat.ranking === entry.person));
    const standing = personDossier(campaign, member.person).standing;
    expect(standing.kind).toBe("hill");
    if (standing.kind !== "hill")
        throw new Error("Actual member was not recognized.");
    expect(standing.post).toBe(member.seat);
    expect(standing.disposition).toBeUndefined();
    expect(standing.influence).toBeUndefined();
});
