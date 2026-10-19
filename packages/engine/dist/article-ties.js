import { worldDataset } from "@admin/world";
import { selectRelationship } from "./state.js";
/** At or above this a relationship's military threat reads as a threat the country is planning against. */
export const THREAT_TIE = 0.5;
function treatyAlly(treaties) {
    return treaties.some((id) => worldDataset.organizations.find((org) => org.id === id.replace(/^compact:/, ""))?.kind === "defense");
}
/** Whether the two governments are bound by a defense compact. */
export function treatyAllyOf(campaign, from, to) {
    const relationship = selectRelationship(campaign, from, to);
    return relationship !== undefined && treatyAlly(relationship.treaties);
}
/** The reader's ties to each foreign party named in the item, for those it has any with. */
export function articleTies(campaign, item) {
    const home = campaign.founding.nation;
    const parties = [...new Set([item.actor, item.target])].filter((id) => id !== undefined && id !== home);
    return parties.flatMap((id) => {
        const relationship = selectRelationship(campaign, home, id);
        const name = campaign.nations[id]?.base.identity.name;
        if (!relationship || !name)
            return [];
        const tie = { name, treatyAlly: treatyAlly(relationship.treaties), threat: relationship.militaryThreat >= THREAT_TIE };
        return tie.treatyAlly || tie.threat ? [tie] : [];
    });
}
