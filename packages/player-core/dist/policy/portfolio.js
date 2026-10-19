import { POLICY_DOMAINS, POLICY_DOMAIN_SPECS, domainAuthority, domainChair, executionQuality, plankDeliverable, programStandUpRemaining, revenueStatuteRequired, selectChairRunner, selectPolicyStance, stancesForDomain, } from "@admin/engine";
import { STATE_IDS, plankById, stateById } from "@admin/world";
import { charterOf } from "../campaign/founding-options";
import { roleTitle } from "../format/figures";
// The standing program, domain by domain: what each domain is set to, who
// carries it, what changing it would run into, and which promises ride on it.
// The stance-by-stance comparison is `stance-comparison.ts`.
/**
 * The parts of a state's economy each domain's program lands on hardest,
 * on the six axes a state is described by. Presentation only: the map colors
 * a state by how much of its living sits in these, so the President sees where
 * a program would be felt before choosing one.
 */
export const POLICY_DOMAIN_AXES = {
    fiscal: ["services"],
    industry: ["industrial", "energy"],
    trade: ["industrial", "agricultural"],
    civil: ["services"],
    security: ["tech"],
    defense: ["defense"],
};
const AXIS_WORDS = {
    industrial: "industry",
    agricultural: "farming",
    energy: "energy",
    tech: "technology",
    services: "services",
    defense: "defense work",
};
/** The glyph each domain is drawn with. */
export const POLICY_DOMAIN_ICONS = {
    fiscal: "departmentTreasury",
    industry: "departmentEnergy",
    trade: "subjectTrade",
    civil: "departmentJustice",
    security: "departmentHomelandSecurity",
    defense: "departmentDefense",
};
export function isPolicyDomain(value) {
    return value !== undefined && POLICY_DOMAINS.includes(value);
}
/** What the map's share lens for a domain is a share of, in words. */
export function domainShareWords(domain) {
    const words = POLICY_DOMAIN_AXES[domain].map((axis) => AXIS_WORDS[axis]);
    return words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}
/** Each state's share of its economy in the domain's axes, 0..1, from the dataset. */
export function stateIndustryShares(domain) {
    const axes = POLICY_DOMAIN_AXES[domain];
    return new Map(STATE_IDS.flatMap((id) => {
        const economy = stateById.get(id)?.character.economy;
        return economy ? [[id, axes.reduce((sum, axis) => sum + economy[axis], 0)]] : [];
    }));
}
/** Every open pledge whose deliverable is a program in this domain. */
export function pledgesOnDomain(campaign, domain) {
    return (campaign.pledges ?? []).flatMap((pledge) => {
        if (pledge.status !== "open")
            return [];
        const deliverable = plankDeliverable(pledge.plank);
        if (!deliverable || deliverable.kind === "sign-order" || deliverable.domain !== domain)
            return [];
        return [
            {
                id: pledge.id,
                title: plankById.get(pledge.plank)?.title ?? pledge.plank,
                dueDate: pledge.dueDate,
                stance: deliverable.stance,
                kind: deliverable.kind === "hold-program" ? "hold" : "adopt",
            },
        ];
    });
}
function portfolioDomain(campaign, domain) {
    const spec = POLICY_DOMAIN_SPECS[domain];
    const stance = selectPolicyStance(campaign, domain);
    const chair = domainChair(campaign, domain);
    const holder = chair ? selectChairRunner(campaign, chair) : undefined;
    const others = stancesForDomain(domain).filter((entry) => entry.id !== stance.id);
    return {
        domain,
        name: spec.name,
        question: spec.question,
        icon: POLICY_DOMAIN_ICONS[domain],
        stance: { id: stance.id, name: stance.name, summary: stance.summary, inherited: stance.inherited === true },
        alternatives: others.length,
        ...(chair ? { chair: roleTitle(chair, charterOf(campaign).roleTitles) } : {}),
        ...(holder?.alive ? { minister: holder.base.name, ministerId: holder.base.id } : {}),
        quality: executionQuality(campaign, domain),
        authority: domainAuthority(domain),
        standUpWeeks: programStandUpRemaining(campaign, domain, stance),
        byStatute: others.some((entry) => revenueStatuteRequired(campaign, domain, entry.id) !== undefined),
        pledges: pledgesOnDomain(campaign, domain),
        shareWords: domainShareWords(domain),
    };
}
/** The six domains of the standing program, in the engine's order. */
export function policyPortfolio(campaign) {
    return POLICY_DOMAINS.map((domain) => portfolioDomain(campaign, domain));
}
