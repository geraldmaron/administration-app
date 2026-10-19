import { type ScenarioDef, type ScenarioPack } from "../scenario.js";
export declare const CORE_SCENARIOS: readonly ScenarioDef[];
export declare const corePack: ScenarioPack;
/**
 * Every flag the bundled content can stamp. Because it ships with every
 * install, these flags exist in any campaign — so a later pack may gate on one
 * without shipping the document that writes it, and the audit needs to know
 * that before calling such a gate unsatisfiable.
 *
 * Replies and consequence cards are one vocabulary, not two. A gate does not
 * care whether the deed was the answer a player gave or the aftermath that
 * answer produced, and splitting the derivation would have made a chain that
 * hangs off an authored aftermath read as unsatisfiable.
 */
export declare const CORE_FLAG_VOCABULARY: readonly string[];
