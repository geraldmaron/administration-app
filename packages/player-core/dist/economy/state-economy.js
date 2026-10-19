import { selectNation } from "@admin/engine";
import { STATE_IDS } from "@admin/world";
const clamp01 = (value) => Math.min(1, Math.max(0, value));
/** Every state's economy this week, in `STATE_IDS` order. Empty for a campaign that governs no nation. */
export function stateEconomyBoard(campaign) {
    const nation = selectNation(campaign, campaign.founding.nation);
    if (!nation)
        return { nationalUnemployment: 0, rows: [] };
    const national = nation.stats.economy.unemployment;
    const states = STATE_IDS.flatMap((id) => {
        const runtime = campaign.states[id];
        return runtime ? [{ id, runtime }] : [];
    });
    const authoredTotal = states.reduce((sum, { runtime }) => sum + runtime.base.grp, 0);
    const rows = states.map(({ id, runtime }) => {
        const anchor = runtime.base.character.vitalAnchor;
        const unemployment = clamp01(national + anchor.unemployment);
        const outputShare = authoredTotal > 0 ? runtime.base.grp / authoredTotal : 0;
        return {
            state: id,
            name: runtime.base.name,
            unemployment,
            jobsGap: unemployment - national,
            pricesGap: anchor.costOfLiving,
            output: outputShare * nation.stats.economy.gdp,
            outputShare,
            federalDependence: runtime.base.character.federalDependence,
        };
    });
    return { nationalUnemployment: national, rows };
}
