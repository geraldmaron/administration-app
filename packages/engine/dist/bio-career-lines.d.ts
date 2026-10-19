/**
 * Where a person was before the chair, one bank per seat.
 *
 * Every line is written rather than assembled, and split out of `bio.ts` so the
 * logic that walks these banks is readable without scrolling past four hundred
 * sentences to reach it.
 *
 * **A bank is as deep as the bench it has to dress, not a fixed twelve.** A
 * seat that is shortlisted — a cabinet chair, where the player's own bench is
 * eight deep and the composer walks the bank by shortlist position — needs
 * twelve, which is the bench plus slack for the shortlist that refills after a
 * resignation and for the same seat read again in another country. A seat held
 * one to a chair needs one line per chair: fifty governors, sixty bureau
 * chiefs, thirty-four committee chairs. Those three used to walk the same
 * twelve, so every fourth governor and every fifth bureau chief opened on a
 * sentence the player had already read on somebody else, and the anti-repetition
 * tests skipped exactly those seats rather than fail on them. They no longer
 * skip anything.
 *
 * `{nation}` is filled by `fillNation` where a line names the country.
 */
export declare const CAREER_LINES: Record<string, readonly string[]>;
export declare const MILITARY_CAREER_LINES: Record<string, ReadonlySet<string>>;
/**
 * Lines that say the person already reigns. True of a crowned head of state
 * and of nobody else: a crown prince who governs as Prime Minister under a
 * reigning King has not "taken the crown", and neither has the head of a party
 * state whose chair the simulation runs under a monarchy's charter.
 */
export declare const REIGNING_CAREER_LINES: Record<string, ReadonlySet<string>>;
/**
 * Lines that presuppose a contested vote: a campaign, a by-election, a
 * coalition built to win a chamber. A leader whose government holds no such
 * vote never lived them.
 */
export declare const CONTESTED_CAREER_LINES: Record<string, ReadonlySet<string>>;
