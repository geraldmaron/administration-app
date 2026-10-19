import { STATE_IDS } from "@admin/world";
import { selectGovernor, selectPerson } from "@admin/engine";
export function governorRows(campaign) {
    return STATE_IDS.filter((id) => id !== "DC")
        .flatMap((id) => {
        const runtime = campaign.states[id];
        if (!runtime)
            return [];
        const standing = selectGovernor(campaign, id);
        const person = standing ? selectPerson(campaign, standing.person) : undefined;
        return [
            {
                state: id,
                stateName: runtime.base.name,
                region: runtime.base.region,
                electoralVotes: runtime.base.electoralVotes,
                ...(person ? { person: person.base } : {}),
                ...(standing ? { party: standing.party, disposition: standing.disposition } : {}),
            },
        ];
    })
        .sort((a, b) => a.stateName.localeCompare(b.stateName));
}
