/**
 * The department as a president names it: "Defense", "State", "Homeland
 * Security".
 *
 * For the places a chair has to be named *on a drawing* rather than in a row.
 * "Secretary of Homeland Security" under a 36pt face is three ellipsized
 * characters or a caption four times wider than the portrait; the full title
 * still goes to the screen reader and to every roster row, and this is only the
 * form the tableau can carry.
 *
 * The institution catalog already holds exactly this string and the executor
 * bench already reads it, so nothing here invents a second vocabulary — a chair
 * named "Defense" on the desk is named "Defense" on the dispatch board.
 *
 * Undefined for a role with neither a department nor an entry above, which is
 * the honest answer: the tableau draws no caption rather than a guess made by
 * chopping words off a title.
 */
export declare function roleShortLabel(roleId: string): string | undefined;
