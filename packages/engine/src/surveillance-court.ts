import type { Campaign } from "./state.js";
import type { Effect } from "./effects.js";
import type { SurveillanceIncident } from "./intelligence.js";
import type { CourtCase, CourtMatter, CourtProceeding } from "./state-judiciary.js";
import { courtStep } from "./court-procedure.js";

const MINIMUM_DAMAGES = 1_000;

function matter(incident: SurveillanceIncident): CourtMatter {
  return {
    kind: "unlawful-surveillance", title: "Aggrieved U.S. person v. federal surveillance officials",
    parties: [{ name: "U.S. person whose private message was intercepted", role: "plaintiff" },
      { name: "Federal officials responsible for the NSA interception", role: "defendant" }],
    injury: `The named person in NSA log ${incident.id} was intentionally targeted in the United States and had private message content acquired there on day ${incident.interceptDay}.`,
    jurisdiction: "An aggrieved person actually subjected to electronic surveillance brings a civil action under 50 U.S.C. §1810 against the officials responsible. A refused tasking alone would create no such claim.",
    question: "Does the documented interception violate 50 U.S.C. §1809, making the responsible officials liable under §1810?",
    authority: "Foreign Intelligence Surveillance Act, 50 U.S.C. §§1801(f), 1809 and 1810.",
    disputedFacts: "The officials contest whether the acquisition qualifies as unauthorized electronic surveillance. The IG log identifies intentional domestic targeting and content acquisition, with no consent, FISA order, or statutory exception.",
    reliefSought: `Award at least $${MINIMUM_DAMAGES} in statutory liquidated damages for the single recorded day, plus any proven fees. This suit does not itself order data deletion.`,
    affected: "The aggrieved person and responsible officials for this interception only; ordinary foreign collection and refused domestic taskings are outside the claim.",
    evidence: [incident.auditLog, `Interception day: ${incident.interceptDay}; IG exposure turn: ${incident.exposedTurn}.`,
      "The log records intentional domestic content acquisition and no consent, judicial order, or other statutory exception."],
  };
}

function opened(state: Campaign, incident: SurveillanceIncident): CourtProceeding {
  return { id: `surveillance:${incident.id}`, subject: { kind: "unlawful-surveillance", incidentId: incident.id },
    matter: matter(incident), filedTurn: state.turn, stage: "threshold", nextTurn: state.turn + 1,
    history: [{ turn: state.turn, stage: "threshold",
      account: "After the Inspector General exposes a specific NSA interception log, the aggrieved target files a §1810 damages action." }] };
}

function finalCase(state: Campaign, proceeding: CourtProceeding): CourtCase {
  return { id: proceeding.id, subject: proceeding.subject, matter: proceeding.matter,
    question: proceeding.matter!.question, ground: "forbidden", filedTurn: proceeding.filedTurn,
    dueTurn: proceeding.nextTurn, ruledTurn: state.turn, holding: "struck-down", votes: [],
    opinion: { majority: `The IG log proves intentional domestic electronic surveillance under color of law without consent or lawful authority. The responsible officials owe the aggrieved person $${MINIMUM_DAMAGES} in §1810 liquidated damages for the recorded day. The judgment does not order data deletion.` },
    procedure: { forum: "lower", lower: "struck-down", history: proceeding.history } };
}

function advance(state: Campaign, proceeding: CourtProceeding, incident: SurveillanceIncident): readonly Effect[] {
  if (state.turn < proceeding.nextTurn || proceeding.stage === "final") return [];
  const set = (next: CourtProceeding): Effect => ({ kind: "courtProceeding", set: next });
  switch (proceeding.stage) {
    case "threshold": return [set(courtStep(proceeding, "lower-merits", state.turn,
      "The aggrieved target's documented interception supports standing and a §1810 cause of action; liability remains disputed."))];
    case "lower-merits": return [set(courtStep(proceeding, "appeal", state.turn,
      "The district court finds that the intentional acquisition had no consent, FISA order, or statutory exception.",
      { lower: { holding: "struck-down", ruledTurn: state.turn, ground: "forbidden", enforcement: "stayed-pending-appeal" } }))];
    case "appeal": {
      const settled = courtStep(proceeding, "final", state.turn,
        "The officials let the district court's person-specific damages judgment become final without appeal.");
      const record = finalCase(state, settled);
      return [set(settled), { kind: "courtCase", set: record },
        { kind: "intelligence", surveillanceIncident: { ...incident, status: "damages-ordered", damages: MINIMUM_DAMAGES } },
        { kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
          headline: "A federal court awards damages for a documented unlawful NSA interception.",
          facts: { instrument: record.matter!.title, stake: record.opinion.majority,
            topicTags: ["judiciary", "intelligence", "surveillance"] } }] }];
    }
    case "interim": case "circuit-merits": case "supreme-merits": case "remand": return [];
  }
}

/** The court can hear an exposed interception, never an attempted tasking that counsel refused. */
export function surveillanceMatterEffects(state: Campaign): readonly Effect[] {
  const incident = state.security.intelligence.surveillanceIncident;
  if (!incident?.exposedTurn) return [];
  const id = `surveillance:${incident.id}`;
  const existing = state.judiciary.proceedings?.find((entry) => entry.id === id);
  return existing ? advance(state, existing, incident) : [{ kind: "courtProceeding", set: opened(state, incident) }];
}
