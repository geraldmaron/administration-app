import type { NationId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import { selectNation } from "./state.js";
import { campaignDay } from "./nomination.js";

// The covert action finding, as an object with three honest states rather than
// as nothing at all.
//
// The covert ladder already existed: five rungs, a real capability they spend,
// a consultation table that names the intelligence committees. What it did not
// have was the piece of paper. Every one of those rungs is, in law, an activity
// that requires the President to determine in writing that it is necessary,
// before it happens, and to tell the committees. A game where the rung is the
// whole act models the operation and skips the presidency.
//
// Three states, and the difference between them is the whole mechanic.
//
// **Written.** Signed before the act, reported before the act. The expensive,
// slow, unremarkable path, and the only one nobody can make anything of later.
//
// **Contemporaneous.** No time for a written finding, so a written record of the
// decision is made at the time and reduced to a finding inside forty-eight
// hours. Lawful, and it looks exactly like the third one to anybody who was not
// in the room.
//
// **Unwritten.** The forty-eight hours passed. There is no lawful way to bless
// it afterward — a finding may not authorize an action that has already
// occurred — so what exists is an operation with no authority behind it, and
// everyone who touched it knows.
//
// Two things a finding can never do, and both are refusals rather than prices:
// it cannot authorize what a statute forbids, and it cannot be aimed at United
// States political processes, opinion, policy or media.

export type FindingId = string;

export type FindingState = "written" | "contemporaneous" | "unwritten";

/** Who was told, which is a separate decision from what was authorized. */
export type NotificationTier = "full-committees" | "gang-of-eight" | "withheld";

export type CovertFinding = {
  readonly id: FindingId;
  readonly objective: string;
  readonly target: NationId;
  readonly signedDay: number;
  readonly signedDate: GameDate;
  readonly state: FindingState;
  readonly notification: NotificationTier;
  /** Required when prior notice was withheld: the statement of reasons the President owes. */
  readonly reasonsWithheld?: string;
  readonly notifiedDay?: number;
  /** Acts taken under this finding. A finding nothing was done under is still a decision. */
  readonly activities: number;
  readonly closedDay?: number;
};

export type UnfoundedAction = {
  readonly id: string;
  readonly target: NationId;
  readonly rung: number;
  readonly turn: number;
  readonly description: string;
};

export type FindingsState = {
  readonly findings: readonly CovertFinding[];
  /** Covert acts taken with no finding standing over them. Kept forever. */
  readonly unfounded: readonly UnfoundedAction[];
};

export function foundingFindings(): FindingsState {
  return { findings: [], unfounded: [] };
}

// --- Reading ---------------------------------------------------------------

export function selectFindings(campaign: Campaign): readonly CovertFinding[] {
  return [...campaign.security.covert.findings].sort(
    (a, b) => b.signedDay - a.signedDay || a.id.localeCompare(b.id),
  );
}

/** The finding, if any, that would cover a covert act against this country today. */
export function standingFinding(campaign: Campaign, target: NationId): CovertFinding | undefined {
  return campaign.security.covert.findings.find(
    (finding) => finding.target === target && finding.closedDay === undefined,
  );
}

export function selectUnfoundedActions(campaign: Campaign): readonly UnfoundedAction[] {
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
export function findingRefusal(campaign: Campaign, objective: string, target: NationId): string | undefined {
  if (!objective.trim()) return "A finding has to state what it authorizes.";
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

export type FindingResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/**
 * Sign a finding.
 *
 * An objective that cannot lawfully be authorized is not refused silently: the
 * packet records the attempt, because a president asking counsel to paper an
 * unlawful operation is an event even when — especially when — the answer was
 * no.
 */
export function signFinding(
  campaign: Campaign,
  objective: string,
  target: NationId,
  state: FindingState,
  notification: NotificationTier,
  reasonsWithheld?: string,
): FindingResult {
  const nation = selectNation(campaign, target);
  if (!nation) return { ok: false, reason: "No such nation." };
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
          entities: [target as string, "INST-CIA"],
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

  const finding: CovertFinding = {
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
        entities: [target as string, "INST-CIA"],
        systems: ["covert-action"],
        visibility: "intelligence",
      },
      narration: {
        summary:
          notification === "withheld"
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

function withholdingCost(campaign: Campaign): readonly Effect[] {
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

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Tell the committees about a finding whose notice was withheld. */
export function notifyCommittees(campaign: Campaign, id: FindingId, statement: string): FindingResult {
  const finding = campaign.security.covert.findings.find((entry) => entry.id === id);
  if (!finding) return { ok: false, reason: "No such finding." };
  if (finding.notifiedDay !== undefined) return { ok: false, reason: "The committees have already been told." };
  if (!statement.trim()) return { ok: false, reason: "The notification owes a statement of reasons." };

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
        entities: [finding.target as string, "INST-CIA"],
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
export function closeFinding(campaign: Campaign, id: FindingId): FindingResult {
  const finding = campaign.security.covert.findings.find((entry) => entry.id === id);
  if (!finding) return { ok: false, reason: "No such finding." };
  if (finding.closedDay !== undefined) return { ok: false, reason: "That finding is already closed." };
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [finding.target as string],
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
export function recordCovertAction(
  campaign: Campaign,
  actor: NationId,
  target: NationId,
  rung: number,
  description: string,
): readonly Effect[] {
  if (actor !== campaign.founding.nation) return [];
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
