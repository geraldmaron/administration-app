import { selectNation } from "./state.js";
import { campaignDay } from "./nomination.js";
export function foundingFindings() {
    return { findings: [], unfounded: [] };
}
// --- Reading ---------------------------------------------------------------
export function selectFindings(campaign) {
    return [...campaign.security.covert.findings].sort((a, b) => b.signedDay - a.signedDay || a.id.localeCompare(b.id));
}
/** The finding, if any, that would cover a covert act against this country today. */
export function standingFinding(campaign, target) {
    return campaign.security.covert.findings.find((finding) => finding.target === target && finding.closedDay === undefined);
}
export function selectUnfoundedActions(campaign) {
    return campaign.security.covert.unfounded;
}
// --- What a finding may not authorize --------------------------------------
const DOMESTIC_TERMS = [
    "american public",
    "domestic",
    "election",
    "opposition party",
    "the press",
    "public opinion",
    "voters",
];
/**
 * Why this cannot be signed, or nothing.
 *
 * Deliberately a text check on the objective the player wrote rather than a
 * hidden flag on a scenario: the objective is the thing the President is
 * signing, and if it says the operation is aimed at an American audience then
 * that is what the finding would say, whatever else was meant by it.
 */
export function findingRefusal(campaign, objective, target) {
    if (!objective.trim())
        return "A finding has to state what it authorizes.";
    if (target === campaign.founding.nation) {
        return "A finding may not authorize covert action inside the United States or against its own political processes.";
    }
    const lowered = objective.toLowerCase();
    const domestic = DOMESTIC_TERMS.find((term) => lowered.includes(term));
    if (domestic) {
        return `No covert action may be conducted that is intended to influence United States political processes, public opinion, policy or media. The objective as written turns on "${domestic}".`;
    }
    return undefined;
}
/**
 * Sign a finding.
 *
 * An objective that cannot lawfully be authorized is not refused silently: the
 * packet records the attempt, because a president asking counsel to paper an
 * unlawful operation is an event even when — especially when — the answer was
 * no.
 */
export function signFinding(campaign, objective, target, state, notification, reasonsWithheld) {
    const nation = selectNation(campaign, target);
    if (!nation)
        return { ok: false, reason: "No such nation." };
    if (state === "unwritten") {
        return { ok: false, reason: "A finding cannot be signed as unwritten. That is what a finding stops being." };
    }
    if (notification === "withheld" && !reasonsWithheld?.trim()) {
        return {
            ok: false,
            reason: "Withholding prior notice requires a statement of the reasons for withholding it.",
        };
    }
    if (standingFinding(campaign, target)) {
        return { ok: false, reason: `A finding on ${nation.base.identity.name} is already standing.` };
    }
    const day = campaignDay(campaign);
    const refusal = findingRefusal(campaign, objective, target);
    if (refusal) {
        return {
            ok: true,
            packet: {
                source: "action",
                actor: "player",
                turn: campaign.turn,
                provenance: {
                    origin: "decision",
                    entities: [target, "INST-CIA"],
                    systems: ["covert-action"],
                    visibility: "internal",
                },
                narration: { summary: `Counsel will not paper the finding: ${refusal}` },
                effects: [
                    {
                        kind: "finding",
                        refusedObjective: {
                            id: `finding-refused:${target}:${day}`,
                            target,
                            rung: 0,
                            turn: campaign.turn,
                            description: `${objective} — refused: ${refusal}`,
                        },
                    },
                ],
            },
        };
    }
    const finding = {
        id: `finding:${target}:${day}`,
        objective,
        target,
        signedDay: day,
        signedDate: campaign.calendar,
        state,
        notification,
        ...(reasonsWithheld ? { reasonsWithheld } : {}),
        ...(notification === "withheld" ? {} : { notifiedDay: day }),
        activities: 0,
    };
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: {
                origin: "decision",
                entities: [target, "INST-CIA"],
                systems: ["covert-action"],
                visibility: "intelligence",
            },
            narration: {
                summary: notification === "withheld"
                    ? `A finding on ${nation.base.identity.name} is signed, and the committees are not told yet.`
                    : `A finding on ${nation.base.identity.name} is signed and reported to ${notification === "gang-of-eight" ? "the eight" : "the committees"}.`,
            },
            effects: [
                { kind: "finding", sign: finding },
                ...(notification === "withheld" ? withholdingCost(campaign) : []),
            ],
        },
    };
}
const WITHHOLDING_DISPOSITION_COST = 0.04;
function withholdingCost(campaign) {
    return [
        {
            kind: "congress",
            set: {
                ...campaign.congress,
                disposition: Math.max(0, round3(campaign.congress.disposition - WITHHOLDING_DISPOSITION_COST)),
            },
        },
    ];
}
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
/** Tell the committees about a finding whose notice was withheld. */
export function notifyCommittees(campaign, id, statement) {
    const finding = campaign.security.covert.findings.find((entry) => entry.id === id);
    if (!finding)
        return { ok: false, reason: "No such finding." };
    if (finding.notifiedDay !== undefined)
        return { ok: false, reason: "The committees have already been told." };
    if (!statement.trim())
        return { ok: false, reason: "The notification owes a statement of reasons." };
    const day = campaignDay(campaign);
    const late = day - finding.signedDay;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: {
                origin: "decision",
                entities: [finding.target, "INST-CIA"],
                systems: ["covert-action"],
                visibility: "intelligence",
            },
            narration: {
                summary: `The committees are informed of a finding signed ${late} ${late === 1 ? "day" : "days"} ago, with the President's reasons for the delay.`,
            },
            effects: [{ kind: "finding", notify: { id, day, statement } }],
        },
    };
}
/** Close a finding out. An operation nobody has ended is an operation still running. */
export function closeFinding(campaign, id) {
    const finding = campaign.security.covert.findings.find((entry) => entry.id === id);
    if (!finding)
        return { ok: false, reason: "No such finding." };
    if (finding.closedDay !== undefined)
        return { ok: false, reason: "That finding is already closed." };
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: {
                origin: "decision",
                entities: [finding.target],
                systems: ["covert-action"],
                visibility: "intelligence",
            },
            narration: {
                summary: `The finding on ${selectNation(campaign, finding.target)?.base.identity.name ?? finding.target} is closed out.`,
            },
            effects: [{ kind: "finding", close: { id, day: campaignDay(campaign) } }],
        },
    };
}
/**
 * What a covert rung leaves on the paper trail.
 *
 * Written the way the war powers record is: the act is permitted, the record is
 * permanent, and the compounding happens because the record is read later
 * rather than because a counter was invented for it. An act covered by a
 * standing finding counts against that finding; an act with nothing standing
 * over it is an operation the President ordered without authorizing, which is
 * the fact the committees eventually ask about.
 *
 * Applied to the player's own government and nobody else's, for the reason the
 * war powers record is: the campaign carries one presidency.
 */
export function recordCovertAction(campaign, actor, target, rung, description) {
    if (actor !== campaign.founding.nation)
        return [];
    const finding = standingFinding(campaign, target);
    if (finding) {
        return [{ kind: "finding", activity: { id: finding.id } }];
    }
    return [
        {
            kind: "finding",
            unfounded: {
                id: `unfounded:${target}:${campaign.turn}`,
                target,
                rung,
                turn: campaign.turn,
                description,
            },
        },
    ];
}
