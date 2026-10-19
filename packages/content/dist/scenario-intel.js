import { createRngStreams } from "@admin/engine";
import { hedgeIn } from "./audit-lexicon.js";
// The unreliable briefing, and the three rules that keep it a battle rather
// than a slot machine.
//
// A game where the briefing can be wrong is only interesting if being wrong is
// something skill can survive. Doubt a player has no way to resolve is noise,
// and noise teaches a player to stop reading — which is the exact opposite of
// what a scenario carrying a marked claim is for. So the doctrine is three
// rules, and every one of them is a mechanism here rather than advice in a
// brief:
//
//   (a) The tell is always present. A briefing that can be wrong says so in its
//       own prose — single-sourced, disputed, one defector, the second service
//       does not agree. `auditIntelTell` refuses a marked scenario whose
//       opening and transmission carry no hedge at all.
//   (b) The rate is low and fixed, and high confidence is never overturned.
//       `intelProvedFalse` is the only place a verdict is drawn, it draws at
//       FALSE_INTEL_RATE, and it returns false outright for a confirmed claim.
//       Trusting your services stays the rational default because it is.
//   (c) The reveal names the check that would have caught it. Enforced on the
//       aftermath cards by `auditRevealNamesTheCheck` in the consequence audit,
//       against the same lexicon this module reads for the tell.
//
// The verdict is derived, never stored. It is a pure function of the campaign
// seed and the scenario's id, which means it is the same answer every time it
// is asked, in a projection and after a commit alike, and it survives a save
// and load without occupying a byte of one.
/**
 * The band of confidence a claim can be overturned in. A confirmed claim is
 * outside it by construction, which is fairness rule (b)'s hard half: no draw
 * happens at all, so no seed and no rate can ever make one false.
 */
export const LOW_CONFIDENCE = ["single-sourced", "disputed"];
/**
 * How often a low-confidence claim turns out to be wrong. Roughly one in six,
 * fixed by doctrine rather than tuned per scenario, so a player can hold the
 * odds in their head: five briefings in six are sound even when hedged, which
 * makes acting on a hedged briefing a defensible bet and refusing every one of
 * them a losing policy. A writer cannot raise it and a scenario cannot carry
 * its own rate — one number, documented, or the player is guessing.
 */
export const FALSE_INTEL_RATE = 1 / 6;
export function isLowConfidence(confidence) {
    return confidence !== undefined && LOW_CONFIDENCE.includes(confidence);
}
/**
 * Whether this campaign's copy of this claim was wrong.
 *
 * Keyed on the scenario id rather than the turn, so the answer does not change
 * underneath a player who sees the same scenario across a reload, and so two
 * campaigns on different seeds disagree about the same briefing — which is what
 * stops the answer leaking between players as folklore.
 */
export function intelProvedFalse(campaign, def) {
    if (!isLowConfidence(def.intelConfidence))
        return false;
    return createRngStreams(campaign.seed).stream("intel-confidence", def.id).next() < FALSE_INTEL_RATE;
}
/**
 * The context a committed reply hands the aftermath layer, so a reveal card can
 * be selected by the same condition-match-and-weighted-draw every other card
 * goes through. `undefined` for an unmarked scenario is deliberate: it is not a
 * claim that the briefing was sound, it is the absence of a briefing with
 * anything to be wrong about, and a card asking either way is refused.
 */
export function intelContext(campaign, def) {
    if (!isLowConfidence(def.intelConfidence))
        return {};
    return { intelFalse: intelProvedFalse(campaign, def) };
}
/**
 * The prose a marked scenario has to hedge in. Both the opening and the
 * transmission count: a foreign ministry's cable calling its own figure
 * contested is as much a tell as a minister saying so out loud, and refusing
 * the second would push every marked scenario into the same shape.
 */
export function intelTellPassages(def) {
    return [def.subject, ...def.opening.map((beat) => beat.text), ...(def.transmission ? [def.transmission.text] : [])];
}
/** The hedge a marked scenario's prose was found to carry, if it carries one. */
export function intelTell(def) {
    for (const text of intelTellPassages(def)) {
        const found = hedgeIn(text);
        if (found)
            return found;
    }
    return undefined;
}
// --- The fairness gate ------------------------------------------------------
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
export function auditIntelConfidence(def, findings) {
    if (!isLowConfidence(def.intelConfidence))
        return;
    if (!intelTell(def)) {
        findings.push({
            kind: "intel-tell-missing",
            severity: "error",
            scenario: def.id,
            message: `is marked ${def.intelConfidence} and its briefing hedges nowhere: a claim that can turn out to be wrong must say how thin its sourcing is, or the player is being punished for believing something they had no way to weigh`,
        });
    }
    if (!def.replies.some((reply) => reply.commitment.kind === "instrument")) {
        findings.push({
            kind: "intel-doubt-unanswerable",
            severity: "error",
            scenario: def.id,
            message: `is marked ${def.intelConfidence} but offers no instrument reply: the aftermath pool is only consulted for an act, so no reveal card can ever be drawn and the claim's falsity would never reach the player`,
        });
    }
}
