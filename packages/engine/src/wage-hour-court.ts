import type { Campaign } from "./state.js";
import type { Effect } from "./effects.js";
import type { CourtCase, CourtMatter, CourtProceeding } from "./state-judiciary.js";
import { courtStep } from "./court-procedure.js";
import type { ServiceRuntime } from "./services.js";

type Complaint = NonNullable<ServiceRuntime["wageComplaint"]>;

function wageShortfall(complaint: Complaint): number {
  return Math.max(0, complaint.requiredPay - complaint.paid);
}

function matter(complaint: Complaint): CourtMatter {
  const shortfall = wageShortfall(complaint);
  return {
    kind: "wage-hour-enforcement", title: "Secretary of Labor v. covered private employer",
    parties: [{ name: "Secretary of Labor, for the investigated hourly worker", role: "plaintiff" },
      { name: "Covered private employer named in the timecard investigation", role: "defendant" }],
    injury: `The employer's timecard records ${complaint.hours} hours in a workweek at $${complaint.hourlyRate} per hour, but its payroll records only $${complaint.paid}; $${shortfall} in overtime wages remains unpaid.`,
    jurisdiction: "The Secretary of Labor sues in federal district court under 29 U.S.C. §216(c) after the covered employer refuses supervised payment. The suit seeks wages for this worker, not a general wage regulation.",
    question: "Does the covered employer owe this worker unpaid overtime and equal liquidated damages?",
    authority: "Fair Labor Standards Act, 29 U.S.C. §§207(a)(1), 216(b), 216(c) and 260.",
    disputedFacts: "The employer disputes the timecard and maintains that its payroll satisfied the workweek obligation; the Labor investigation records both hours and payment, with no substantiated good-faith defense to liquidated damages.",
    reliefSought: `Recover $${shortfall} in unpaid overtime and $${shortfall} in equal liquidated damages for this worker.`,
    affected: "The investigated worker and named employer only; other payrolls are outside the judgment.",
    evidence: [`Investigation: ${complaint.id}.`, `Timecard discovered turn: ${complaint.discoveredTurn}.`,
      `Hours: ${complaint.hours}; regular rate: $${complaint.hourlyRate}; required pay: $${complaint.requiredPay}; paid: $${complaint.paid}.`,
      `Good-faith defense evidence: ${complaint.goodFaithEvidence}.`,
      `Employer refused supervised payment on turn ${complaint.responseTurn}.`],
  };
}

function opened(state: Campaign, complaint: Complaint): CourtProceeding {
  return { id: `wage-hour:${complaint.id}`, subject: { kind: "wage-hour-enforcement", complaintId: complaint.id },
    matter: matter(complaint), filedTurn: state.turn, stage: "threshold", nextTurn: state.turn + 1,
    history: [{ turn: state.turn, stage: "threshold", account: "The Secretary files a worker-specific §216(c) recovery suit after the employer's refusal." }] };
}

function finalCase(state: Campaign, proceeding: CourtProceeding, complaint: Complaint): CourtCase {
  const shortfall = wageShortfall(complaint);
  const holding = shortfall > 0 ? "struck-down" : "upheld";
  return { id: proceeding.id, subject: proceeding.subject, matter: proceeding.matter,
    question: proceeding.matter!.question, ground: holding === "struck-down" ? "forbidden" : "authorized",
    filedTurn: proceeding.filedTurn, dueTurn: proceeding.nextTurn, ruledTurn: state.turn, holding, votes: [],
    opinion: { majority: holding === "struck-down"
      ? `The timecard and payroll establish $${shortfall} in unpaid overtime, and the employer substantiated no §260 good-faith defense. It owes that worker $${shortfall} in wages and $${shortfall} in liquidated damages under §216(c).`
      : "The payroll record does not establish an overtime shortfall for this worker; the Secretary takes no recovery." },
    procedure: { forum: "lower", lower: holding, history: proceeding.history } };
}

function advance(state: Campaign, proceeding: CourtProceeding, complaint: Complaint): readonly Effect[] {
  if (state.turn < proceeding.nextTurn || proceeding.stage === "final") return [];
  const set = (next: CourtProceeding): Effect => ({ kind: "courtProceeding", set: next });
  switch (proceeding.stage) {
    case "threshold": return [set(courtStep(proceeding, "lower-merits", state.turn,
      "The district court accepts the Secretary's §216(c) claim for this worker and orders production of the timecard and payroll."))];
    case "lower-merits": {
      const holding = wageShortfall(complaint) > 0 ? "struck-down" : "upheld";
      return [set(courtStep(proceeding, "appeal", state.turn,
        holding === "struck-down" ? "The court finds unpaid overtime from the timecard and payroll." : "The court finds no payroll shortfall.",
        { lower: { holding, ruledTurn: state.turn, ground: holding === "struck-down" ? "forbidden" : "authorized", enforcement: "stayed-pending-appeal" } }))];
    }
    case "appeal": {
      const settled = courtStep(proceeding, "final", state.turn, "The worker-specific district judgment becomes final without an appeal.");
      const record = finalCase(state, settled, complaint);
      const runtime = state.services?.["wage-complaints"];
      return [set(settled), { kind: "courtCase", set: record },
        ...(runtime && record.holding === "struck-down" ? [{ kind: "institution" as const, services: [{ ...runtime,
          wageComplaint: { ...complaint, status: "recovery-ordered" as const } }] }] : []),
        { kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
          headline: "A federal court decides a worker-specific overtime recovery suit.",
          facts: { instrument: record.matter!.title, stake: record.opinion.majority,
            topicTags: ["judiciary", "labor", "wages"] } }] }];
    }
    case "interim": case "circuit-merits": case "supreme-merits": case "remand": return [];
  }
}

/** A dated Labor investigation and employer refusal precede any court filing. */
export function wageHourMatterEffects(state: Campaign): readonly Effect[] {
  const complaint = state.services?.["wage-complaints"]?.wageComplaint;
  if (!complaint || complaint.employerResponse !== "refused") return [];
  const id = `wage-hour:${complaint.id}`;
  const existing = state.judiciary.proceedings?.find((entry) => entry.id === id);
  return existing ? advance(state, existing, complaint) : [{ kind: "courtProceeding", set: opened(state, complaint) }];
}
