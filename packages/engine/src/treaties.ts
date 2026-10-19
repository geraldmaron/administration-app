import type { Charter, NationId, OrgId, TreatyId } from "@admin/world";
import {
  selectNation,
  selectRelationship,
  selectTreaties,
  sharesCompact,
  type Campaign,
  type ChamberVote,
  type IssuedTreatyAct,
  type LobbyForecast,
  type TreatyKind,
  type TreatyRecord,
} from "./state.js";
import { supermajorityOf } from "./congress.js";
import { voteOn } from "./congress-votes.js";
import { headOfGovernmentTitle, nationName, sentenceCase } from "./naming.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { addDays, compareDates } from "./clock.js";
import { confidenceFromEvidence, likelihoodFromUnitInterval } from "./assessments.js";
import { counterpartDecision, counterpartRefusal } from "./treaty-counterpart.js";

// The one vote a president cannot win by winning an election.
//
// Congress arrived with two arithmetics and they are the same arithmetic: a
// simple majority confirms a Secretary and a simple majority appropriates the
// year's money. Ratification is neither. Two thirds of the Senate is a bar an
// administration with a comfortable majority still fails, which makes it the
// only constraint on the board that a popular president feels — and it is
// exactly the constraint that decides what the top of the diplomatic ladder is
// actually worth. A summit produces a document; the document binds nobody until
// sixty-seven senators say so.
//
// So a president can sign what the Senate will not ratify, and the model has to
// let them: it is one of the most characteristic failures of the office, and a
// system that refused the signature would be quietly asserting that a president
// only ever promises what they can deliver.

// --- What can be signed -----------------------------------------------------

export type TreatyTerms = {
  readonly kind: TreatyKind;
  readonly name: string;
  readonly summary: string;
  /**
   * What the Senate thinks of this kind of instrument before it reads the
   * particular one. An arms-control treaty is the hardest thing to get sixty-
   * seven votes for and a trade agreement is the easiest, and neither of those
   * facts has anything to do with the counterpart.
   *
   * Absent for a kind that binds on signature: it never reaches a Senate whip
   * count to have an opinion about.
   */
  readonly senateAppeal?: number;
  /** What being in force does to the relationship it is with. */
  readonly effect: { readonly trust: number; readonly alignment: number; readonly tension: number };
  /** How warm the counterpart has to be before there is anything to sign. */
  readonly minTrust: number;
  /**
   * Whether this instrument needs the Senate's two thirds before it does
   * anything, or takes effect the moment it is signed.
   *
   * An Article II treaty binds on ratification. Most of what the United States
   * actually concludes abroad is a congressional-executive or sole executive
   * agreement instead (Case-Zablocki Act, 1 U.S.C. section 112b) — the
   * President's own authority is enough, no vote is taken, and what is bought
   * with the missing vote is durability: the relationship effect is smaller,
   * and the next administration can walk away from it unilaterally in a way it
   * cannot from a ratified treaty.
   */
  readonly bindsOn: "ratification" | "signature";
};

export const TREATY_TERMS: Readonly<Record<TreatyKind, TreatyTerms>> = {
  alliance: {
    kind: "alliance",
    name: "Treaty of Mutual Defense",
    summary: "An armed attack on either party is treated as an attack on both, and consultation is continuous.",
    senateAppeal: -0.05,
    effect: { trust: 0.18, alignment: 0.22, tension: -0.12 },
    minTrust: 0.25,
    bindsOn: "ratification",
  },
  trade: {
    kind: "trade",
    name: "Agreement on Trade and Investment",
    summary: "Tariff schedules bound at their current levels, with an arbitration panel for what the schedules do not cover.",
    senateAppeal: 0.08,
    effect: { trust: 0.1, alignment: 0.1, tension: -0.06 },
    minTrust: -0.1,
    bindsOn: "ratification",
  },
  "arms-control": {
    kind: "arms-control",
    name: "Treaty on the Limitation of Strategic Arms",
    summary: "Ceilings on deployed systems, with inspection rights on both sides and a withdrawal clause neither side expects to use.",
    // The hardest of the three, always, and hardest of all with a government
    // the Senate does not trust — which is the only kind anyone signs one with.
    senateAppeal: -0.14,
    effect: { trust: 0.12, alignment: 0.06, tension: -0.2 },
    minTrust: -0.3,
    bindsOn: "ratification",
  },
  "executive-agreement": {
    kind: "executive-agreement",
    name: "Executive Agreement",
    summary: "Concluded on the President's own authority alone. It binds this administration the moment it is signed, and nothing more permanent than that.",
    effect: { trust: 0.06, alignment: 0.05, tension: -0.04 },
    // The one instrument a government that will not sit down for a treaty will
    // still take: no Senate to fail in front of, and a narrower, revocable
    // promise is a cheaper thing for either side to be seen making.
    minTrust: -0.4,
    bindsOn: "signature",
  },
};

/**
 * The instrument a standing defense compact already is.
 *
 * A mutual-defense body is not a club that has a treaty somewhere near it: NATO
 * *is* the North Atlantic Treaty, and every member is party to the same
 * document. So the id is minted per compact rather than per pair — two members
 * hold one instrument between them, and a surface that counts what is in force
 * counts it once however many capitals are inside it.
 *
 * Distinct from `treatyRecordId` by construction, so an inherited compact can
 * never be confused with something this administration signed.
 */
export function compactTreatyId(org: OrgId): TreatyId {
  return `compact:${org}` as TreatyId;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

const SENATE_SEATS = 100;

function counterpartName(campaign: Campaign, counterpart: NationId): string {
  const nation = selectNation(campaign, counterpart);
  return nation ? nationName(nation.base.identity) : (counterpart as string);
}

export function treatyTitle(campaign: Campaign, kind: TreatyKind, counterpart: NationId): string {
  return `${TREATY_TERMS[kind].name} with ${counterpartName(campaign, counterpart)}`;
}

// --- The count --------------------------------------------------------------

/**
 * How far a compact the two countries are already in carries a treaty on the
 * floor.
 *
 * Real and worth stating separately from trust: the Senate ratifies an
 * instrument with a government the United States already sits beside in a
 * standing body far more readily than one with a government it does not,
 * whatever the two capitals privately think of each other. It composes with the
 * membership model that is already on the board rather than adding a second one.
 */
const COMPACT_APPEAL = 0.12;

export type RatificationProjection = {
  readonly vote: ChamberVote;
  readonly wouldRatify: boolean;
  /** Hidden engine odds; ordinary play reads `forecast` instead. */
  readonly successChance: number;
  readonly forecast: LobbyForecast;
  /** The one-line reason the count is what it is — no exact shortfall. */
  readonly reasoning: string;
};

/**
 * Map the whip arithmetic onto a 0..1 reading without printing the count.
 * Crossing two thirds is past "roughly even"; a comfortable surplus climbs
 * toward almost certain; a wide shortfall falls toward remote.
 */
function chanceFromVote(vote: ChamberVote): number {
  if (vote.passed) {
    return clamp01(0.62 + (vote.yeas - vote.required) / 50);
  }
  return clamp01(0.45 - (vote.required - vote.yeas) / 50);
}

function ratificationForecast(
  campaign: Campaign,
  record: TreatyRecord,
  chance: number,
): LobbyForecast {
  const relationship = selectRelationship(campaign, campaign.founding.nation, record.counterpart);
  const trust = Math.abs(relationship?.trust ?? 0);
  const disposition = Math.abs(campaign.congress.disposition - 0.5);
  const evidence = clamp01(
    0.32 + disposition * 0.4 + trust * 0.18 + (sharesCompact(campaign, record.counterpart) ? 0.14 : 0),
  );
  const confidence = confidenceFromEvidence(evidence);
  return {
    likelihood: likelihoodFromUnitInterval(chance),
    confidence,
    confidenceBasis:
      confidence === "high"
        ? "Caucus posture and the relationship with the counterpart give the whip a clear read."
        : confidence === "moderate"
          ? "The whip is working from chamber mood, trust abroad, and what this kind of instrument usually costs."
          : "Little stable evidence about how this Senate answers a two-thirds ask.",
    supporting: sharesCompact(campaign, record.counterpart)
      ? "The two governments already sit in a standing body together, which carries votes the terms alone would not."
      : "How the Senate is disposed toward this administration is the strongest available factor.",
    uncertainty:
      "Members can still move between the send and the vote, and a missed whip is not a count the office can see in advance.",
    source: "Office of Senate Legislative Affairs",
    asOf: campaign.calendar,
  };
}

/**
 * The whip count before the treaty is sent up. Pure and seed-independent: the
 * engine still uses the exact arithmetic; ordinary play reads likelihood and
 * confidence instead of the yeas.
 */
export function projectRatification(campaign: Campaign, record: TreatyRecord): RatificationProjection {
  const terms = TREATY_TERMS[record.kind];
  const relationship = selectRelationship(campaign, campaign.founding.nation, record.counterpart);
  const trust = relationship?.trust ?? 0;
  const threat = relationship?.militaryThreat ?? 0;
  const appeal =
    (terms.senateAppeal ?? 0) +
    trust * 0.25 +
    (sharesCompact(campaign, record.counterpart) ? COMPACT_APPEAL : 0) -
    // Senators do not ratify an instrument with a government their own
    // intelligence briefings describe as a threat, however good the terms are.
    threat * 0.3;
  const vote = voteOn(campaign, {
    chamber: "senate",
    appeal,
    required: supermajorityOf(SENATE_SEATS),
    // Nobody's measure: consent to an instrument with another government is
    // answered on the terms and the counterpart, which is what the appeal above
    // is made of, and both caucuses answer it the same way.
    stance: "neutral",
  });
  const successChance = chanceFromVote(vote);
  return {
    vote,
    wouldRatify: vote.passed,
    successChance,
    forecast: ratificationForecast(campaign, record, successChance),
    reasoning: vote.passed
      ? "Two thirds looks reachable on the present reading of the chamber."
      : "Two thirds is not there on the present reading, and the votes that are missing are not votes about this treaty.",
  };
}

// --- Signing ----------------------------------------------------------------

export type TreatyResult =
  | { readonly ok: true; readonly packet: EffectPacket; readonly record: TreatyRecord }
  | { readonly ok: false; readonly reason: string };

const treatyRecordId = (kind: TreatyKind, counterpart: NationId, turn: number) =>
  `treaty:${kind}:${counterpart}:${turn}`;

/**
 * Sign it abroad.
 *
 * Deliberately not gated on whether the Senate would ratify. A president who has
 * negotiated an agreement the Hill will refuse has done something real and
 * consequential, and refusing the signature here would model a presidency that
 * can only ever promise what it can already deliver — which is not this office.
 */
export function signTreaty(
  campaign: Campaign,
  charter: Charter,
  kind: TreatyKind,
  counterpart: NationId,
): TreatyResult {
  if (counterpart === campaign.founding.nation) {
    return { ok: false, reason: "A government does not sign a treaty with itself." };
  }
  if (!selectNation(campaign, counterpart)) return { ok: false, reason: `No such nation: ${counterpart}.` };
  const relationship = selectRelationship(campaign, campaign.founding.nation, counterpart);
  if (!relationship) return { ok: false, reason: `There is no standing relationship with ${counterpart} to write one into.` };
  const terms = TREATY_TERMS[kind];
  if (relationship.trust < terms.minTrust) {
    return {
      ok: false,
      // No raw figure here on purpose. Trust is stored -1..1 and the engine has
      // no business formatting a scale — quoting `-0.51` beside a `0.25` floor
      // told the player nothing, because neither number names the scale it is
      // on. The gate reads `relationship.trust` on the founding-nation-to-
      // counterpart edge: our own government's trust in them, which is always
      // legible to us. Their trust in us is a separate, intel-gated read
      // (`standingToward`'s `theirs`), so the refusal never claims a view we
      // might not have.
      reason: `We do not trust ${counterpartName(campaign, counterpart)} nearly enough yet to send a delegation.`,
    };
  }
  const refusal = counterpartRefusal(campaign, counterpart, kind);
  if (refusal) return refusal;
  const live = selectTreaties(campaign).find(
    (record) =>
      record.counterpart === counterpart &&
      record.kind === kind &&
      (record.status === "signed" || record.status === "ratified" || record.status === "in-force-by-signature"),
  );
  if (live) return { ok: false, reason: `${live.title} is already ${live.status === "signed" ? "signed and awaiting the Senate" : "in force"}.` };

  const title = treatyTitle(campaign, kind, counterpart);
  const who = headOfGovernmentTitle(campaign.founding.leadRole, charter.roleTitles);
  // The counterpart's yes is the reason of record for the signature, as its no
  // is for a refusal, so the Record can say why it signed.
  const accepted = counterpartDecision(campaign, counterpart, kind);
  const provenance = {
    origin: "decision" as const,
    entities: [campaign.founding.nation as string, counterpart as string],
    systems: ["treaties"],
    ...(accepted ? { decision: accepted } : {}),
  };

  if (terms.bindsOn === "signature") {
    const record: TreatyRecord = {
      id: treatyRecordId(kind, counterpart, campaign.turn),
      treaty: `${kind}:${campaign.founding.nation}:${counterpart}` as TreatyId,
      title,
      kind,
      counterpart,
      signedTurn: campaign.turn,
      status: "in-force-by-signature",
      resolvedTurn: campaign.turn,
    };
    return {
      ok: true,
      record,
      packet: {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: {
          summary: `${sentenceCase(who)} concludes the ${title} by executive action. It is binding the moment the ink is dry, on this administration and no other.`,
        },
        provenance,
        effects: [
          { kind: "treaty", set: record },
          ...inForceEffects(campaign, record),
          // Smaller than a ratified treaty earns on both counts: the Senate
          // gave the President nothing to claim credit for, and it resents
          // having been gone around rather than asked.
          { kind: "metric", deltas: { standing: EXECUTIVE_AGREEMENT_STANDING_GAIN } },
          {
            kind: "congress",
            set: {
              ...campaign.congress,
              disposition: round3(clamp01(campaign.congress.disposition + EXECUTIVE_AGREEMENT_DISPOSITION_FALL)),
            },
          },
        ],
      },
    };
  }

  const record: TreatyRecord = {
    id: treatyRecordId(kind, counterpart, campaign.turn),
    treaty: `${kind}:${campaign.founding.nation}:${counterpart}` as TreatyId,
    title,
    kind,
    counterpart,
    signedTurn: campaign.turn,
    status: "signed",
  };
  return {
    ok: true,
    record,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: `${sentenceCase(who)} signs the ${title}. It binds nobody until two thirds of the Senate says so.`,
      },
      provenance,
      // Signing alone moves nothing but the room's temperature: the instrument
      // itself is written into the relationship at ratification and not before,
      // which is the whole distinction the Senate's role exists to draw.
      effects: [{ kind: "treaty", set: record }, { kind: "metric", deltas: { standing: 0.02 } }],
    },
  };
}

/**
 * How much less an in-force-by-signature instrument earns a president than the
 * ratified kind: the standing gain a chamber that was cut out of the decision
 * grants, and the fall in that chamber's own mood at having been cut out.
 * Named apart from the inline figures elsewhere in this file because these two
 * numbers are the whole of the rule that an executive agreement earns a
 * smaller standing gain and that a Congress gone around resents it — a reader
 * should be able to find them without re-deriving what "smaller" means from
 * the ratification figures.
 */
const EXECUTIVE_AGREEMENT_STANDING_GAIN = 0.03;
const EXECUTIVE_AGREEMENT_DISPOSITION_FALL = -0.02;
/** Undoing a commitment that was already in force costs more than pulling
 *  back one that was only ever a signature awaiting a vote. */
const EXECUTIVE_AGREEMENT_WITHDRAWAL_COST = -0.05;

/** What an in-force instrument does to the relationship it is with, both ways. */
function inForceEffects(campaign: Campaign, record: TreatyRecord): readonly Effect[] {
  const terms = TREATY_TERMS[record.kind];
  const player = campaign.founding.nation;
  const pairs: readonly (readonly [NationId, NationId])[] = [
    [player, record.counterpart],
    [record.counterpart, player],
  ];
  return pairs.flatMap(([from, to]): readonly Effect[] =>
    selectRelationship(campaign, from, to)
      ? [
          {
            kind: "relationship",
            from,
            to,
            deltas: { trust: terms.effect.trust, alignment: terms.effect.alignment, tension: terms.effect.tension },
            addTreaty: record.treaty,
          },
        ]
      : [],
  );
}

/**
 * The inverse of `inForceEffects`, for a signature-bound instrument taken back
 * off the board. A ratified treaty is never withdrawn once it is in force —
 * that is what "the presidencies after this one" means — so only the
 * signature-bound kind needs an unwind at all.
 */
function unwindInForceEffects(campaign: Campaign, record: TreatyRecord): readonly Effect[] {
  const terms = TREATY_TERMS[record.kind];
  const player = campaign.founding.nation;
  const pairs: readonly (readonly [NationId, NationId])[] = [
    [player, record.counterpart],
    [record.counterpart, player],
  ];
  return pairs.flatMap(([from, to]): readonly Effect[] =>
    selectRelationship(campaign, from, to)
      ? [
          {
            kind: "relationship",
            from,
            to,
            deltas: { trust: -terms.effect.trust, alignment: -terms.effect.alignment, tension: -terms.effect.tension },
          },
        ]
      : [],
  );
}

/** Days the Senate holds the instrument after it is sent up. */
const RATIFICATION_DELAY_DAYS = 3;

function pendingTreatyAct(campaign: Campaign, treatyId: string): IssuedTreatyAct | undefined {
  return Object.values(campaign.issuedActs ?? {}).find(
    (act): act is IssuedTreatyAct =>
      act.kind === "treaty" &&
      act.treatyId === treatyId &&
      (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"),
  );
}

function treatyActId(treatyId: string, campaign: Campaign): string {
  return `issued:treaty:${treatyId}:${campaign.turn}:${campaign.calendar.year}-${campaign.calendar.month}-${campaign.calendar.day}`;
}

export type TreatyIssueResult =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly projection: RatificationProjection;
      readonly act: IssuedTreatyAct;
      readonly packet: EffectPacket;
    };

/**
 * Send it to the Senate. The floor has not voted; Continue brings the count on
 * the due date. Ordinary play freezes likelihood and confidence, not the yeas.
 */
export function issueRatification(campaign: Campaign, id: string): TreatyIssueResult {
  const found = campaign.treaties[id];
  if (!found) return { ok: false, reason: `No such treaty: ${id}.` };
  if (TREATY_TERMS[found.kind].bindsOn === "signature") {
    return { ok: false, reason: `${found.title} took effect the moment it was signed. There is no Senate vote to send it to.` };
  }
  if (found.status !== "signed") return { ok: false, reason: `${found.title} is not awaiting the Senate.` };
  if (pendingTreatyAct(campaign, id)) {
    return { ok: false, reason: `${found.title} is already before the Senate.` };
  }

  const projection = projectRatification(campaign, found);
  const dueDate = addDays(campaign.calendar, RATIFICATION_DELAY_DAYS);
  const act: IssuedTreatyAct = {
    id: treatyActId(id, campaign),
    kind: "treaty",
    status: "awaiting-response",
    treatyId: id,
    title: found.title,
    issuedTurn: campaign.turn,
    issuedDate: campaign.calendar,
    dueDate,
    chance: projection.successChance,
    forecast: { ...projection.forecast, asOf: campaign.calendar },
  };
  return {
    ok: true,
    projection,
    act,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: `${found.title} goes to the Senate. The floor answers in ${RATIFICATION_DELAY_DAYS} days.`,
      },
      effects: [{ kind: "issuedAct", set: act }],
      provenance: { origin: "decision", systems: ["congress", "treaties"] },
    },
  };
}

function ratificationPacket(
  campaign: Campaign,
  found: TreatyRecord,
  projection: RatificationProjection,
  who: string,
  act: IssuedTreatyAct | undefined,
): Extract<TreatyResult, { ok: true }> {
  const record: TreatyRecord = {
    ...found,
    status: projection.wouldRatify ? "ratified" : "rejected",
    vote: projection.vote,
    resolvedTurn: campaign.turn,
  };
  const resolvedAct: IssuedTreatyAct | undefined = act
    ? {
        ...act,
        status: "resolved",
        outcome: {
          landed: projection.wouldRatify,
          account: projection.wouldRatify
            ? `The Senate ratifies, ${projection.vote.yeas} to ${projection.vote.nays}.`
            : `The Senate refuses, ${projection.vote.yeas} to ${projection.vote.nays}.`,
        },
      }
    : undefined;
  if (!projection.wouldRatify) {
    return {
      ok: true,
      record,
      packet: {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        narration: {
          summary: `The Senate refuses to ratify the ${found.title}, ${projection.vote.yeas} to ${projection.vote.nays}, and ${who} is left holding a document with a signature on it and nothing behind it.`,
        },
        effects: [
          { kind: "treaty", set: record },
          ...(resolvedAct ? [{ kind: "issuedAct" as const, set: resolvedAct }] : []),
          // The cost of a failed ratification is paid abroad, where every
          // government now knows what this administration's word is worth.
          { kind: "metric", deltas: { standing: -0.05 } },
        ],
        provenance: act
          ? { origin: "scheduled", causeIds: [act.id], systems: ["congress", "treaties"], effectiveDate: campaign.calendar }
          : { origin: "decision", systems: ["congress", "treaties"] },
      },
    };
  }
  return {
    ok: true,
    record,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: `The Senate ratifies the ${found.title}, ${projection.vote.yeas} to ${projection.vote.nays}. It is now law and it binds the presidencies after this one.`,
      },
      effects: [
        { kind: "treaty", set: record },
        ...(resolvedAct ? [{ kind: "issuedAct" as const, set: resolvedAct }] : []),
        ...inForceEffects(campaign, record),
        { kind: "metric", deltas: { standing: 0.06 } },
        {
          kind: "congress",
          set: {
            ...campaign.congress,
            disposition: round3(clamp01(campaign.congress.disposition + 0.02)),
          },
        },
      ],
      provenance: act
        ? { origin: "scheduled", causeIds: [act.id], systems: ["congress", "treaties"], effectiveDate: campaign.calendar }
        : { origin: "decision", systems: ["congress", "treaties"] },
    },
  };
}

/** Resolve one issued ratification whose due date has arrived. */
export function resolveIssuedTreaty(
  campaign: Campaign,
  id: string,
  roleTitles?: Readonly<Record<string, string>>,
): TreatyResult {
  const act = campaign.issuedActs?.[id];
  if (!act || act.kind !== "treaty") return { ok: false, reason: "That instrument is not outstanding before the Senate." };
  if (act.status === "resolved" || act.status === "reported" || act.status === "withdrawn" || act.status === "expired") {
    return { ok: false, reason: "That instrument has already closed." };
  }
  if (compareDates(campaign.calendar, act.dueDate) < 0) {
    return { ok: false, reason: "The Senate has not voted yet." };
  }
  const found = campaign.treaties[act.treatyId];
  if (!found) return { ok: false, reason: `No such treaty: ${act.treatyId}.` };
  if (found.status !== "signed") {
    const expired: IssuedTreatyAct = { ...act, status: "expired" };
    return {
      ok: true,
      record: found,
      packet: {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: `${found.title} is no longer awaiting a vote.` },
        effects: [{ kind: "issuedAct", set: expired }],
      },
    };
  }
  // Live chamber at the due date — a Hill play between send and vote can still
  // move the count. The frozen forecast stays on the act for the record.
  const projection = projectRatification(campaign, found);
  const who = headOfGovernmentTitle(campaign.founding.leadRole, roleTitles);
  return ratificationPacket(campaign, found, projection, who, act);
}

export function dueIssuedTreatyActs(campaign: Campaign): readonly IssuedTreatyAct[] {
  return Object.values(campaign.issuedActs ?? {})
    .filter(
      (act): act is IssuedTreatyAct =>
        act.kind === "treaty" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress") &&
        compareDates(campaign.calendar, act.dueDate) >= 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Every treaty still waiting on the Senate floor, whether or not it is due. */
export function outstandingIssuedTreatyActs(campaign: Campaign): readonly IssuedTreatyAct[] {
  return Object.values(campaign.issuedActs ?? {})
    .filter(
      (act): act is IssuedTreatyAct =>
        act.kind === "treaty" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"),
    )
    .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
}

/** Apply every ratification that has come due. */
export function resolveDueTreaties(
  campaign: Campaign,
  roleTitles?: Readonly<Record<string, string>>,
): { readonly campaign: Campaign; readonly packets: readonly EffectPacket[] } {
  const due = dueIssuedTreatyActs(campaign);
  const packets: EffectPacket[] = [];
  let working = campaign;
  for (const act of due) {
    const result = resolveIssuedTreaty(working, act.id, roleTitles);
    if (!result.ok) continue;
    packets.push(result.packet);
    working = apply(working, result.packet);
  }
  return { campaign: working, packets };
}


/** Take it back off the table, which a president may do and a Senate may not. */
export function withdrawTreaty(campaign: Campaign, id: string): TreatyResult {
  const found = campaign.treaties[id];
  if (!found) return { ok: false, reason: `No such treaty: ${id}.` };
  // A treaty still awaiting the Senate has nothing live to unwind — signing
  // alone moved nothing. An in-force-by-signature instrument is the office's
  // one binding commitment a president can undo without anybody's permission,
  // which is the real-world asymmetry a ratified treaty does not share.
  if (found.status !== "signed" && found.status !== "in-force-by-signature") {
    return { ok: false, reason: `${found.title} is not a treaty that can be withdrawn.` };
  }
  const wasInForce = found.status === "in-force-by-signature";
  const record: TreatyRecord = { ...found, status: "withdrawn", resolvedTurn: campaign.turn };
  const pending = pendingTreatyAct(campaign, id);
  const expired: IssuedTreatyAct | undefined = pending ? { ...pending, status: "withdrawn" } : undefined;
  return {
    ok: true,
    record,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: wasInForce
          ? `${found.title} is revoked. It was never before the Senate, and undoing it needs nobody's permission either.`
          : pending
            ? `The ${found.title} is withdrawn from the Senate before the floor votes, which is the version of this that does not appear in the record as a defeat.`
            : `The ${found.title} is withdrawn from the Senate before a vote, which is the version of this that does not appear in the record as a defeat.`,
      },
      effects: [
        { kind: "treaty", set: record },
        ...(expired ? [{ kind: "issuedAct" as const, set: expired }] : []),
        ...(wasInForce ? unwindInForceEffects(campaign, found) : []),
        { kind: "metric", deltas: { standing: wasInForce ? EXECUTIVE_AGREEMENT_WITHDRAWAL_COST : -0.02 } },
      ],
    },
  };
}
