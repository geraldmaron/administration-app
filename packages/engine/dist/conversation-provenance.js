import { decisionCauses, marksOfPacket } from "./causality.js";
// Where a decision taken in a conversation sits in the causal graph.
//
// Split out of conversations.ts beside it, the way resolution-provenance was
// split out of the resolver: the graph reads one way for every commit path in
// the room, and the room's own file has a size budget to keep.
function subjectIds(script) {
    return (script.subjects ?? []).flatMap((subject) => [subject.id, ...(subject.person ? [subject.person] : []), ...(subject.institution ? [subject.institution] : [])]);
}
/**
 * The stamp a spoken decision carries.
 *
 * It is observed because the words were said rather than inferred. The script
 * carries the access of the room: a classified briefing stays classified even
 * when the President gives an answer. Both governments are named, not only the
 * capital spoken to: the exchange between two capitals is a thread, and a
 * thread with one end on it is not one anything can walk.
 */
export function decisionProvenance(campaign, script, effects) {
    const entities = [campaign.founding.nation, script.counterpart];
    const flagCauses = decisionCauses(campaign.ledger, {
        ...(entities[0] === entities[1] ? {} : { between: entities }),
        ...(script.gatedOn ? { gatedOn: script.gatedOn } : {}),
    });
    const causeIds = [...new Set([...flagCauses, ...(script.subjectCauseIds ?? [])])];
    const marks = marksOfPacket(campaign.turn, effects);
    return {
        origin: "decision",
        confidence: "observed",
        visibility: script.visibility ?? "public",
        entities: [...new Set([...entities, ...subjectIds(script)])],
        ...(script.locales && script.locales.length > 0 ? { locales: script.locales } : {}),
        systems: ["statecraft", "conversation", ...(script.scenarioClass ? [script.scenarioClass] : [])],
        ...(causeIds.length > 0 ? { causeIds } : {}),
        ...(marks.length > 0 ? { marks } : {}),
    };
}
/**
 * A packet another module built, given the situation's own place in the graph.
 *
 * The resolver and the conflict writer each stamp what they know — a covert
 * order is not public, an instrument names its own subsystem — and neither of
 * them has ever heard of the situation that put the decision on the desk. So
 * what they stamped wins on every field they set, and the three fields this
 * knows more about, the causes, the markers and the places, are the union of
 * both.
 */
export function stampedDecision(campaign, script, packet) {
    const situation = decisionProvenance(campaign, script, packet.effects);
    const own = packet.provenance;
    const causeIds = [...new Set([...(situation.causeIds ?? []), ...(own?.causeIds ?? [])])];
    const marks = [...new Set([...(situation.marks ?? []), ...(own?.marks ?? [])])];
    const locales = [...new Set([...(situation.locales ?? []), ...(own?.locales ?? [])])];
    const entities = [...new Set([...(own?.entities ?? situation.entities ?? []), ...subjectIds(script)])];
    return {
        ...packet,
        ...(script.subjects?.length ? { subjects: script.subjects } : {}),
        provenance: {
            ...situation,
            ...(own ?? {}),
            ...(script.subjects?.length ? { entities } : {}),
            ...(causeIds.length > 0 ? { causeIds } : {}),
            ...(marks.length > 0 ? { marks } : {}),
            ...(locales.length > 0 ? { locales } : {}),
        },
    };
}
