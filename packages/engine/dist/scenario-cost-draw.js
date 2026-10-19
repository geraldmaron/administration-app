import { createRngStreams, makeCampaignSeed } from "./rng.js";
export const COST_JITTER = {
    overrunBias: 0.08,
    bandSpread: 0.35,
    basisSpread: 0.15,
    treasuryBias: 0.03,
    treasurySpread: 0.1,
    floor: 0.5,
    ceiling: 2.5,
};
/**
 * A standard normal draw, reproducible from its key and attempt.
 *
 * Both uniforms come off one seeded stream in sequence. Two hashes of the key
 * with different suffixes looked independent and were not: FNV-1a moves little
 * when only the last characters change, and the pair skewed the draw's mean
 * and widened its spread enough to move a quarter of the overrun bias.
 */
function normalFrom(key, attempt) {
    const stream = createRngStreams(makeCampaignSeed(key)).stream("scenario-cost", attempt);
    const u1 = Math.max(1e-12, stream.next());
    const u2 = stream.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
/** How many times a draw outside the bounds is drawn again before it is clamped. */
const REDRAWS = 8;
/**
 * A log-normal multiplier around one, skewed by `bias`, bounded so a draw cannot
 * be absurd. A draw outside the bounds is drawn again rather than clamped: a
 * clamp would pile every tail draw onto the same two figures, and two campaigns
 * paying exactly the floor is the identical number this exists to prevent.
 */
export function costMultiplier(key, spread, bias = COST_JITTER.overrunBias) {
    if (key === undefined)
        return 1;
    for (let attempt = 0; attempt < REDRAWS; attempt += 1) {
        const drawn = Math.exp(bias + spread * normalFrom(key, attempt));
        if (drawn >= COST_JITTER.floor && drawn <= COST_JITTER.ceiling)
            return drawn;
    }
    return Math.min(COST_JITTER.ceiling, Math.max(COST_JITTER.floor, Math.exp(bias)));
}
