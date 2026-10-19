// A state's congressional bloc and its own memory: what a state carries
// between weeks beyond the live partisan `lean` it already had. It sits beside
// state-campaign.ts rather than inside it, for the same reason
// state-legislature.ts is separate: state-campaign.ts is at the 800-line size
// limit this project treats as a signal to stop, and a shape this
// document-heavy earns its own module rather than pushing that file past it.
//
// This file carries the mark/claim/delegation shapes and the derived
// grievanceLean reading. Writers that land against it: `routeDomestic`
// (marks), `statePhase` (decay + claim expiry into omission marks + lean
// drift toward the grievance anchor), `apportionDelegations` /
// `withSeatedGovernors`, and `applyStateGeography`. `openingStates` seeds
// `marks` and `claims` empty; `delegation` and `governor` stay optional for
// the same reason no stored shape here is retrofitted onto a save that
// predates it — an absent field here is not a claim a fact was computed and
// lost, it is the honest statement that nothing has computed it yet.
import { towardAdministration } from "./party.js";
/**
 * Deterministic eviction bounds for `marks` and `claims`. When a list would
 * exceed its bound, the writer drops the entry with the lowest `weight`,
 * ties broken by the lowest `turn`, ties broken by `signature` ascending —
 * fully ordered, so eviction is identical on every machine. The bound
 * numbers themselves are not fiction-time quantities the way decay rates
 * are: they cap magnitude and save size and hold at any pacing granularity.
 */
export const MAX_STATE_MARKS = 8;
export const MAX_STATE_CLAIMS = 3;
/**
 * Per-turn weight drop for a routed act's mark. Kept at 0.06 (~sixteen weeks of
 * life) rather than slowed to ~0.02: reachability comes from proportional lean
 * drift (STATE_LEAN_DRIFT), not from making every mark outlive the midterm.
 * Slowing this rate re-introduces state pairs that cannot reach each other.
 */
export const BASE_MARK_DECAY = 0.06;
/**
 * Per-turn weight drop for an omission mark. Half of BASE_MARK_DECAY so an
 * unanswered claim is remembered roughly twice as long as an act. The
 * asymmetry is deliberate: what a government failed to do outlasts what it did.
 */
export const OMISSION_DECAY = 0.03;
/**
 * How hard a unit of net mark weight displaces the lean anchor. Net weight ×
 * this scale, then clamped to ±GRIEVANCE_LEAN_CAP so a full mark stack cannot
 * rewrite a state's politics in one season.
 */
export const GRIEVANCE_LEAN_SCALE = 0.12;
export const GRIEVANCE_LEAN_CAP = 0.25;
/**
 * Signed lean displacement the live mark stack asks for. Derived every read —
 * never stored — so the anchor cannot disagree with the memory that justifies
 * it.
 */
export function grievanceLean(marks, standing) {
    const net = marks.reduce((sum, mark) => sum + mark.weight * mark.valence, 0);
    // A mark's valence is administration-relative ("for the administration, or
    // against it") while `lean` is partisan (Dem ← → Rep). Converting one to the
    // other needs the administration's own party, and without it this returned the
    // Republican reading always: under the default Democratic administration a
    // state that had been abandoned drifted *toward* the president's own party,
    // so neglect was rewarded and relief was punished. A mark for the
    // administration moves the state toward the party that holds the office.
    //
    // Signed by the caucus anchor and scaled by reach: a president with no party
    // still earns credit and blame, but less of it is banked on the partisan axis
    // by a caucus that did none of it.
    const raw = towardAdministration(net * GRIEVANCE_LEAN_SCALE, standing);
    return Math.max(-GRIEVANCE_LEAN_CAP, Math.min(GRIEVANCE_LEAN_CAP, raw));
}
