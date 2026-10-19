import { issueFuelWaiver, leanOnTheFed, projectFedLean, projectFuelWaiver, projectReserveRelease, releaseStrategicReserve, } from "@admin/engine";
import { formatDate } from "../format/figures";
const LABELS = {
    "fed-ease": "Press the Fed to cut",
    "fed-tighten": "Press the Fed to hold rates steady",
    reserve: "Release the Strategic Petroleum Reserve",
    "fuel-waiver": "Issue an emergency fuel waiver",
};
function fedLever(campaign, key, direction) {
    const projection = projectFedLean(campaign, direction);
    if (!projection.ok)
        return { key, label: LABELS[key], kind: "refused", refusal: projection.reason };
    return {
        key,
        label: LABELS[key],
        kind: "available",
        cost: projection.cost,
        risks: projection.risks,
        effect: `Nudges the Fed to care a little more about ${direction === "ease" ? "jobs" : "prices"} at its ${formatDate(projection.meeting)} meeting (by at most 0.05). The size of the nudge is the game's estimate, not a real-world figure.`,
    };
}
/** Every market lever the President holds, priced or refused. */
export function marketLevers(campaign) {
    const reserve = projectReserveRelease(campaign);
    const waiver = projectFuelWaiver(campaign);
    return [
        fedLever(campaign, "fed-ease", "ease"),
        fedLever(campaign, "fed-tighten", "tighten"),
        reserve.ok
            ? { key: "reserve", label: LABELS.reserve, kind: "available", cost: reserve.cost, risks: reserve.risks, effect: `Adds oil to the world market until ${formatDate(reserve.until)}.` }
            : { key: "reserve", label: LABELS.reserve, kind: "refused", refusal: reserve.reason },
        waiver.ok
            ? { key: "fuel-waiver", label: LABELS["fuel-waiver"], kind: "available", cost: waiver.cost, risks: waiver.risks, effect: `Takes a few cents off a gallon of gas until ${formatDate(waiver.until)}.` }
            : { key: "fuel-waiver", label: LABELS["fuel-waiver"], kind: "refused", refusal: waiver.reason },
    ];
}
/** The act a lever commits, through the ordinary commit path. */
export function marketLeverAct(campaign, key) {
    if (key === "fed-ease")
        return leanOnTheFed(campaign, "ease");
    if (key === "fed-tighten")
        return leanOnTheFed(campaign, "tighten");
    if (key === "reserve")
        return releaseStrategicReserve(campaign);
    return issueFuelWaiver(campaign);
}
