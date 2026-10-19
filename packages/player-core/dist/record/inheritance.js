import { inheritedRowCount } from "@admin/engine";
// Money is left out: the inherited walk moves the treasury by a fraction of
// itself each week, so a signed-points reading of it is a different quantity
// wearing the same row as the four bounded readings.
const RATIO_METRICS = ["approval", "stability", "militaryReadiness", "standing"];
/**
 * The predecessor's quarter as far as it is still held in `metricHistory`.
 *
 * Undefined once every inherited row has scrolled out of the window — there is
 * nothing left to reconstruct it from, and reporting a quarter this campaign
 * can no longer see would be inventing a second stamp for it.
 */
export function inheritedQuarter(campaign) {
    const weeks = inheritedRowCount(campaign);
    if (weeks === 0)
        return undefined;
    const history = campaign.player.metricHistory;
    const first = history[0];
    const last = history[weeks - 1];
    if (!first || !last)
        return undefined;
    const moves = RATIO_METRICS.map((metric) => ({ metric, from: first[metric], to: last[metric] }));
    return { modeled: true, weeks, moves };
}
/**
 * Whether one row of the campaign's metric history is the predecessor's. The
 * one predicate every surface drawing that history reads, dated against the
 * oath rather than counted by index, because the oldest rows scroll out.
 */
export function isInheritedRow(campaign, index) {
    if (index < 0 || index >= campaign.player.metricHistory.length)
        return false;
    return index < inheritedRowCount(campaign);
}
