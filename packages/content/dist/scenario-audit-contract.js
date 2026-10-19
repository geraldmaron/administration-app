import { INSTITUTION_KINDS } from "./audit-lexicon.js";
import { PLACE_TOKEN_NAMES } from "./scenario-text.js";
// The binder's whole vocabulary: the counterpart and player identity tokens,
// plus one token per institution kind, filled from the founding charter.
export const PLACEHOLDERS = [
    "counterpart",
    "counterpartAdjective",
    "leader",
    "title",
    "nation",
    // The congressional caucuses by name, across from and beside the administration.
    "opposition",
    "oppositionAdjective",
    "caucus",
    "caucusAdjective",
    // The place tokens come from the binder's own list, so a token it fills is
    // never refused here and a token registered here is never left blank.
    ...PLACE_TOKEN_NAMES,
    ...INSTITUTION_KINDS,
];
/**
 * Ceilings per field rather than one number for all copy: a subject is a
 * headline, a beat is a paragraph, and a reply is something a leader says out
 * loud in one breath. Exported so the generation brief quotes the numbers the
 * validator actually enforces instead of a remembered copy of them.
 */
export const LENGTH_CEILINGS = {
    subject: 70,
    beat: 400,
    reply: 160,
    remembered: 220,
    press: 130,
    locus: 90,
    // Shorter than a beat on purpose. A transmission is a document read aloud in the
    // room, and the ones that land are the short ones — a government that needed
    // four paragraphs to make its threat was not making a threat.
    transmission: 320,
};
/**
 * What a writer is aiming for, under the ceiling and well over the schema's
 * refusal floor (`LENGTH_FLOORS`). Copy between the floor and the target parses
 * and ships; it just reads thin — a beat that states the situation without
 * setting a scene, a reply that picks a side without saying anything a person
 * would say out loud. That is a judgment about writing, not a defect, so it is
 * a warning: at corpus scale it is the signal that tells a reviewer which of
 * seven hundred scenarios to read first.
 *
 * A subject has no target. A headline earns its force by being short, and the
 * ceiling is the only bound worth putting on one.
 */
export const LENGTH_TARGETS = { beat: 90, reply: 70, remembered: 80, press: 50, locus: 30, transmission: 110 };
export function passages(def) {
    return [
        { label: "subject", text: def.subject },
        { label: "locus", text: def.locus.descriptor },
        // Label and value audited as one passage: a real nation's name is just as
        // disqualifying in either half, and splitting them would double the noise.
        ...(def.particulars ?? []).map((particular, index) => ({
            label: `particular[${index}]`,
            text: `${particular.label}: ${particular.value}`,
        })),
        // The standing brief is player copy like any other passage. Left out, a
        // context block could name a real country, quote a real outlet or drift out
        // of register — under a gate that reads every other sentence in the file.
        ...(def.context
            ? [
                { label: "context.standing", text: def.context.standing },
                { label: "context.precedent", text: def.context.precedent },
                { label: "context.inaction", text: def.context.inaction },
                { label: "context.unknown", text: def.context.unknown },
                ...def.context.pressures.map((pressure, index) => ({
                    label: `context.pressures[${index}]`,
                    text: pressure.want,
                })),
            ]
            : []),
        ...def.opening.map((beat, index) => ({ label: `opening[${index}]`, text: beat.text })),
        // A transmission is player copy like any other. It reaches the screen down a
        // different path than the thread does, which is exactly why it has to be
        // audited on the same pass — copy that skips the language gates is copy
        // that eventually ships a real country's name in a foreign cable.
        ...(def.transmission
            ? [
                { label: "transmission", text: def.transmission.text },
                { label: "transmission attribution", text: def.transmission.attribution },
            ]
            : []),
        ...def.replies.flatMap((reply) => [
            { label: `reply "${reply.id}"`, text: reply.text },
            ...(reply.press ? [{ label: `press for "${reply.id}"`, text: reply.press }] : []),
            ...(reply.commitment.kind === "position"
                ? [{ label: `remembered for "${reply.id}"`, text: reply.commitment.remembered }]
                : []),
            // A rejoinder is spoken in the room, whichever commitment it follows, so
            // it is a beat and audited as one: same neutrality, same register, same
            // length ceiling as any other line a chair says out loud.
            ...(reply.commitment.rejoinder
                ? [{ label: `rejoinder for "${reply.id}"`, text: reply.commitment.rejoinder.text }]
                : []),
        ]),
    ];
}
export function fieldFor(label) {
    if (label === "subject")
        return "subject";
    // The standing brief is prose in the register of a beat, not a spoken reply.
    // Read against the reply ceiling it refused every context block ever written.
    if (label.startsWith("context.pressures"))
        return "reply";
    if (label.startsWith("context."))
        return "beat";
    if (label === "locus")
        return "locus";
    if (label.startsWith("opening"))
        return "beat";
    if (label.startsWith("press"))
        return "press";
    if (label.startsWith("remembered"))
        return "remembered";
    if (label.startsWith("rejoinder"))
        return "beat";
    if (label.startsWith("transmission"))
        return "transmission";
    return "reply";
}
// A scenario that pins a nation is a declared, owned exception; everything
// else has to survive being cast onto whichever nation the live board picks,
// so it may not name a country, quote a country's figures, or assume a
// charter. The declaration is the difference, not the cast.
export function isDeclaredSetPiece(def) {
    return def.setPiece !== undefined;
}
/**
 * The depth floor. The language gates keep a batch clean; these keep it a
 * game. A generator held only to prohibitions learns that the cheapest way
 * through is a set of near-zero, all-loss, interchangeable answers — every
 * one of them valid, none of them a decision. Exported so the generation
 * brief quotes the numbers the validator actually enforces.
 *
 * `heavy*` is what makes one reply a door the player is afraid of: an
 * instrument at the rung where it stops being a gesture, a metric move a
 * player can feel, a treasury line worth a cabinet argument, or an alignment
 * pull that changes who this government is. `token*` is the other end: a
 * position under every one of those thresholds that also stamps no flag has
 * no consequence of any kind, and "reply that does nothing" is a defect, not
 * a style.
 */
export const STAKES_FLOORS = {
    heavyRung: 3,
    heavyMetric: 0.04,
    heavyTreasury: 60,
    heavyPull: 0.06,
    tokenMetric: 0.02,
    tokenTreasury: 20,
    tokenPull: 0.03,
};
export function costEntries(reply) {
    if (reply.commitment.kind !== "position")
        return { metrics: [], treasury: 0, pulls: [] };
    const { treasury = 0, ...rest } = reply.commitment.cost;
    return {
        metrics: Object.values(rest).filter((value) => value !== undefined),
        treasury,
        pulls: Object.values(reply.commitment.pull ?? {}).filter((value) => value !== undefined),
    };
}
export function isHeavy(reply) {
    if (reply.commitment.kind === "instrument")
        return reply.commitment.rung >= STAKES_FLOORS.heavyRung;
    if (reply.commitment.kind === "position" && (reply.commitment.relief || reply.commitment.localeAct || reply.commitment.transmit ||
        reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview))
        return true;
    const { metrics, treasury, pulls } = costEntries(reply);
    return (metrics.some((value) => Math.abs(value) >= STAKES_FLOORS.heavyMetric) ||
        Math.abs(treasury) >= STAKES_FLOORS.heavyTreasury ||
        pulls.some((value) => Math.abs(value) >= STAKES_FLOORS.heavyPull) ||
        // A declared impact carries weight the authored-cost fields cannot see.
        // Without this, a scenario whose expensive door is "hundreds dead, ours"
        // reads to the stakes rule as a week where nothing was at issue.
        impactWeight(reply) >= STAKES_FLOORS.heavyMetric);
}
export function isToken(reply) {
    if (reply.commitment.kind !== "position")
        return false;
    if (reply.commitment.collection)
        return false;
    if (reply.commitment.relief)
        return false;
    if (reply.commitment.localeAct)
        return false;
    if (reply.commitment.transmit)
        return false;
    if (reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview)
        return false;
    if (reply.sets && reply.sets.length > 0)
        return false;
    const { metrics, treasury, pulls } = costEntries(reply);
    return (metrics.every((value) => Math.abs(value) < STAKES_FLOORS.tokenMetric) &&
        Math.abs(treasury) < STAKES_FLOORS.tokenTreasury &&
        pulls.every((value) => Math.abs(value) < STAKES_FLOORS.tokenPull));
}
/** The board behavior used to reject two differently worded copies of one answer. */
export function outcomeFingerprint(reply) {
    const sets = [...(reply.sets ?? [])].sort().join(",");
    if (reply.commitment.kind === "instrument")
        return `instrument:${reply.commitment.instrument}:${reply.commitment.rung}|${sets}`;
    if (reply.commitment.kind === "join")
        return `join:${reply.commitment.side}|${sets}`;
    const entries = (record) => Object.entries(record)
        .filter(([, value]) => value !== undefined && value !== 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`).join(",");
    return `position:${entries(reply.commitment.cost)}:${entries(reply.commitment.pull ?? {})}:${JSON.stringify(reply.commitment.collection ?? null)}:${Boolean(reply.commitment.relief)}:${reply.commitment.localeAct ?? ""}:${reply.commitment.transmit ?? ""}:${JSON.stringify(reply.commitment.tariff ?? null)}:${JSON.stringify(reply.commitment.tariffLift ?? null)}:${JSON.stringify(reply.commitment.directive ?? null)}:${JSON.stringify(reply.commitment.billText ?? null)}:${JSON.stringify(reply.commitment.judicialNomination ?? null)}:${JSON.stringify(reply.commitment.orderRescission ?? null)}:${JSON.stringify(reply.commitment.orderReview ?? null)}|${sets}`;
}
/**
 * How many ways a reply costs something.
 *
 * Reads the declared impact as well as the authored cost, because a reply that
 * declares a human toll and an emergency appropriation is not a costless
 * decision — it is a decision whose price is computed rather than typed. Before
 * this, every scenario written the new way tripped `costless-position`, which
 * would have made the rule a reason not to migrate.
 *
 * The two are alternatives, never layers: a reply states what it spent or what
 * it did, and counting both would let one decision be billed twice.
 */
export function positionCost(reply) {
    if (reply.commitment.kind !== "position")
        return 1;
    // A lawful collection command changes the standing requirement itself. Its
    // real cost is the capability and time it occupies, not an invented metric.
    if (reply.commitment.collection || reply.commitment.relief || reply.commitment.localeAct || reply.commitment.transmit ||
        reply.commitment.tariff || reply.commitment.tariffLift || reply.commitment.directive || reply.commitment.billText || reply.commitment.judicialNomination || reply.commitment.orderRescission || reply.commitment.orderReview)
        return 1;
    const authored = Object.values(reply.commitment.cost).filter((value) => value !== undefined && value !== 0).length;
    if (authored > 0)
        return authored;
    const impact = reply.commitment.impact;
    if (!impact)
        return 0;
    const human = impact.human ?? {};
    return ((human.lives !== undefined && human.lives !== "none" ? 1 : 0) +
        (human.displaced !== undefined && human.displaced !== "none" ? 1 : 0) +
        (impact.financial?.scale !== undefined && impact.financial.scale !== "none" ? 1 : 0) +
        (impact.institutional?.length ?? 0) +
        (impact.divisive ? 1 : 0));
}
/**
 * Whether this reply's authored `cost.treasury` and its declared
 * `impact.financial.scale` read as one price named twice.
 *
 * Before the treasury/budget-authority split, the two books were the same
 * book, so any reply naming both was billing one decision twice by
 * construction — the corpus-wide count `docs/CONTENT_DOCTRINE.md` §3 used to
 * quote. Since the split, `cost.treasury` is what the reply obligates against
 * the administration's own authority and `impact.financial` is what it does
 * to the *bearing nation's* debt (`resolveImpact` books a `choiceBorrowing`
 * amount added to the live stock, never the President's authority) — two pots a single decision can
 * genuinely draw from at once, e.g. an order that spends a little now and
 * triggers a much larger supplemental later.
 *
 * What is still worth flagging is the pairing that reads like one price typed
 * twice rather than two real pots: a treasury line already at the heavy
 * floor sitting beside a financial band big enough to be its own emergency
 * appropriation. The schema cannot tell intent apart from coincidence, so
 * this is read as a warning for a reviewer, never a refusal — see
 * `docs/CONTENT_DOCTRINE.md` §3.
 */
export function costAndImpactBothPriced(reply) {
    if (reply.commitment.kind !== "position")
        return false;
    const treasury = reply.commitment.cost.treasury;
    const scale = reply.commitment.impact?.financial?.scale;
    if (treasury === undefined || scale === undefined || scale === "none")
        return false;
    return Math.abs(treasury) >= STAKES_FLOORS.heavyTreasury && (scale === "emergency" || scale === "structural");
}
/**
 * How heavy the heaviest thing this reply does is, on the 0..1 scale the stakes
 * rule reads. Mirrors the impact model's own ordering without importing its
 * tables — the audit asks whether an option is expensive, not what it costs.
 */
export function impactWeight(reply) {
    if (reply.commitment.kind !== "position")
        return 0;
    const impact = reply.commitment.impact;
    if (!impact)
        return 0;
    const livesWeight = { none: 0, isolated: 0.02, dozens: 0.05, hundreds: 0.08, thousands: 0.12, mass: 0.2 };
    const financialWeight = { none: 0, discretionary: 0.01, supplemental: 0.05, emergency: 0.09, structural: 0.12 };
    return Math.max(livesWeight[impact.human?.lives ?? "none"], financialWeight[impact.financial?.scale ?? "none"], (impact.institutional?.length ?? 0) >= 2 ? 0.05 : 0);
}
