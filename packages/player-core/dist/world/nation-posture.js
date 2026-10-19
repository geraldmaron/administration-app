import { hasIntelOnNation } from "@admin/engine";
import { temperamentReadings } from "../reasons/temperament-words";
import { figureProvenance } from "./figure-provenance";
const POSTURE = {
    defensive: { word: "Defends what it has", stance: "favorable", level: 1 },
    balanced: { word: "Balanced", stance: "neutral", level: 2 },
    assertive: { word: "Assertive", stance: "caution", level: 3 },
    expansionist: { word: "Wants to expand", stance: "adverse", level: 4 },
};
/** The one sentence of the file's provenance that says where the temperament comes from. */
function temperamentSource(nation, fidelity) {
    if ((fidelity ?? "full") === "full")
        return undefined;
    const text = figureProvenance(nation, fidelity);
    return text?.match(/[^.]+\./g)?.map((sentence) => sentence.trim()).find((sentence) => /temperament/.test(sentence));
}
/** A foreign government's posture, aims and temperament; undefined for the player's own or an unknown id. */
export function nationPosture(campaign, nation) {
    const runtime = campaign.nations[nation];
    if (!runtime || nation === campaign.founding.nation)
        return undefined;
    const unread = !hasIntelOnNation(campaign, nation);
    const aims = unread
        ? []
        : [...runtime.traits.agendas]
            .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
            .map((agenda) => agenda.description);
    const source = unread ? undefined : temperamentSource(nation, runtime.base.fidelity);
    return {
        posture: POSTURE[runtime.base.doctrine.posture],
        unread,
        aims,
        temperament: temperamentReadings(nation, campaign),
        ...(source ? { temperamentSource: source } : {}),
    };
}
