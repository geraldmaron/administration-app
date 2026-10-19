import { type Campaign } from "@admin/engine";
import type { ScenarioFinding } from "./scenario-audit.js";
import type { ScenarioDef, ScenarioIntelConfidence } from "./scenario.js";
/**
 * The band of confidence a claim can be overturned in. A confirmed claim is
 * outside it by construction, which is fairness rule (b)'s hard half: no draw
 * happens at all, so no seed and no rate can ever make one false.
 */
export declare const LOW_CONFIDENCE: readonly ScenarioIntelConfidence[];
/**
 * How often a low-confidence claim turns out to be wrong. Roughly one in six,
 * fixed by doctrine rather than tuned per scenario, so a player can hold the
 * odds in their head: five briefings in six are sound even when hedged, which
 * makes acting on a hedged briefing a defensible bet and refusing every one of
 * them a losing policy. A writer cannot raise it and a scenario cannot carry
 * its own rate — one number, documented, or the player is guessing.
 */
export declare const FALSE_INTEL_RATE: number;
export declare function isLowConfidence(confidence: ScenarioIntelConfidence | undefined): boolean;
/**
 * Whether this campaign's copy of this claim was wrong.
 *
 * Keyed on the scenario id rather than the turn, so the answer does not change
 * underneath a player who sees the same scenario across a reload, and so two
 * campaigns on different seeds disagree about the same briefing — which is what
 * stops the answer leaking between players as folklore.
 */
export declare function intelProvedFalse(campaign: Campaign, def: Pick<ScenarioDef, "id" | "intelConfidence">): boolean;
/**
 * The context a committed reply hands the aftermath layer, so a reveal card can
 * be selected by the same condition-match-and-weighted-draw every other card
 * goes through. `undefined` for an unmarked scenario is deliberate: it is not a
 * claim that the briefing was sound, it is the absence of a briefing with
 * anything to be wrong about, and a card asking either way is refused.
 */
export declare function intelContext(campaign: Campaign, def: Pick<ScenarioDef, "id" | "intelConfidence">): {
    readonly intelFalse?: boolean;
};
/**
 * The prose a marked scenario has to hedge in. Both the opening and the
 * transmission count: a foreign ministry's cable calling its own figure
 * contested is as much a tell as a minister saying so out loud, and refusing
 * the second would push every marked scenario into the same shape.
 */
export declare function intelTellPassages(def: ScenarioDef): readonly string[];
/** The hedge a marked scenario's prose was found to carry, if it carries one. */
export declare function intelTell(def: ScenarioDef): string | undefined;
/**
 * Fairness rule (a) as a refusal, and rule (b)'s reachability half beside it.
 *
 * A marked briefing with no tell is the failure mode the whole design exists to
 * forbid: the player is punished for believing something they had no way to
 * weigh. It is an error rather than a warning for the same reason a scenario
 * gated on a flag nothing writes is — both are documents that will reach a
 * player and do the wrong thing, and neither is a matter of a writer's taste.
 *
 * The second rule is the war-fixture lesson applied to this marker. A reveal
 * card is drawn out of the aftermath pool, and the aftermath pool is only
 * consulted for a reply that reaches for an instrument. Mark a briefing on a
 * scenario whose every answer is words, and the claim can be false all it likes
 * — no card will ever be selected and the player will never learn it. That is a
 * marker with nowhere to be true, which ships as dead content and reads to the
 * writer as a feature that works.
 */
export declare function auditIntelConfidence(def: ScenarioDef, findings: ScenarioFinding[]): void;
