function living(campaign, person) {
    if (person === undefined)
        return undefined;
    return campaign.people[person]?.alive === true ? person : undefined;
}
/**
 * Who would take the oath if the office passed today: the Vice President, and
 * with no living Vice President the Speaker. Asked before the office passes,
 * which is what lets the removal that causes it name who comes next.
 */
export function nextInLine(campaign) {
    const vicePresident = living(campaign, campaign.vicePresident);
    if (vicePresident)
        return { successor: vicePresident, from: "vice-president" };
    const speaker = campaign.congress.leadership.find((figure) => figure.post === "post-house-speaker")?.person;
    const seated = living(campaign, speaker);
    return seated ? { successor: seated, from: "speaker" } : undefined;
}
/** Who succeeds this President, once the office has passed. Undefined while the President serves. */
export function successionOf(campaign) {
    if (!campaign.removal.resolved)
        return undefined;
    const next = nextInLine(campaign);
    return next ? { ...next, mechanism: "removal" } : undefined;
}
/**
 * The line a removal closes on: the successor taking the oath. Empty when
 * nobody in the line can be named, rather than a sentence about a stranger.
 */
export function successionHandover(campaign) {
    const next = nextInLine(campaign);
    if (!next)
        return "";
    const name = campaign.people[next.successor]?.base.name;
    if (!name)
        return "";
    return next.from === "vice-president"
        ? `Within the hour, Vice President ${name} takes the oath of office, and the presidency passes without a break.`
        : `With no Vice President to take it, the oath passes to the Speaker of the House, ${name}, and the presidency continues without a break.`;
}
/**
 * The Twenty-fifth Amendment's fourth section, asked by the balance harness
 * and nothing else: if the Vice President and a majority of the Cabinet
 * declared the President unable to serve today, who would act as President.
 * Nothing is written; the harness reads the answer.
 */
export function section4Succession(campaign) {
    const vicePresident = living(campaign, campaign.vicePresident);
    if (!vicePresident || campaign.removal.resolved)
        return undefined;
    return { successor: vicePresident, mechanism: "incapacity", from: "vice-president" };
}
