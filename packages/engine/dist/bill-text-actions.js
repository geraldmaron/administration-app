import { amendableAct } from "./legislative-acts.js";
/** The President may offer an authored narrower text while markup remains open. */
export function proposeBillText(campaign, id) {
    const bill = campaign.bills[id];
    if (!bill || !amendableAct(bill.act))
        return { ok: false, reason: "No authored alternative text exists for this bill." };
    if (bill.status !== "in-progress" || bill.stage !== "markup")
        return { ok: false, reason: "The bill is not in markup." };
    if (bill.text?.proposed)
        return { ok: false, reason: "An amendment has already been proposed." };
    return {
        ok: true,
        packet: { source: "action", actor: "player", turn: campaign.turn,
            narration: { summary: `The President proposes the narrower text for ${bill.title}. Congress will vote on it.` },
            effects: [{ kind: "bill", set: { ...bill, text: { ...bill.text, proposed: "targeted" } } }],
        },
    };
}
/** Conference recommends one of the two passed texts; both chambers still vote again. */
export function recommendBillConferenceText(campaign, id, choice) {
    const bill = campaign.bills[id];
    if (!bill || !amendableAct(bill.act))
        return { ok: false, reason: "No authored alternative text exists for this bill." };
    if (bill.status !== "in-progress" || bill.stage !== "conference" || !bill.text?.initialPassage) {
        return { ok: false, reason: "The bill is not in conference." };
    }
    if (bill.text.conference)
        return { ok: false, reason: "Conference already has a recommended text." };
    if (choice !== bill.text.house && choice !== bill.text.senate)
        return { ok: false, reason: "That text did not pass either chamber." };
    return {
        ok: true,
        packet: { source: "action", actor: "player", turn: campaign.turn,
            narration: { summary: `The President recommends the ${choice === "base" ? "original" : "targeted"} text for ${bill.title} in conference. Both chambers must vote again.` },
            effects: [{ kind: "bill", set: { ...bill, text: { ...bill.text, conference: choice } } }],
        },
    };
}
export function proposeHousingText(campaign, id) {
    if (campaign.bills[id]?.act !== "act-housing-supply")
        return { ok: false, reason: "This is not the housing bill." };
    return proposeBillText(campaign, id);
}
export function recommendHousingConferenceText(campaign, id, choice) {
    if (campaign.bills[id]?.act !== "act-housing-supply")
        return { ok: false, reason: "This is not the housing bill." };
    return recommendBillConferenceText(campaign, id, choice);
}
