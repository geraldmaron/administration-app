import { selectRelationship } from "./state.js";
import { liveMemberships } from "./instrument-gates.js";
import { noiseFrom, weigh, willDraw } from "./willingness.js";
import { eventLineIndex, templateOf, worldEventKind } from "./world-event-templates.js";
// How a world event is decided and filed, shared by every family: one weighed
// decision per party with its one draw, the wire item from the template's
// bank, the packet with the deciding stamp on its provenance, and the marker
// on the acting edge that is both the record and the cooldown.
/** Inside this margin the draw decides a member's or a government's vote. */
export const EVENT_NOISE = 0.1;
/** One weighed decision on a standing template, with its one draw. Keyed by the parties and never the week. */
function decide(streams, question, terms, threshold, subject) {
    const draw = willDraw(streams, question, ...subject);
    return weigh(question, terms, { threshold, noiseBound: EVENT_NOISE, noise: noiseFrom(draw, EVENT_NOISE) });
}
/** A member's vote in a body's own chamber: a bloc's sanctions, an admission, a departure. */
export function decideVote(streams, terms, threshold, subject) {
    return decide(streams, "org-vote", terms, threshold, subject);
}
/** A government deciding whether to act against a rival on a standing template. */
export function decideHostileAct(streams, terms, threshold, subject) {
    return decide(streams, "world-event", terms, threshold, subject);
}
/** A government that is not a party deciding whether to send help. */
export function decideAid(streams, terms, threshold, subject) {
    return decide(streams, "send-aid", terms, threshold, subject);
}
export function filing(campaign, family, names, ids, visibility, index = eventLineIndex(campaign.turn, names.actor, names.subject)) {
    const { bank } = templateOf(family);
    return {
        turn: campaign.turn + 1,
        kind: family === "sanctions-package" || family === "accession" ? "bloc" : "npc-action",
        visibility,
        headline: bank.headlines[index](names.actor, names.subject),
        ...(ids.actor ? { actor: ids.actor } : {}),
        ...(ids.subject ? { target: ids.subject } : {}),
        facts: { stake: bank.standfirsts[index](names.actor, names.subject), instrument: templateOf(family).id, topicTags: ["world"] },
    };
}
export function eventPacket(campaign, summary, effects, stamp, entities) {
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary },
        effects,
        provenance: { origin: "world", entities, systems: ["world-events"], decision: stamp },
    };
}
/**
 * A government's reaction on the edge it holds toward another, or nothing
 * where the graph holds no such edge. The graph is directed and sparse, so the
 * edge an actor holds toward its target does not promise one back, and
 * `apply()` refuses a move on an edge that is not there.
 */
export function onEdge(campaign, effect) {
    return selectRelationship(campaign, effect.from, effect.to) ? [effect] : [];
}
/** The marker a firing leaves on the acting government's edge: its cooldown, and the record of it. */
export function marker(campaign, family, from, to, description) {
    return { kind: "relationship", from, to, addHistory: { turn: campaign.turn, kind: worldEventKind(family), description } };
}
/** The governments sitting in a body this week, its authored roster as accessions and withdrawals have changed it. */
export function liveMembers(campaign, org) {
    return Object.keys(campaign.nations).filter((id) => liveMemberships(campaign, id).includes(org));
}
