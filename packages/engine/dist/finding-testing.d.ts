import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
/** A board with a written finding standing on the target, for tests that exercise a covert rung and not the finding gate. */
export declare function withStandingFinding(campaign: Campaign, target: NationId): Campaign;
