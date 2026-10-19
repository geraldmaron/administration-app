import { selectCabinet } from "./state.js";
import { knownPersonContacts } from "./person-network-influence.js";
import { usPartyOfPerson } from "./cast-fit.js";
import { createRngStreams } from "./rng.js";
import { noiseFrom, stampOf, weigh, willDraw } from "./willingness.js";
/** Office access is a fact, not personal ambition or an inferred biography edge. */
export function cabinetAccess(campaign, source) {
    if (!campaign.people[source]?.alive)
        return 0;
    if (Object.values(selectCabinet(campaign)).includes(source))
        return 1;
    return campaign.ledger.some((record) => record.counsel?.room?.some((entry) => entry.person === source)) ? 0.5 : 0;
}
/** A past accepted conversation permits an approach, never automatic allegiance. */
export function cabinetBreakContacts(campaign, source) {
    const actor = campaign.people[source]?.base;
    if (!actor || !campaign.people[source]?.alive)
        return [];
    const targets = [...new Set(knownPersonContacts(campaign).filter((edge) => edge.from === source).map((edge) => edge.to))];
    return targets.filter((target) => target !== source && campaign.people[target]?.alive).map((target) => {
        const person = campaign.people[target].base;
        const ownParty = usPartyOfPerson(actor), theirParty = usPartyOfPerson(person);
        const decision = weigh("cabinet-break-cooperation", [
            { key: "loyalty", source: "trait", value: 0.6 * (1 - person.loyalty) },
            { key: "ambition", source: "trait", value: 0.15 * person.ambition },
            { key: "integrity", source: "trait", value: -0.1 * person.integrity + 0 },
            { key: "co-partisanship", source: "situation", value: ownParty && theirParty ? (ownParty === theirParty ? 0.1 : -0.2) : 0 },
            { key: "bond", source: "obligation", value: 0.1 },
        ], { threshold: 0.55, noiseBound: 0.05, noise: noiseFrom(willDraw(createRngStreams(campaign.seed), "cabinet-break-cooperation", target, source), 0.05) });
        return { person: target, decision: stampOf(decision, target, source, "intelligence") };
    });
}
/** Four willing direct contacts exhaust the former maximum consequence budget. */
export function cabinetBreakSpread(contacts) {
    return Math.min(4, contacts.filter((contact) => contact.decision.acts).length) / 4;
}
