import type { RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import { selectCabinetHolder } from "./state-selectors.js";
import type { Effect, EffectPacket } from "./effects.js";
import { institutionDef } from "./institutions.js";
import { committeeForInstitution, committeeName } from "./committees.js";
import type { TurnPhase } from "./turn-loop.js";
import type { OversightMatter } from "./oversight.js";
import { isMatterOpen, matterSource } from "./oversight.js";

// The prosecutor the President cannot instruct.
//
// Every other check on this presidency answers to somebody the player can
// reach. An inspector general can be given thirty days' notice. A committee
// needs a chair who wants a hearing. The department that would actually bring a
// case is run by a member of the cabinet, and a cabinet seat is a chair the
// President fills and empties — so the one inquiry that could end in a
// prosecution was, structurally, the one inquiry the President was already
// standing on top of.
//
// A special counsel is what the department does about that. The Attorney
// General appoints one out of a matter the department can no longer be seen to
// be handling itself, and from that day nobody in the administration supervises
// it: there is no presidential verb anywhere in this file, and none anywhere
// else that reaches its matter. What is left to the President is the chair the
// appointment came out of. Emptying it does not stop the counsel — it marks its
// matter obstructed, permanently, on the record, which is the price of the only
// move the office has.

/** The department a counsel is appointed out of, and the panel notified. */
const COUNSEL_DEPARTMENT = "INST-DOJ";

/**
 * The cabinet seat that appoints and could remove one.
 *
 * Read off the catalog's own join rather than named here, so the seat this
 * file means is the seat the rest of the government means by the Department of
 * Justice — and a charter that seats no Attorney General simply has no counsel
 * to appoint, which is the honest outcome rather than a crash.
 */
export function attorneyGeneralRole(): RoleId | undefined {
  return institutionDef(COUNSEL_DEPARTMENT)?.cabinetRole;
}

/** The committee a counsel's appointment and removal are notified to. */
function judiciaryCommittee(): string {
  return committeeForInstitution(COUNSEL_DEPARTMENT) ?? "CMTE-JUDICIARY";
}

export function isSpecialCounselMatter(matter: OversightMatter): boolean {
  return matter.origin.kind === "special-counsel";
}

export function selectSpecialCounselMatters(campaign: Campaign): readonly OversightMatter[] {
  return campaign.oversight.matters.filter(isSpecialCounselMatter);
}

/** The counsels actually sitting, which is what any price depends on. */
export function selectOpenSpecialCounsel(campaign: Campaign): readonly OversightMatter[] {
  return selectSpecialCounselMatters(campaign).filter(isMatterOpen);
}

// --- What gets one appointed ------------------------------------------------

/**
 * The bar a matter has to clear before the department stops handling it itself.
 *
 * Three facts, all of them already on the record and none of them invented for
 * this file: the matter is aimed at the administration, the administration
 * moved against the people conducting it, and it has reported — a finding the
 * country can read rather than a suspicion somebody holds. The first two are
 * what makes the department's own handling untenable; the third is what makes
 * it ripe. A counsel appointed on an open file would be a prosecutor named for
 * a hunch, which is the thing the office is most often wrongly accused of
 * being.
 *
 * A counsel's own matter is excluded, because a counsel that could beget a
 * counsel is a chain rather than an appointment.
 */
function predicateMatters(campaign: Campaign): readonly OversightMatter[] {
  const taken = new Set(
    selectSpecialCounselMatters(campaign).flatMap((matter) =>
      matter.origin.kind === "special-counsel" ? [matter.origin.predicate] : [],
    ),
  );
  return campaign.oversight.matters.filter(
    (matter) =>
      matter.direction === "received" &&
      matter.public &&
      matter.obstructed &&
      matter.stage === "reported" &&
      !isSpecialCounselMatter(matter) &&
      !taken.has(matter.id),
  );
}

/** Whether the department has a confirmed Attorney General to make the appointment. */
function seatedAttorneyGeneral(campaign: Campaign): string | undefined {
  const role = attorneyGeneralRole();
  if (!role) return undefined;
  const holder = selectCabinetHolder(campaign, role);
  return holder?.alive ? holder.base.name : undefined;
}

function appointedCounsel(campaign: Campaign, predicate: OversightMatter): OversightMatter {
  const subject = `${predicate.subject}, and how this administration answered the inquiry into it`;
  return {
    id: `matter:counsel:${campaign.turn}|${predicate.id}`,
    origin: { kind: "special-counsel", predicate: predicate.id },
    direction: "received",
    subject,
    openedTurn: campaign.turn,
    stage: "opened",
    // An appointment is announced and the committee is told the same day. There
    // is no quiet window on a counsel the way there is on an audit: the reason
    // the office exists is that the department could no longer be seen to be
    // handling this quietly.
    public: true,
    obstructed: false,
    beats: [
      {
        turn: campaign.turn,
        description: `The Attorney General appoints a special counsel to take over ${predicate.subject}. Nobody in the administration supervises it.`,
      },
    ],
  };
}

/**
 * The week the department stops handling something itself.
 *
 * One counsel at a time across the whole government, and the oldest ripe matter
 * first: a president with three reported obstructions should watch the second
 * appointment arrive after the first is finished, rather than open the board to
 * a standing panel of prosecutors.
 */
export const specialCounselPhase: TurnPhase = (state: Campaign) => {
  if (selectOpenSpecialCounsel(state).length > 0) return [];
  const attorneyGeneral = seatedAttorneyGeneral(state);
  if (!attorneyGeneral) return [];
  const predicate = [...predicateMatters(state)].sort(
    (a, b) => a.openedTurn - b.openedTurn || a.id.localeCompare(b.id),
  )[0];
  if (!predicate) return [];

  const counsel = appointedCounsel(state, predicate);
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      narration: { summary: counsel.beats[0]!.description },
      effects: [
        { kind: "oversight", matters: [counsel] },
        {
          kind: "feed",
          items: [
            {
              turn: state.turn,
              kind: "governance",
              visibility: "public",
              headline: `${attorneyGeneral} notifies the ${committeeName(judiciaryCommittee())} of the appointment of a special counsel.`,
              facts: { subject: attorneyGeneral },
            },
          ],
        },
      ],
    },
  ] satisfies readonly EffectPacket[];
};

// --- What the President can still do ----------------------------------------

/**
 * What emptying the Attorney General's chair does to a counsel already sitting.
 *
 * More than the same move against an inspector general, and for a reason the
 * arithmetic should state rather than assume: an inspector's removal is one
 * office going dark, and this is the President reaching for the only person who
 * could dismiss the prosecutor looking at them. The counsel does not stop —
 * nothing in this engine stops one — so what the act buys is nothing at all,
 * and what it costs is a fact on the record that no later week takes back.
 */
const COUNSEL_DISMISSAL_DISPOSITION_COST = 0.2;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

function obstructedByDismissal(matter: OversightMatter, turn: number, name: string): OversightMatter {
  return {
    ...matter,
    obstructed: true,
    beats: [
      ...matter.beats,
      {
        turn,
        description: `${name} is dismissed as Attorney General while this counsel is sitting. The counsel continues.`,
      },
    ],
  };
}

/**
 * The oversight, chamber and press effects a dismissal of the Attorney General
 * carries while a counsel is sitting.
 *
 * Returned as effects rather than as a packet so the dismissal stays one act in
 * the record: a president who fires the Attorney General has done one thing,
 * and the record should not show them doing two on the same day.
 */
export function counselDismissalEffects(
  campaign: Campaign,
  role: RoleId,
  name: string,
): readonly Effect[] {
  if (role !== attorneyGeneralRole()) return [];
  const sitting = selectOpenSpecialCounsel(campaign);
  if (sitting.length === 0) return [];
  const panel = committeeName(judiciaryCommittee());
  return [
    {
      kind: "oversight",
      matters: sitting.map((matter) => obstructedByDismissal(matter, campaign.turn, name)),
    },
    {
      kind: "congress",
      set: {
        ...campaign.congress,
        disposition: round3(clamp01(campaign.congress.disposition - COUNSEL_DISMISSAL_DISPOSITION_COST)),
      },
    },
    {
      kind: "feed",
      items: [
        {
          turn: campaign.turn,
          kind: "governance",
          visibility: "public",
          headline: `The ${panel} is notified that the Attorney General has been removed with a special counsel sitting.`,
          facts: { subject: name },
        },
      ],
    },
  ];
}

/**
 * What the chair costs while a counsel is sitting, for the screen that offers
 * to empty it.
 *
 * Absent when there is nothing sitting, so a surface reading this has no way to
 * warn about a prosecutor who does not exist.
 */
export type CounselPrice = {
  readonly counsel: readonly OversightMatter[];
  readonly reasoning: string;
};

export function projectCounselObstruction(campaign: Campaign, role: RoleId): CounselPrice | undefined {
  if (role !== attorneyGeneralRole()) return undefined;
  const counsel = selectOpenSpecialCounsel(campaign);
  if (counsel.length === 0) return undefined;
  return {
    counsel,
    reasoning: `${matterSource(counsel[0]!)} is sitting. Dismissing the Attorney General does not close it: the ${committeeName(judiciaryCommittee())} is notified, the matter is marked obstructed for good, and the chamber reads the removal as the answer to the inquiry.`,
  };
}
