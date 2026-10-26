import { organizations } from "@admin/world";
import { sharedBodies } from "./compacts.js";
import { disposition } from "./relationships.js";
import { selectNation, selectRelationship } from "./state.js";
const SUBSTANTIVE = new Set(["recommendation", "sanctions", "authorize-force"]);
/** How much more a government must prefer the sponsor to the target before it votes yes, by how far the measure reaches. Planning values. */
const YES_MARGIN = { procedural: 0, recommendation: 0.04, sanctions: 0.12, "authorize-force": 0.25 };
/** How far a government must prefer the target to the sponsor before it votes no rather than abstains. */
const NO_MARGIN = 0.1;
/** What a treaty partner's standing counts for a government that shares a defense body or a treaty with the sponsor. */
const PARTNER_BONUS = 0.25;
/** What a member's feeling toward the sponsor counts against its feeling toward the target: a draft is about the target first. */
const SPONSOR_WEIGHT = 0.5;
const EFFECTS = {
    procedural: { standing: "agenda", bindsMembers: false, authorizesForce: false, usDomesticAuthority: "none", militaryOutcome: "none" },
    recommendation: { standing: "recommendation", bindsMembers: false, authorizesForce: false, usDomesticAuthority: "none", militaryOutcome: "none" },
    sanctions: { standing: "binding-measures", bindsMembers: true, authorizesForce: false, usDomesticAuthority: "none", militaryOutcome: "none" },
    "authorize-force": { standing: "authorization-of-force", bindsMembers: false, authorizesForce: true, usDomesticAuthority: "none", militaryOutcome: "none" },
};
export function councilEffects(measure) {
    return EFFECTS[measure];
}
export function isSubstantive(measure) {
    return SUBSTANTIVE.has(measure);
}
/** The Council as the registry holds it, or undefined where a dataset ships none. */
export function securityCouncil() {
    return organizations.find((org) => org.council !== undefined);
}
/** Art. 27 on a set of positions: the count, the veto and whether the draft is adopted. */
export function tallyCouncil(rule, measure, positions) {
    const votes = Object.values(positions);
    const count = (position) => votes.filter((p) => p === position).length;
    const substantive = isSubstantive(measure);
    const vetoedBy = substantive
        ? rule.permanent.filter((seat) => positions[seat] === "against").sort()
        : [];
    const yes = count("for");
    const enough = yes >= rule.threshold;
    const reason = !enough ? "short-of-votes" : vetoedBy.length > 0 ? "vetoed" : "adopted";
    return { for: yes, against: count("against"), abstain: count("abstain"), adopted: reason === "adopted", reason, vetoedBy };
}
function lean(campaign, from, to) {
    const relationship = selectRelationship(campaign, from, to);
    return relationship ? disposition(relationship, campaign) : 0;
}
function protects(campaign, member, target) {
    const mine = selectNation(campaign, member)?.base.memberships ?? [];
    const theirs = selectNation(campaign, target)?.base.memberships ?? [];
    const treaty = (selectRelationship(campaign, member, target)?.treaties.length ?? 0) > 0;
    return treaty || sharedBodies(mine, theirs).some((body) => body.kind === "defense");
}
/** How one member votes: its own cause first, then a treaty partner's, then which of the two it would rather see prevail. */
export function councilPosition(campaign, member, proposal) {
    const { sponsor, target, measure } = proposal;
    const parties = proposal.parties ?? (target ? [target] : []);
    // Art. 27(3) binds a sponsoring party too, so abstention outranks the sponsor's own yes.
    if (measure === "recommendation" && parties.includes(member))
        return "abstain";
    if (member === sponsor)
        return "for";
    if (target && measure !== "procedural" && member === target)
        return "against";
    if (target && measure !== "procedural" && protects(campaign, member, target) && !protects(campaign, member, sponsor))
        return "against";
    const partner = protects(campaign, member, sponsor) ? PARTNER_BONUS : 0;
    const stance = partner + SPONSOR_WEIGHT * lean(campaign, member, sponsor) - (target ? lean(campaign, member, target) : 0);
    if (stance >= YES_MARGIN[measure])
        return "for";
    return stance <= -NO_MARGIN ? "against" : "abstain";
}
/** The vote on a draft resolution, member by member in id order, with what an adopted one does. */
export function councilVote(campaign, proposal) {
    const body = securityCouncil();
    if (!body?.council)
        return undefined;
    const positions = {};
    for (const member of [...body.members].sort())
        positions[member] = councilPosition(campaign, member, proposal);
    const tally = tallyCouncil(body.council, proposal.measure, positions);
    return { ...tally, measure: proposal.measure, positions, effects: tally.adopted ? councilEffects(proposal.measure) : undefined };
}
