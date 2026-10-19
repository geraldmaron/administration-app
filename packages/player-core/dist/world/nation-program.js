import { GOVERNANCE_REVIEW_INTERVAL, POLICY_DOMAIN_SPECS, POLICY_DOMAINS, reviewsProgramThisTurn, selectFeed, selectGovernmentStance, } from "@admin/engine";
function weeksAgo(now, turn) {
    const weeks = Math.max(0, now - turn);
    return weeks === 0 ? "This week" : weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}
function weeksToReview(nation, turn) {
    for (let ahead = 0; ahead < GOVERNANCE_REVIEW_INTERVAL; ahead += 1) {
        if (reviewsProgramThisTurn(nation, turn + ahead))
            return ahead;
    }
    return GOVERNANCE_REVIEW_INTERVAL;
}
/** The program row on a foreign country's file; undefined for the player's own government or an unknown id. */
export function nationProgram(campaign, nation) {
    if (nation === campaign.founding.nation || campaign.nations[nation] === undefined)
        return undefined;
    const rows = POLICY_DOMAINS.map((domain) => {
        const stance = selectGovernmentStance(campaign, nation, domain);
        return { domain, domainName: POLICY_DOMAIN_SPECS[domain].name, stanceName: stance.name, summary: stance.summary };
    });
    const change = [...selectFeed(campaign)]
        .filter((item) => item.kind === "governance" && item.actor === nation)
        .sort((a, b) => b.turn - a.turn)[0];
    return {
        rows,
        ...(change ? { lastChange: { turn: change.turn, headline: change.headline, when: weeksAgo(campaign.turn, change.turn) } } : {}),
        reviewInWeeks: weeksToReview(nation, campaign.turn),
    };
}
