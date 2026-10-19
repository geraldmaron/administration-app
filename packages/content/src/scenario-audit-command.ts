import { amendableAct, tradeSector, type TradeSectorId } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
import { passages } from "./scenario-audit-contract.js";
import { auditTradeActs } from "./scenario-audit-trade.js";

/**
 * An authored command must be tied to exactly the record the binder pins, and
 * a reply's words must state the trade act its command or rung carries.
 */
export function auditScenarioCommands(def: ScenarioDef, findings: ScenarioFinding[]): void {
  auditTradeActs(def, findings);
  const trade = def.conditions.filter((condition) => condition.kind === "tradeMeasure");
  const bills = def.conditions.filter((condition) => condition.kind === "liveBill");
  const judicialVacancies = def.conditions.filter((condition) => condition.kind === "judicialVacancy");
  const orderCases = def.conditions.filter((condition) => condition.kind === "pendingOrderCase");
  const matters = def.conditions.filter((condition): condition is Extract<ScenarioDef["conditions"][number], { kind: "oversightMatter" }> =>
    condition.kind === "oversightMatter" && condition.origin === "inspector-general");
  const error = (message: string) => findings.push({ kind: "ungrounded-command", severity: "error", scenario: def.id, message });
  const copy = passages(def).map((passage) => passage.text).join(" ");
  if (/\{\{trade(?:Sector|Rate)\}\}/.test(copy) && (def.cast.pick !== "tradeMeasure" || trade.length !== 1)) {
    error("trade tokens need a pinned retaliation cast and gate");
  }
  if (/\{\{matter(?:Subject|Institution)\}\}/.test(copy) && matters.length !== 1) {
    error("matter tokens need one pinned inspector-general gate");
  }
  if (/\{\{bill(?:Title|Provision|HouseProvision|SenateProvision)\}\}/.test(copy) && (def.cast.pick !== "liveBill" || bills.length !== 1)) {
    error("bill tokens need one pinned live-bill cast and gate");
  }
  if (def.cast.pick === "liveBill" && bills.length !== 1) error("liveBill cast needs exactly one bill gate");
  if (bills.length > 0 && def.cast.pick !== "liveBill") error("liveBill gate needs a liveBill cast");
  if (def.cast.pick === "liveBill" && !def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.billText)) {
    error("liveBill decision needs an executable bill-text reply");
  }
  if (/\{\{judicial(?:Seat|Nominee(?:Record)?|Alternate(?:Record)?)\}\}/.test(copy) && (def.cast.pick !== "judicialVacancy" || judicialVacancies.length !== 1)) {
    error("judicial tokens need one pinned vacant-seat cast and gate");
  }
  if (def.cast.pick === "judicialVacancy" && judicialVacancies.length !== 1) error("judicialVacancy cast needs exactly one vacancy gate");
  if (judicialVacancies.length > 0 && def.cast.pick !== "judicialVacancy") error("judicial vacancy gate needs a judicialVacancy cast");
  if (def.cast.pick === "judicialVacancy" && !["first", "alternate"].every((candidate) =>
    def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.judicialNomination?.candidate === candidate))) {
    error("judicial vacancy decision needs executable replies for both eligible candidates");
  }
  if (/\{\{court(?:Order|Question)\}\}/.test(copy) && (def.cast.pick !== "pendingOrderCase" || orderCases.length !== 1)) {
    error("court tokens need one pinned pending-order case and gate");
  }
  if (def.cast.pick === "pendingOrderCase" && orderCases.length !== 1) error("pendingOrderCase cast needs exactly one case gate");
  if (orderCases.length > 0 && def.cast.pick !== "pendingOrderCase") error("pending order case gate needs a pendingOrderCase cast");
  if (def.cast.pick === "pendingOrderCase" && !def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.orderRescission)) {
    if (orderCases[0]?.posture !== "adverse-lower") error("pending order case decision needs an executable rescission reply");
  }
  if (orderCases[0]?.ruleState && orderCases[0].posture !== "adverse-lower") error("ruleState needs an adverse lower judgment gate");
  if (orderCases[0]?.posture === "adverse-lower" && !["accept", "seek", "seek-with-stay"].every((choice) =>
    def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.orderReview?.choice === choice))) {
    error("adverse lower judgment needs executable accept, seek, and seek-with-stay replies");
  }
  if (bills[0]?.stage === "conference" && bills[0].responseText === undefined) error("conference bill gate needs a response text");
  if (bills[0]?.act && !amendableAct(bills[0].act)) error("live bill gate names an act with no authored alternative text");
  if (bills[0]?.stage === "markup" && bills[0].responseText !== undefined) error("markup bill gate cannot name conference text");
  if (bills[0]?.stage === "conference" && bills[0].responseText === "both" && !["house", "senate"].every((text) =>
    def.replies.some((reply) => reply.commitment.kind === "position" && reply.commitment.billText?.action === "recommend" && reply.commitment.billText.text === text))) {
    error("dual-text conference decision needs executable recommendations of both passed chamber texts");
  }
  if (def.cast.pick === "tradeMeasure" && trade.length !== 1) error("tradeMeasure cast needs exactly one retaliation gate");
  if (trade.length > 0 && def.cast.pick !== "tradeMeasure") error("retaliation gate needs a tradeMeasure cast");
  if (matters.length > 1) error("a pinned inspector-general decision needs exactly one matter gate");
  for (const reply of def.replies) {
    if (reply.commitment.kind !== "position") continue;
    const { tariff, tariffLift, directive, billText, judicialNomination, orderRescission, orderReview, cost, impact, collection, relief, localeAct, transmit } = reply.commitment;
    if (tariff && tradeSector(tariff.sector as TradeSectorId)?.instrument !== "tariff") {
      error(`tariff reply names "${tariff.sector}", which is not goods a tariff can be laid on`);
    }
    if (tariff && def.cast.pick === "tradeMeasure") {
      const gate = trade[0];
      if (trade.length !== 1 || !gate || tariff.sector !== gate.responseSector || tariff.rate !== gate.responseRate) {
        error("tariff reply needs a pinned retaliation and must match the gated response sector and rate");
      }
    }
    if (tariff && def.cast.pick === "none") error("tariff reply needs a cast counterpart to lay the tariff on");
    if (tariffLift && (def.cast.pick !== "tradeMeasure" || trade.length !== 1 ||
      !def.conditions.some((condition) => condition.kind === "tariffInForce" && condition.present &&
        (condition.of ?? "answered") === (tariffLift.which ?? "answered")))) {
      error("tariff-lift reply needs a pinned retaliation and a tariffInForce gate on the same tariff, so the tariff it lifts is the one the week is about");
    }
    if (directive && (matters.length !== 1 || matters[0]?.institution === undefined)) {
      error("a matter-bound command needs one pinned inspector-general matter with a named institution");
    }
    if (billText && (def.cast.pick !== "liveBill" || bills.length !== 1 ||
      bills[0]?.stage !== (billText.action === "propose" ? "markup" : "conference") ||
      (billText.action === "recommend" && (bills[0]?.responseText === "both"
        ? billText.text !== "house" && billText.text !== "senate"
        : bills[0]?.responseText !== billText.text)))) {
      error("bill reply needs a pinned live bill in the matching stage");
    }
    if (judicialNomination && (def.cast.pick !== "judicialVacancy" || judicialVacancies.length !== 1)) {
      error("nomination reply needs a pinned vacant Court seat");
    }
    if (orderRescission && (def.cast.pick !== "pendingOrderCase" || orderCases.length !== 1 || orderCases[0]?.posture === "adverse-lower")) {
      error("rescission reply needs a pinned pending order case");
    }
    if (orderReview && (def.cast.pick !== "pendingOrderCase" || orderCases.length !== 1 || orderCases[0]?.posture !== "adverse-lower")) {
      error("review reply needs a pinned adverse lower judgment");
    }
    // A lift's own price is revenue the Treasury stops collecting and a shelf
    // price that falls, so the political cost of dropping the protection is
    // authored beside it. Treasury stays out: customs already books it.
    const liftCost = tariffLift !== undefined && cost.treasury === undefined;
    if ((tariff || tariffLift || directive || billText || judicialNomination || orderRescission || orderReview) &&
      ((Object.keys(cost).length > 0 && !liftCost) || impact || collection || relief || localeAct || transmit)) {
      error("a typed command carries its own price and cannot share a reply with authored cost or another action");
    }
    if ([tariff, tariffLift, directive, billText, judicialNomination, orderRescission, orderReview].filter(Boolean).length > 1) error("one reply cannot issue multiple typed commands");
  }
}
