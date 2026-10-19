import { beforeAll, describe, expect, it } from "vitest";
import { apply, foreignLeaderFor, type Campaign, type OversightMatter, type Pursuit } from "@admin/engine";
import type { NationId, PersonId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { personLeadRows, referChoices, referOrder, taskChoices, taskOrder, collectionReading, taskingRefusal, type TaskingDraft } from "./collection-reading";

let base: Campaign;
let cases: Campaign;
let actor: NationId;
let holder: PersonId;

beforeAll(() => {
  base = openingCampaign({ seedText: "person-leads" });
  actor = (Object.keys(base.nations) as NationId[]).find((id) => id !== base.founding.nation && foreignLeaderFor(base, id))!;
  holder = Object.values(base.player.cabinet).find((id) => id !== undefined && id !== base.player.cabinet[base.founding.leadRole]) as PersonId;
  const pursuit: Pursuit = { id: `pursuit:${actor}:${base.founding.nation}:1`, actor, target: base.founding.nation, aim: "security", openedTurn: 1,
    commitment: 0.5, progress: 0, rungReached: 1, overt: false, lastActedTurn: base.turn, status: "active", beats: [] };
  const matter: OversightMatter = { id: "matter:ig:INST-DOJ:graft:1", causeId: "event:graft:1", origin: { kind: "inspector-general", institution: "INST-DOJ" },
    direction: "directed", subject: "Contract steering", openedTurn: 1, stage: "reported", public: true, obstructed: false, beats: [] };
  cases = { ...base, pursuits: { [pursuit.id]: pursuit }, oversight: { ...base.oversight, matters: [...base.oversight.matters, matter] },
    ledger: [...base.ledger, { causal: { eventId: "event:graft:1", graft: { person: holder, role: "role", institution: "INST-DOJ", fiscalYear: 2029, account: "defense",
      annualShare: 0.01, departmentShare: 1, annualPurchasing: 1, purchasingReach: 0.1, oversightPressure: 0.1 } } } as never] };
}, 60_000);

describe("the person picker", () => {
  it("offers nobody until an incident binds a person on record", () => {
    expect(personLeadRows(base)).toHaveLength(0);
  });

  it("offers a foreign leader to task and a domestic officer only to refer", () => {
    const rows = personLeadRows(cases);
    expect(rows.map((row) => row.pathway).sort()).toEqual(["refer", "task"]);
    expect(rows.every((row) => cases.people[row.subject.personId]?.base.name === row.name)).toBe(true);
  });

  it("tasks the foreign person through CIA human sources and shows them on the desk", () => {
    const row = personLeadRows(cases).find((entry) => entry.pathway === "task")!;
    const draft: TaskingDraft = { element: "IC-CIA", discipline: "humint", kind: "foreign-person", target: row.subject.personId, subject: row.subject,
      focus: "external-intent", question: "" };
    expect(taskingRefusal(draft)).toBeUndefined();
    expect(taskChoices(cases, draft)!.columns[0]!.locked).toBeUndefined();
    const tasked = apply(cases, taskOrder(cases, draft));
    const shown = collectionReading(tasked).taskings[0]!;
    expect(shown.target).toBe(row.name);
    expect(shown.href).toBe(row.href);
    expect(taskingRefusal({ ...draft, element: "IC-NSA", discipline: "sigint" })).toContain("no sourced authority");
  });

  it("never offers a domestic person as a tasking and records a referral instead", () => {
    const row = personLeadRows(cases).find((entry) => entry.pathway === "refer")!;
    const draft: TaskingDraft = { element: "IC-FBI", discipline: "humint", kind: "domestic-person", target: row.subject.personId, subject: row.subject, question: "Investigate." };
    expect(taskingRefusal(draft)).toContain("not an instruction");
    expect(referChoices(cases, row.subject).columns[0]!.locked).toBeUndefined();
    const referred = apply(cases, referOrder(cases, row.subject));
    expect(personLeadRows(referred).find((entry) => entry.pathway === "refer")!.referred).toBe(true);
    expect(referChoices(referred, row.subject).columns[0]!.locked).toContain("already");
  });
});
