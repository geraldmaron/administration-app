import type { ScenarioDef } from "./scenario.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
/**
 * A reply whose words impose, lift or pause a tariff, or announce sanctions,
 * must carry the route that does it, at the rate and on the goods it names,
 * and a reply that lays a tariff must say so.
 * Otherwise the memo says the duty ended while the trade ledger still collects
 * it. Ids that shipped before the rule are listed in `TRADE_ACT_DEBT` and may
 * only leave it.
 */
export declare function auditTradeActs(def: ScenarioDef, findings: ScenarioFinding[]): void;
