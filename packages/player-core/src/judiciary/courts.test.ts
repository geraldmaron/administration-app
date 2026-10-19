import { beforeAll, describe, expect, it } from "vitest";
import {
  advanceTurn,
  apply,
  campaignTurnPhases,
  EXECUTIVE_ORDERS,
  judiciaryBenchSeats,
  judicialReviewPhase,
  LEGISLATIVE_ACTS,
  projectOrder,
  signOrder,
  statutoryMatterId,
  presidencyElections,
  selectDateOfTurn,
  turnOnDate,
  withdrawNomination,
  type Campaign,
  type RngStreams,
} from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { caseFile } from "./case-file";
import { benchReading, courtDocket, justiceFile, leanAxes } from "./courts";
import { judicialNominations } from "./judicial-nominations";
import { appointmentDesk, deskPlan, DESK_CANDIDATES } from "../appointments/desk";

// A draw of zero is under any odds, so the first order a challenge can reach
// comes back contested: the order the screens read is one the engine itself
// signed, not a record written by hand.
const ALWAYS_CHALLENGED: RngStreams = { stream: () => ({ key: "test", next: () => 0, nextInt: (min: number) => min, pick: <T>(items: readonly T[]) => items[0]! }) };

function signContested(campaign: Campaign): Campaign {
  const charter = charterOf(campaign);
  const order = EXECUTIVE_ORDERS.find((entry) => projectOrder(campaign, charter, entry).challengeChance > 0 && signOrder(campaign, charter, entry.id, ALWAYS_CHALLENGED).ok);
  if (!order) throw new Error("no order a challenge can reach could be signed");
  const signed = signOrder(campaign, charter, order.id, ALWAYS_CHALLENGED);
  if (!signed.ok || !signed.contested) throw new Error("the signed order was not contested");
  return apply(campaign, signed.packet);
}

function advance(campaign: Campaign, weeks: number): Campaign {
  const phases = campaignTurnPhases(charterOf(campaign));
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) working = advanceTurn(working, phases);
  return working;
}

/** A justice dies: the person effect every death writes, so the seat reads vacant the way the engine reads it. */
function withoutJustice(campaign: Campaign, seat: number): Campaign {
  const justice = judiciaryBenchSeats(campaign).find((row) => row.seat === seat)?.personId;
  if (!justice) throw new Error(`seat ${seat} is empty`);
  return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "A justice dies." }, effects: [{ kind: "person", person: justice, changes: { alive: false } }] });
}

let opening: Campaign;
let pending: Campaign;
let ruled: Campaign;

beforeAll(() => {
  opening = openingCampaign();
  pending = signContested(opening);
  ruled = advance(pending, 14);
}, 120_000);

describe("benchReading", () => {
  it("reads the nine seats the engine seats, lined up left to right by lean", () => {
    const bench = benchReading(opening);
    expect(bench.seats).toHaveLength(9);
    expect(bench.seated).toBe(9);
    expect(bench.majority).toBe(5);
    expect(bench.seats[0]?.chief).toBe(true);
    const leans = bench.byLean.map((seat) => seat.lean ?? Infinity);
    expect([...leans].sort((a, b) => a - b)).toEqual(leans);
    expect(bench.seats.every((seat) => seat.href?.startsWith("/washington/person/"))).toBe(true);
  });

  it("reads a seat whose justice has died as open, last in the line, with no door to a file", () => {
    const bench = benchReading(withoutJustice(opening, 4));
    expect(bench.vacancies).toBe(1);
    expect(bench.majority).toBe(5);
    const open = bench.seats.find((seat) => seat.seat === 4)!;
    expect(open.vacant).toBe(true);
    expect(open.href).toBeUndefined();
    expect(bench.byLean.at(-1)?.seat).toBe(4);
  });
});

describe("justiceFile", () => {
  it("places a justice on the three scales and reads only the readings the bench reads, in words, never figures", () => {
    const seat = benchReading(opening).seats[1]!;
    const file = justiceFile(opening, seat.personId!)!;
    expect(file.axes.map((axis) => axis.key)).toEqual(["economicLeftRight", "authLibertarian", "nationalistGlobalist"]);
    expect(file.readings.map((reading) => reading.key)).toEqual(["competence", "integrity"]);
    expect(file.readings.every((reading) => reading.figure === "")).toBe(true);
    expect(file.votes).toEqual([]);
  });

  it("reads the vote record the engine stored when the bench ruled", () => {
    const entry = ruled.judiciary.cases[0]!;
    if (entry.votes.length === 0) {
      expect(entry.procedure?.forum).toBe("lower");
      return;
    }
    const cast = entry.votes[0]!;
    const file = justiceFile(ruled, cast.justice as string)!;
    expect(file.votes[0]?.vote).toBe(cast.vote);
    expect(file.votes[0]?.withMajority).toBe(entry.procedure?.appeal === "equally-divided" ? false : cast.vote === (entry.holding === "struck-down" ? "strike" : "uphold"));
  });

  it("answers nothing for somebody not on the bench", () => {
    expect(justiceFile(opening, "nobody")).toBeUndefined();
  });
});

describe("leanAxes", () => {
  it("names the center and each end of a scale", () => {
    const [economy, power, world] = leanAxes({ economicLeftRight: -0.6, authLibertarian: 0, nationalistGlobalist: 0.2 });
    expect(economy?.word).toBe("Leans left");
    expect(power?.word).toBe("Center");
    expect(world?.word).toBe("Leans toward putting the nation first");
    expect(leanAxes({ economicLeftRight: 0, authLibertarian: 0.5, nationalistGlobalist: -0.5 }).map((axis) => axis.word)).toEqual(["Center", "Favors authority", "Favors working with other countries"]);
  });
});

describe("courtDocket and caseFile", () => {
  it("forecasts a grant appeal from the signed enacted bill that the merits votes read", () => {
    const billId = "bill:policing-grants";
    const recordId = "order-grant-conditions:7";
    const law = { id: billId, act: "act-police-accountability", title: "The Policing Standards and Accountability Act",
      sponsor: "administration" as const, introducedTurn: 4, status: "law" as const, passage: [], resolvedTurn: 5 };
    const record = { id: recordId, order: "order-grant-conditions", turn: 7,
      contested: true, challengeChance: 0.5, subject: { kind: "grant" as const, billId },
      review: { status: "pending" as const, dueTurn: 12 } };
    const matter = { kind: "federal-state" as const, title: "State v. Department of Justice",
      parties: [{ name: "State", role: "plaintiff" as const }, { name: "Department of Justice", role: "defendant" as const }],
      injury: "A state challenges the policing-grant condition.", jurisdiction: "Federal-question suit.",
      question: "Does the condition stay within the enacted law?", authority: law.title,
      disputedFacts: "The law and the rule.", reliefSought: "Set aside any excess condition.",
      affected: "This grant rule." };
    const proceeding = { id: `case:${recordId}`, subject: { kind: "executive-order" as const,
      recordId, orderId: record.order }, matter, filedTurn: 7, stage: "supreme-merits" as const, nextTurn: 12,
      history: [{ turn: 7, stage: "threshold" as const, account: "The state filed." }],
      lower: { holding: "upheld" as const, ruledTurn: 10, ground: "authorized" as const,
        enforcement: "stayed-pending-appeal" as const } };
    const state: Campaign = { ...opening, turn: 11, bills: { ...opening.bills, [billId]: law },
      orders: [...opening.orders, record], judiciary: { ...opening.judiciary,
        proceedings: [...(opening.judiciary.proceedings ?? []), proceeding] } };
    expect(courtDocket(state).pending.find((row) => row.id === recordId)?.strikeChance).toBe(0);
    const noLaw = { ...state, bills: { ...opening.bills } };
    expect(courtDocket(noLaw).pending.find((row) => row.id === recordId)?.strikeChance).toBe(1);
  });

  it("shows the next procedural step without inventing a Supreme merits forecast", () => {
    const [row] = courtDocket(pending).pending;
    const record = pending.orders.find((entry) => entry.id === row?.id)!;
    expect(row?.stage).toBe("threshold");
    expect(row?.strikeChance).toBeUndefined();
    expect(row?.weeksLeft).toBeGreaterThan(0);
    expect(row?.href).toBe(`/washington/courts/case/${encodeURIComponent(record.id)}`);
  });

  it("moves the case to the rulings with its split once the bench rules", () => {
    const docket = courtDocket(ruled);
    expect(docket.pending).toHaveLength(0);
    expect(docket.ruled).toHaveLength(1);
    expect(docket.ruled[0]?.split).toBe("District court");
  });

  it("keeps a withdrawn order's historical case without attributing its earlier reversal to the court", () => {
    const record = pending.orders.at(-1)!;
    const ended = { ...record, rescindedTurn: pending.turn, endReason: "rescinded" as const,
      remedyApplied: true, remedyContribution: { "security.borderControl": 0.03 } };
    const campaign: Campaign = { ...pending, orders: pending.orders.map((entry) => entry.id === record.id ? ended : entry) };
    const row = courtDocket(campaign).pending.find((entry) => entry.id === record.id);
    expect(row?.endReason).toBe("rescinded");
    expect(row?.ended).toBeTruthy();
    const file = caseFile(campaign, record.id);
    expect(file?.reversed).toEqual([]);
    expect(file?.reversedNote).toContain("stopped when it was canceled");
    const upheld: Campaign = { ...campaign, orders: campaign.orders.map((entry) => entry.id === record.id
      ? { ...entry, review: { dueTurn: record.review!.dueTurn, status: "upheld" as const, ruledTurn: campaign.turn } }
      : entry) };
    expect(courtDocket(upheld).ruled.find((entry) => entry.id === record.id)?.endReason).toBe("rescinded");
  });

  it("reads a pending case whole: what a loss undoes, its timeline and the paths that move the odds", () => {
    const id = courtDocket(pending).pending[0]!.id;
    const file = caseFile(pending, id)!;
    expect(file.timeline).toHaveLength(1);
    expect(file.reversed.length + (file.reversedNote ? 1 : 0)).toBeGreaterThan(0);
    expect(file.votes).toEqual([]);
    const statute = file.order !== undefined && LEGISLATIVE_ACTS.some((act) => act.constrains?.authorizesOrders?.includes(file.order!));
    expect(file.paths.map((path) => path.key)).toEqual(file.ground === "silent" && statute ? ["statute"] : []);
    const open = caseFile(withoutJustice(pending, 3), id)!;
    expect(open.paths.some((path) => path.key === "bench")).toBe(false);
  });

  it("reads a ruled case with its actual forum, votes and opinion, and no paths left", () => {
    const id = courtDocket(ruled).ruled[0]!.id;
    const file = caseFile(ruled, id)!;
    expect(file.votes).toHaveLength(file.forum === "supreme" ? 9 : 0);
    expect(file.opinion?.majority).toBeTruthy();
    expect(file.paths).toEqual([]);
    expect(caseFile(ruled, "no-such-case")).toBeUndefined();
  });
});

describe("a Congress-originated statutory matter", () => {
  it("appears on the docket with its own parties, injury and legal question", () => {
    const billId = "bill:act-defense-authorization:1";
    const recordId = "order-defense-production:2";
    const law = { id: billId, act: "act-defense-authorization", title: "The Annual Defense Authorization Act",
      sponsor: "bipartisan" as const, introducedTurn: 1, status: "law" as const, passage: [], resolvedTurn: 1 };
    const record = { id: recordId, order: "order-defense-production", turn: 2, contested: false, challengeChance: 0,
      defenseContract: { supplier: "Potomac Precision Works", munitionClass: "precision-fires" as const,
        initialIndex: 0.05, due: opening.calendar, provenance: "planning value" as const } };
    const state: Campaign = { ...opening, turn: 2, bills: { ...opening.bills, [billId]: law }, orders: [...opening.orders, record] };
    const filed = judicialReviewPhase(charterOf(state))(state).reduce(apply, state);
    const id = statutoryMatterId(billId, recordId);
    const row = courtDocket(filed).pending.find((entry) => entry.id === id);
    expect(row?.orderName).toBe("Potomac Precision Works v. Department of Defense");
    expect(row?.subject?.kind).toBe("statutory-authority");
    const file = caseFile(filed, id);
    expect(file?.matter?.parties).toHaveLength(2);
    expect(file?.matter?.injury).toMatch(/private contracts/);
    expect(file?.timeline[0]?.text).toMatch(/file a federal statutory challenge/);
    expect(file?.reversed).toEqual([]);
  });

  it("keeps the generic party label for a legacy priority order without a named contract", () => {
    const billId = "bill:act-defense-authorization:1";
    const recordId = "order-defense-production:2";
    const law = { id: billId, act: "act-defense-authorization", title: "The Annual Defense Authorization Act",
      sponsor: "bipartisan" as const, introducedTurn: 1, status: "law" as const, passage: [], resolvedTurn: 1 };
    const record = { id: recordId, order: "order-defense-production", turn: 2, contested: false, challengeChance: 0 };
    const state: Campaign = { ...opening, turn: 2, bills: { ...opening.bills, [billId]: law }, orders: [...opening.orders, record] };
    const filed = judicialReviewPhase(charterOf(state))(state).reduce(apply, state);
    const row = courtDocket(filed).pending.find((entry) => entry.id === statutoryMatterId(billId, recordId));
    expect(row?.orderName).toBe("The supplier identified in the priority order v. Department of Defense");
  });

  it("shows the recorded movement withheld for named suppliers during a party stay", () => {
    const billId = "bill:act-defense-authorization:1";
    const recordId = "order-defense-production:2";
    const law = { id: billId, act: "act-defense-authorization", title: "The Annual Defense Authorization Act",
      sponsor: "bipartisan" as const, introducedTurn: 1, status: "law" as const, passage: [], resolvedTurn: 1 };
    const border = opening.nations[opening.founding.nation]!.stats.security.borderControl;
    const delta = border > 0.5 ? -0.12 : 0.12;
    const record = { id: recordId, order: "order-defense-production", turn: 2, contested: false, challengeChance: 0,
      nationContribution: { "security.borderControl": delta } };
    const starting: Campaign = { ...opening, turn: 2, bills: { ...opening.bills, [billId]: law }, orders: [...opening.orders, record] };
    const state = apply(starting, { source: "simulate", actor: "world", turn: starting.turn,
      narration: { summary: "The priority order changes border-control capacity." }, effects: [{
        kind: "nationStat", nation: starting.founding.nation,
        setStats: { security: { borderControl: border + delta } },
        requestedDelta: { path: "security.borderControl", amount: delta, ownerId: recordId },
      }] });
    const id = statutoryMatterId(billId, recordId);
    const filed = judicialReviewPhase(charterOf(state))(state).reduce(apply, state);
    const stayed = apply(filed, { source: "simulate", actor: "world", turn: filed.turn,
      narration: { summary: "The named suppliers receive interim relief." }, effects: [
        { kind: "courtLimitedRelief", proceedingId: id, orderId: recordId, action: "apply", scope: "defense-industrial", fraction: 0.5 }] });
    const file = caseFile(stayed, id);
    expect(file?.partyRelief?.active).toBe(true);
    expect(file?.partyEffects?.[0]?.value).toBeTruthy();
    expect(file?.unreversed).toMatch(/suppliers named in the case/);
  });
});

describe("a state election-access matter", () => {
  it("shows the autonomous HAVA filing and its prospective state-limited remedy without an order", () => {
    const founded = opening.foundingDate ?? opening.calendar;
    const [midterm, presidential] = presidencyElections(founded);
    const turn = turnOnDate(founded, presidential!.date) - 18;
    const state: Campaign = { ...opening, turn, calendar: selectDateOfTurn(opening, turn),
      termClock: { ...opening.termClock, elections: [{ id: "midterm-held", kind: "midterm",
        turn: turnOnDate(founded, midterm!.date), voteShare: 0.5, summary: "The midterm was held." }] } };
    const audited = judicialReviewPhase(charterOf(state))(state).reduce(apply, state);
    expect(courtDocket(audited).pending.some((entry) => entry.subject?.kind === "state-election-access")).toBe(false);
    const responseTurn = turn + 2;
    const responseState = { ...audited, turn: responseTurn, calendar: selectDateOfTurn(audited, responseTurn) };
    const filed = judicialReviewPhase(charterOf(responseState))(responseState).reduce(apply, responseState);
    const row = courtDocket(filed).pending.find((entry) => entry.subject?.kind === "state-election-access");
    expect(row?.order).toBeUndefined();
    expect(row?.matter?.authority).toContain("Help America Vote Act");
    const file = caseFile(filed, row!.id);
    expect(file?.timeline[0]?.text).toContain("state responds to the audit");
    expect(file?.unreversed).toContain("No official result changes");
  });
});

describe("judicial nominations", () => {
  const seatOffice = (number: number) => benchReading(opening).seats.find((seat) => seat.seat === number)!.office;

  it("lists no desk seat for a seat that is filled", () => {
    expect(appointmentDesk(opening).seats.some((seat) => seat.office === seatOffice(2))).toBe(false);
  });

  it("sets out an open seat's lawyers, priced off the packet the nomination commits, with no name preselected", () => {
    const open = withoutJustice(opening, 6);
    const seat = appointmentDesk(open).seats.find((row) => row.office === seatOffice(6))!;
    expect(seat.kind).toBe("justice");
    expect(seat.recommended).toBeUndefined();
    expect(seat.candidates.length).toBeGreaterThan(0);
    expect(seat.candidates.length).toBeLessThanOrEqual(DESK_CANDIDATES);
    for (const candidate of seat.candidates) {
      expect(candidate.cost).toEqual({});
      expect(candidate.readings.map((reading) => reading.attribute)).toEqual(["competence", "integrity"]);
      expect(candidate.vote.required).toBeGreaterThan(0);
    }
  });

  it("sends a name up, lists it before the Senate with the withdrawal priced, and takes the seat off the desk while it waits", () => {
    const open = withoutJustice(opening, 6);
    const seat = appointmentDesk(open).seats.find((row) => row.office === seatOffice(6))!;
    const pick = seat.candidates[0]!;
    const sent = deskPlan(open, [{ office: seat.office, person: pick.personId }]).packets.reduce(apply, open);
    const [row] = judicialNominations(sent);
    expect(row?.name).toBe(pick.name);
    expect(row?.standing).toBe("Background check under way");
    const withdrawal = withdrawNomination(sent, row!.id);
    expect(withdrawal.ok).toBe(true);
    expect(row?.withdrawal?.cost).toEqual({ standing: -0.012 });
    expect(appointmentDesk(sent).seats.some((entry) => entry.office === seat.office)).toBe(false);
    expect(benchReading(sent).seats.find((entry) => entry.seat === 6)?.pending?.name).toBe(pick.name);
  });
});
