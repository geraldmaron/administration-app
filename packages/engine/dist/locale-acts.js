import { worldDataset } from "@admin/world";
import { RELIEF_SIGNATURE_PREFIX } from "./obligations.js";
import { underDeclaredEmergency } from "./emergency.js";
import { obligationAvailability } from "./funding.js";
import { playerGdp } from "./policy.js";
import { domesticBrigadeWeek, domesticGuardWeek } from "./force-costs.js";
import { executiveOrder, orderAvailability } from "./orders.js";
import { federalServiceGround, governorAssents, insurrectionGround, liveProclamation, LOCALE_REFUSALS, MISSION_ATTENTION, missionOrderId, } from "./locale-missions.js";
import { liveCourtOrder, SURVEILLANCE_ORDER_KINDS } from "./court-order-records.js";
const govinfo = (title, section) => `https://www.govinfo.gov/link/uscode/${title}/${section}`;
const MISSION_TIERS = {
    "251": { standingCost: 0.02, governor: { opposed: 0.02, assenting: 0.02 }, answersClaim: true,
        mark: { valence: 1, weight: 0.3, signature: "locale:troops", when: "always" }, opinion: { competence: 0.004 },
        mission: "assist state authorities" },
    "252": { standingCost: 0.06, governor: { opposed: -0.04, assenting: -0.04 }, answersClaim: false,
        mark: { valence: -1, weight: 0.5, signature: "locale:troops", when: "always" }, opinion: { integrity: -0.01, polarize: 0.01 },
        mission: "enforce federal law and court orders" },
    "253": { standingCost: 0.06, governor: { opposed: -0.04, assenting: -0.04 }, answersClaim: false,
        mark: { valence: -1, weight: 0.5, signature: "locale:troops", when: "always" }, opinion: { integrity: -0.01, polarize: 0.01 },
        mission: "suppress violence denying rights" },
};
/** The proclamation's own tier: the governor's request costs that governor nothing. */
const PROCLAMATION_TIERS = {
    "251": { standingCost: 0.01, governor: { opposed: 0, assenting: 0 }, answersClaim: false, opinion: { polarize: 0.004 } },
    "252": { standingCost: 0.01, governor: { opposed: -0.02, assenting: -0.02 }, answersClaim: false, opinion: { polarize: 0.004 } },
    "253": { standingCost: 0.01, governor: { opposed: -0.02, assenting: -0.02 }, answersClaim: false, opinion: { polarize: 0.004 } },
};
const ENFORCEMENT_ACTS = [
    {
        id: "property-surge",
        name: "Surge officers to federal property",
        summary: "Homeland Security officers protect the federal buildings here and the people on them, and nothing past their grounds.",
        group: "enforcement", needsDeclaration: false, needsGovernorAssent: false, occasion: "disorder", answersClaim: false,
        // ~$15M: about 430 officers for the six-week mission at ~$300k per loaded officer-year, a planning value.
        treasuryOfGdp: -5.5e-7,
        standingCost: 0.005,
        excepted: true,
        coercion: { kind: "agents", odds: 0.1, severity: 0.8 },
        orderId: "order-property-surge",
        mission: MISSION_ATTENTION["property-surge"],
        protest: -0.01,
        governor: { opposed: -0.02, assenting: 0 },
        opinion: { polarize: 0.003 },
        stability: 0.004,
    },
    {
        id: "immigration-operation",
        name: "Run an immigration operation",
        summary: "Immigration officers concentrate in this state to question and arrest people they believe are removable.",
        group: "enforcement", needsDeclaration: false, needsGovernorAssent: false, occasion: "enforcement", answersClaim: false,
        // ~$65M: about 1,400 officers for eight weeks at ~$300k per loaded officer-year, a planning value.
        treasuryOfGdp: -2.4e-6,
        standingCost: 0.01,
        excepted: true,
        coercion: { kind: "agents", odds: 0.14, severity: 1 },
        orderId: "order-immigration-operation",
        protest: 0.015,
        governor: { opposed: -0.04, assenting: -0.01 },
        mark: { valence: -1, weight: 0.3, signature: "locale:immigration-operation", when: "always" },
        reach: "foreign-born",
    },
    {
        id: "task-force",
        name: "Stand up a federal task force",
        summary: "Justice Department agents work federal crimes here beside the state's own police, at the governor's invitation.",
        group: "enforcement", needsDeclaration: false, needsGovernorAssent: true, occasion: "disorder", answersClaim: false,
        // ~$40M: about 870 agents, analysts and prosecutors for the eight-week mission at ~$300k per loaded officer-year, a planning value.
        treasuryOfGdp: -1.5e-6,
        standingCost: 0,
        excepted: true,
        coercion: { kind: "agents", odds: 0.07, severity: 0.7 },
        orderId: "order-joint-task-force",
        mission: MISSION_ATTENTION["task-force"],
        protest: -0.01,
        governor: { opposed: 0.02, assenting: 0.02 },
        mark: { valence: 1, weight: 0.2, signature: "answered:task-force", when: "always" },
    },
];
const MILITARY_ACTS = [
    {
        id: "federalize",
        name: "Federalize the Guard",
        summary: "Call the state's National Guard into federal service, through its governor, on one of the three occasions the statute names.",
        group: "military", needsDeclaration: false, needsGovernorAssent: false, occasion: "any", predicate: "federal-service",
        answersClaim: "with-assent",
        // ~$20M to mobilize, a planning value, then the force's weekly cost below.
        treasuryOfGdp: -7.3e-7,
        standingCost: 0.03,
        excepted: true,
        coercion: { kind: "troops", odds: 0.18, severity: 1.2 },
        orderId: "order-guard-federalization",
        mission: MISSION_ATTENTION.federalize,
        protest: -0.02,
        // ~$13.5M a week: a 3,000-member call-up at CBO's cost of the Guard deployed to a city.
        commitment: { amountPerTurn: domesticGuardWeek(), weeks: MISSION_ATTENTION.federalize.weeks, line: "defense" },
        governor: { opposed: -0.04, assenting: 0 },
        mark: { valence: -1, weight: 0.4, signature: "locale:federalize", when: "opposed" },
        opinion: { integrity: -0.008, polarize: 0.008, when: "opposed" },
        stability: 0.006,
        readiness: -0.003,
    },
    {
        id: "proclaim",
        name: "Proclaim the insurgents to disperse",
        summary: "The proclamation the Insurrection Act requires before any troops are used. By itself it moves no one.",
        group: "military", needsDeclaration: false, needsGovernorAssent: false, occasion: "any", predicate: "insurrection",
        answersClaim: false,
        treasuryOfGdp: 0,
        standingCost: 0.01,
        excepted: true,
        orderId: "order-insurrection-proclamation",
        protest: -0.005,
        tiers: PROCLAMATION_TIERS,
    },
    {
        id: "troops",
        name: "Send in active-duty troops",
        summary: "Send one brigade of active-duty troops into the state, on the proclamation already issued and for the mission it states.",
        group: "military", needsDeclaration: false, needsGovernorAssent: false, occasion: "any", predicate: "proclaimed",
        answersClaim: "with-assent",
        // ~$25M to move a brigade, a planning value, then the force's weekly cost below.
        treasuryOfGdp: -9e-7,
        standingCost: 0.06,
        excepted: true,
        coercion: { kind: "troops", odds: 0.22, severity: 1.5 },
        orderId: "order-insurrection-enforcement",
        mission: MISSION_ATTENTION.troops,
        protest: -0.03,
        // ~$14.5M a week: the active-duty border deployment's average rate, in 2026 dollars.
        commitment: { amountPerTurn: domesticBrigadeWeek(), weeks: MISSION_ATTENTION.troops.weeks, line: "defense",
            forces: { branch: "army", unitType: "army.brigade-combat-team", count: 1 } },
        stability: 0.008,
        readiness: -0.008,
        tiers: MISSION_TIERS,
    },
];
const INVESTIGATIVE_ACTS = [
    {
        id: "priority",
        name: "Set an investigative priority",
        summary: "A memorandum asking the Attorney General to put violent disorder here first. Justice decides the cases.",
        group: "investigation", needsDeclaration: false, needsGovernorAssent: false, occasion: "disorder", answersClaim: false,
        treasuryOfGdp: 0,
        standingCost: 0,
        coercion: { kind: "surveillance", odds: 0.06, severity: 0.6 },
        authority: { kind: "statute", cite: "28 U.S.C. §509", name: "Functions of the Attorney General",
            limit: "The Department's functions are the Attorney General's; the President may set priorities but not direct a case.",
            source: govinfo(28, "509"), opened: "2026-10-25" },
        mission: MISSION_ATTENTION.priority,
        protest: -0.005,
        opinion: { integrity: -0.006, polarize: 0.004 },
    },
    {
        id: "surveil",
        name: "Order surveillance of residents",
        summary: "A presidential order to watch residents. No such order exists; the courts and the Attorney General's procedures decide.",
        group: "investigation", needsDeclaration: false, needsGovernorAssent: false, occasion: "disorder", answersClaim: false,
        treasuryOfGdp: 0,
        standingCost: 0,
        boundary: true,
        authority: { kind: "statute", cite: "50 U.S.C. §1812", name: "Exclusive means for electronic surveillance",
            limit: "Electronic surveillance runs only on a FISA or Title III court order; no presidential order supplies one.",
            source: govinfo(50, "1812"), opened: "2026-10-25" },
    },
    {
        id: "surveil-under-order",
        name: "Conduct surveillance under the court's order",
        summary: "Justice and the Bureau collect on the targets and facilities a FISA or Title III order names here, for the term it runs and on its minimization rules.",
        group: "investigation", needsDeclaration: false, needsGovernorAssent: false, occasion: "any", predicate: "court-order", answersClaim: false,
        treasuryOfGdp: 0,
        standingCost: 0,
        // Lawful collection still reaches people it was not aimed at; a narrowed order raises the odds (see `surveillanceRisk`).
        coercion: { kind: "surveillance", odds: 0.05, severity: 0.5 },
        authority: { kind: "statute", cite: "50 U.S.C. §1805; 18 U.S.C. §2518", name: "Court-ordered electronic surveillance",
            limit: "Only the targets, facilities and term the order names, under its minimization procedures; the order, not the President, authorizes the collection.",
            source: govinfo(50, "1805"), opened: "2026-10-25" },
        opinion: { polarize: 0.002 },
    },
];
/**
 * Priced against `order-relief-program`, which is the *national* relief
 * program at 0.0015 of output — about $41B. Reaching one state costs a
 * fraction of reaching the whole country: direct relief to a single state is a
 * sixth of the national program, which is the order of magnitude of a real
 * state-level disaster supplemental, and a locale act that cost two-thirds of
 * the national program would make helping Michigan and helping America nearly
 * the same decision.
 */
export const LOCALE_ACTS = [
    {
        id: "relief",
        name: "Direct federal relief",
        summary: "Money and materiel to this state, ahead of the ordinary appropriation.",
        group: "relief",
        needsDeclaration: false,
        needsGovernorAssent: false,
        occasion: "any",
        predicate: "request",
        answersClaim: true,
        // ~$6.9B, a sixth of the national program.
        treasuryOfGdp: -0.00025,
        standingCost: 0,
        // The disaster relief fund is a no-year appropriation and does not stop
        // when the annual ones do.
        excepted: true,
        authority: { kind: "statute", cite: "42 U.S.C. §5170", name: "The Stafford Disaster Relief and Emergency Assistance Act",
            limit: "Answers a governor's request over a disaster beyond what the state can meet.",
            source: govinfo(42, "5170"), opened: "2026-10-12" },
    },
    {
        id: "request-deployment",
        name: "Ask the governor to deploy the Guard",
        summary: "The state's own Guard, on the state's own authority, at the President's request.",
        group: "military",
        needsDeclaration: false,
        needsGovernorAssent: true,
        occasion: "any",
        answersClaim: true,
        // ~$108M: the state's own Guard, on state orders, federally reimbursed for
        // a 3,000-member call-up for eight weeks at the federalized Guard's weekly
        // rate (`domesticGuardWeek`), the same people at the same cost.
        treasuryOfGdp: -3.9e-6,
        standingCost: 0.01,
        excepted: true,
        authority: { kind: "statute", cite: "32 U.S.C. §502(f)", name: "National Guard duty at the President's request",
            limit: "The Guard stays under the governor's command and on state orders; the governor may decline.",
            source: govinfo(32, "502"), opened: "2026-10-25" },
    },
    // Enforcement, military and investigative acts, in the order the desk offers them.
    ...ENFORCEMENT_ACTS,
    ...MILITARY_ACTS,
    ...INVESTIGATIVE_ACTS,
    {
        id: "waiver",
        name: "Grant a regulatory waiver",
        summary: "Cheap, narrow, and only part of an answer.",
        group: "relief",
        needsDeclaration: false,
        needsGovernorAssent: false,
        occasion: "any",
        answersClaim: false,
        // ~$825M: the administrative cost of suspending a rule for one state.
        treasuryOfGdp: -0.00003,
        standingCost: 0,
    },
    {
        id: "review",
        name: "Order a federal review",
        summary: "Buys time. The state waits longer before the silence counts against you.",
        group: "relief",
        needsDeclaration: false,
        needsGovernorAssent: false,
        occasion: "any",
        answersClaim: false,
        // ~$550M: a federal review, which is people and time.
        treasuryOfGdp: -0.00002,
        standingCost: 0,
    },
];
export function localeAct(id) {
    return LOCALE_ACTS.find((act) => act.id === id);
}
/** The law an act runs on: its own citation, or the mission order's it signs. */
export function localeActAuthority(act) {
    return act.authority ?? (act.orderId ? executiveOrder(act.orderId)?.authority : undefined);
}
/** The act as its tier changes it: the troop act and the proclamation read their Insurrection Act section. */
export function tieredLocaleAct(act, ground) {
    const tier = ground ? act.tiers?.[ground] : undefined;
    if (!tier)
        return act;
    return {
        ...act,
        standingCost: tier.standingCost,
        governor: tier.governor,
        answersClaim: tier.answersClaim,
        ...(tier.mark ? { mark: tier.mark } : {}),
        ...(tier.opinion ? { opinion: tier.opinion } : {}),
        ...(act.orderId ? { orderId: missionOrderId(act.id, ground) } : {}),
    };
}
/** The Insurrection Act section this act rests on now: the proclamation's for troops, this week's occasion for a proclamation. */
export function localeGround(campaign, id, act) {
    if (act.id === "proclaim")
        return insurrectionGround(campaign, id);
    if (act.id !== "troops")
        return undefined;
    const subject = liveProclamation(campaign, id)?.subject;
    return subject?.kind === "locale-mission" ? subject.ground : undefined;
}
/** The subject the act's mission order is signed for in this state. */
export function missionSubject(campaign, id, act) {
    const ground = localeGround(campaign, id, act);
    const mission = ground ? act.tiers?.[ground]?.mission : undefined;
    return { kind: "locale-mission", state: id, act: act.id, ...(ground ? { ground } : {}), ...(mission ? { mission } : {}) };
}
/** How long a federal review pushes a claim's deadline out. Once only; see `deferClaims`. */
export const REVIEW_DEFERRAL_TURNS = 3;
/** What one use of an act obligates, resolved against the country paying for it. */
export function localeActCost(campaign, act) {
    return Math.round(Math.abs(act.treasuryOfGdp) * playerGdp(campaign));
}
/** The statutory predicate refused, as the text after "This needs ", or nothing when it holds. */
function predicateRefusal(campaign, id, act) {
    if (act.predicate === "federal-service" && !federalServiceGround(campaign, id))
        return LOCALE_REFUSALS.federalize;
    if (act.predicate === "insurrection" && !insurrectionGround(campaign, id))
        return LOCALE_REFUSALS.proclaim;
    if (act.predicate === "proclaimed" && !liveProclamation(campaign, id))
        return LOCALE_REFUSALS.troops;
    if (act.predicate === "court-order" && !liveCourtOrder(campaign, id, SURVEILLANCE_ORDER_KINDS))
        return LOCALE_REFUSALS["surveil-under-order"];
    return undefined;
}
/** The mission order's own gate: a Secretary in the chair, a week since the last signature, no statute against it. */
function missionOrderRefused(campaign, id, act) {
    const subject = missionSubject(campaign, id, act);
    const order = executiveOrder(tieredLocaleAct(act, subject.ground).orderId ?? "");
    if (!order)
        return undefined;
    const available = orderAvailability(campaign, order, subject);
    return available.ok ? undefined : available.missing;
}
/** One investigative priority a week for each state: Justice keeps one record of the instruction per state and week. */
export function priorityDirectiveId(turn, id) {
    return `directive:INST-DOJ:enforcement-posture:${turn}:${id}`;
}
function priorityRefused(campaign, id, act) {
    if (act.id !== "priority")
        return undefined;
    return campaign.directives?.[priorityDirectiveId(campaign.turn, id)]
        ? "a new week before the Attorney General is sent another priority for this state" : undefined;
}
export function localeAvailability(campaign, id, act, cause) {
    const runtime = campaign.states[id];
    if (!runtime)
        return { ok: false, missing: "a state this act could reach" };
    if (act.boundary)
        return { ok: false, missing: LOCALE_REFUSALS.surveil };
    if (act.needsDeclaration && !underDeclaredEmergency(campaign, id)) {
        return { ok: false, missing: "a declared emergency reaching this state" };
    }
    if (act.occasion === "disorder" && cause !== "unrest")
        return { ok: false, missing: LOCALE_REFUSALS.disorder };
    if (act.needsGovernorAssent && !governorAssents(runtime.governor)) {
        return { ok: false, missing: "the governor's recorded assent, which is absent or withheld" };
    }
    const refused = predicateRefusal(campaign, id, act) ?? priorityRefused(campaign, id, act) ?? missionOrderRefused(campaign, id, act);
    if (refused)
        return { ok: false, missing: refused };
    const funded = obligationAvailability(campaign, localeActCost(campaign, act), { excepted: act.excepted });
    if (!funded.ok)
        return funded;
    return { ok: true };
}
/**
 * What reaching into a state that has not asked costs at home.
 *
 * The Stafford Act runs the other way round: every request for a declaration is
 * made by the Governor, who has to have directed the state's own response
 * first. The game already models the asking — a governor's request is a claim —
 * and simply never consulted it. Unasked relief is not refused, because a
 * President who thinks a governor is failing their own people may act anyway;
 * it is charged, and it is charged hardest where the governor is most opposed,
 * because that is the one who will say so on television.
 */
export const UNREQUESTED_RELIEF_STANDING = 0.04;
export function unrequestedReliefCost(campaign, id) {
    if (openRequests(campaign, id).length > 0)
        return 0;
    const disposition = campaign.states[id]?.governor?.disposition ?? 0.5;
    return round3(UNREQUESTED_RELIEF_STANDING * (1 - disposition));
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/** Push every open relief claim in this state further out, once. */
export function deferClaims(claims, turn) {
    return claims.map((claim) => claim.signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`) && claim.expiresTurn > turn
        ? { ...claim, expiresTurn: claim.expiresTurn + REVIEW_DEFERRAL_TURNS }
        : claim);
}
/** Standing paid for force or collection with no unrest to answer, as a multiple of the act's own. */
export const UNPROVOKED_STANDING = 2;
/**
 * A second entry point cannot waive the ordinary authority boundary. The home
 * path takes coercive acts whose occasion is not `any`; it supplies no cause, so
 * an act that answers disorder is refused there, and routine enforcement is not.
 */
export function homeActAvailability(campaign, id, act) {
    if (!act.coercion || act.occasion === "any")
        return { ok: false, missing: "an act of force or collection" };
    return localeAvailability(campaign, id, act);
}
/** The charter the mission orders are signed under. */
export function playerCharter(campaign) {
    return worldDataset.charters.find((entry) => entry.id === campaign.founding.charter);
}
/**
 * Whether this state is currently asking for something.
 *
 * The player-facing half of the obligation ledger: a governor's request is a
 * claim, and this is how a surface asks whether one is open.
 */
export function openRequests(campaign, id) {
    const runtime = campaign.states[id];
    if (!runtime)
        return [];
    return runtime.claims.filter((claim) => claim.signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`));
}
