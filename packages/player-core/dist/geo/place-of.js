import { isStanding, } from "@admin/engine";
import { placeAt, STATE_IDS } from "@admin/world";
/** Every kind `placeOf` answers for; `verify-incident-places` holds it to the engine's records. */
export const PINNABLE_KINDS = ["claim", "condition", "emergency", "mark", "order"];
/** City, then the state's largest city or its capitol, then the nation. */
export function placeOf(item) {
    switch (item.kind) {
        case "condition":
            return placeAt({
                nation: item.record.nation,
                ...(item.record.state ? { state: item.record.state } : {}),
                ...(item.record.city ? { city: item.record.city } : {}),
            });
        case "emergency":
            return placeAt({
                nation: item.nation,
                ...(item.record.scope.kind === "state" ? { state: item.record.scope.state } : {}),
            });
        case "mark":
        case "claim":
            return placeAt({ nation: item.nation, state: item.state });
        case "order":
            if (item.record.subject?.kind === "state")
                return placeAt({ nation: item.nation, state: item.record.subject.state });
            if (item.record.subject?.kind === "foreign")
                return placeAt({ nation: item.record.subject.nation });
            return undefined;
    }
}
/**
 * Every live pinnable record in a campaign, in a declared order: conditions and
 * emergencies by id, located orders by id, then each state's marks and claims in `STATE_IDS` order.
 * Resolved conditions and ended emergencies are history, not pins.
 */
export function pinnableItems(campaign) {
    const home = campaign.founding.nation;
    const conditions = Object.keys(campaign.conditions)
        .sort()
        .map((id) => campaign.conditions[id])
        .filter((record) => record.status === "active")
        .map((record) => ({ kind: "condition", record }));
    const emergencies = Object.keys(campaign.emergencies)
        .sort()
        .map((id) => campaign.emergencies[id])
        .filter(isStanding)
        .map((record) => ({ kind: "emergency", nation: home, record }));
    const orders = [...campaign.orders]
        .filter((record) => record.subject?.kind === "state" || record.subject?.kind === "foreign")
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((record) => ({ kind: "order", nation: home, record }));
    const held = STATE_IDS.flatMap((state) => {
        const runtime = campaign.states[state];
        if (!runtime)
            return [];
        return [
            ...runtime.marks.map((record) => ({ kind: "mark", nation: home, state, record })),
            ...runtime.claims.map((record) => ({ kind: "claim", nation: home, state, record })),
        ];
    });
    return [...conditions, ...emergencies, ...orders, ...held];
}
