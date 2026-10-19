// Every figure the regime operations turn on, in one place, the way
// `contest-dials.ts` holds the odds. All are planning values: none is fitted to
// a measured series, and each says what it was set against. The record they
// are set against is O'Rourke's count of Cold War covert regime changes (39%
// of covert attempts succeeded, and most attempts against strong states
// failed), read through the H-Diplo/ISSF roundtable on her book; it gives no
// time profile, so every half-life below is a design choice, not a finding.

export const REGIME_DIALS = {
  /**
   * The weekly coup hazard a fresh coup-support operation adds, per unit of
   * the target's own exposure to a coup: regime proneness times the ambition
   * of its armed rival times its distance from full stability. Set so the
   * operation against a fragile autocracy (Haiti, Venezuela) ends in a fall in
   * about 45% of runs over 104 weeks, counting the country's own coup risk,
   * and against a stable one (Cuba, Iran, Panama) in under 15%.
   */
  coupSupportWeight: 0.0228,
  /** Weeks for the operation's added hazard to halve: assets are rolled up, officers retire, the moment passes. */
  coupSupportHalfLifeWeeks: 26,
  /** The longest any standing operation runs before it lapses, and the window every forecast reads over. */
  operationWeeks: 104,
  /** How far political action lowers the sitting government's chance of coming through its next selection. */
  politicalActionStandingPull: 0.12,
  /** How much political action multiplies the weekly chance a parliament brings the government down. */
  politicalActionConfidenceLift: 2,
  /**
   * Weekly exposure hazard: base × footprint × (0.5 + the target's
   * counter-intelligence) × (1.5 − the sponsor's). With the United States'
   * counter-intelligence, coup support in Haiti is exposed in about 27% of
   * runs over 104 weeks and in Cuba about 41%; "most failed to remain covert"
   * (Preble, 2019) over multi-year programs, a short one more often stays
   * quiet.
   */
  exposureBase: 0.006,
  footprint: { "political-action": 0.5, "coup-support": 1 } as const,
  /** The lean toward the sponsor a successor takes office with, toward the sponsor's government. */
  installedAlignment: { "political-action": 0.3, "coup-support": 0.4 } as const,
  installedTrust: { "political-action": 0.2, "coup-support": 0.3 } as const,
  /**
   * Weeks for a successor's lean to halve. O'Rourke finds installed regimes no
   * more likely to vote or trade with their sponsor over the following
   * decade; a two-year half-life leaves 6% of the lean after eight years.
   */
  installedHalfLifeWeeks: 104,
  /** A successor's lean stops being written once it has halved this many times. */
  installedHalfLives: 4,
  /** What an exposed operation leaves in the target government's memory of the sponsor. */
  exposedGrudge: 0.6,
  exposedAlignment: -0.15,
} as const;
