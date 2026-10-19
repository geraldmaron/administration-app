import { confidenceFromEvidence, chamberMajority, selectHillMember, } from "@admin/engine";
import { attributeVerdict, loyaltyWord, stanceForRatio } from "../format/figures";
const LABEL = {
    loyalty: "Loyalty",
    competence: "Competence",
    integrity: "Integrity",
    charisma: "Charisma",
};
// Loyalty is the least observable of the three original readings, so a read
// from reputation alone starts low; competence has a public record behind it
// and starts moderate. Charisma is public by nature — a debate stage, a
// interview, a stump speech — so it starts at the same prior as competence.
// Each contested call they advised on is the President watching them work,
// and it firms the loyalty read fastest because that is where a loyalty shows;
// charisma earns nothing from a contested call, since advising in a closed
// room is not the venue charisma is read in.
const EVIDENCE_PRIOR = { loyalty: 0.25, competence: 0.5, integrity: 0.35, charisma: 0.5 };
const EVIDENCE_PER_CALL = { loyalty: 0.12, competence: 0.06, integrity: 0.06, charisma: 0 };
const BAND_OF = { adverse: 0, caution: 1, neutral: 2, favorable: 3 };
function basisFor(calls) {
    if (calls === 0)
        return "from their record alone";
    return `from ${calls} contested ${calls === 1 ? "call" : "calls"}`;
}
/**
 * One person's reading as a band and a confidence.
 *
 * `contestedCalls` is how many contested decisions they have advised the
 * President on: none for a nominee or a newly seated secretary.
 */
export function judgeAttribute(attribute, value, contestedCalls = 0) {
    const stance = stanceForRatio(value);
    const calls = Math.max(0, Math.floor(contestedCalls));
    const evidence = Math.min(1, EVIDENCE_PRIOR[attribute] + EVIDENCE_PER_CALL[attribute] * calls);
    return {
        attribute,
        label: LABEL[attribute],
        word: attribute === "loyalty" ? loyaltyWord(stance) : attributeVerdict(value),
        stance,
        band: BAND_OF[stance],
        confidence: confidenceFromEvidence(evidence),
        basis: basisFor(calls),
    };
}
const MAJORITY_POST = {
    house: "post-house-speaker",
    senate: "post-senate-majority-leader",
};
/** Which party holds a chamber and who leads its floor, counted the way the engine counts control. */
export function chamberControl(campaign, chamber) {
    const anchor = campaign.congress.caucusAnchor;
    const caucus = chamberMajority(campaign.congress, chamber);
    const party = caucus === "administration" ? anchor : anchor === "democrat" ? "republican" : "democrat";
    const leader = selectHillMember(campaign, MAJORITY_POST[chamber]);
    return { chamber, party, caucus, anchor, ...(leader ? { leader } : {}) };
}
