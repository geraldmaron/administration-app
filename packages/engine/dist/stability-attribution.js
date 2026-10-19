export const ATTRIBUTED_METRICS = ["stability", "treasury"];
/** The stretch before the tick where the President acts. */
export const DECISIONS = "decisions";
/** The stretch before the tick where the day resolvers run. Not a phase, so no phase observer sees it. */
export const DAY_RESOLVERS = "dayResolvers";
export function openMetricAttribution() {
    return { stability: {}, treasury: {} };
}
function book(movements, id, delta) {
    if (delta === 0)
        return movements;
    const held = movements[id] ?? { fell: 0, rose: 0 };
    const next = delta < 0 ? { ...held, fell: held.fell - delta } : { ...held, rose: held.rose + delta };
    return { ...movements, [id]: next };
}
/**
 * One harness week: `start` before the President acted, `decided` after, then
 * each stretch the harness observed from the state it began on to the next
 * one's, the last running to `end`.
 */
export function attributeMetricWeek(ledger, start, decided, stretches, end) {
    const week = [
        { id: DECISIONS, from: start, to: decided },
        ...stretches.map((stretch, index) => ({ id: stretch.id, from: stretch.state, to: stretches[index + 1]?.state ?? end })),
    ];
    return week.reduce((acc, stretch) => ({
        stability: book(acc.stability, stretch.id, stretch.to.player.metrics.stability - stretch.from.player.metrics.stability),
        treasury: book(acc.treasury, stretch.id, stretch.to.player.metrics.treasury - stretch.from.player.metrics.treasury),
    }), ledger);
}
/** Each stretch's share of a metric's gross falls and rises, the stretch that moved it furthest first. Shares of zero movement read zero. */
export function metricShares(attributions, metric) {
    const totals = new Map();
    for (const attribution of attributions) {
        for (const [id, moved] of Object.entries(attribution[metric])) {
            const held = totals.get(id) ?? { fell: 0, rose: 0 };
            totals.set(id, { fell: held.fell + moved.fell, rose: held.rose + moved.rose });
        }
    }
    const fell = [...totals.values()].reduce((sum, moved) => sum + moved.fell, 0);
    const rose = [...totals.values()].reduce((sum, moved) => sum + moved.rose, 0);
    const share = (value, total) => (total > 0 ? Math.round((value / total) * 1000) / 1000 : 0);
    return [...totals]
        .sort(([a, x], [b, y]) => y.fell + y.rose - (x.fell + x.rose) || a.localeCompare(b))
        .map(([id, moved]) => ({ id, fell: share(moved.fell, fell), rose: share(moved.rose, rose) }));
}
