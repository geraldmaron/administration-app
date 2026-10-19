import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { apply, createRngStreams, holdElection, judicialReviewPhase, presidencyElections,
  selectDateOfTurn, stateCalls, turnOnDate, type Campaign } from "@admin/engine";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { CaseScreen } from "./CaseScreen";

vi.mock("../../shell/Door", () => ({ Door: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("../../shell/Screen", () => ({ Screen: ({ children, title }: { children: React.ReactNode; title: string }) => <main><h1>{title}</h1>{children}</main> }));
vi.mock("../../nation/policy/use-act", () => ({ useAct: () => ({ busy: false, problem: "", done: undefined, run: () => undefined, dismiss: () => undefined }) }));

function beforeElection(): Campaign {
  for (const name of ["hava-ui", "hava-ui-2", "hava-ui-3", "hava-ui-4"]) {
    const founded = openingHarnessCampaign(name);
    const milestones = presidencyElections(founded.foundingDate ?? founded.calendar);
    const midterm = milestones[0]!;
    const election = milestones[1]!;
    const turn = turnOnDate(founded.foundingDate ?? founded.calendar, election.date);
    const stream = createRngStreams(founded.seed).stream("state-election-access", turn);
    stream.next();
    const compliant = Math.round((0.68 + stream.next() * 0.16) * 100) / 100;
    const capacity = Math.round((0.12 + stream.next() * 0.18) * 100) / 100;
    if (compliant + capacity >= 1) continue;
    const auditTurn = turn - 18;
    const midtermTurn = turnOnDate(founded.foundingDate ?? founded.calendar, midterm.date);
    return { ...founded, turn: auditTurn, calendar: selectDateOfTurn(founded, auditTurn),
      termClock: { ...founded.termClock, elections: [{ id: `election:midterm:${midtermTurn}`,
        kind: "midterm", turn: midtermTurn, voteShare: 0.5, summary: "The midterm was held." }] } };
  }
  throw new Error("No seeded election-access shortfall available for the court journey");
}

function courtWeek(state: Campaign): Campaign {
  const next = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC)(state).reduce(apply, state);
  const turn = state.turn + 1;
  return { ...next, turn, calendar: selectDateOfTurn(next, turn) };
}

describe("election-access court screen", () => {
  it("renders an ordinary audit, later filing, remedy, and surviving election-night access gap", () => {
    let campaign = beforeElection();
    const electionTurn = campaign.turn + 18;
    campaign = courtWeek(campaign);
    const audit = Object.values(campaign.states).find((entry) => entry.electionAccess?.electionTurn === electionTurn)!;
    expect(campaign.judiciary.proceedings?.some((entry) => entry.subject.kind === "state-election-access")).toBeFalsy();
    while (campaign.turn < electionTurn) campaign = courtWeek(campaign);
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.subject.kind === "state-election-access");
    if (!proceeding) throw new Error("The audited HAVA case was not filed");
    const finding = campaign.states[audit.base.id]!.electionAccess!;
    expect(finding.response).toContain("contest the audit");
    expect(finding.remediedShare).toBeLessThan(1);
    const result = holdElection(campaign, CHARTER_PRESIDENTIAL_REPUBLIC, "presidential", electionTurn);
    campaign = { ...campaign, termClock: { ...campaign.termClock, elections: [...campaign.termClock.elections, result] } };
    const call = stateCalls(campaign).find((entry) => entry.state === audit.base.id)!;
    expect(call.access?.affectedEligibleShare).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<CaseScreen campaign={campaign} id={proceeding.id} />);
    expect(html).toContain("The case");
    expect(html).toContain("Help America Vote Act");
    expect(html).toContain("state responds to the audit");
    expect(html).toContain("still without it were noted on election night");
    expect(html).toContain("ordered state election administrators to meet the accessible-equipment requirement");
    expect(html).not.toContain("limited the priority as to the plaintiffs");
  });
});
