import { describe, expect, it } from "vitest";
import type { Campaign, CourtCase, CourtProceeding } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { caseProcess } from "./case-process";

const opening = openingCampaign();
const at = opening.turn;

function proceeding(stage: CourtProceeding["stage"], extra: Partial<CourtProceeding> = {}): CourtProceeding {
  return { id: "case:p", subject: { kind: "state-election-access", state: "OH", electionTurn: 40 },
    matter: { title: "Voting access", parties: [{ name: "Voter", role: "plaintiff" }], injury: "Absent equipment.", jurisdiction: "District court.",
      question: "Was access denied?", authority: "Federal election law.", disputedFacts: "Equipment.", reliefSought: "Install it.", affected: "Voters." },
    filedTurn: at - 6, stage, nextTurn: at + 2,
    history: [{ turn: at - 6, stage: "threshold", account: "Filed." }, { turn: at - 5, stage: "lower-merits", account: "Accepted for merits review." },
      { turn: at - 3, stage: "appeal", account: "District court ruled." }],
    ...extra };
}

const process = (rows: readonly CourtProceeding[], cases: readonly CourtCase[] = []) =>
  caseProcess({ ...opening, judiciary: { ...opening.judiciary, proceedings: rows, cases } } as Campaign, "case:p")!;

describe("caseProcess", () => {
  it("marks recorded steps done, the current one now with its date, and later ones only possible", () => {
    const result = process([proceeding("appeal")]);
    expect(result.steps.map((step) => [step.id, step.state])).toEqual([
      ["filed", "done"], ["interim", "not-reached"], ["district", "done"], ["appeal", "now"], ["supreme", "possible"], ["final", "possible"],
    ]);
    expect(result.next).toMatchObject({ turn: at + 2, weeks: 2 });
    expect(result.steps.find((step) => step.id === "district")!.moments).toEqual([expect.objectContaining({ text: "District court ruled." })]);
  });

  it("keeps a granted stay distinct from a final remedy", () => {
    const stayed = process([proceeding("appeal", { lower: { holding: "struck-down", ruledTurn: at - 3, ground: "forbidden", enforcement: "in-force" },
      stayApplication: { status: "granted", requestedTurn: at - 2, decidedTurn: at - 1,
        factors: { merits: 0.5, irreparableHarm: 0.5, harmToOthers: 0.5, publicInterest: 0.5, modeledGrantChance: 0.5 } } })]);
    expect(stayed.governing).toEqual({ kind: "stay-granted" });
    expect(stayed.stay).toMatchObject({ status: "granted" });
    const inForce = process([proceeding("appeal", { lower: { holding: "struck-down", ruledTurn: at - 3, ground: "forbidden", enforcement: "in-force" } })]);
    expect(inForce.governing).toEqual({ kind: "lower-in-force", setAside: true });
  });

  it("closes a decided case: final done, and steps it never took read as not reached", () => {
    const ruling = { id: "case:p", subject: { kind: "state-election-access", state: "OH", electionTurn: 40 }, question: "Was access denied?",
      ground: "forbidden", filedTurn: at - 6, dueTurn: at - 1, ruledTurn: at - 1, holding: "upheld", votes: [], opinion: { majority: "No." } } as CourtCase;
    const result = process([proceeding("final")], [ruling]);
    expect(result.steps.find((step) => step.id === "final")!.state).toBe("done");
    expect(result.steps.find((step) => step.id === "supreme")!.state).toBe("not-reached");
    expect(result.governing).toEqual({ kind: "final", upheld: true, dismissed: false });
    expect(result.next).toBeUndefined();
  });

  it("records a remand as a return to the district court", () => {
    const result = process([proceeding("remand", { history: [...proceeding("remand").history, { turn: at - 1, stage: "remand", account: "Remanded." }] })]);
    expect(result.remanded).toBe(true);
    expect(result.steps.find((step) => step.id === "district")!.state).toBe("now");
  });

  it("lets a later circuit judgment govern over an earlier stay of the district judgment", () => {
    const result = process([proceeding("supreme-merits", {
      lower: { holding: "struck-down", ruledTurn: at - 5, ground: "forbidden", enforcement: "stayed-pending-appeal" },
      stayApplication: { status: "granted", requestedTurn: at - 4, decidedTurn: at - 4,
        factors: { merits: 0.5, irreparableHarm: 0.5, harmToOthers: 0.5, publicInterest: 0.5, modeledGrantChance: 0.5 } },
      circuit: { court: "District of Columbia", ruledTurn: at - 2, holding: "struck-down", votes: [] } })]);
    expect(result.governing).toEqual({ kind: "circuit", setAside: true });
    expect(result.stay).toMatchObject({ status: "granted", superseded: true });
  });

  it("files a decision under the step it decided, not the one it opened", () => {
    const history = [
      { turn: at - 8, stage: "threshold" as const, account: "Filed." },
      { turn: at - 7, stage: "interim" as const, account: "Accepted for merits review." },
      { turn: at - 6, stage: "lower-merits" as const, account: "Interim relief denied." },
      { turn: at - 5, stage: "appeal" as const, account: "District court sets the order aside." },
      { turn: at - 4, stage: "appeal" as const, account: "Stay requested." },
      { turn: at - 2, stage: "supreme-merits" as const, account: "Review granted." },
    ];
    const steps = process([proceeding("supreme-merits", { history })]).steps;
    const textOf = (id: string) => steps.find((step) => step.id === id)!.moments.map((moment) => moment.text);
    expect(textOf("filed")).toEqual(["Filed.", "Accepted for merits review."]);
    expect(textOf("interim")).toEqual(["Interim relief denied."]);
    expect(textOf("district")).toEqual(["District court sets the order aside."]);
    expect(textOf("appeal")).toEqual(["Stay requested."]);
    expect(textOf("supreme")).toEqual(["Review granted."]);
  });
});
