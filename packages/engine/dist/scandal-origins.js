import { fnv1a, mulberry32 } from "@admin/world";
import { institutionDef } from "./institutions.js";
import { RIVAL_LEAK_SYSTEM } from "./cabinet-alignment.js";
import { flagMarker } from "./marked-flags.js";
/**
 * How grave a story is by what it charges, 0..1, scaling what the story costs
 * the country's belief in the government's honesty at any given heat.
 *
 * One at most, so the heaviest story costs what a live story always cost and
 * the rest cost less. The order is the order a public weighs them in: a hearing
 * about the act itself and a covert operation that came apart are about the
 * President's own honesty; a source lost is grave and mostly unseen; reaching
 * for emergency powers splits the country on whether it was warranted; a leak
 * traced to the building is about the staff before it is about the President;
 * an auditor's report is about a department before it is about its chief; and
 * an officer talking out of turn is the officer's story first.
 */
export const SCANDAL_GRAVITY = {
    "conduct-in-question": 1,
    "covert-failure": 1,
    flagged: 1,
    "burned-source": 0.8,
    "emergency-powers": 0.7,
    leak: 0.7,
    "ig-finding": 0.6,
    "cabinet-leak": 0.5,
};
const OWN_ACT_SUBJECT = {
    "emergency-powers": "the emergency powers the President reached for, and whether the situation warranted them",
    "burned-source": "a source this country was running, and what the decision cost the person who was it",
    "covert-failure": "a covert operation run on the President's own authority that did not stay covert",
    "conduct-in-question": "whether the administration told the truth about what it did, and who knew",
};
/**
 * Which declared costs are stories, and why the rest are not.
 *
 * The test is not how much an act cost but whether a newsroom would run it for
 * six weeks. `legal-authority-spent` is declared on about a fifth of every
 * authored reply, because spending legal authority is what a hard decision
 * ordinarily does; a charge that fires that often is a permanent condition, not
 * a scandal channel. Reaching for emergency powers and getting a source killed
 * are rare, and they are the two an administration gets asked about daily for a
 * month. A hearing about the act itself is the plainest scandal an act can
 * cost, and is declared only on the weeks where the question is whether the
 * government can be believed.
 *
 * A strained civil service, a spent legislative majority and alliance credit
 * are prices, not stories, and the press reads them as what the act argued for
 * (`press-beliefs.ts`), never as a charge.
 */
const CHARGE_FOR_COST = {
    "emergency-powers-invoked": "emergency-powers",
    "intelligence-source-burned": "burned-source",
    "conduct-in-question": "conduct-in-question",
};
/**
 * The chair a charge lands on when the act took no counsel: the officer whose
 * department did the thing. Read off the institution catalog, so a charter that
 * seats no such officer simply names nobody.
 */
const CHARGE_DEPARTMENT = {
    "emergency-powers": "INST-DOJ",
    "conduct-in-question": "INST-DOJ",
    "burned-source": "INST-ODNI",
    "covert-failure": "INST-ODNI",
};
/**
 * The share of cabinet leaks that turn into a story about conduct. Most leaks
 * are an officer losing a policy argument in public, which is a bad day and not
 * a scandal; about one in three carries something the government did that it
 * would rather nobody knew. At the cabinet's six to fifteen leaks a term that is
 * two to five stories a term from inside the building.
 */
export const CABINET_LEAK_STORY_SHARE = 1 / 3;
/**
 * The charge a decision can be asked about, if any: one per act, in the order a
 * newsroom would lead on. A covert operation that came apart is the story
 * whatever else the same week also spent.
 */
function chargeFor(entry) {
    if (entry.commitment?.instrument === "covert" && entry.commitment.landed === false)
        return "covert-failure";
    for (const cost of entry.institutional ?? []) {
        const charge = CHARGE_FOR_COST[cost];
        if (charge)
            return charge;
    }
    return undefined;
}
function seatHolding(campaign, person) {
    const seat = Object.entries(campaign.player.cabinet).find(([, holder]) => holder === person);
    return seat ? seat[0] : undefined;
}
function departmentChair(campaign, charge) {
    const department = CHARGE_DEPARTMENT[charge];
    const role = department ? institutionDef(department)?.cabinetRole : undefined;
    const person = role ? campaign.player.cabinet[role] : undefined;
    return role && person ? { person, role } : undefined;
}
/** The officer a decision's story names: the chair that advised it, else the chair whose department carried it out. */
function implicatedFor(campaign, entry, charge) {
    if (entry.counsel && entry.counsel.role !== campaign.founding.leadRole) {
        return { person: entry.counsel.person, role: entry.counsel.role };
    }
    return departmentChair(campaign, charge);
}
function isChargedAct(entry) {
    return entry.actor === "player" && entry.causal !== undefined && chargeFor(entry) !== undefined;
}
function isCabinetLeak(entry) {
    const systems = entry.causal?.systems ?? [];
    return entry.actor === "world" && systems.includes("cabinet") && systems.includes("leak");
}
// Every packet the engine applies re-reads approval, approval reads the
// standing stories, and every packet appends to the ledger: rescanning a
// term's twelve thousand entries per packet was a quarter of a week's cost.
// Whether an entry can open a story is a fact about the entry alone, so the
// list is extended from the last ledger read whenever the new ledger begins
// with it entry for entry, and rebuilt in full otherwise.
let lastStoryEntries;
function beginsWith(ledger, prefix) {
    if (prefix.length > ledger.length)
        return false;
    for (let index = prefix.length - 1; index >= 0; index -= 1)
        if (ledger[index] !== prefix[index])
            return false;
    return true;
}
function storyEntries(ledger) {
    const prior = lastStoryEntries;
    if (prior?.ledger === ledger)
        return prior;
    const extending = prior !== undefined && beginsWith(ledger, prior.ledger);
    const acts = extending ? [...prior.acts] : [];
    const leaks = extending ? [...prior.leaks] : [];
    for (let index = extending ? prior.ledger.length : 0; index < ledger.length; index += 1) {
        const entry = ledger[index];
        if (isChargedAct(entry))
            acts.push(entry);
        else if (entry.causal !== undefined && isCabinetLeak(entry))
            leaks.push(entry);
    }
    lastStoryEntries = { ledger, acts, leaks };
    return lastStoryEntries;
}
function ownActIdentities(campaign) {
    return storyEntries(campaign.ledger).acts.flatMap((entry) => {
        const charge = chargeFor(entry);
        if (!charge || entry.causal === undefined)
            return [];
        const implicated = implicatedFor(campaign, entry, charge);
        return [
            {
                id: `scandal:act:${entry.causal.eventId}`,
                subject: OWN_ACT_SUBJECT[charge],
                origin: { kind: "own-act", eventId: entry.causal.eventId, charge },
                charge,
                brokeTurn: entry.turn,
                context: entry.description,
                ...(implicated ? { implicated } : {}),
            },
        ];
    });
}
/**
 * Whether this leak is one of the third that carries a story, the same answer
 * on every read. Mixed through a generator rather than read off the bare hash,
 * because event ids differ only in their last digits and the bare hash of two
 * such keys lands close together.
 */
function leakCarriesStory(campaign, eventId) {
    return mulberry32(fnv1a(`${campaign.seed}::leak-story::${eventId}`))() < CABINET_LEAK_STORY_SHARE;
}
/** The officer a story names, with the chair they still hold if they hold one. */
function implicatedPerson(campaign, person) {
    const role = seatHolding(campaign, person);
    return role ? { person, role } : { person };
}
/**
 * The colleague a leak was aimed at, read off the leak's own record: the
 * second person on an entry tagged as aimed. A story about an aimed leak is a
 * story about its target, which is the leaker's whole purpose in placing it.
 */
function aimedAt(campaign, entry) {
    if (!entry.causal?.systems?.includes(RIVAL_LEAK_SYSTEM))
        return undefined;
    const target = entry.causal.entities?.[1];
    return target !== undefined && campaign.people[target] !== undefined ? target : undefined;
}
function leakSubject(campaign, person, target) {
    const name = campaign.people[person]?.base.name ?? "An officer";
    if (target === undefined)
        return `what ${name} told the press about how the administration does its business`;
    return `what ${name} told the press about how ${campaign.people[target]?.base.name ?? "a colleague"} does the job`;
}
function cabinetLeakIdentities(campaign) {
    return storyEntries(campaign.ledger).leaks.flatMap((entry) => {
        if (entry.causal === undefined)
            return [];
        const eventId = entry.causal.eventId;
        const person = (entry.causal.entities ?? []).find((id) => campaign.people[id] !== undefined);
        if (!person || !leakCarriesStory(campaign, eventId))
            return [];
        const target = aimedAt(campaign, entry);
        return [
            {
                id: `scandal:leak:${eventId}`,
                subject: leakSubject(campaign, person, target),
                origin: { kind: "cabinet-leak", eventId, person, ...(target === undefined ? {} : { target }) },
                charge: "cabinet-leak",
                brokeTurn: entry.turn,
                context: entry.description,
                implicated: implicatedPerson(campaign, target ?? person),
            },
        ];
    });
}
/** The week a matter's report went on the record, if it has reported. */
function reportedTurn(matter) {
    if (matter.finding === undefined)
        return undefined;
    return matter.beats.find((beat) => beat.description === matter.finding)?.turn;
}
function inspectorIdentities(campaign) {
    return campaign.oversight.matters.flatMap((matter) => {
        if (matter.origin.kind !== "inspector-general" || matter.direction !== "received" || !matter.public)
            return [];
        const turn = reportedTurn(matter);
        if (turn === undefined)
            return [];
        const institution = matter.origin.institution;
        const role = institutionDef(institution)?.cabinetRole;
        const cause = matter.causeId ? campaign.ledger.find((entry) => entry.causal?.eventId === matter.causeId) : undefined;
        const graft = cause?.causal?.graft;
        const person = graft?.person ?? (role ? campaign.player.cabinet[role] : undefined);
        return [
            {
                id: `scandal:ig:${matter.id}`,
                subject: `what the inspector general found about ${matter.subject}`,
                origin: { kind: "inspector-general", matterId: matter.id, institution },
                charge: "ig-finding",
                brokeTurn: turn,
                ...(matter.finding === undefined ? {} : { context: matter.finding }),
                ...(role && person ? { implicated: { person: person, role } } : {}),
            },
        ];
    });
}
function leakIdentity(engagementId, brokeTurn) {
    return {
        id: `scandal:${engagementId}`,
        subject: "a leak placed with the press that came back sourced to the administration's own staff",
        origin: { kind: "leak-backfire", engagementId },
        charge: "leak",
        brokeTurn,
    };
}
/**
 * The week a flag was set, off the marker every authored flag is stamped with.
 * A flag with no marker has no date, and is read exactly as it was before
 * markers existed.
 */
export function flagSetTurn(campaign, flag) {
    const prefix = flagMarker(flag, 0).slice(0, -1);
    const turns = Object.keys(campaign.player.flags)
        .filter((key) => key.startsWith(prefix) && campaign.player.flags[key])
        .map((key) => Number(key.slice(prefix.length)))
        .filter((turn) => Number.isInteger(turn));
    return turns.length > 0 ? Math.min(...turns) : undefined;
}
/**
 * The flag the scandal phase keeps standing while any story is live, so a
 * scenario can gate on "a story is running" without reading the board. It
 * shares the `scandal:` prefix a scenario would look for, so it is excluded
 * here by name or it would open a story about itself.
 */
export const SCANDAL_LIVE_FLAG = "scandal:live";
export function flagIdentity(flag, brokeTurn) {
    const subject = flag.slice("scandal:".length).replace(/-/g, " ").trim();
    return {
        id: `scandal:flag:${flag}`,
        subject: subject.length > 0 ? subject : "a matter the administration has not answered for",
        origin: { kind: "flagged", flag },
        charge: "flagged",
        brokeTurn,
    };
}
/** Authored scandal flags standing on the board, with the week each was set where it was stamped. */
export function scandalFlags(campaign) {
    return Object.keys(campaign.player.flags)
        .filter((flag) => flag.startsWith("scandal:") && flag !== SCANDAL_LIVE_FLAG && campaign.player.flags[flag])
        .map((flag) => {
        const setTurn = flagSetTurn(campaign, flag);
        return setTurn === undefined ? { flag } : { flag, setTurn };
    });
}
/** Every dated story the campaign's facts can open: bad leaks, the President's own acts, cabinet leaks and auditors' reports. */
export function datedScandalIdentities(campaign) {
    const fromLeaks = campaign.press.engagements
        .filter((engagement) => engagement.kind === "leak" && !engagement.wentWell)
        .map((engagement) => leakIdentity(engagement.id, engagement.turn));
    return [
        ...fromLeaks,
        ...ownActIdentities(campaign),
        ...cabinetLeakIdentities(campaign),
        ...inspectorIdentities(campaign),
    ];
}
