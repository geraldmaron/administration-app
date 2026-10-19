import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PersonId } from "@admin/world";
import { addDays, apply, answerLowerOrderReview, EXECUTIVE_ORDERS, withRaisedCase, type Campaign } from "@admin/engine";
import { caseFile, place, type CourtDocket, type DocketCase } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { CASE_STATUS, CaseStatus } from "./CaseStatus";
import { CaseScreen } from "./CaseScreen";
import { CourtsScreen } from "./CourtsScreen";
import { Docket } from "./Docket";
import { Nominations } from "./Nominations";
import { isCourtsView, COURTS_VIEWS } from "./views";
vi.mock("../../map/MapView", () => ({ MapView: ({ title }: { title: string }) => <section aria-label={title} /> }));

vi.mock("../../shell/Door", () => ({ Door: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/Screen", () => ({ Screen: ({ title, children }: { title: string; children: ReactNode }) => <main aria-label={title}>{children}</main> }));
vi.mock("../../shell/built-routes", () => ({ useBuilt: () => () => true }));
vi.mock("../../nation/economy/commit", () => ({ useNationCommit: () => ({ busy: false, problem: "", committed: undefined, commit: async () => undefined, dismiss: () => undefined }) }));
vi.mock("../../nation/policy/use-act", () => ({ useAct: () => ({ busy: false, problem: "", done: undefined, run: () => undefined, dismiss: () => undefined }) }));

const base = openingHarnessCampaign();

it("shows the recorded circuit assignment, participating judges, and case-specific recusal", () => {
  const pending = pendingReviewCampaign();
  const seats = Object.entries(pending.institutions).filter(([, seat]) => seat.lowerBenchSeat?.circuit === "District of Columbia").slice(0, 4);
  const judges = Object.keys(pending.people).slice(0, 4) as PersonId[];
  expect(seats).toHaveLength(4);
  expect(judges).toHaveLength(4);
  const record = pending.orders[0]!;
  const proceeding = pending.judiciary.proceedings![0]!;
  const panel = { assignedTurn: pending.turn,
    assigned: seats.slice(0, 3).map(([seatId], index) => ({ seatId, judge: judges[index]! })),
    recusals: [{ seatId: seats[3]![0], judge: judges[3]!, turn: pending.turn,
      reason: "prior-government-advice" as const }] };
  const campaign: Campaign = { ...pending,
    institutions: { ...pending.institutions, ...Object.fromEntries(seats.map(([seatId, seat], index) =>
      [seatId, { ...seat, leader: judges[index]!, vacancy: index === 2 }])) },
    judiciary: { ...pending.judiciary, proceedings: [{ ...proceeding, stage: "appeal", circuitPanel: panel,
      circuit: { court: "District of Columbia", ruledTurn: pending.turn, holding: "upheld",
        votes: panel.assigned.slice(0, 2).map(({ seatId, judge }) => ({ seatId, judge, vote: "uphold" as const })) } }] } };
  const file = caseFile(campaign, record.id)!;
  expect(file.circuitPanel).toEqual(panel);
  const html = renderToStaticMarkup(<CaseScreen campaign={campaign} id={record.id} />);
  expect(html).toContain("Assigned circuit panel");
  expect(html).toContain("Participated");
  expect(html).toContain("Did not participate");
  expect(html).toContain("Recorded recusals");
  expect(html).toContain(`${campaign.people[judges[3]!]!.base.name} was recused`);
  expect(html).toContain("prior government advice on this order");
});

function pendingReviewCampaign(): Campaign {
  const recordId = "order-border-controls:court-screen";
  const proceedingId = `case:${recordId}`;
  const pending = withRaisedCase({ ...base,
    orders: [{ id: recordId, order: "order-border-controls", turn: base.turn, contested: true,
      challengeChance: 0.5, review: { dueTurn: base.turn, status: "pending" } }],
    pendingRules: [{ id: recordId, order: "order-border-controls", signedTurn: base.turn,
      effectiveTurn: base.turn + 3, status: "stayed" }],
    judiciary: { ...base.judiciary, proceedings: [{ id: proceedingId,
      subject: { kind: "executive-order", recordId, orderId: "order-border-controls" },
      filedTurn: base.turn, stage: "appeal", nextTurn: base.turn,
      history: [{ turn: base.turn, stage: "lower-merits", account: "The lower court set aside the rule." }],
      lower: { holding: "struck-down", ruledTurn: base.turn, ground: "forbidden", enforcement: "in-force" } }] },
  }, { id: `case:review:${proceedingId}`, kind: "court-response", title: "Further review",
    subject: { kind: "court-proceeding", id: proceedingId }, urgency: "hard",
    clock: { kind: "operational", dueAt: addDays(base.calendar, 7) },
    defaultOutcome: { kind: "legal-default", outcomeId: "accept-lower-judgment" },
    responseRequirement: "president", allowedDispositions: ["act", "allow-default"] }, "world", undefined);
  return pending;
}

it("renders the actual Court response for the order record and closes its actions after acceptance", () => {
  const pending = pendingReviewCampaign();
  const recordId = pending.orders[0]!.id;
  const proceedingId = pending.judiciary.proceedings![0]!.id;
  const html = renderToStaticMarkup(<CaseScreen campaign={pending} id={recordId} />);
  expect(html).toContain("Ask for further review");
  expect(html).toContain("Accept the lower judgment");
  expect(html).toContain("The challenged order cannot begin or continue its future operation");
  expect(html).toContain("Ask for review and a stay");
  const answer = answerLowerOrderReview(pending, proceedingId, "accept");
  expect(answer.ok).toBe(true);
  if (!answer.ok) return;
  const accepted = apply(pending, answer.packet);
  expect(renderToStaticMarkup(<CaseScreen campaign={accepted} id={recordId} />)).not.toContain("Ask for further review");
  expect(answerLowerOrderReview(accepted, proceedingId, "accept").ok).toBe(false);
});


it("shows a requested stay as pending and preserves its dated result without exposing model draws", () => {
  const pending = pendingReviewCampaign();
  const recordId = pending.orders[0]!.id;
  const proceedingId = pending.judiciary.proceedings![0]!.id;
  const answer = answerLowerOrderReview(pending, proceedingId, "seek-with-stay");
  expect(answer.ok).toBe(true);
  if (!answer.ok) return;
  const requested = apply(pending, answer.packet);
  const html = renderToStaticMarkup(<CaseScreen campaign={requested} id={recordId} />);
  expect(html).toContain("No decision on this stay request is recorded");
  expect(html).not.toContain("Ask for review and a stay");
  for (const status of ["granted", "denied"] as const) {
    const result: Campaign = { ...requested, turn: requested.turn + 1, calendar: addDays(requested.calendar, 7), judiciary: { ...requested.judiciary,
      proceedings: requested.judiciary.proceedings!.map((entry) => ({ ...entry,
        lower: { ...entry.lower!, enforcement: status === "granted" ? "stayed-pending-appeal" as const : "in-force" as const },
        stayApplication: { ...entry.stayApplication!, status, decidedTurn: requested.turn + 1,
          factors: { ...entry.stayApplication!.factors, draw: 0.123456789 } } })) } };
    const markup = renderToStaticMarkup(<CaseScreen campaign={result} id={recordId} />);
    expect(markup).toContain(status === "granted" ? "The court granted a stay" : "The court denied a stay");
    expect(markup).toContain("decided");
    expect(markup).not.toContain("0.123456789");
    expect(markup).not.toContain("modeledGrantChance");
  }
});

function row(id: string, status: DocketCase["status"], extra: Partial<DocketCase> = {}): DocketCase {
  return { id, href: `/washington/courts/case/${id}`, order: "o", orderName: `Order ${id}`, status, question: "May the President do this?", ground: "silent", groundWords: "Congress has said nothing on it", signed: "March 1, 2029", due: "April 12, 2029", weeksLeft: 3, ...extra };
}

describe("courts views", () => {
  it("offers Bench, Docket and Nominations only", () => {
    expect(COURTS_VIEWS).toEqual(["bench", "docket", "nominations"]);
    expect(isCourtsView("docket")).toBe(true);
    expect(isCourtsView("judge")).toBe(false);
  });
});

describe("case status", () => {
  it("gives pending, struck down and upheld different words and different icons", () => {
    const looks = Object.values(CASE_STATUS);
    expect(new Set(looks.map((look) => look.label)).size).toBe(3);
    expect(new Set(looks.map((look) => look.icon)).size).toBe(3);
    expect(renderToStaticMarkup(<CaseStatus status="struck-down" />)).toContain("Struck down, final");
    expect(renderToStaticMarkup(<CaseStatus status="pending" />)).toContain("Pending in the courts");
  });

  it("distinguishes a historical holding from an order that later ended", () => {
    expect(renderToStaticMarkup(<CaseStatus status="upheld" endReason="rescinded" />)).toContain("Upheld; order rescinded");
    expect(renderToStaticMarkup(<CaseStatus status="pending" endReason="sunset" />)).toContain("Pending; order expired");
    expect(renderToStaticMarkup(<CaseStatus status="upheld" dismissedAtThreshold endReason="sunset" />)).toContain("Challenge dismissed; order expired");
  });
});

describe("the docket", () => {
  const docket: CourtDocket = {
    pending: [row("a", "pending", { strikeChance: 0.62 })],
    ruled: Array.from({ length: 11 }, (_, i) => row(`r${i}`, i % 2 ? "upheld" : "struck-down", { ruled: "May 2, 2029", split: "6 to 3" })),
  };

  it("shows a qualitative staff projection without exposing the internal threshold", () => {
    const html = renderToStaticMarkup(<Docket docket={docket} />);
    expect(html).toContain("Staff projection");
    expect(html).toContain("Likely struck down");
    expect(html).not.toContain("62%");
    expect(html).not.toContain('aria-valuenow="0.62"');
    expect(html).toContain("Upheld, in force");
    expect(html).toContain("Struck down, final");
  });

  it("keeps every ruling reachable", () => {
    const html = renderToStaticMarkup(<Docket docket={docket} />);
    expect(html).toContain("8 of 11 rulings");
    expect(html).toContain("Show all 11");
  });

  it("offers all pending and ruled sort dimensions in the card ledger", () => {
    const html = renderToStaticMarkup(<Docket docket={docket} />);
    expect(html.match(/value="[^"]+:ascending"/g)).toHaveLength(11);
    for (const dimension of ["Legal question", "Ruling due", "Staff projection", "Holding", "Split", "Ruled"]) expect(html).toContain(`${dimension}, low to high`);
  });

  it("names a quiet docket and a split that was not recorded", () => {
    expect(renderToStaticMarkup(<Docket docket={{ pending: [], ruled: [] }} />)).toContain("No ruling has been handed down.");
    expect(renderToStaticMarkup(<Docket docket={{ pending: [], ruled: [row("x", "upheld")] }} />)).toContain("Date not recorded");
  });

  it("opens an upheld but rescinded order without presenting it as in force", () => {
    const order = EXECUTIVE_ORDERS.find((entry) => entry.id === "order-defense-production")!;
    const id = `${order.id}:1`;
    const campaign: Campaign = { ...base, orders: [...base.orders, { id, order: order.id, turn: 1,
      contested: true, challengeChance: 0.5, rescindedTurn: 2, endReason: "rescinded",
      remedyApplied: true, review: { dueTurn: 4, status: "upheld", ruledTurn: 4 } }] };
    const docket = renderToStaticMarkup(<CourtsScreen campaign={campaign} view="docket" onView={() => undefined} />);
    expect(docket).toContain("Upheld; order rescinded");
    const html = renderToStaticMarkup(<CaseScreen campaign={campaign} id={id} />);
    expect(html).toContain("Upheld; order rescinded");
    expect(html).toContain("Its future operation ended");
    expect(html).toContain("nothing more for this case to undo");
    expect(html).not.toContain("Upheld, in force");
  });
});

describe("fact-backed housing matter", () => {
  it("opens the applicant's district-court file from the playable docket", () => {
    const complaintId = "housing-complaint:12";
    const id = `fair-housing:${complaintId}`;
    const matter = {
      kind: "fair-housing-enforcement", title: "Rental applicant v. housing provider",
      parties: [{ name: "Rental applicant", role: "plaintiff" }, { name: "Housing provider", role: "defendant" }],
      injury: "A rental application was denied on turn 12.",
      jurisdiction: "Private district-court action under 42 U.S.C. §3613.",
      question: "Was the applicant denied housing because of race?", authority: "42 U.S.C. §§3604 and 3613.",
      disputedFacts: "The provider's written criterion.", reliefSought: "Keep the application open.",
      affected: "This applicant and provider.", evidence: [`HUD complaint: ${complaintId}.`],
    } as const;
    const campaign = { ...base, judiciary: { ...base.judiciary, proceedings: [{ id,
      subject: { kind: "fair-housing-enforcement", complaintId }, matter,
      filedTurn: 12, stage: "interim", nextTurn: 13,
      history: [{ turn: 12, stage: "threshold", account: "The applicant files a private suit." }] }] },
      services: { ...(base.services ?? {}), "fair-housing-complaints": {
        id: "fair-housing-complaints", openedTurn: 12, pending: [], returning: [],
        housingComplaint: { id: complaintId, filedTurn: 12, originalDeadlineTurn: 19,
          applicationDeadlineTurn: 19, allegedPractice: "race-based-rental-denial",
          respondent: "housing-provider", writtenCriterion: "race", status: "pending" } } } } as Campaign;
    const docket = renderToStaticMarkup(<CourtsScreen campaign={campaign} view="docket" onView={() => undefined} />);
    expect(docket).toContain(`href="${place.case(id)}"`);
    expect(docket).toContain("Rental applicant v. housing provider");
    const html = renderToStaticMarkup(<CaseScreen campaign={campaign} id={id} />);
    expect(html).toContain("Private district-court action under 42 U.S.C. §3613");
    expect(html).toContain(`HUD complaint: ${complaintId}.`);
    expect(html).toContain("A Supreme Court merits vote is not scheduled");
  });
});

describe("worker and surveillance claims on the docket", () => {
  it("opens the Labor recovery suit from a named timecard and shows its worker-specific judgment", () => {
    const complaintId = "wage-complaint:18";
    const id = `wage-hour:${complaintId}`;
    const matter = { kind: "wage-hour-enforcement", title: "Secretary of Labor v. covered private employer",
      parties: [{ name: "Secretary of Labor", role: "plaintiff" }, { name: "Covered private employer", role: "defendant" }],
      injury: "A worker's timecard shows $60 in unpaid overtime.", jurisdiction: "District court under 29 U.S.C. §216(c).",
      question: "Does the employer owe overtime?", authority: "29 U.S.C. §§207 and 216.",
      disputedFacts: "The timecard and payroll differ.", reliefSought: "$60 wages and $60 liquidated damages.",
      affected: "This worker and employer.", evidence: [`Investigation: ${complaintId}.`] } as const;
    const campaign = { ...base, judiciary: { ...base.judiciary,
      proceedings: [{ id, subject: { kind: "wage-hour-enforcement", complaintId }, matter,
        filedTurn: 19, stage: "final", nextTurn: 22,
        history: [{ turn: 19, stage: "threshold", account: "The Secretary filed after employer refusal." }] }],
      cases: [{ id, subject: { kind: "wage-hour-enforcement", complaintId }, matter,
        question: matter.question, ground: "forbidden", filedTurn: 19, dueTurn: 22, ruledTurn: 22,
        holding: "struck-down", votes: [], opinion: { majority: "The employer owes $60 wages and $60 liquidated damages." },
        procedure: { forum: "lower", lower: "struck-down", history: [] } }] },
      services: { ...(base.services ?? {}), "wage-complaints": { id: "wage-complaints", openedTurn: 1,
        pending: [], returning: [], wageComplaint: { id: complaintId, discoveredTurn: 18,
          employer: "covered-private-employer", worker: "hourly-worker", hours: 46, hourlyRate: 20,
          paid: 920, requiredPay: 980, goodFaithEvidence: "none-substantiated", employerResponse: "refused", responseTurn: 19, status: "recovered", recoveredTurn: 23 } } } } as Campaign;
    const docket = renderToStaticMarkup(<CourtsScreen campaign={campaign} view="docket" onView={() => undefined} />);
    expect(docket).toContain(`href="${place.case(id)}"`);
    expect(docket).toContain("Overtime owed, final");
    const file = renderToStaticMarkup(<CaseScreen campaign={campaign} id={id} />);
    expect(file).toContain("$60 in unpaid overtime");
    expect(file).toContain("plus $60 more in damages the law adds");
    expect(file).not.toContain("Order struck down");
  });

  it("shows the aggrieved target's §1810 suit and separates damages from agency deletion", () => {
    const incidentId = "intercept:nsa:9";
    const id = `surveillance:${incidentId}`;
    const matter = { kind: "unlawful-surveillance", title: "Aggrieved U.S. person v. federal surveillance officials",
      parties: [{ name: "Aggrieved U.S. person", role: "plaintiff" }, { name: "Federal officials", role: "defendant" }],
      injury: "Private message content was acquired on day 63.", jurisdiction: "Aggrieved person sues under 50 U.S.C. §1810.",
      question: "Was the interception unlawful?", authority: "50 U.S.C. §§1809 and 1810.",
      disputedFacts: "The officials contest authorization.", reliefSought: "$1000 damages; no deletion order.",
      affected: "The intercepted person only.", evidence: [`IG log: ${incidentId}.`] } as const;
    const campaign = { ...base, judiciary: { ...base.judiciary,
      proceedings: [{ id, subject: { kind: "unlawful-surveillance", incidentId }, matter,
        filedTurn: 14, stage: "final", nextTurn: 17,
        history: [{ turn: 14, stage: "threshold", account: "The aggrieved target filed after IG exposure." }] }],
      cases: [{ id, subject: { kind: "unlawful-surveillance", incidentId }, matter,
        question: matter.question, ground: "forbidden", filedTurn: 14, dueTurn: 17, ruledTurn: 17,
        holding: "struck-down", votes: [], opinion: { majority: "Officials owe $1000 in §1810 damages." },
        procedure: { forum: "lower", lower: "struck-down", history: [] } }] },
      security: { ...base.security, intelligence: { ...base.security.intelligence,
        surveillanceIncident: { id: incidentId, actor: "IC-NSA", target: "known-us-person-in-united-states",
          acquired: "private-domestic-message-content", location: "united-states", intentional: true,
          consent: false, fisaOrder: false, statutoryException: false, interceptTurn: 9, interceptDay: 63,
          auditLog: `IG log: ${incidentId}.`, exposedTurn: 14, status: "complied", damages: 1000, compliedTurn: 18 } } } } as Campaign;
    const docket = renderToStaticMarkup(<CourtsScreen campaign={campaign} view="docket" onView={() => undefined} />);
    expect(docket).toContain(`href="${place.case(id)}"`);
    expect(docket).toContain("Damages awarded, final");
    const file = renderToStaticMarkup(<CaseScreen campaign={campaign} id={id} />);
    expect(file).toContain("§1810 damages");
    expect(file).toContain("order that deletion");
    expect(file).not.toContain("Order struck down");
  });
});

describe("the nominations tab", () => {
  it("says plainly that a full bench has nothing to nominate", () => {
    const html = renderToStaticMarkup(<Nominations campaign={base} />);
    expect(html).toContain("Every seat on the Supreme Court and the courts of appeals is filled or has a name before the Senate.");
  });
});

describe("the courts page", () => {
  it("keeps one focused bench workspace with contextual jurisdiction and no duplicated bench", () => {
    const html = renderToStaticMarkup(<CourtsScreen campaign={base} view="bench" onView={() => undefined} />);
    const needs = html.indexOf("court-needs__title");
    expect(needs).toBeGreaterThan(-1);
    expect(html).toContain("Explore circuits");
    expect(html.match(/id="court-bench-title"/g)).toHaveLength(1);
    expect(html).not.toContain("Where each case stands");
    for (const label of ["Bench", "Docket", "Nominations"]) expect(html).toContain(label);
    expect(html).toContain("votes strike an order");
    expect(html).toContain("Justices, left to right");
    expect(html).not.toContain("The map shows");
  });

  it("shows the docket and nominations views", () => {
    expect(renderToStaticMarkup(<CourtsScreen campaign={base} view="docket" onView={() => undefined} />)).toContain("Cases before the courts");
    expect(renderToStaticMarkup(<CourtsScreen campaign={base} view="nominations" onView={() => undefined} />)).toContain("Every seat on the Supreme Court and the courts of appeals is filled");
  });
});

describe("the case page", () => {
  const order = EXECUTIVE_ORDERS[0]!;
  function withCase(status: "pending" | "struck-down"): Campaign {
    const turn = 1;
    const record = { id: `${order.id}:${turn}`, order: order.id, turn, contested: true, challengeChance: 0.5, review: status === "pending" ? { status, dueTurn: base.turn + 4 } : { status, dueTurn: 2, ruledTurn: 2 } };
    return { ...base, orders: [record as never] };
  }
  const id = `${order.id}:1`;

  it("keeps a pending case a question without a premature merits forecast", () => {
    const html = renderToStaticMarkup(<CaseScreen campaign={withCase("pending")} id={id} />);
    expect(html).toContain("Pending in the courts");
    expect(html).toContain("The pending question");
    expect(html).not.toContain("Staff projection");
    expect(html).not.toContain("ui-document");
    expect(html).toContain("Procedural history");
    expect(html).toContain("Related acts");
  });

  it("issues a final invalidation as a document marked struck down", () => {
    const html = renderToStaticMarkup(<CaseScreen campaign={withCase("struck-down")} id={id} />);
    expect(html).toContain("Struck down, final");
    expect(html).toContain("ui-document");
    expect(html).toContain("Order struck down");
    expect(html).toContain("No individual votes were recorded for this legacy opinion");
    expect(html).not.toContain("The pending question");
  });

  it("names a case that does not exist", () => {
    expect(renderToStaticMarkup(<CaseScreen campaign={base} id="nope" />)).toContain("No such case");
  });
});
