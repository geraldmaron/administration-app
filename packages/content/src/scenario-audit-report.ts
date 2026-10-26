import { ACUTE_CONDITIONS } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import { passages, type ScenarioFinding } from "./scenario-audit-contract.js";

/** The locale acts that answer disorder rather than a disaster; the engine opens them only on unrest. */
const COERCIVE_LOCALE_ACTS: readonly string[] = ["property-surge", "task-force", "priority"];

/**
 * A court application's flag carries the filed odds and, until the ruling week,
 * a pending marker only; the drawn answer is already fixed at filing. Content
 * reads the ruling from `court-order-<outcome>:<kind>:<state>`, which the engine
 * writes the week the court gives it, so a scenario can never fire on an answer
 * the player has not been told. Hooked here because the scenario audit file is
 * at its frozen size.
 */
function auditCourtFlagReads(def: ScenarioDef, findings: ScenarioFinding[]): void {
  for (const condition of def.conditions) {
    if (condition.kind === "flag" && condition.flag.startsWith("court-application:")) {
      findings.push({ kind: "ungrounded-report", severity: "error", scenario: def.id,
        message: `a court case is read from its ruling flag court-order-<outcome>:<kind>:<state>, never from "${condition.flag}", which exists before the court has ruled` });
    }
  }
}

/** A report decision may only claim what its selected issued product contains. */
export function auditCollectionReport(def: ScenarioDef, findings: ScenarioFinding[]): void {
  auditCourtFlagReads(def, findings);
  const gates = def.conditions.filter((condition) => condition.kind === "collectionReport");
  const reportTokens = passages(def).flatMap((passage) => [...passage.text.matchAll(/\{\{(report[A-Z][a-zA-Z]*)\}\}/g)].map((match) => match[1]!));
  const error = (kind: "ungrounded-report" | "classified-report-disclosure", message: string) =>
    findings.push({ kind, severity: "error", scenario: def.id, message });
  if (def.cast.pick !== "collectionReport") {
    if (gates.length > 0) error("ungrounded-report", "a report gate needs a collectionReport cast");
    if (reportTokens.length > 0) error("ungrounded-report", "report tokens need a collectionReport cast and gate");
    if (def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.collection !== undefined)) {
      error("ungrounded-report", "a collection reply needs a pinned issued report");
    }
    if (def.replies.some((reply) => reply.commitment.kind === "position" && (reply.commitment.relief || reply.commitment.localeAct))) {
      error("ungrounded-report", "a relief reply needs a pinned governor-request report");
    }
    return;
  }
  const gate = gates[0];
  if (gates.length !== 1 || !gate ||
    (def.cast.bind === "home") !== (gate.targetKind === "domestic-state") ||
    (def.cast.bind === "recipient" && gate.shared !== true)) {
    error("ungrounded-report", "report cast needs one matching report gate; recipient binding needs a shared report");
  }
  if (reportTokens.includes("reportRecipient") && gate?.shared !== true) {
    error("ungrounded-report", "reportRecipient needs a shared report gate");
  }
  if (gate?.recipientAffected && (gate.shared !== true || gate.basis !== "pursuit")) {
    error("ungrounded-report", "recipientAffected requires a shared pursuit finding whose destination is the recipient");
  }
  if (gate?.status === "no-result") {
    if (gate.topic !== undefined || gate.basis !== undefined || gate.condition !== undefined) {
      error("ungrounded-report", "a no-result report has no finding topic or typed finding basis");
    }
    if (reportTokens.some((token) => token === "reportFinding" || token === "reportSource")) {
      error("ungrounded-report", "a no-result report has no finding or finding source to quote");
    }
    if (!reportTokens.includes("reportSummary") || !reportTokens.includes("reportGaps")) {
      error("ungrounded-report", "a no-result decision must show the issued absence and its recorded gaps");
    }
    const copy = passages(def).map((passage) => passage.text).join(" ");
    if (/\b(?:all clear|no threat|nothing to fear|target is clear|absence proves)\b/i.test(copy)) {
      error("ungrounded-report", "no usable result cannot be written as reassurance that the target is clear");
    }
  } else {
    if (gate?.topic === undefined) error("ungrounded-report", "a findings report must select a recorded topic");
    if (gate?.targetKind === "domestic-state" && gate.basis === undefined) {
      error("ungrounded-report", "a domestic findings report must select a recorded state condition or governor request");
    }
    if (gate?.basis === "state-condition" && gate.condition === undefined) {
      error("ungrounded-report", "a state-condition report must name the recorded condition kind");
    }
  }
  if (def.replies.some((reply) => reply.press !== undefined)) {
    error("classified-report-disclosure", "a report-bound reply cannot publish classified findings as press copy");
  }
  for (const reply of def.replies) {
    if (reply.commitment.kind === "position" && reply.commitment.collection?.action === "close" && gate?.activeTasking !== true) {
      error("ungrounded-report", "closing the original collection tasking requires an activeTasking report gate");
    }
    if (reply.commitment.kind !== "position" || (!reply.commitment.relief && !reply.commitment.localeAct)) continue;
    const { localeAct } = reply.commitment;
    const coercive = localeAct !== undefined && COERCIVE_LOCALE_ACTS.some((act) => act === localeAct);
    if (coercive) {
      // The engine refuses these on any other cause; the audit refuses them first so the reply never ships as a dead button.
      if (gate?.targetKind !== "domestic-state" || gate.condition !== "unrest") {
        error("ungrounded-report", "a coercive state response (property surge, task force, investigative priority) needs a domestic report whose condition is unrest");
      }
    } else if (gate?.targetKind !== "domestic-state" || gate.basis !== "governor-request" ||
      !gate.condition || !ACUTE_CONDITIONS.some((kind) => kind === gate.condition)) {
      error("ungrounded-report", "a state response needs a governor request for a named acute state condition");
    }
    if (reply.commitment.collection || (reply.commitment.relief && reply.commitment.localeAct) ||
      Object.keys(reply.commitment.cost).length > 0 || reply.commitment.impact) {
      error("ungrounded-report", "the state response has its own price and cannot share a reply with authored costs or another action");
    }
  }
}
