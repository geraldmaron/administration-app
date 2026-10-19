import type { Person, PersonId, RoleId } from "@admin/world";
import { selectCabinetHolder, type Campaign } from "./state.js";
import { INSTRUMENT_COERCION, rungDefinition, type InstrumentId, type RungLevel } from "./instruments.js";
import { classRoles, domainRole, matchRole } from "./stewardship.js";
import { scenarioClassDepartments, unclassedDepartment } from "./department-ownership.js";
import { TREASURY_REFERENCE } from "./metrics.js";
import { hashFraction } from "./rng.js";
export { appetiteOnScale, instinctFor, type CounselRegister } from "./counsel-instinct.js";
import { instinctFor, type CounselRegister } from "./counsel-instinct.js";
import type { ConversationScript, ConversationTone, ReplyOption, ReplyProjection } from "./conversations.js";

// A minister's opinion of a reply, derived rather than authored per scenario.
// Two halves: who the person is — a hawk backs the hard answer, a dove flinches
// from it, a cautious hand distrusts thin odds — and what the answer does to the
// department they run, which is the half that lets a Secretary of Agriculture
// have a view on a naval standoff. The engine emits the judgment as structure
// only; the sentence a player reads belongs to the surface, so no prose is
// composed here.

export type CounselStance = "for" | "against" | "wary";

/**
 * Why the stance, as a named driver the surface can phrase.
 *
 * The first three are the minister: the reply matches their instincts, cuts
 * against them, or the odds worry them more than the idea does. The last two
 * are the department they run — a cabinet officer does not only hold opinions,
 * they hold a budget, a staff and a mandate, and the most common objection in
 * a real room is not "I disagree" but "not out of my account".
 */
export type CounselReason =
  | "instinct-for"
  | "instinct-against"
  | "thin-odds"
  | "department-stake"
  | "crowded-out";

/**
 * Whose business this course is, as the room would recognize it.
 *
 * The seat that would carry the course out, a seat with standing in this kind
 * of week, or a department watching from outside it. Emitted as structure
 * because the surface phrases a Treasury objection differently from an
 * Agriculture one, and because how loudly a minister speaks depends on whether
 * they are on their own ground.
 */
export type CounselStake = "owns" | "standing" | "outside";

/**
 * What the minister is actually giving a view on, said in structure.
 *
 * An opinion with no course attached can only ever be phrased against the
 * person holding it, which is how a cabinet came to have nine sentences for a
 * whole presidency: the same minister said the same words about a bomb threat,
 * a drought and a naval standoff, because the words had nothing else to be
 * about. The rung's catalogue name and the register a position was answered in
 * are the two facts a sentence can name without inventing one.
 */
export type CounselCourse =
  | { readonly kind: "instrument"; readonly instrument: InstrumentId; readonly rung: RungLevel; readonly name: string }
  | {
      readonly kind: "position";
      readonly tone: ConversationTone;
      /**
       * What kind of week this answer is an answer to. The register alone gives
       * five courses for a whole presidency, which is not enough for a minister
       * to say something different about a bomb threat and a drought; the class
       * is what the sentence is actually about. A slug, not a phrase — the words
       * belong to the surface.
       */
      readonly scenarioClass?: string;
    }
  | { readonly kind: "join"; readonly side: "beside" | "against" };

export type CabinetCounsel =
  | {
      readonly kind: "counsel";
      readonly role: RoleId;
      readonly person: PersonId;
      readonly name: string;
      readonly stance: CounselStance;
      readonly reason: CounselReason;
      // The same competence that sways the resolved odds, so how much an
      // opinion is worth and how much its holder moves outcomes are one number.
      readonly conviction: number;
      /** Which reply this is an opinion about — the other half of the key a phrasing varies on. */
      readonly reply: string;
      readonly course: CounselCourse;
      /** Whose business the course is, so a sentence can say whether they are on their own ground. */
      readonly stake: CounselStake;
    }
  | { readonly kind: "vacant"; readonly role: RoleId };

// A spoken position is pressure without an instrument behind it — so every
// tone below sits under the instrument scale in npc-agent.ts, where the
// gentlest option (diplomatic) is already 0.25.
//
// Pricing all five tones at one number was the same as not reading them: a
// cabinet asked to weigh "walk in and listen" and "clear it before dawn, water
// first, then arrests" scored both identically and returned the same line for
// each, which made the room look scripted rather than opinionated. The tone is
// authored, validated, and shown to the player as the option's own heading;
// this is the system that has to act on it.
const TONE_COERCION: Readonly<Record<ConversationTone, number>> = {
  conciliatory: 0.05,
  evasive: 0.1,
  principled: 0.2,
  firm: 0.45,
  coercive: 0.7,
};

// Where an opinion tips from endorsement to warning to opposition. The band
// between them is deliberate: most counsel should be hedged, and a flat
// "for" or "against" should read as the exception that it is.
const FOR_THRESHOLD = 0.62;
const AGAINST_THRESHOLD = 0.38;

// Odds below this make a cautious minister argue against otherwise-agreeable
// plans; everyone else only flinches when the coin is visibly unfair.
const CAUTIOUS_ODDS_FLOOR = 0.55;
const GENERAL_ODDS_FLOOR = 0.4;

function replyCoercion(reply: ReplyProjection): number {
  return reply.option.commitment.kind === "instrument"
    ? INSTRUMENT_COERCION[reply.option.commitment.instrument]
    : TONE_COERCION[reply.option.tone];
}

// The chair that would speak to this reply: whoever owns the instrument for an
// attempt; for a spoken position, the chair the subject belongs to, falling
// back to where the trouble is when the class seats nobody the charter holds.
// A charter with an ownership table routes to the department that owns the
// matter even while its chair is empty, so the room shows the vacancy rather
// than handing the brief to whichever secretary is seated next.
function counselRole(campaign: Campaign, script: ConversationScript, reply: ReplyProjection): RoleId | undefined {
  if (reply.option.commitment.kind === "instrument") {
    return domainRole(campaign, reply.option.commitment.instrument);
  }
  const charter = campaign.founding.charter;
  const owner = scenarioClassDepartments(charter, script.scenarioClass)?.[0];
  if (owner !== undefined) return owner;
  const unclassed = unclassedDepartment(charter, script.counterpart === campaign.founding.nation);
  if (unclassed !== undefined) return unclassed;
  // A spoken answer has no instrument to route by, so the subject routes it.
  // Reading the counterpart alone put the foreign chair in front of every
  // scenario cast abroad and the interior chair in front of every one at home,
  // whatever the week was actually about.
  const seated = classRoles(campaign, script.scenarioClass)[0];
  if (seated !== undefined) return seated;
  const roles = Object.keys(campaign.player.cabinet) as RoleId[];
  return script.counterpart === campaign.founding.nation
    ? matchRole(roles, ["interior", "home", "domestic"]) ?? roles[0]
    : matchRole(roles, ["foreign", "state", "external"]) ?? roles[0];
}



// The four drivers, each capped so no one of them can decide an opinion alone.
const INSTINCT_WEIGHT = 0.2;
const ODDS_WEIGHT = 1.2;
// What a chair gets for having a part in the week. A department believes in the
// instrument it owns and wants the course to run through it; a department with
// standing wants the government to answer at all, which is a smaller pull in
// the same direction. A department with no part in the week gets neither, and
// reads the answer through the bill alone.
const OWN_COURSE = 0.12;
const STANDING_IN_WEEK = 0.06;
// How much of that pull survives a minister whose instincts run the other way.
const STAKE_RAMP = 0.5;
// What the bill does to an opinion, per point of the political accounts it
// charges. A chair whose department has standing in the week reads the cost as
// the price of their own business; a chair with no part in it reads the same
// cost as their program being spent on someone else's crisis, which is the
// objection that actually gets voiced in a real cabinet room.
const BILL_INSIDE = 0.5;
const BILL_OUTSIDE = 1.8;

/** What the reply asks in force, on the scale it is measured on. */
function registerKind(reply: ReplyProjection): CounselRegister {
  return reply.option.commitment.kind === "instrument" ? "instrument" : "position";
}



/**
 * What the answer charges the accounts every department draws on, as one figure.
 *
 * Only the debits: a reply that credits standing is not a bill anybody has to
 * be talked into. Budget authority is carried in USD millions, so it is brought
 * onto the same 0..1 scale as the standing and stability charges against the
 * reference treasury health already saturates at — otherwise a supplemental
 * would be three orders of magnitude louder than a hit to the government's
 * standing, which is not how a department reads the two.
 */
function politicalCharge(reply: ReplyProjection): number {
  const debit = (value: number | undefined): number => Math.max(0, -(value ?? 0));
  // Approval is absent on purpose: `apply()` settles it from the six judgments
  // rather than letting an effect write it, so no reply ever quotes a charge
  // against it and a term reading one would be a branch nothing can reach.
  return (
    debit(reply.cost.standing) +
    debit(reply.cost.stability) +
    debit(reply.cost.militaryReadiness) +
    debit(reply.cost.treasury) / TREASURY_REFERENCE
  );
}

/**
 * Whose business the course is: the chair that would run it, a chair with
 * standing in the week, or a department outside it.
 *
 * The owner is whichever chair `counselRole` already routes the decision to, so
 * the seat the room asks first and the seat that carries the course are the
 * same seat by construction rather than by two tables agreeing.
 */
export function counselStake(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
  role: RoleId,
): CounselStake {
  if (counselRole(campaign, script, reply) === role) return "owns";
  return classRoles(campaign, script.scenarioClass).includes(role) ? "standing" : "outside";
}

type Driver = { readonly reason: CounselReason; readonly shift: number };

/**
 * The four things that move a minister's opinion, each named so the surface can say which one did.
 *
 * An opinion starts hedged and is pushed off that neutral by what the minister
 * believes, what the odds look like from where they sit, and what the answer
 * does to the department they run. The third term is the one that lets a
 * Secretary of Agriculture have a view on a naval standoff: not a temperament
 * they were never authored with, but a bill their program is about to pay.
 */
/**
 * How far a minister's read of the odds can stray, at no competence at all. A
 * seasoned hand reads a course's chances close to what they are; a weak one
 * reads them loosely, and is wrong more often for it. Keyed on the question,
 * not on a stream, so the same room gives the same advice however often it is
 * read and the record scores the call that was actually made.
 */
const ODDS_BLUR = 0.3;

function perceivedOdds(campaign: Campaign, script: ConversationScript, reply: ReplyProjection, person: Person): number | undefined {
  if (reply.successChance === undefined) return undefined;
  const draw = hashFraction(`${campaign.seed}::counsel-odds::${person.id}::${script.id}::${reply.option.id}`);
  const blur = (draw - 0.5) * 2 * (1 - person.competence) * ODDS_BLUR;
  return Math.max(0, Math.min(1, reply.successChance + blur));
}

function drivers(person: Person, reply: ReplyProjection, stake: CounselStake, odds?: number): readonly Driver[] {
  const instinct = INSTINCT_WEIGHT * instinctFor(person, registerKind(reply), replyCoercion(reply));

  const oddsFloor = person.traits.includes("cautious") ? CAUTIOUS_ODDS_FLOOR : GENERAL_ODDS_FLOOR;
  const oddsConcern = odds !== undefined ? Math.max(0, oddsFloor - odds) : 0;
  // The chair that would run it carries the failure, so thin odds bite twice as
  // hard there as they do for a minister watching from across the table.
  const oddsShift = -oddsConcern * ODDS_WEIGHT * (stake === "owns" ? 2 : 1);

  const bill = -politicalCharge(reply) * (stake === "outside" ? BILL_OUTSIDE : BILL_INSIDE);

  // The stake amplifies, it never rescues: a minister does not stop being who
  // they are because the file has their name on it, so a dovish Secretary of
  // Defense handed a strike is still against it. Half, not all — a department
  // still believes in the instrument it owns while it is arguing about how far
  // to take it, and zeroing the belief outright made the whole room oppose
  // every hard answer, which is the old unanimity wearing the other face.
  const room = instinct >= 0 ? 1 : 1 + (STAKE_RAMP * instinct) / INSTINCT_WEIGHT;
  const stakeShift = (stake === "owns" ? OWN_COURSE : stake === "standing" ? STANDING_IN_WEEK : 0) * room;

  return [
    { reason: instinct >= 0 ? "instinct-for" : "instinct-against", shift: instinct },
    { reason: "thin-odds", shift: oddsShift },
    { reason: "department-stake", shift: stakeShift },
    { reason: "crowded-out", shift: bill },
  ];
}

/**
 * Which driver the sentence should name: the loudest one pulling the way the
 * opinion actually landed.
 *
 * A minister who ends up for a course despite the bill is not "crowded out",
 * and one who opposes their own department's instrument is not speaking from
 * departmental stake — so a hedged opinion names its loudest driver either way,
 * and a committed one names the loudest driver on its own side.
 */
function namedDriver(list: readonly Driver[], stance: CounselStance): CounselReason {
  const side = stance === "for" ? 1 : stance === "against" ? -1 : 0;
  const eligible = side === 0 ? list : list.filter((d) => Math.sign(d.shift) === side);
  const pool = eligible.length > 0 ? eligible : list;
  return [...pool].sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))[0]!.reason;
}

/**
 * What a seated minister makes of one reply.
 *
 * Two halves, deliberately: who the person is, and what the decision does to
 * the department they run. The person half alone is what left thirteen of
 * sixteen chairs mathematically unable to oppose anything — only four role
 * profiles in the dataset carry a hawkish or dovish trait, so every other
 * minister scored an identical, unmovable opinion of every answer the President
 * could give. A cabinet officer's real objection is institutional, and this is
 * where the institution gets a say.
 */
function scoreOpinion(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
  role: RoleId,
  person: Person,
): { stance: CounselStance; reason: CounselReason; stake: CounselStake } {
  const stake = counselStake(campaign, script, reply, role);
  const list = drivers(person, reply, stake, perceivedOdds(campaign, script, reply, person));
  const score = 0.5 + list.reduce((total, driver) => total + driver.shift, 0);
  const stance: CounselStance = score >= FOR_THRESHOLD ? "for" : score <= AGAINST_THRESHOLD ? "against" : "wary";
  return { stance, reason: namedDriver(list, stance), stake };
}

type CounselOpinion = Extract<CabinetCounsel, { kind: "counsel" }>;

function courseOf(option: ReplyOption, scenarioClass: string | undefined): CounselCourse {
  const commitment = option.commitment;
  if (commitment.kind === "instrument") {
    return {
      kind: "instrument",
      instrument: commitment.instrument,
      rung: commitment.rung,
      name: rungDefinition(commitment.instrument, commitment.rung).name,
    };
  }
  if (commitment.kind === "join") return { kind: "join", side: commitment.side };
  return { kind: "position", tone: option.tone, ...(scenarioClass === undefined ? {} : { scenarioClass }) };
}

function opinionOf(
  campaign: Campaign,
  script: ConversationScript,
  role: RoleId,
  person: Person,
  reply: ReplyProjection,
): CounselOpinion {
  const { stance, reason, stake } = scoreOpinion(campaign, script, reply, role, person);
  return {
    kind: "counsel",
    role,
    person: person.id,
    name: person.name,
    stance,
    reason,
    conviction: person.competence,
    reply: reply.option.id,
    course: courseOf(reply.option, script.scenarioClass),
    stake,
  };
}

export function counselOnReply(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
): CabinetCounsel | undefined {
  const role = counselRole(campaign, script, reply);
  if (!role) return undefined;
  const holder = selectCabinetHolder(campaign, role);
  if (!holder || !holder.alive) return { kind: "vacant", role };
  return opinionOf(campaign, script, role, holder.base, reply);
}

// How far a stance sits from unqualified support — the axis a real
// disagreement is measured across, not just "different from the primary".
function polarity(stance: CounselStance): number {
  return stance === "for" ? 1 : stance === "against" ? -1 : 0;
}

// The rest of the room's reaction to the same reply. A unanimous cabinet is a
// wasted system, but a manufactured one is dishonest — this only returns a
// second voice when a living, seated minister (never the head of state, who
// does not counsel themselves) genuinely lands on a different stance than the
// primary. Among real dissenters, the one furthest from the primary's stance
// speaks, tie-broken by conviction — the same competence that moves the odds.
// A vacant primary chair has no stance to disagree with, so this stays silent
// rather than passing off some other minister's opinion as "dissent".
export function dissentingCounsel(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
): CabinetCounsel | undefined {
  const primary = counselOnReply(campaign, script, reply);
  if (!primary || primary.kind !== "counsel") return undefined;

  const others = (Object.keys(campaign.player.cabinet) as RoleId[]).filter(
    (role) => role !== primary.role && role !== campaign.founding.leadRole,
  );
  const opinions = others.flatMap((role) => {
    const holder = selectCabinetHolder(campaign, role);
    return holder && holder.alive ? [opinionOf(campaign, script, role, holder.base, reply)] : [];
  });

  const dissenters = opinions.filter((o) => polarity(o.stance) !== polarity(primary.stance));
  if (dissenters.length === 0) return undefined;

  return [...dissenters].sort((a, b) => {
    const distance =
      Math.abs(polarity(b.stance) - polarity(primary.stance)) - Math.abs(polarity(a.stance) - polarity(primary.stance));
    return distance !== 0 ? distance : b.conviction - a.conviction;
  })[0];
}

function livingCabinetVoiceCount(campaign: Campaign): number {
  const leadRole = campaign.founding.leadRole;
  return (Object.keys(campaign.player.cabinet) as RoleId[]).filter((role) => {
    if (role === leadRole) return false;
    const holder = selectCabinetHolder(campaign, role);
    return holder && holder.alive;
  }).length;
}

function strongestDissent(primary: CounselOpinion, opinions: readonly CounselOpinion[]): CounselOpinion | undefined {
  const anchor = polarity(primary.stance);
  const dissenters = opinions.filter((o) => polarity(o.stance) !== anchor);
  if (dissenters.length === 0) return undefined;
  return [...dissenters].sort((a, b) => {
    const distance =
      Math.abs(polarity(b.stance) - anchor) - Math.abs(polarity(a.stance) - anchor);
    return distance !== 0 ? distance : b.conviction - a.conviction;
  })[0];
}

function strongestWary(opinions: readonly CounselOpinion[], skip: ReadonlySet<RoleId>): CounselOpinion | undefined {
  const wary = opinions.filter((o) => o.stance === "wary" && !skip.has(o.role));
  if (wary.length === 0) return undefined;
  return [...wary].sort((a, b) => b.conviction - a.conviction)[0];
}

function strongestSupporter(
  primary: CounselOpinion,
  opinions: readonly CounselOpinion[],
  skip: ReadonlySet<RoleId>,
): CounselOpinion | undefined {
  const anchor = polarity(primary.stance);
  const supporters = opinions.filter((o) => polarity(o.stance) === anchor && !skip.has(o.role));
  if (supporters.length === 0) return undefined;
  return [...supporters].sort((a, b) => b.conviction - a.conviction)[0];
}

function strongestByStance(
  opinions: readonly CounselOpinion[],
  stance: CounselStance,
  skip: ReadonlySet<RoleId>,
): CounselOpinion | undefined {
  const matches = opinions.filter((o) => o.stance === stance && !skip.has(o.role));
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => b.conviction - a.conviction)[0];
}

// The full room's reaction to one reply: the chair the subject belongs to
// first, then the voice that actually disagrees, then the rest of the seats
// with standing in this kind of week, and only then anyone seated for the
// strength of their opinion alone — never a manufactured chorus, and never an
// empty chair unless the room is nearly mute.
//
// The order is the finding. Seating by polarity distance and then by
// competence alone put the highest-scoring ministers in the cabinet in front of
// every subject, so the Education Secretary advised on a bomb threat while
// Defense and Homeland Security were not in the meeting at all.
export function roomCounselOnReply(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
  limit = 4,
): readonly CabinetCounsel[] {
  const leadRole = campaign.founding.leadRole;
  const cabinetRoles = (Object.keys(campaign.player.cabinet) as RoleId[]).filter((role) => role !== leadRole);

  const result: CabinetCounsel[] = [];
  const usedRoles = new Set<RoleId>();

  const tryAdd = (counsel: CabinetCounsel | undefined): void => {
    if (!counsel || usedRoles.has(counsel.role) || result.length >= limit) return;
    usedRoles.add(counsel.role);
    result.push(counsel);
  };

  const primary = counselOnReply(campaign, script, reply);
  tryAdd(primary);

  const others = seatedViews(campaign, script, reply, cabinetRoles.filter((role) => !usedRoles.has(role)));
  const livingOthers = others.filter((o): o is CounselOpinion => o.kind === "counsel");
  const vacantOthers = others.filter((o): o is Extract<CabinetCounsel, { kind: "vacant" }> => o.kind === "vacant");

  const primaryOpinion = primary?.kind === "counsel" ? primary : undefined;
  // Dissent is seated before domain standing on purpose: a room that agrees
  // with itself is a wasted system, and the seats with standing are the ones
  // most likely to agree with the chair whose subject they share.
  if (primaryOpinion) tryAdd(strongestDissent(primaryOpinion, livingOthers));
  for (const role of classRoles(campaign, script.scenarioClass)) {
    tryAdd(livingOthers.find((opinion) => opinion.role === role));
  }
  fillByStance(tryAdd, livingOthers, usedRoles, primaryOpinion);

  if (livingCabinetVoiceCount(campaign) < 2) {
    for (const vacant of vacantOthers) {
      tryAdd(vacant);
      if (result.length >= limit) break;
    }
  }

  return result;
}

/**
 * What every seated chair privately makes of one reply, an empty one read as
 * empty rather than skipped.
 *
 * The room the player is shown is a selection out of this — four voices, chosen
 * for standing and for disagreement. This is the whole cabinet, and it is what
 * a check on the room's plurality has to read: a Secretary who would have
 * opposed the course but was never called on is a different fact from a
 * Secretary who cannot oppose anything.
 */
export function cabinetViewsOnReply(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
): readonly CabinetCounsel[] {
  const leadRole = campaign.founding.leadRole;
  return seatedViews(
    campaign,
    script,
    reply,
    (Object.keys(campaign.player.cabinet) as RoleId[]).filter((role) => role !== leadRole),
  );
}

function seatedViews(
  campaign: Campaign,
  script: ConversationScript,
  reply: ReplyProjection,
  roles: readonly RoleId[],
): readonly CabinetCounsel[] {
  return roles.map((role) => {
    const holder = selectCabinetHolder(campaign, role);
    if (!holder || !holder.alive) return { kind: "vacant" as const, role };
    return opinionOf(campaign, script, role, holder.base, reply);
  });
}

/** The seats nothing else earned: the loudest hedge and the loudest agreement, or both poles where there is no primary to measure against. */
function fillByStance(
  tryAdd: (counsel: CabinetCounsel | undefined) => void,
  livingOthers: readonly CounselOpinion[],
  usedRoles: ReadonlySet<RoleId>,
  primary: CounselOpinion | undefined,
): void {
  if (primary) {
    tryAdd(strongestWary(livingOthers, usedRoles));
    tryAdd(strongestSupporter(primary, livingOthers, usedRoles));
    return;
  }
  tryAdd(strongestByStance(livingOthers, "against", usedRoles));
  tryAdd(strongestWary(livingOthers, usedRoles));
  tryAdd(strongestByStance(livingOthers, "for", usedRoles));
}
