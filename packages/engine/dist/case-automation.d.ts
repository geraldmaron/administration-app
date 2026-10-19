import type { CaseAutomationRule, CaseEffect } from "./case-types.js";
import type { Campaign } from "./state.js";
export declare function automationPreview(campaign: Campaign, rule: CaseAutomationRule): readonly string[];
/** The same case effect a manual disposition would write, and only for confirmed ids. */
export declare function confirmedAutomationEffects(campaign: Campaign, rule: CaseAutomationRule, confirmed: readonly string[]): readonly CaseEffect[];
