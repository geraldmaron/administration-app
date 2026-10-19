import { describe, expect, it } from "vitest";
import { DISTRICT_FORUM_READINGS, type Campaign, type CourtCase, type CourtProceeding } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { benchReading } from "./courts";
import { agreementKey, courtSystem } from "./court-system";

const opening = openingCampaign();
const forum = DISTRICT_FORUM_READINGS.find((entry) => entry.state === "Ohio")!;

function proceeding(id: string, stage: CourtProceeding["stage"], nextTurn = opening.turn + 3): CourtProceeding {
  return { id, subject: { kind: "state-election-access", state: "OH", electionTurn: 40 },
    matter: { title: `Election access ${id}`, parties: [{ name: "Voter", role: "plaintiff" }],
      injury: "The accessible equipment was absent.", jurisdiction: "Federal district court.", question: "Was access denied?",
      authority: "Federal election law.", disputedFacts: "Equipment available.", reliefSought: "Install equipment.", affected: "Voters." },
    filedTurn: opening.turn, stage, nextTurn, history: [],
    lowerForum: { id: forum.id, court: forum.court, circuit: forum.circuit, sourceDate: "2026-10-11",
      authorized: forum.authorized, activeRepublican: forum.activeRepublican,
      activeDemocratic: forum.activeDemocratic, vacancies: forum.vacancies } };
}

const withProceedings = (rows: readonly CourtProceeding[], cases: readonly CourtCase[] = []): Campaign =>
  ({ ...opening, judiciary: { ...opening.judiciary, proceedings: rows, cases: [...opening.judiciary.cases, ...cases] } });

describe("courtSystem", () => {
  it("places a live case once, in its lane and circuit, with the step date the record holds", () => {
    const system = courtSystem(withProceedings([proceeding("live", "circuit-merits")]));
    const live = system.cases.filter((entry) => entry.id === "live");
    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({ lane: "circuit", circuit: forum.circuit, forum: forum.court, next: { turn: opening.turn + 3, weeks: 3 } });
    expect(system.circuits.find((circuit) => circuit.name === forum.circuit)?.caseIds).toContain("live");
    expect(system.events.filter((event) => event.caseId === "live").map((event) => event.kind)).toEqual(["step"]);
  });

  it("shows a scheduled argument and the late-June target, never an announced opinion day", () => {
    const calendar = { termYear: 2029, argumentTurn: opening.turn + 20, opinionTurn: opening.turn + 28, opinionTargetTurn: opening.turn + 40, status: "scheduled" as const };
    const system = courtSystem(withProceedings([{ ...proceeding("merits", "supreme-merits"), calendar }]));
    const kinds = system.events.filter((event) => event.caseId === "merits").map((event) => [event.kind, event.weeks]);
    expect(kinds).toEqual([["step", 3], ["argument", 20], ["opinion-target", 40]]);
    expect(system.events.some((event) => event.weeks === 28)).toBe(false);
  });

  it("marks a pending stay with no decision date rather than inventing one", () => {
    const stay = { ...proceeding("stay", "appeal"), stayApplication: { status: "pending" as const, requestedTurn: opening.turn,
      factors: { merits: 0.5, irreparableHarm: 0.5, harmToOthers: 0.5, publicInterest: 0.5, modeledGrantChance: 0.5 } } };
    const entry = courtSystem(withProceedings([stay])).cases.find((row) => row.id === "stay");
    expect(entry).toMatchObject({ lane: "emergency", stayPending: true });
  });

  it("reports no recorded agreement until two sitting justices have voted in the same case", () => {
    const empty = courtSystem(withProceedings([]));
    expect(empty.agreementRecorded).toBe(false);
    const seated = benchReading(opening).seats.filter((seat) => !seat.vacant).map((seat) => opening.institutions[seat.institution]!.leader!);
    const a = seated[0]!;
    const b = seated[1]!;
    const ruling: CourtCase = { id: "ruled", subject: { kind: "state-election-access", state: "OH", electionTurn: 40 }, question: "Was access denied?",
      ground: "forbidden", filedTurn: 1, dueTurn: 2, ruledTurn: 3, holding: "struck-down",
      votes: [{ justice: a, seat: 1, vote: "strike" }, { justice: b, seat: 2, vote: "uphold" }], opinion: { majority: "Required." } };
    const recorded = courtSystem(withProceedings([], [ruling]));
    expect(recorded.agreementRecorded).toBe(true);
    expect(recorded.agreement.get(agreementKey(a, b))).toEqual({ together: 0, shared: 1 });
    expect(recorded.agreement.get(agreementKey(b, a))).toEqual({ together: 0, shared: 1 });
  });

  it("gives each circuit its appointee margin, bounded and absent only without a filled seat", () => {
    for (const circuit of courtSystem(opening).circuits) {
      if (circuit.democratic + circuit.republican === 0) expect(circuit.margin).toBeUndefined();
      else expect(Math.abs(circuit.margin!)).toBeLessThanOrEqual(1);
    }
  });

  it("names the October terms that overlap the coming year, each ending June 30", () => {
    const { terms } = courtSystem(opening);
    expect(terms.length).toBeGreaterThan(0);
    for (const term of terms) {
      expect(term.end.date).toMatch(/^June 30, \d{4}$/);
      expect(term.start.date).toMatch(/^October 1, \d{4}$/);
      expect(term.end.weeks).toBeGreaterThanOrEqual(0);
    }
  });
});
