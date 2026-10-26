import { fnv1a, mulberry32 } from "@admin/world";
import { partyReading } from "./party-beliefs.js";
import { stateAffinity } from "./domestic-signature.js";
import { compareDates } from "./clock.js";
import { rapportOf } from "./ties.js";
import { breakSenateTie } from "./senate-tie.js";
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/** A member's stable reservation point; no new vote-time draws or aggregate allocation. */
function reservation(person) {
    return mulberry32(fnv1a(person))();
}
export function memberVote(congress, states, people, question, shares) {
    if (!congress.members || Object.keys(people).length === 0)
        return undefined;
    const members = congress.members.filter((member) => member.chamber === question.chamber);
    // Hypothetical composition projections retain the aggregate counter unless they reseat identities too.
    const composition = congress.chambers[question.chamber];
    if (members.length !== composition.seats || members.filter((member) => member.party === congress.caucusAnchor).length !== composition.administration || members.filter((member) => member.party === "independent").length !== composition.independent)
        return undefined;
    const byCaucus = {
        administration: { seats: 0, yeas: 0 }, opposition: { seats: 0, yeas: 0 }, independent: { seats: 0, yeas: 0 },
    };
    const rollCall = members.map((member) => {
        const runtime = people[member.person];
        if (!runtime)
            throw new Error(`Missing congressional member ${member.person}.`);
        const caucus = member.party === congress.caucusAnchor ? "administration" : member.party === "independent" ? "independent" : "opposition";
        const signature = question.signature;
        const conviction = signature ? 0.18 * partyReading(runtime.base.ideology, signature) : 0;
        const state = states?.[member.state];
        const constituency = signature && state ? 0.12 * Math.max(-1, Math.min(1, stateAffinity(state.base.character, state.lean, signature))) : 0;
        const direction = question.counted === "against" ? -1 : 1;
        const rapport = 0.22 * (rapportOf(people, member.person) - 0.5) * direction;
        const party = question.stance === "neutral" ? 0 : 0.08 * (runtime.base.loyalty - 0.5) * (question.stance === caucus ? 1 : -1);
        const localStanding = 0.14 * ((state?.delegation?.disposition ?? congress.disposition) - congress.disposition) * direction;
        const pressure = (runtime.issuePressure ?? []).filter((entry) => entry.actId === question.actId && question.asOf && compareDates(entry.through, question.asOf) >= 0).reduce((sum, entry) => sum + entry.delta, 0);
        const issue = Math.max(-0.12, Math.min(0.12, pressure));
        const support = clamp01(shares[caucus] + (question.merit ?? 0) + conviction + constituency + rapport + party + localStanding + issue);
        const yea = member.vacancy === undefined && runtime.alive && support >= reservation(member.person);
        byCaucus[caucus].seats += 1;
        byCaucus[caucus].yeas += Number(yea);
        const reasons = [
            `${member.party === "democrat" ? "Democratic" : member.party === "republican" ? "Republican" : "Independent"} caucus position`,
            ...(issue !== 0 ? ["Recorded issue-specific outreach"] : []),
            ...(Math.abs(conviction) > 0.015 ? [conviction > 0 ? "Policy convictions favor the measure" : "Policy convictions oppose the measure"] : []),
            ...(Math.abs(constituency) > 0.015 ? [constituency > 0 ? "Home-state interests favor the measure" : "Home-state interests oppose the measure"] : []),
            ...(Math.abs(localStanding) > 0.015 ? [localStanding > 0 ? "Local political standing supports this vote" : "Local political pressure pulls against this vote"] : []),
            ...(Math.abs(rapport) > 0.015 ? [rapport > 0 ? "Personal confidence in the administration supports this vote" : "Strained relations with the administration pull against this vote"] : []),
        ];
        return { person: member.person, seat: member.seat, state: member.state, party: member.party, yea, support, reasons };
    });
    const yeas = rollCall.filter((vote) => vote.yea).length;
    // An empty seat casts no vote either way; the nays are the seated members who did not vote yea.
    const voting = members.filter((member) => member.vacancy === undefined).length;
    return { ...breakSenateTie(congress, {
            chamber: question.chamber, yeas, nays: voting - yeas, required: question.required, passed: yeas >= question.required,
        }, question.counted ?? "with"), byCaucus, rollCall };
}
