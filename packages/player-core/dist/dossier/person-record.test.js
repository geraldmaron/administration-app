import { describe, expect, it } from "vitest";
import { selectDateOfTurn } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { benchReading } from "../judiciary/courts.js";
import { personDossier } from "./person-dossier.js";
import { personRecord } from "./person-record.js";
const opening = openingCampaign({ seedText: "person-record" });
function holderOf(kind) {
    const id = Object.keys(opening.people).find((personId) => personDossier(opening, personId)?.standing.kind === kind);
    if (!id)
        throw new Error(`no ${kind} in the opening campaign`);
    return id;
}
describe("a person's record in office", () => {
    it("lists a justice's recorded votes with their side of the court", () => {
        const seats = benchReading(opening).seats.filter((seat) => seat.personId);
        const [a, b, c] = seats.map((seat) => seat.personId);
        const ruled = {
            id: "case:order-x", question: "Was it lawful?", ground: "silent", filedTurn: 1, dueTurn: 2, ruledTurn: 3, holding: "struck-down",
            votes: [{ justice: a, seat: 1, vote: "strike" }, { justice: b, seat: 2, vote: "strike" }, { justice: c, seat: 3, vote: "uphold" }],
            majorityAuthor: a, dissentAuthor: c, opinion: { majority: "No." },
        };
        const campaign = { ...opening, judiciary: { ...opening.judiciary, cases: [ruled] } };
        const mine = personRecord(campaign, a);
        expect(mine.kind).toBe("bench");
        expect(mine.rows).toHaveLength(1);
        expect(mine.rows[0]).toMatchObject({ outcome: "Struck down", castKey: "strike", standing: "The majority, and wrote the opinion" });
        expect(personRecord(campaign, c).rows[0]).toMatchObject({ castKey: "uphold", standing: "The dissent, and wrote the dissent" });
        expect(personRecord(opening, a).rows).toHaveLength(0);
        expect(personRecord(opening, a).empty).toMatch(/since .* joined it/);
    });
    it("lists a member's recorded roll calls with party standing, and says plainly when none exist", () => {
        const member = holderOf("hill");
        expect(personRecord(opening, member)).toMatchObject({ kind: "floor", rows: [], empty: expect.stringMatching(/No recorded votes yet this term/) });
        const party = opening.people[member].base.party;
        const other = party === "democrat" ? "republican" : "democrat";
        const pad = (name, p, yea, seat) => ({ person: name, seat, state: "OH", party: p, yea, support: 0.5, reasons: [] });
        const vote = {
            chamber: "senate", yeas: 2, nays: 2, required: 3, passed: false, recordedTurn: 4,
            rollCall: [pad(member, party, true, "OH-1"), pad("x1", party, false, "OH-2"), pad("x2", party, false, "OH-3"), pad("y", other, true, "OH-4")],
        };
        const bill = { id: "bill:test:1", act: "test", title: "A test bill", passage: [vote], status: "dead" };
        const campaign = { ...opening, bills: { ...opening.bills, [bill.id]: bill } };
        const row = personRecord(campaign, member).rows[0];
        expect(row).toMatchObject({ title: "A test bill", cast: "Yea", castKey: "yea", outcome: "Failed, 2 to 2" });
        expect(row.standing).toMatch(/^Against most /);
        expect(row.href).toContain("bill");
    });
    it("states a governor's state and stance, with no answers listed before any request", () => {
        const record = personRecord(opening, holderOf("governor"));
        expect(record.kind).toBe("governor");
        expect(record.rows).toHaveLength(0);
        expect(record.facts.map((fact) => fact.label)).toEqual(expect.arrayContaining(["State", "How they feel about you"]));
        expect(record.facts[0].href).toMatch(/\/nation\/state\//);
        const term = record.facts.find((fact) => fact.label === "Term ends");
        if (term)
            expect(term.value).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });
    it("lists a governor's recorded answers since taking office, and none from before", () => {
        const governor = holderOf("governor");
        const state = Object.entries(opening.states).find(([, runtime]) => runtime.governor?.person === governor)[0];
        const stamp = (turn, acts, eventId) => ({
            turn,
            description: `The governor ${acts ? "agrees" : "declines"}.`,
            causal: { origin: "decision", eventId, createdDate: selectDateOfTurn(opening, opening.turn), visibility: "public", decision: { question: "governor-consent", actor: state, terms: [], score: 0, threshold: 0, acts, close: !acts, visibility: "public" } },
        });
        const seated = { ...opening.states[state], governor: { ...opening.states[state].governor, since: 5 } };
        const campaign = { ...opening, states: { ...opening.states, [state]: seated }, ledger: [...opening.ledger, stamp(3, true, "ev-3-x"), stamp(6, false, "ev-6-y")] };
        const rows = personRecord(campaign, governor).rows;
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ cast: "Declined", castKey: "declined", standing: "Close", href: "/record/event/ev-6-y" });
    });
    it("lists a foreign government's public acts under its leader, never its intelligence-only ones", () => {
        const leader = holderOf("foreign-leader");
        const nation = (personRecord(opening, leader).facts[0].href ?? "").split("/").pop();
        const act = (visibility, eventId) => ({
            turn: opening.turn,
            description: "A trade restriction.",
            causal: { origin: "world", eventId, createdDate: selectDateOfTurn(opening, opening.turn), visibility, decision: { question: "npc-act", actor: nation, subject: opening.founding.nation, terms: [], score: 0, threshold: 0, acts: true, close: false, visibility: "intelligence" } },
        });
        const campaign = { ...opening, ledger: [...opening.ledger, act("public", "ev-a"), act("intelligence", "ev-b")] };
        const rows = personRecord(campaign, leader).rows;
        expect(rows.map((row) => row.key)).toEqual(["ev-a"]);
        expect(rows[0].castKey).toBe("acted");
    });
    it("gives a foreign head of government their country and its standing with the President", () => {
        const record = personRecord(opening, holderOf("foreign-leader"));
        expect(record.kind).toBe("leader");
        expect(record.facts[0].href).toMatch(/country|world/);
        expect(record.facts.some((fact) => fact.label === "Their view of you")).toBe(true);
    });
    it("has nothing role-specific for a cabinet officer or an unknown id", () => {
        expect(personRecord(opening, holderOf("cabinet"))).toBeUndefined();
        expect(personRecord(opening, "PER-NOBODY")).toBeUndefined();
    });
});
