export declare const REGIME_DIALS: {
    /**
     * The weekly coup hazard a fresh coup-support operation adds, per unit of
     * the target's own exposure to a coup: regime proneness times the ambition
     * of its armed rival times its distance from full stability. Set so the
     * operation against a fragile autocracy (Haiti, Venezuela) ends in a fall in
     * about 45% of runs over 104 weeks, counting the country's own coup risk,
     * and against a stable one (Cuba, Iran, Panama) in under 15%.
     */
    readonly coupSupportWeight: 0.0228;
    /** Weeks for the operation's added hazard to halve: assets are rolled up, officers retire, the moment passes. */
    readonly coupSupportHalfLifeWeeks: 26;
    /** The longest any standing operation runs before it lapses, and the window every forecast reads over. */
    readonly operationWeeks: 104;
    /** How far political action lowers the sitting government's chance of coming through its next selection. */
    readonly politicalActionStandingPull: 0.12;
    /** How much political action multiplies the weekly chance a parliament brings the government down. */
    readonly politicalActionConfidenceLift: 2;
    /**
     * Weekly exposure hazard: base × footprint × (0.5 + the target's
     * counter-intelligence) × (1.5 − the sponsor's). With the United States'
     * counter-intelligence, coup support in Haiti is exposed in about 27% of
     * runs over 104 weeks and in Cuba about 41%; "most failed to remain covert"
     * (Preble, 2019) over multi-year programs, a short one more often stays
     * quiet.
     */
    readonly exposureBase: 0.006;
    readonly footprint: {
        readonly "political-action": 0.5;
        readonly "coup-support": 1;
    };
    /** The lean toward the sponsor a successor takes office with, toward the sponsor's government. */
    readonly installedAlignment: {
        readonly "political-action": 0.3;
        readonly "coup-support": 0.4;
    };
    readonly installedTrust: {
        readonly "political-action": 0.2;
        readonly "coup-support": 0.3;
    };
    /**
     * Weeks for a successor's lean to halve. O'Rourke finds installed regimes no
     * more likely to vote or trade with their sponsor over the following
     * decade; a two-year half-life leaves 6% of the lean after eight years.
     */
    readonly installedHalfLifeWeeks: 104;
    /** A successor's lean stops being written once it has halved this many times. */
    readonly installedHalfLives: 4;
    /** What an exposed operation leaves in the target government's memory of the sponsor. */
    readonly exposedGrudge: 0.6;
    readonly exposedAlignment: -0.15;
};
