import { STATE_IDS, type StateId } from "@admin/world";
import { nextElection } from "./elections.js";
import { courtStep } from "./court-procedure.js";
import { createRngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import type { CourtCase, CourtMatter, CourtProceeding } from "./state-judiciary.js";
import type { Effect } from "./effects.js";

// A state audit, not a presidential order or a governor's politics, opens this
// matter. HAVA §301(a)(3) requires at least one accessible voting system at each
// polling place; §401 lets the Attorney General seek declaratory or injunctive
// relief. The simulated audit concerns a future election, never a past result.

const AUDIT_LEAD_TURNS = 18;

function matter(state: Campaign, id: StateId, electionTurn: number, compliantShare: number): CourtMatter {
  const name = state.states[id]!.base.name;
  return {
    kind: "election-access", state: id,
    title: `United States v. ${name} election administrators`,
    parties: [{ name: "United States, through the Attorney General", role: "plaintiff" },
      { name: `${name} election administrators`, role: "defendant" }],
    injury: `A state audit found accessible equipment ready at ${Math.round(compliantShare * 100)} percent of ${name} polling places for the coming federal election. Voters with disabilities face an imminent barrier where equipment is missing.`,
    jurisdiction: "The Attorney General brings a prospective federal civil action under Help America Vote Act §401; the federal election is still ahead.",
    question: "Will every polling place have an accessible voting system for the coming federal election as HAVA §301(a)(3) requires?",
    authority: "Help America Vote Act §§301(a)(3) and 401; Congress's federal-election authority under Article I, §4.",
    disputedFacts: "The state disputes whether equipment deliveries and installation will close the audited gap before Election Day.",
    reliefSought: "A state-limited order requiring accessible equipment before this election; no certified result is challenged.",
    affected: `Voters who need accessible equipment at ${name} polling places lacking it.`,
    arguments: ["The United States relies on the state audit and the statutory polling-place requirement.",
      "The state says scheduled deliveries will cure the gap without an injunction."],
    evidence: [`Audited compliant polling-place share: ${Math.round(compliantShare * 100)} percent.`,
      `Election turn: ${electionTurn}.`],
  };
}

function opening(state: Campaign): readonly Effect[] {
  const election = nextElection(state);
  if (election?.kind !== "presidential" || election.turnsAway !== AUDIT_LEAD_TURNS) return [];
  if (Object.values(state.states).some((entry) => entry.electionAccess?.electionTurn === election.turn)) return [];
  const stream = createRngStreams(state.seed).stream("state-election-access", election.turn);
  const id = STATE_IDS[Math.floor(stream.next() * STATE_IDS.length)]!;
  const runtime = state.states[id];
  if (!runtime) return [];
  const compliantShare = Math.round((0.68 + stream.next() * 0.16) * 100) / 100;
  const finding = { electionTurn: election.turn, observedTurn: state.turn,
    actor: `${runtime.base.name} state election administration audit`, compliantShare,
    responseDueTurn: state.turn + 2,
    installationCapacity: Math.round((0.12 + stream.next() * 0.18) * 100) / 100 };
  return [
    { kind: "state", state: id, setElectionAccess: finding, reason: "The state audit records an accessible-equipment shortfall before a federal election." },
    { kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
      headline: `${runtime.base.name} auditors report a gap in accessible voting equipment.`,
      facts: { stake: `The state has two weeks to answer the finding before federal filing.`, topicTags: ["judiciary", "elections"] } }] },
  ];
}

function filing(state: Campaign): readonly Effect[] {
  return Object.values(state.states).flatMap((runtime) => {
    const finding = runtime.electionAccess;
    if (!finding?.responseDueTurn || state.turn < finding.responseDueTurn || finding.response
      || finding.electionTurn <= state.turn) return [];
    const id = runtime.base.id;
    const idOfCase = `election-access:${id}:${finding.electionTurn}`;
    if (state.judiciary.proceedings?.some((entry) => entry.id === idOfCase)) return [];
    const response = `${runtime.base.name} election administrators contest the audit and submit a delivery schedule that still leaves polling places without confirmed accessible equipment.`;
  const filedTurn = state.turn;
  const proceeding: CourtProceeding = {
    id: idOfCase, subject: { kind: "state-election-access", state: id, electionTurn: finding.electionTurn },
    matter: matter(state, id, finding.electionTurn, finding.compliantShare), filedTurn,
    stage: "threshold", nextTurn: filedTurn + 1,
    history: [{ turn: filedTurn, stage: "threshold",
      account: `After the state responds to the audit, the Attorney General files a prospective HAVA §401 action. ${response}` }],
  };
  return [
    { kind: "state", state: id, setElectionAccess: { ...finding, response }, reason: "The state answers the audit before the Attorney General files." },
    { kind: "courtProceeding", set: proceeding },
    { kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
      headline: `The Justice Department sues ${runtime.base.name} over accessible voting equipment.`,
      facts: { instrument: proceeding.matter!.title, stake: proceeding.matter!.injury, topicTags: ["judiciary", "elections"] } }] },
  ];
  });
}

function finalCase(state: Campaign, proceeding: CourtProceeding): CourtCase {
  const matter = proceeding.matter!;
  return {
    id: proceeding.id, subject: proceeding.subject, matter,
    question: matter.question, ground: "forbidden", filedTurn: proceeding.filedTurn,
    dueTurn: proceeding.nextTurn, ruledTurn: state.turn, holding: "struck-down", votes: [],
    opinion: { majority: "The audited shortfall violates HAVA's accessible-equipment requirement. The state must complete a polling-place remedy before this election; the order neither changes election law elsewhere nor revises a certified result." },
    procedure: { forum: "lower", lower: "struck-down", history: proceeding.history },
  };
}

function advance(state: Campaign, proceeding: CourtProceeding): readonly Effect[] {
  if (state.turn < proceeding.nextTurn || proceeding.stage === "final") return [];
  if (proceeding.subject.kind !== "state-election-access") return [];
  const id = proceeding.subject.state;
  const finding = state.states[id]?.electionAccess;
  if (!finding || finding.electionTurn !== proceeding.subject.electionTurn) return [];
  const set = (next: CourtProceeding): readonly Effect[] => [{ kind: "courtProceeding", set: next }];
  switch (proceeding.stage) {
    case "threshold":
      return set(courtStep(proceeding, "interim", state.turn,
        "The federal court accepts the Attorney General's statutory action: the state audit identifies an imminent injury before Election Day."));
    case "interim": {
      const due = state.turn + 6;
      return [...set(courtStep(proceeding, "lower-merits", state.turn,
        "The court orders the state to begin installing accessible equipment at the audited polling places while merits review continues.",
        { interim: "state-compliance-ordered" })),
        { kind: "state", state: id, setElectionAccess: { ...finding, remedyDueTurn: due },
          reason: "A prospective HAVA injunction starts the state's accessible-equipment installation." }];
    }
    case "lower-merits":
      return set(courtStep(proceeding, "appeal", state.turn,
        "The district court finds the audited shortfall violates HAVA §301(a)(3); its state-limited compliance order remains in force.",
        { lower: { holding: "struck-down", ruledTurn: state.turn, ground: "forbidden", enforcement: "in-force" } }));
    case "appeal": {
      const settled = courtStep(proceeding, "final", state.turn,
        "The state seeks a stay pending appeal. The court denies the stay; the state does not pursue a merits appeal before this election, and the lower compliance judgment remains in force.");
      const record = finalCase(state, settled);
      return [{ kind: "courtProceeding", set: settled }, { kind: "courtCase", set: record },
        { kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
          headline: `A federal court orders ${state.states[id]!.base.name} to meet the accessible-voting requirement before Election Day.`,
          facts: { instrument: record.matter!.title, stake: record.opinion.majority, topicTags: ["judiciary", "elections"] } }] }];
    }
    case "circuit-merits":
    case "supreme-merits":
    case "remand":
      return [];
  }
}

function installation(state: Campaign): readonly Effect[] {
  return Object.values(state.states).flatMap((runtime) => {
    const finding = runtime.electionAccess;
    if (!finding?.remedyDueTurn || finding.remediedShare !== undefined || state.turn < finding.remedyDueTurn
      || state.turn >= finding.electionTurn) return [];
    const remediedShare = Math.min(1, Math.round((finding.compliantShare + (finding.installationCapacity ?? 0)) * 100) / 100);
    return [{ kind: "state" as const, state: runtime.base.id,
      setElectionAccess: { ...finding, remediedShare },
      reason: `The state verifies accessible equipment at ${Math.round(remediedShare * 100)} percent of polling places; any remaining gap persists into Election Day.` }];
  });
}

/** An audit, federal civil case, and prospective installation advance without a presidential click. */
export function electionAccessMatterEffects(state: Campaign): readonly Effect[] {
  const existing = (state.judiciary.proceedings ?? []).flatMap((proceeding) => advance(state, proceeding));
  return [...opening(state), ...filing(state), ...existing, ...installation(state)];
}
