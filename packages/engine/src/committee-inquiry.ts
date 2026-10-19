import type { Campaign } from "./state.js";
import { selectScandalForInquiry } from "./press-scandal.js";
import type { EffectPacket } from "./effects.js";
import { institutionDef, institutionInProse, institutionsForDomain } from "./institutions.js";
import { COMMITTEE_IDS, committeeForInstitution, committeeName, committeePanel } from "./committees.js";

// Re-exported rather than moved out of every caller's sight: the routing is a
// fact about the panels and lives in committees.ts, but an inquiry is what the
// engine has always asked it for.
export { committeeForInstitution };
import { EXECUTIVE_ORDERS, type OrderDomain } from "./orders.js";
import type { TurnPhase } from "./turn-loop.js";
import type { OversightMatter } from "./oversight.js";
import { isMatterOpen } from "./oversight.js";

// Congress investigating, which the game could not do.
//
// A president could sign an order the courts threw out, have covert action run
// in a country nobody voted to touch, and remove the auditor who was mid-way
// through asking about it — and the branch whose whole business that is would
// carry on marking up appropriations bills. There was no way, anywhere in the
// simulation, for a president to be caught.
//
// An inquiry is deliberately not a second removal arc. It has no verdict, it
// convicts nobody, and nothing in this file ends a presidency. What it does is
// take a fact that was already true and put a committee's name and a clock on
// it, so that being caught is a thing that happens on a date, to a body with a
// chair and a jurisdiction, on a board the President can read.

/**
 * The committee that would take a matter about an order in this domain.
 *
 * Routed through the bodies that would have to carry the order out, so the
 * jurisdiction is the same one the confirmation lattice already uses. An order
 * about the border is a Homeland matter because the border is run by bodies the
 * Homeland committee confirms, not because a list here says so.
 */
export function committeeForOrderDomain(domain: OrderDomain): string | undefined {
  const counts = new Map<string, number>();
  for (const def of institutionsForDomain(ORDER_DOMAIN_SUBJECTS[domain])) {
    const committee = committeeForInstitution(def.id);
    if (committee) counts.set(committee, (counts.get(committee) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked[0]?.[0];
}

/**
 * What each order domain is, in the vocabulary the institution catalog uses for
 * what a body is responsible for.
 *
 * The two vocabularies were written for different jobs — one names the kind of
 * power an order reaches for, the other names the subject a department covers —
 * and this is the only place they meet. `civil` maps to domestic because an
 * order about how the country is policed and governed at home is answered for
 * by the bodies that do it.
 */
const ORDER_DOMAIN_SUBJECTS: Readonly<Record<OrderDomain, string>> = {
  security: "security",
  economy: "economy",
  civil: "domestic",
  emergency: "homeland",
};

// --- What opens one ---------------------------------------------------------

/** Only acts attributable to this President can open an inquiry into presidential authority. */
function isPresidentialCovertFlag(campaign: Campaign, flag: string): boolean {
  if (flag.startsWith("surveilling-domestic:")) return true;
  if (flag.startsWith("surveilling:")) return flag.startsWith(`surveilling:${campaign.founding.nation}:`);
  if (!flag.startsWith("destabilized:")) return false;
  const target = flag.slice("destabilized:".length);
  return campaign.ledger.some((entry) =>
    entry.actor === "player" &&
    entry.commitment?.instrument === "covert" &&
    entry.commitment.rung === 5 &&
    entry.commitment.target === target &&
    entry.commitment.landed === true,
  );
}

const INTELLIGENCE_COMMITTEE = "CMTE-INTEL";
const OVERSIGHT_COMMITTEE = "CMTE-HOMELAND";

/**
 * Something that has happened which a committee would open a file on.
 *
 * Three kinds, and each is a fact already sitting in the campaign that nothing
 * was reading: an order the courts refused, a covert act taken abroad, and an
 * audit the President moved against. None of them is invented for this file and
 * none of them is a roll — every one is a decision the player took, on a week
 * the record can name.
 */
type InquiryCause = {
  readonly key: string;
  readonly committee: string;
  readonly subject: string;
};

function contestedOrderCauses(campaign: Campaign): readonly InquiryCause[] {
  return campaign.orders.flatMap((record) => {
    if (!record.contested) return [];
    const order = EXECUTIVE_ORDERS.find((candidate) => candidate.id === record.order);
    if (!order) return [];
    const committee = committeeForOrderDomain(order.domain);
    if (!committee) return [];
    return [
      {
        key: `order:${record.id}`,
        committee,
        subject: `the authority claimed for ${order.name}, which the courts were asked to strike down`,
      },
    ];
  });
}

function covertActCauses(campaign: Campaign): readonly InquiryCause[] {
  return Object.entries(campaign.player.flags)
    .filter(([flag, held]) => held && isPresidentialCovertFlag(campaign, flag))
    .map(([flag]) => {
      const target = flag.split(":").at(-1) ?? flag;
      const domestic = flag.startsWith("surveilling-domestic:");
      return {
        key: `covert:${flag}`,
        committee: INTELLIGENCE_COMMITTEE,
        subject: domestic
          ? `surveillance of people in ${campaign.states[target as keyof typeof campaign.states]?.base.name ?? target} ordered on the President's own authority`
          : `covert action taken against ${target} on the President's own authority`,
      };
    });
}

/**
 * A story the press is already running.
 *
 * A committee does not need its own discovery to open a file — most real
 * inquiries begin with a reporter, not a subpoena. Until this join, the two
 * halves ran past each other: the press could keep a story alive for six weeks
 * while every committee behaved as though nothing had been printed, so a
 * scandal cost approval and never once cost the President a hearing.
 *
 * Only the loudest live story, and only one at a time — a committee that opened
 * a file on every running story would turn a bad month into a permanent docket.
 * Which gavel takes it follows the charge: a burned source or a failed covert
 * operation belongs to intelligence, everything else to oversight.
 */
function scandalCauses(campaign: Campaign): readonly InquiryCause[] {
  const scandal = selectScandalForInquiry(campaign);
  if (!scandal) return [];
  const intelligence =
    scandal.origin.kind === "own-act" &&
    (scandal.origin.charge === "burned-source" || scandal.origin.charge === "covert-failure");
  return [
    {
      key: `scandal:${scandal.id}`,
      committee: intelligence ? INTELLIGENCE_COMMITTEE : OVERSIGHT_COMMITTEE,
      subject: scandal.subject,
    },
  ];
}

function obstructedAuditCauses(campaign: Campaign): readonly InquiryCause[] {
  return campaign.oversight.matters.flatMap((matter) => {
    if (!matter.obstructed || matter.origin.kind !== "inspector-general") return [];
    const committee = committeeForInstitution(matter.origin.institution);
    if (!committee) return [];
    const name = institutionDef(matter.origin.institution)?.name ?? matter.origin.institution;
    return [
      {
        key: `obstruction:${matter.id}`,
        committee,
        subject: `the removal of the inspector general at ${institutionInProse(name)} while an audit was open`,
      },
    ];
  });
}

/**
 * How hostile a panel has to be before it opens a file on a fact it can see.
 *
 * A committee that is broadly with the administration does not investigate it,
 * whatever has happened, and that is the fact rather than a softening: an
 * inquiry needs a chair who wants one. Below a half means the panel is on the
 * opposition's side of neutral, which is where the gavel starts being used this
 * way.
 */
const INQUIRY_OPENS_BELOW = 0.5;

/** The one cause the room is most disposed to take up this week, if any. */
function nextCause(campaign: Campaign, open: ReadonlySet<string>): InquiryCause | undefined {
  const causes = [
    ...obstructedAuditCauses(campaign),
    ...contestedOrderCauses(campaign),
    ...covertActCauses(campaign),
    ...scandalCauses(campaign),
  ].filter(
    (cause) =>
      !open.has(cause.key) &&
      COMMITTEE_IDS.includes(cause.committee) &&
      committeePanel(campaign, cause.committee).disposition < INQUIRY_OPENS_BELOW,
  );
  // Most hostile panel first, so which file gets opened is a fact about who
  // holds which gavel rather than about the order the causes were listed in.
  return [...causes].sort(
    (a, b) =>
      committeePanel(campaign, a.committee).disposition - committeePanel(campaign, b.committee).disposition ||
      a.key.localeCompare(b.key),
  )[0];
}

/** The causes a committee has already opened a file on, so nothing is opened twice. */
function causesAlreadyTaken(campaign: Campaign): ReadonlySet<string> {
  return new Set(
    campaign.oversight.matters.flatMap((matter) =>
      matter.origin.kind === "committee" ? [matter.id.split("|").at(-1) ?? ""] : [],
    ),
  );
}

function openedInquiry(campaign: Campaign, cause: InquiryCause): OversightMatter {
  const name = committeeName(cause.committee);
  return {
    id: `matter:committee:${cause.committee}:${campaign.turn}|${cause.key}`,
    origin: { kind: "committee", committee: cause.committee },
    direction: "received",
    subject: cause.subject,
    openedTurn: campaign.turn,
    stage: "opened",
    // A committee announcing an inquiry is the announcement. Unlike an audit,
    // there is no quiet window: the chair says it into a microphone.
    public: true,
    obstructed: false,
    beats: [{ turn: campaign.turn, description: `The ${name} opens an inquiry into ${cause.subject}.` }],
  };
}

/**
 * The week Congress decides whether to look at something.
 *
 * One inquiry at a time across the whole Congress, for the same reason the
 * auditors open one at a time: a president who has done four investigable
 * things should watch four committees arrive over four months with room to
 * answer each, rather than open the board one morning and find the term
 * already over.
 */
export const committeeInquiryPhase: TurnPhase = (state: Campaign) => {
  const cause = nextCause(state, causesAlreadyTaken(state));
  if (!cause) return [];
  const matter = openedInquiry(state, cause);
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      narration: { summary: matter.beats[0]!.description },
      effects: [{ kind: "oversight", matters: [matter] }],
    },
  ] satisfies readonly EffectPacket[];
};

// --- Reading them -----------------------------------------------------------

/** Every matter this committee has open, for the panel's own page. */
export function selectInquiriesFor(campaign: Campaign, committee: string): readonly OversightMatter[] {
  return campaign.oversight.matters.filter(
    (matter) => matter.origin.kind === "committee" && matter.origin.committee === committee,
  );
}

/**
 * The committee file opened on a press story, if the story ever reached one.
 *
 * A story ends and the inquiry it started does not: a committee keeps asking
 * after the papers have moved on, so the story's own page has to be able to say
 * who is still looking into it. Found through the cause the file was opened on,
 * the same key that keeps a story from being opened twice.
 */
export function matterForScandal(campaign: Campaign, scandalId: string): OversightMatter | undefined {
  const cause = `scandal:${scandalId}`;
  return campaign.oversight.matters.find(
    (matter) => matter.origin.kind === "committee" && matter.id.split("|").at(-1) === cause,
  );
}

/** Whether this committee is currently investigating the administration. */
export function committeeIsInvestigating(campaign: Campaign, committee: string): boolean {
  return selectInquiriesFor(campaign, committee).some(isMatterOpen);
}
