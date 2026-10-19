import { actOf } from "./legislative-acts.js";
import { ACT_ADVOCATE } from "./lobbying-advocate.js";
import { selectChairRunner } from "./appointments.js";
import { selectHill } from "./hill.js";
import { partyReading } from "./party-beliefs.js";
import { stateAffinity } from "./domestic-signature.js";
import { rapportOf } from "./ties.js";
import { noiseFrom, weigh, willDraw } from "./willingness.js";
import { createRngStreams } from "./rng.js";
/** Actual recorded dialogue, distinct from the dossier's inferred biography contacts. */
export function knownPersonContacts(campaign, actId) {
    const latest = new Map();
    for (const record of campaign.congress.lobbying)
        for (const edge of record.cooperation ?? []) {
            if (actId && edge.actId !== actId)
                continue;
            latest.set(`${edge.from}:${edge.to}:${edge.actId}`, edge);
        }
    return [...latest.values()].filter((edge) => edge.accepted).sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
}
/** Formal issue reach caps an effort; it does not create contacts or obedience. */
export function issueReach(campaign, person, bill) {
    const runtime = campaign.people[person];
    if (!runtime?.alive)
        return 0;
    const act = actOf(bill);
    const advocate = act?.committee ? ACT_ADVOCATE[act.committee] : undefined;
    if (advocate && selectChairRunner(campaign, advocate)?.base.id === person)
        return 8;
    const hill = selectHill(campaign).find((member) => member.figure.person === person);
    if (hill?.post.role === "role-congressional-leader")
        return 8;
    if (act?.committee && campaign.congress.committees[act.committee]?.chair === person)
        return 6;
    if (campaign.congress.members?.some((member) => member.person === person))
        return 2;
    return knownPersonContacts(campaign, act?.id).some((edge) => edge.from === person) ? 1 : 0;
}
/** Public eligibility only. Private willingness is considered when the request arrives. */
export function availableIssueBrokers(campaign, bill) {
    const act = actOf(bill);
    const role = act?.committee ? ACT_ADVOCATE[act.committee] : undefined;
    const advocate = role ? selectChairRunner(campaign, role)?.base.id : undefined;
    return [...new Set([...knownPersonContacts(campaign, act?.id).map((edge) => edge.from).filter((id) => campaign.people[id]?.alive), ...(advocate ? [advocate] : []), ...selectHill(campaign).filter((member) => member.post.role === "role-congressional-leader" || campaign.congress.committees[act?.committee ?? ""]?.chair === member.figure.person).map((member) => member.figure.person)])];
}
/** A recipient retains personal convictions and constituency interests. */
export function issuePreference(campaign, person, bill) {
    const runtime = campaign.people[person];
    const signature = actOf(bill)?.domestic;
    if (!runtime || !signature)
        return 0;
    const member = campaign.congress.members?.find((entry) => entry.person === person);
    const state = member ? campaign.states[member.state] : undefined;
    const local = state ? Math.max(-1, Math.min(1, stateAffinity(state.base.character, state.lean, signature))) : 0;
    return Math.max(-1, Math.min(1, 0.75 * partyReading(runtime.base.ideology, signature) + 0.25 * local));
}
export function issueCooperationDecision(campaign, person, bill, direction, action, bond) {
    const runtime = campaign.people[person];
    if (!runtime?.alive)
        return undefined;
    const fit = issuePreference(campaign, person, bill) * direction;
    // Strong principled opposition cannot be bought with a friendly introduction.
    const principledRefusal = fit < -0.3 && runtime.base.integrity > 0.6;
    const decision = weigh("issue-cooperation", [
        { key: "policy-fit", source: "interest", value: 0.65 * fit },
        { key: "bond", source: "obligation", value: 0.12 * bond },
        { key: "rapport", source: "situation", value: 0.12 * (rapportOf(campaign.people, person) - 0.5) },
        { key: "ambition", source: "trait", value: 0.08 * runtime.base.ambition * Math.max(0, fit) },
    ], { threshold: principledRefusal ? 1 : -0.08, noiseBound: 0.05, noise: noiseFrom(willDraw(createRngStreams(campaign.seed), "issue-cooperation", action, person), 0.05) });
    return decision;
}
export function answersIssue(campaign, person, bill, direction, action, bond) {
    return issueCooperationDecision(campaign, person, bill, direction, action, bond)?.acts ?? false;
}
/** Directed breadth-first traversal: one actor once, two hops, office budget, and an independent answer at every step. */
export function propagateIssue(campaign, source, bill, action, direction, exclude = []) {
    const reach = issueReach(campaign, source, bill);
    const links = knownPersonContacts(campaign, actOf(bill)?.id);
    const visited = new Set([source, ...exclude]);
    const queue = [{ person: source, depth: 0 }];
    const responses = [];
    while (queue.length && responses.length < reach) {
        const current = queue.shift();
        if (current.depth >= 2)
            continue;
        for (const edge of links.filter((link) => link.from === current.person)) {
            if (visited.has(edge.to) || responses.length >= reach)
                continue;
            visited.add(edge.to);
            const accepted = answersIssue(campaign, edge.to, bill, direction, action, 1);
            const depth = current.depth + 1;
            responses.push({ ...edge, date: campaign.calendar, accepted, depth, delta: accepted ? direction * 0.06 / depth : 0,
                account: accepted ? "Accepted an issue-specific conversation; no vote was promised." : "Declined the issue-specific argument." });
            if (accepted)
                queue.push({ person: edge.to, depth });
        }
    }
    return responses;
}
