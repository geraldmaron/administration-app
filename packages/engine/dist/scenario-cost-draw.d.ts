export declare const COST_JITTER: {
    readonly overrunBias: 0.08;
    readonly bandSpread: 0.35;
    readonly basisSpread: 0.15;
    readonly treasuryBias: 0.03;
    readonly treasurySpread: 0.1;
    readonly floor: 0.5;
    readonly ceiling: 2.5;
};
/**
 * A log-normal multiplier around one, skewed by `bias`, bounded so a draw cannot
 * be absurd. A draw outside the bounds is drawn again rather than clamped: a
 * clamp would pile every tail draw onto the same two figures, and two campaigns
 * paying exactly the floor is the identical number this exists to prevent.
 */
export declare function costMultiplier(key: string | undefined, spread: number, bias?: number): number;
