import { foldedAxes } from "./domestic-signature.js";
import { oppositionParties, usTicket } from "./party.js";
/**
 * How far a figure's caucus-party reading of the live signature may move their
 * disposition target. Small beside CAUCUS_TILT (0.16): a platform agreement is
 * a nudge, not a rewrite of who they caucus with.
 */
export const BELIEF_WEIGHT = 0.08;
/**
 * Peak polarization one act may emit from belief-split alone. Held under the
 * joint MAX_TURN_POLARIZE ceiling with every other writer — this constant is
 * not a separate allowance.
 */
export const BELIEF_SPLIT_POLARIZATION = 0.008;
const BELIEF_AXES = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];
const clamp11 = (value) => Math.max(-1, Math.min(1, value));
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * What a domestic signature asserts in ideology space. Pure fold: the act's own
 * declared values are read on the axis they are declared on, sectors land on
 * economy axes first, and then the six axes plus the urban and federal tilts
 * become a three-axis stance a party can agree or disagree with.
 *
 * Industrial / energy / defense / agricultural protection pull nationalist;
 * services and tech pull globalist. Federal and urban tilts pull left; energy
 * and industrial protection pull mildly right. Defense and federal outlays pull
 * authoritarian.
 */
export function signatureStance(signature) {
    const folded = foldedAxes(signature);
    const axis = (key) => folded[key];
    const urban = signature.urban ?? 0;
    const federal = signature.federal ?? 0;
    // What the act says about the country, on the axis it says it: an act whose
    // signature is a value and not an industry — a rate cut, a revenue bill — read
    // zero on all three axes while this was inferred from sectors alone, so every
    // caucus read it the same and the floor counted the two tax bills as cohesion
    // noise. Read directly, at its own weight, because the field is already in the
    // same space a platform is.
    const values = signature.values;
    return {
        economicLeftRight: clamp11((values?.economicLeftRight ?? 0) +
            0.55 * federal +
            0.35 * urban +
            0.4 * axis("services") +
            0.25 * axis("tech") -
            0.25 * axis("energy") -
            0.15 * axis("industrial")),
        authLibertarian: clamp11((values?.authLibertarian ?? 0) + 0.55 * axis("defense") + 0.35 * federal - 0.2 * urban),
        nationalistGlobalist: clamp11((values?.nationalistGlobalist ?? 0) +
            0.85 * axis("industrial") +
            0.5 * axis("energy") +
            0.45 * axis("defense") +
            0.35 * axis("agricultural") -
            0.7 * axis("services") -
            0.45 * axis("tech") -
            0.25 * urban),
    };
}
/**
 * How a party's caucus reads one act. Signed: positive is "this is what we
 * are for". Not a vote — a disposition input and a framing input.
 */
export function partyReading(beliefs, signature) {
    const stance = signatureStance(signature);
    const total = BELIEF_AXES.reduce((sum, axis) => sum + beliefs[axis] * stance[axis], 0);
    return round3(clamp11(total));
}
/**
 * How a whole ticket reads one act: the platform reading, scaled by how alike
 * the ticket's members read anything at all.
 *
 * A whipped caucus mostly reads its platform. The bloc of people who joined
 * neither party does not — it contains both ends, so the same act that moves a
 * major caucus a long way leaves the independents where they were. That is a
 * fact about cohesion rather than about position, and reading the platform
 * without it is how a bloc with a centrist mean got mistaken for a centrist
 * bloc.
 */
export function ticketReading(ticket, signature) {
    return round3(clamp11(ticket.cohesion * partyReading(ticket.beliefs, signature)));
}
/**
 * How far apart two platforms read the same act, 0..1. An act two caucuses read
 * in opposite directions is divisive by construction, without an author having
 * to declare it.
 */
export function beliefSplit(a, b, signature) {
    const gap = Math.abs(partyReading(a, signature) - partyReading(b, signature));
    // Readings sit in [-1, 1]; the furthest they can sit apart is 2.
    return round3(clamp01(gap / 2));
}
/** The same, between two seated tickets, so cohesion counts. */
export function ticketSplit(a, b, signature) {
    return round3(clamp01(Math.abs(ticketReading(a, signature) - ticketReading(b, signature)) / 2));
}
function readingFor(party, signature) {
    const ticket = usTicket(party);
    return { party, ticket, reading: ticketReading(ticket, signature) };
}
/**
 * How every seated bloc reads one act, for the decision memo. A reading, not a
 * gate — content must not condition on partyBelief. The administration's own
 * entry is its own ticket, including the independent one: a president who ran
 * as an independent is read against what that bloc believes, not against the
 * caucus they happen to sit nearest.
 */
export function selectPartyReading(campaign, signature) {
    const party = campaign.congress.administrationParty;
    return {
        administration: readingFor(party, signature),
        opposition: oppositionParties(party).map((entry) => readingFor(entry, signature)),
    };
}
/** BELIEF_SPLIT_POLARIZATION × a split — the amount to feed OpinionEffect.polarize. */
export function beliefSplitPolarizeAmount(split) {
    // Four decimals so a small split (e.g. 0.195 × 0.008) is not rounded away
    // to the nearest thousandth before it reaches OpinionEffect.
    return Math.round(BELIEF_SPLIT_POLARIZATION * clamp01(split) * 10_000) / 10_000 + 0;
}
/**
 * The widest any two seated blocs read this act apart.
 *
 * With a president who has a party there is one pair and this is the old
 * administration-versus-opposition split. With an independent there are three,
 * and the widest is usually the two majors reading each other — which is the
 * honest answer: the country polarizes around an act whoever signed it, and a
 * president standing outside both caucuses does not make the caucuses agree.
 */
export function widestTicketSplit(campaign, signature) {
    const selection = selectPartyReading(campaign, signature);
    const seated = [selection.administration, ...selection.opposition];
    let widest = 0;
    for (let i = 0; i < seated.length; i++) {
        for (let j = i + 1; j < seated.length; j++) {
            widest = Math.max(widest, ticketSplit(seated[i].ticket, seated[j].ticket, signature));
        }
    }
    return widest;
}
/**
 * Opinion effects an act with a signature emits from belief-split alone.
 * Callers splice these beside routeDomestic / resolveImpact the same way those
 * compilers return effects. Zero when every seated bloc reads the act alike.
 */
export function beliefSplitEffects(campaign, signature) {
    const amount = beliefSplitPolarizeAmount(widestTicketSplit(campaign, signature));
    if (amount <= 0)
        return [];
    return [{ kind: "opinion", deltas: {}, polarize: amount }];
}
