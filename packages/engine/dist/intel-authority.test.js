import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { foreignLeaderFor } from "./foreign-leader.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { apply } from "./effects.js";
import { relationshipKey } from "./state.js";
import { createSave, loadSave } from "./save.js";
import { campaignDay } from "./nomination.js";
import { SUBJECT_FRESH_DAYS, referToAttorneyGeneral, selectSubjectLeads, } from "./intel-authority.js";
import { intelligencePhase, selectAgReferrals, selectCollectionProducts, selectCollectionShares, selectRefusals, selectStandingTaskings, shareCollectionReport, taskCollection, } from "./intelligence.js";
const seed = makeCampaignSeed("intel-authority");
function founded() {
    const pool = generateFoundingPool(seed, worldDataset);
    const nation = worldDataset.nations.find((n) => n.playable);
    const charter = worldDataset.charters[0];
    const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0);
    const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]));
    const choices = {
        nationId: nation.id, nationName: nation.identity.name, name: "Test President", title: "President",
        charterId: charter.id, cradleId: cradle.id, flag: defaultFlagDesign, compactIds: [], cabinet,
        leader: { ...defaultLeaderDraft(), name: "Test President" },
    };
    return sealFounding(seed, worldDataset, choices);
}
const base = founded();
const actor = Object.keys(base.nations).find((id) => id !== base.founding.nation && foreignLeaderFor(base, id));
const leader = foreignLeaderFor(base, actor);
const pursuit = {
    id: `pursuit:${actor}:${base.founding.nation}:1`, actor, target: base.founding.nation, aim: "security", openedTurn: 1,
    commitment: 0.5, progress: 0, rungReached: 1, overt: false, lastActedTurn: base.turn, status: "active", beats: [],
};
const holder = Object.values(base.player.cabinet).find((id) => id !== undefined && id !== base.player.cabinet[base.founding.leadRole]);
const graftEvent = "event:graft:1";
const matter = {
    id: "matter:ig:INST-DOJ:graft:1", causeId: graftEvent, origin: { kind: "inspector-general", institution: "INST-DOJ" },
    direction: "directed", subject: "Contract steering", openedTurn: 1, stage: "reported", public: true, obstructed: false, beats: [],
};
const withCases = {
    ...base,
    pursuits: { [pursuit.id]: pursuit },
    oversight: { ...base.oversight, matters: [...base.oversight.matters, matter] },
    ledger: [...base.ledger, { causal: { eventId: graftEvent, graft: { person: holder, role: "role", institution: "INST-DOJ", fiscalYear: 2029, account: "defense",
                    annualShare: 0.01, departmentShare: 1, annualPurchasing: 1, purchasingReach: 0.1, oversightPressure: 0.1 } } }],
};
const lead = (jurisdiction) => selectSubjectLeads(withCases).find((entry) => entry.jurisdiction === jurisdiction);
const foreign = (extra = {}) => ({
    element: "IC-CIA", discipline: "humint", targetKind: "foreign-person", target: leader.person, question: "",
    focus: "external-intent", subject: lead("foreign").subject, ...extra,
});
const domestic = (element, subject = lead("domestic").subject) => ({
    element, discipline: "humint", targetKind: "domestic-person", target: subject.personId, question: "Investigate.", subject,
});
describe("cases bind people the registry already holds", () => {
    it("offers only the foreign leader of a government pressing the United States and the person an IG finding names", () => {
        const leads = selectSubjectLeads(withCases);
        expect(leads.map((entry) => entry.subject.personId).sort()).toEqual([leader.person, holder].sort());
        expect(leads.every((entry) => withCases.people[entry.subject.personId])).toBe(true);
        expect(selectSubjectLeads(base)).toHaveLength(0);
    });
});
describe("foreign person collection", () => {
    it("opens a CIA human-source tasking bound to the case and the person", () => {
        const result = taskCollection(withCases, foreign());
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const next = apply(withCases, result.packet);
        const [tasking] = selectStandingTaskings(next);
        expect(tasking?.subject).toEqual(lead("foreign").subject);
        expect(tasking?.target).toBe(leader.person);
        expect(selectRefusals(next)).toHaveLength(0);
    });
    it("hard-rejects a missing subject, an unknown person, a stale snapshot and a closed case without logging anything", () => {
        const { subject: _omitted, ...bare } = foreign();
        expect(taskCollection(withCases, bare)).toMatchObject({ ok: false });
        const unknown = taskCollection(withCases, foreign({ subject: { ...lead("foreign").subject, personId: "PER-NOBODY" } }));
        expect(unknown).toEqual({ ok: false, reason: "No such person is on record." });
        const day = campaignDay(withCases);
        const stale = taskCollection(withCases, foreign({ subject: { ...lead("foreign").subject, snapshotDay: day - SUBJECT_FRESH_DAYS } }));
        expect(stale).toMatchObject({ ok: false });
        if (!stale.ok)
            expect(stale.reason).toContain("too long ago");
        const closed = { ...withCases, pursuits: { [pursuit.id]: { ...pursuit, status: "abandoned" } } };
        const result = taskCollection(closed, foreign());
        expect(result).toMatchObject({ ok: false });
        if (!result.ok)
            expect(result.reason).toContain("closed");
        const swapped = taskCollection(withCases, foreign({ subject: { ...lead("foreign").subject, personId: holder } }));
        expect(swapped.ok).toBe(false);
    });
    it("requires the external-intent question and the matching jurisdiction", () => {
        expect(taskCollection(withCases, foreign({ focus: "overview" })).ok).toBe(false);
        expect(taskCollection(withCases, foreign({ subject: lead("domestic").subject })).ok).toBe(false);
    });
    it("logs a refusal, not a hard error, for an element or discipline with no sourced pathway", () => {
        for (const request of [foreign({ element: "IC-NSA", discipline: "sigint" }), foreign({ element: "IC-CIA", discipline: "all-source" })]) {
            const result = taskCollection(withCases, request);
            expect(result.ok).toBe(true);
            if (!result.ok)
                continue;
            const next = apply(withCases, result.packet);
            expect(selectStandingTaskings(next)).toHaveLength(0);
            expect(selectRefusals(next)[0]?.subject).toEqual(request.subject);
            expect(selectRefusals(next)[0]?.reason).toContain("no sourced authority");
        }
    });
});
describe("a person in the United States", () => {
    it("is never taskable by the President: every element's answer is a logged refusal", () => {
        for (const element of ["IC-FBI", "IC-CIA", "IC-NSA", "IC-DEA", "IC-DHS", "IC-ODNI"]) {
            const result = taskCollection(withCases, domestic(element));
            expect(result.ok).toBe(true);
            if (!result.ok)
                continue;
            const next = apply(withCases, result.packet);
            expect(selectStandingTaskings(next)).toHaveLength(0);
            expect(selectRefusals(next)).toHaveLength(1);
        }
        const fbi = taskCollection(withCases, domestic("IC-FBI"));
        if (fbi.ok)
            expect(apply(withCases, fbi.packet).security.intelligence.refusals[0].reason).toContain("not an instruction");
    });
    it("still hard-rejects an unknown or stale subject before it can be logged", () => {
        const unknown = taskCollection(withCases, domestic("IC-FBI", { ...lead("domestic").subject, personId: "PER-NOBODY" }));
        expect(unknown).toMatchObject({ ok: false });
        const closed = { ...withCases, oversight: { ...withCases.oversight, matters: withCases.oversight.matters.map((entry) => entry.id === matter.id ? { ...entry, stage: "closed" } : entry) } };
        expect(taskCollection(closed, domestic("IC-FBI")).ok).toBe(false);
    });
    it("is referred to the Attorney General once, directing nothing", () => {
        const result = referToAttorneyGeneral(withCases, lead("domestic").subject);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const next = apply(withCases, result.packet);
        expect(selectAgReferrals(next)).toHaveLength(1);
        expect(selectAgReferrals(next)[0]?.authority).toBe("president-take-care");
        expect(selectStandingTaskings(next)).toHaveLength(0);
        expect(selectRefusals(next)).toHaveLength(0);
        expect(referToAttorneyGeneral(next, lead("domestic").subject)).toMatchObject({ ok: false });
        expect(referToAttorneyGeneral(withCases, lead("foreign").subject)).toMatchObject({ ok: false });
        expect(referToAttorneyGeneral(withCases, { ...lead("domestic").subject, personId: "PER-NOBODY" })).toMatchObject({ ok: false });
        expect(selectAgReferrals(loadSave(createSave(next)))).toEqual(selectAgReferrals(next));
    });
});
describe("a person-level tasking across weeks, saves and reports", () => {
    const tasked = (() => {
        const result = taskCollection(withCases, foreign());
        if (!result.ok)
            throw new Error(result.reason);
        return apply(withCases, result.packet);
    })();
    const closedCase = { ...tasked, pursuits: { [pursuit.id]: { ...pursuit, status: "abandoned" } } };
    it("survives save and reload while its case holds", () => {
        expect(selectStandingTaskings(loadSave(createSave(tasked)))[0]?.subject).toEqual(lead("foreign").subject);
    });
    it("closes with a recorded reason on reload when the case no longer holds", () => {
        const reloaded = loadSave({ schemaVersion: 66, campaign: closedCase });
        expect(selectStandingTaskings(reloaded)).toHaveLength(0);
        expect(reloaded.security.intelligence.taskings[Object.keys(tasked.security.intelligence.taskings)[0]]?.closedReason).toContain("closed");
        expect(loadSave(createSave(reloaded))).toEqual(reloaded);
    });
    it("closes a legacy person tasking that names no person on reload", () => {
        const [id, tasking] = Object.entries(tasked.security.intelligence.taskings)[0];
        const { subject: _subject, ...legacy } = tasking;
        const old = { ...tasked, security: { ...tasked.security, intelligence: { ...tasked.security.intelligence, taskings: { [id]: legacy } } } };
        expect(selectStandingTaskings(loadSave({ schemaVersion: 66, campaign: old }))).toHaveLength(0);
    });
    it("closes in the weekly phase before it can file again", () => {
        const packets = intelligencePhase(closedCase);
        const closes = packets.flatMap((packet) => packet.effects).filter((effect) => effect.kind === "intelligence" && effect.closeTasking);
        expect(closes).toHaveLength(1);
        expect(packets.flatMap((packet) => packet.effects).some((effect) => effect.kind === "intelligence" && effect.product)).toBe(false);
        expect(selectStandingTaskings(packets.reduce(apply, closedCase))).toHaveLength(0);
    });
    it("files a report that carries the subject and shares it with the snapshot intact, never with the subject's own government", () => {
        const filed = intelligencePhase(tasked).reduce(apply, tasked);
        const report = selectCollectionProducts(filed)[0];
        expect(report.targetKind).toBe("foreign-person");
        expect(report.subject).toEqual(lead("foreign").subject);
        expect(report.gaps?.join(" ")).toContain("does not establish");
        const recipient = Object.keys(filed.nations).find((id) => id !== actor && id !== filed.founding.nation);
        const trusted = { ...filed, relationships: { ...filed.relationships, [relationshipKey(filed.founding.nation, recipient)]: {
                    ...Object.values(filed.relationships)[0], from: filed.founding.nation, to: recipient, trust: 0.9
                } } };
        expect(shareCollectionReport(trusted, report.id, [actor])).toMatchObject({ ok: false });
        const sent = shareCollectionReport(trusted, report.id, [recipient]);
        expect(sent.ok).toBe(true);
        if (!sent.ok)
            return;
        const shared = selectCollectionShares(loadSave(createSave(apply(trusted, sent.packet))))[0];
        expect(shared.report.subject).toEqual(lead("foreign").subject);
    });
});
