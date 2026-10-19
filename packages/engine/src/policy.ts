import type { RoleId } from "@admin/world";
import { selectChairRunner } from "./appointments.js";
import type { PolicyStatPath } from "./policy-stats.js";
import { policyNationEffects } from "./policy-program.js";
import { STANCES } from "./policy-catalog.js";
import { matchRole } from "./stewardship.js";
import { policyDomainDepartment } from "./department-ownership.js";
import { inShutdown } from "./funding.js";
export * from "./policy-stats.js";
export * from "./policy-program.js";
import {
  selectCabinetSeats, selectNation, type AlignmentVector, type Campaign, type MetricSet, } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
import { createRngStreams } from "./rng.js";
import {
  domainAuthority,
  programBites,
  programMark,
  programStandUpRemaining,
  stanceOpposition,
} from "./policy-teeth.js";
import type { DeltaMetricKey, MetricDeltas } from "./effect-types.js";

// Governing at home.
//
// A campaign had three ways to act and none of them was governing. Conversations
// are reactive — the world raises something and the player answers. Ops project
// an instrument at another country. Appointments decide who runs a ministry but
// not what the ministry is *for*. Between them there was no way to say what this
// administration is actually trying to do, which is the one thing a head of
// government spends their whole term on.
//
// A policy is a standing position, not an act. The player always holds one
// stance in every domain their charter gives them a minister for — including the
// one they inherited — so the policy screen is a picture of the whole program
// rather than a list of things they have bought. Changing a stance is the
// decision; the stance then works, every turn, until it is changed again.
//
// Three things keep it from being a menu of free upgrades:
//
//   - Every stance costs something and returns something else. There is no
//     stance that is simply better than the one beside it, only stances that
//     trade a metric the player needs for one they need more.
//   - A domain is only legislable if the charter seats the minister responsible.
//     A junta has no treasury minister and therefore cannot run fiscal policy at
//     all — which is a fact about juntas, arrived at from the charter data rather
//     than written as a special case.
//   - What a program actually delivers is scaled by the competence of the
//     minister carrying it, the same premise stewardship.ts runs resolutions on.
//     A brilliant policy under a weak minister is a weak policy.
//
// Policy reaches the score by the same route everything else does: the per-turn
// effects move stability, standing, readiness and treasury, and the public
// revises its judgment of the government from those four over the following
// season (opinion.ts) until the headline approval rating follows. It also moves the
// player's alignment on enactment, which feeds removal pressure (removal.ts) and
// how the NPC world reads them (alignment.ts) — so a program is not only worth
// points, it is worth a reputation.

export type PolicyDomain = "fiscal" | "industry" | "trade" | "civil" | "security" | "defense";

export const POLICY_DOMAINS: readonly PolicyDomain[] = [
  "fiscal",
  "industry",
  "trade",
  "civil",
  "security",
  "defense",
];

export type PolicyDomainSpec = {
  readonly name: string;
  /**
   * The chair answerable for it, as hints resolved against the charter's own
   * seats rather than as one hardcoded role id.
   *
   * A single id was a claim that one constitution's answer is every
   * constitution's. It is not: civil liberties are the Attorney General's brief
   * in a presidential republic and the interior ministry's in a parliamentary
   * one, and trade is run out of Commerce in Washington and out of the foreign
   * ministry almost everywhere else. Hardcoding either meant the table was
   * wrong for one set of charters or the other, and the way it was wrong was
   * silent — `legislableDomains` simply dropped a domain whose named chair a
   * charter did not seat, so correcting it for the United States would have
   * quietly removed civil-liberties policy from the nine charters that seat no
   * attorney general.
   *
   * Order is precedence: the first hint that matches a seated role wins, so the
   * list reads most-specific first and falls back to the seat that carries the
   * brief where the specific one does not exist. `matchRole` does the matching,
   * the same function the instrument stewardship and the scenario speaker hints
   * already use. No chair resolves, no program — which is the honest reading of
   * a government with nobody to sign one.
   */
  readonly chairHints: readonly string[];
  /** What the domain is, in the terms the player is choosing between. */
  readonly question: string;
};

export const POLICY_DOMAIN_SPECS: Readonly<Record<PolicyDomain, PolicyDomainSpec>> = {
  fiscal: {
    name: "Fiscal",
    chairHints: ["treasury", "finance", "economy"],
    question: "What the state takes, and what it spends it on.",
  },
  industry: {
    name: "Industry and energy",
    // What the country makes its living from is a commerce brief where a
    // commerce department exists, and a treasury one where it does not.
    chairHints: ["commerce", "industry", "energy", "treasury", "finance"],
    question: "What the country makes its living from.",
  },
  trade: {
    name: "Trade",
    // Trade policy runs out of Commerce in Washington and out of the foreign
    // ministry in most other capitals. Both are now true of their own charter.
    chairHints: ["commerce", "trade", "foreign", "state", "external"],
    question: "How open the border is to everyone else's goods.",
  },
  civil: {
    name: "Civil liberties",
    // What the state may do to the people it governs is the Attorney General's
    // brief under a presidential republic and the interior ministry's under a
    // parliamentary one.
    chairHints: ["attorney", "justice", "interior", "home", "domestic"],
    question: "What the state may do to the people it governs.",
  },
  security: {
    name: "Security and intelligence",
    chairHints: ["intelligence", "homeland", "interior", "security"],
    question: "How much the services watch, and who watches them.",
  },
  defense: {
    name: "Defense",
    chairHints: ["defense", "war", "military"],
    question: "How large a force the country keeps, and on what terms.",
  },
};

/**
 * Signed per-turn movement. `treasuryOfGdp` is a fraction of the nation's own
 * gross domestic product rather than a flat sum: a tax rise is worth
 * proportionally the same to a large economy and a small one, where a flat
 * figure would be a rounding error in one and the entire budget in the other.
 *
 * The share is an *annual* one — the scale a budget is actually written at.
 * `POLICY_TURN_SHARE` prorates it to the week a turn covers.
 */
export type PolicyMovement = {
  readonly stability?: number;
  /**
   * Kept on the type and unused by the defense stances on purpose. A standing
   * program's effect on the force belongs in `nationEffects` with the rest of
   * what a program does to the country: that path runs for every government
   * that adopts the stance rather than only the player's, it is what the
   * ladder's gates and the capacity ceiling actually read, and it is clamped to
   * the schema's own range. Declared here as well and a program would raise the
   * same force twice, at a weekly rate that outran refit and left the top of
   * the military ladder permanently open to anyone who bought the stance.
   */
  readonly militaryReadiness?: number;
  readonly standing?: number;
  readonly treasuryOfGdp?: number;
};


/**
 * Signed per-turn movement on the nation's own stats — the program's teeth.
 *
 * Without this a stance was only ever five numbers on the player's dashboard,
 * which made every program in a domain the same kind of thing at a different
 * magnitude, and left the country itself untouched by how it was governed. It
 * is also what makes an NPC's program mean anything at all: a nation the
 * player does not govern has no `MetricSet` for a stance to move.
 */
export type PolicyNationMovement = Partial<Record<PolicyStatPath, number>>;

export type PolicyStance = {
  readonly id: string;
  readonly domain: PolicyDomain;
  readonly name: string;
  /** In-fiction: what the program is, in the words the player is choosing in. */
  readonly summary: string;
  /** The founding default for its domain — what the administration inherited. */
  readonly inherited?: true;
  readonly perTurn: PolicyMovement;
  /** The one-off price of putting it in place, paid the turn it is enacted. */
  readonly enactment: PolicyMovement;
  /**
   * What holding this program does to the country week by week. Every
   * non-inherited stance must declare at least one path, and every path it
   * declares must be a stat something else in the engine already reads — both
   * enforced by `policy-teeth.test.ts` against the authored-field consumer
   * registry, so a program cannot be decor.
   */
  readonly nationEffects: PolicyNationMovement;
  readonly alignment: Partial<AlignmentVector>;
};

export const POLICY_STANCES: readonly PolicyStance[] = STANCES;


const STANCE_BY_ID: ReadonlyMap<string, PolicyStance> = new Map(STANCES.map((s) => [s.id, s]));

export function policyStance(id: string): PolicyStance | undefined {
  return STANCE_BY_ID.get(id);
}

export function stancesForDomain(domain: PolicyDomain): readonly PolicyStance[] {
  return STANCES.filter((stance) => stance.domain === domain);
}

/** The stance every campaign starts each domain on. */
export function inheritedStance(domain: PolicyDomain): PolicyStance {
  const stance = stancesForDomain(domain).find((s) => s.inherited);
  if (!stance) throw new Error(`domain ${domain} authors no inherited stance to open on`);
  return stance;
}

export type PolicySet = Readonly<Record<PolicyDomain, string>>;

/** What a founding opens on: continuity everywhere, which is a position too. */
export function inheritedPolicies(): PolicySet {
  return Object.fromEntries(POLICY_DOMAINS.map((domain) => [domain, inheritedStance(domain).id])) as PolicySet;
}

// --- What a charter will actually let the player legislate. ---------------

/**
 * The domains this campaign can hold a policy in: the ones whose responsible
 * chair the charter actually seats.
 *
 * This is not a rule written about juntas — it is the charter's own cabinet list
 * read honestly. A charter with no treasury minister has nobody who could sign a
 * budget, so it has no fiscal policy, and the screen says so in those terms.
 */
/**
 * The chair a given charter's seats put in charge of a domain, if any of them.
 *
 * Takes the seats rather than a campaign so founding — which has a charter and
 * no campaign yet — resolves through the identical rule the game in play does.
 * Two resolvers would be two answers to "who signs this", which is the defect
 * the hint list was introduced to end. Given the charter, a charter with a
 * written ownership table answers from the table and the hints serve the rest.
 */
export function resolveDomainChair(
  seats: readonly RoleId[],
  domain: PolicyDomain,
  charter?: string,
): RoleId | undefined {
  const tabled = charter === undefined ? undefined : policyDomainDepartment(charter, domain);
  if (tabled !== undefined) return seats.includes(tabled) ? tabled : undefined;
  return matchRole(seats, POLICY_DOMAIN_SPECS[domain].chairHints);
}

/** The chair answerable for a domain in this campaign, if the charter seats one. */
export function domainChair(campaign: Campaign, domain: PolicyDomain): RoleId | undefined {
  return resolveDomainChair(selectCabinetSeats(campaign), domain, campaign.founding.charter);
}

export function legislableDomains(campaign: Campaign): readonly PolicyDomain[] {
  const seats = selectCabinetSeats(campaign);
  return POLICY_DOMAINS.filter((domain) => resolveDomainChair(seats, domain, campaign.founding.charter) !== undefined);
}

/**
 * What a given chair is answerable for. The inverse of the spec table's own
 * `chair` field rather than a second list beside it, so a domain cannot be
 * reassigned in one place and keep answering to the old minister in the other.
 *
 * Scoped to the legislable set: a domain this charter seats nobody for is not
 * this minister's brief either.
 */
export function domainsChairedBy(campaign: Campaign, role: RoleId): readonly PolicyDomain[] {
  return legislableDomains(campaign).filter((domain) => domainChair(campaign, domain) === role);
}

export function selectPolicies(campaign: Campaign): PolicySet {
  return campaign.player.policies as PolicySet;
}

export function selectPolicyStance(campaign: Campaign, domain: PolicyDomain): PolicyStance {
  const held = campaign.player.policies[domain];
  return (held ? policyStance(held) : undefined) ?? inheritedStance(domain);
}

// --- Execution: a program is only as good as the hand carrying it. ------

// A minister at the middle of the range delivers a program as designed; the
// scale either side is deliberately gentler than stewardship's, because this
// compounds every turn rather than resolving once.
const QUALITY_FLOOR = 0.6;
const QUALITY_RANGE = 0.8;

/**
 * The width of the competence band, exported so a government with no cabinet to
 * read — every nation the player does not run — can be scored on the same scale
 * rather than on a second one invented for it. A quality of 0.6 means the same
 * thing wherever it came from.
 */
export const POLICY_QUALITY_RANGE = QUALITY_RANGE;

// A ministry with nobody in it does not stop working, it stops being steered —
// the same caretaker minimum an empty chair falls to everywhere else.
export const CARETAKER_QUALITY = QUALITY_FLOOR;

export function executionQuality(campaign: Campaign, domain: PolicyDomain): number {
  const chair = domainChair(campaign, domain);
  const holder = chair ? selectChairRunner(campaign, chair) : undefined;
  if (!holder || !holder.alive) return CARETAKER_QUALITY;
  return QUALITY_FLOOR + QUALITY_RANGE * holder.base.competence;
}

export const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/**
 * The share of an annual budget movement one turn actually collects or spends.
 *
 * A `treasuryOfGdp` figure is written the way a budget is: a share of GDP over
 * a year. A turn is a week, and applying the annual figure once a week made the
 * fiscal lever the only lever in the game — the program was not a decision, it
 * was a tide.
 *
 * Re-measured against the shipped scale rather than the two retired ones this
 * comment used to quote: the heaviest money line any stance carries is 0.012 of
 * output, which is 329,986 a year for the United States. Applied once a week it
 * would be 92% of the 357,485 of budget authority an administration founds on,
 * every week. Prorated it is 6,346 — under two points of the stock, which is
 * the same order of magnitude as a turn of statecraft, so the accounts are a
 * constraint the player weighs rather than a current they are carried on.
 */
export const POLICY_TURN_SHARE = DAYS_PER_TURN / 365;

/**
 * The share of the gap between the country's order and where it rests that
 * closes each week (the pull itself is `conditionPhase`'s).
 *
 * It is what makes a stance's weekly stability a level rather than a rate. A
 * program that writes a point of order a week holds the country ten points
 * above where it would otherwise settle, and no higher however long it is held;
 * one that costs a point a week holds it ten below, and no lower. Before
 * anything pulled back, careful government's program spent a point and a half
 * of order every week forever and ended every year at zero, and a program with
 * a gift in it ended at one. A tenth is the horizon `horizonFit` already weighs a
 * stance's weekly movement over, so a government choosing a program and a
 * country living under one read it on the same scale.
 */
export const STABILITY_REVERSION = 0.1;

export function playerGdp(campaign: Campaign): number {
  return selectNation(campaign, campaign.founding.nation)?.stats.economy.gdp ?? 0;
}

/**
 * A movement as actual metric deltas, with the minister's competence applied.
 *
 * Quality scales what a program *delivers*, never what it costs: a weak
 * treasury minister running a consolidation raises less money and still closes
 * the same clinics. Scaling both would make an incompetent appointment a way of
 * buying a cheaper policy, which is the opposite of the thing being modeled.
 */
export function movementToDeltas(
  movement: PolicyMovement,
  gdp: number,
  quality: number,
  // An enactment is a lump sum paid once, so it is booked at its full annual
  // scale; a standing program collects or spends across the year, so a turn
  // only gets the week it covers.
  treasuryShare: number = POLICY_TURN_SHARE,
): MetricDeltas {
  const scale = (value: number) => round3(value > 0 ? value * quality : value);
  const deltas: MetricDeltas = {};
  if (movement.stability !== undefined) deltas.stability = scale(movement.stability);
  if (movement.militaryReadiness !== undefined) deltas.militaryReadiness = scale(movement.militaryReadiness);
  if (movement.standing !== undefined) deltas.standing = scale(movement.standing);
  if (movement.treasuryOfGdp !== undefined) {
    const raw = movement.treasuryOfGdp * gdp * treasuryShare;
    deltas.treasury = Math.round(raw > 0 ? raw * quality : raw);
  }
  return deltas;
}

// --- The outlook: what the standing program is worth, per domain. -------

export type PolicyOutlookLine = {
  readonly domain: PolicyDomain;
  readonly stance: PolicyStance;
  /** The chair carrying it, and whether anyone is in it. */
  readonly chair: RoleId;
  readonly minister?: string;
  readonly quality: number;
  /** This domain's own per-turn contribution, competence already applied. */
  readonly perTurn: MetricDeltas;
};

export type PolicyOutlook = {
  readonly lines: readonly PolicyOutlookLine[];
  /** Every domain's per-turn contribution, summed — what a turn actually applies. */
  readonly perTurn: MetricDeltas;
};

export function sumDeltas(entries: readonly MetricDeltas[]): MetricDeltas {
  const total: MetricDeltas = {};
  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry) as [DeltaMetricKey, number][]) {
      total[key] = round3((total[key] ?? 0) + value);
    }
  }
  // Treasury is money and stays whole.
  if (total.treasury !== undefined) total.treasury = Math.round(total.treasury);
  return total as MetricDeltas;
}

/**
 * The standing program, domain by domain, with what each is worth per turn.
 *
 * Pure and cheap, so the policy screen can show the player exactly what the
 * turn will do before they end it — and the turn phase below applies this same
 * computation rather than a second one that could disagree with it.
 */
export function selectPolicyOutlook(campaign: Campaign): PolicyOutlook {
  const gdp = playerGdp(campaign);
  const lines = legislableDomains(campaign).map((domain): PolicyOutlookLine => {
    const stance = selectPolicyStance(campaign, domain);
    const chair = domainChair(campaign, domain)!;
    const holder = selectChairRunner(campaign, chair);
    const quality = executionQuality(campaign, domain);
    return {
      domain,
      stance,
      chair,
      minister: holder && holder.alive ? holder.base.name : undefined,
      quality: round3(quality),
      perTurn: movementToDeltas(stance.perTurn, gdp, quality),
    };
  });
  return { lines, perTurn: sumDeltas(lines.map((line) => line.perTurn)) };
}

/**
 * Where the program as a whole stands, on the three axes every stance already
 * declares an `alignment` on.
 *
 * Each stance says which direction it pushes the country; nothing until now
 * added them up, so a government holding four right-leaning programs and a
 * left-leaning one had no reading of what it was, only a list of what it did.
 * The sum is clamped per axis rather than averaged: holding three
 * market-leaning positions is a more committed government than holding one, and
 * an average would flatten exactly that difference.
 *
 * This is the program's own shape, deliberately *not* `campaign.player
 * .alignments` — that is the record of what the player has said in
 * conversations. A government can talk one way and legislate another, and the
 * two readings existing separately is what lets a player see it.
 */
export function selectProgramAlignment(campaign: Campaign): AlignmentVector {
  const axes: AlignmentVector = { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 };
  const total = { ...axes };
  for (const domain of legislableDomains(campaign)) {
    const { alignment } = selectPolicyStance(campaign, domain);
    for (const key of Object.keys(total) as (keyof AlignmentVector)[]) {
      total[key] += alignment[key] ?? 0;
    }
  }
  return {
    economicLeftRight: round3(Math.max(-1, Math.min(1, total.economicLeftRight))),
    authLibertarian: round3(Math.max(-1, Math.min(1, total.authLibertarian))),
    nationalistGlobalist: round3(Math.max(-1, Math.min(1, total.nationalistGlobalist))),
  };
}

// --- The turn phase. ------------------------------------------------------

// Which metric a turn's program moved most, on a common footing — treasury is
// money and the rest are points, so a large economy's ordinary receipts would
// otherwise always be "the story of the turn".
function headlineMetric(perTurn: MetricDeltas, gdp: number): keyof MetricSet | undefined {
  const entries = Object.entries(perTurn) as [keyof MetricSet, number][];
  let best: [keyof MetricSet, number] | undefined;
  for (const [key, value] of entries) {
    const weight = key === "treasury" ? Math.abs(value) / Math.max(1, gdp) : Math.abs(value);
    if (!best || weight > best[1]) best = [key, weight];
  }
  return best?.[0];
}

const METRIC_WORDS: Record<keyof MetricSet, string> = {
  treasury: "the accounts",
  stability: "the country's footing",
  militaryReadiness: "the forces",
  standing: "your standing abroad",
  approval: "the polls",
};

/**
 * How a week of the standing program is told.
 *
 * Every entry takes the same four facts — which programs are running, whether
 * that is one or several, what they moved most, and whether it went the
 * player's way — so the variants differ in wording alone and never in what
 * they claim. A record is allowed to be repetitive about substance; it is not
 * allowed to be repetitive about language.
 */
type ProgramVoice = (subject: string, single: boolean, target: string, favorable: boolean) => string;

const PROGRAM_VOICES: readonly ProgramVoice[] = [
  (subject, single, target, favorable) =>
    `${subject} ${single ? "continues" : "continue"} to work on ${target}, ${favorable ? "for" : "against"} you.`,
  (subject, single, target, favorable) =>
    `Another week of ${subject.toLowerCase()}; ${target} ${favorable ? "moves your way" : "moves against you"}.`,
  (subject, single, target, favorable) =>
    `${subject} ${single ? "is" : "are"} still in force, and ${target} ${favorable ? "shows it" : "pays for it"}.`,
  (subject, single, target, favorable) =>
    `${target.charAt(0).toUpperCase()}${target.slice(1)} ${favorable ? "answers to" : "suffers under"} ${subject.toLowerCase()}, held for another week.`,
];

const INHERITED_VOICES: readonly string[] = [
  "The government's inherited program carries on unchanged.",
  "Nothing in the program changed this week; the country runs on what it was handed.",
  "Another week governed entirely on the settings you inherited.",
];

/**
 * A program's spending is an obligation like any other, and while the
 * appropriation has lapsed nobody may make one: the money line stops for the
 * weeks of the shutdown and resumes when the government reopens. What the
 * program does to the country's order and standing is not money and carries on.
 */
function withoutLapsedSpending(state: Campaign, deltas: MetricDeltas): MetricDeltas {
  if ((deltas.treasury ?? 0) >= 0 || !inShutdown(state)) return deltas;
  const { treasury: _obligation, ...unpaid } = deltas;
  return unpaid;
}

/**
 * One packet a turn for the whole program, not one per domain: six ledger
 * entries every week saying "policy happened" is noise the record has to be
 * read around, where one entry naming what the program actually did to the
 * country is the thing a player wants their own record to say.
 */
export const policyPhase: TurnPhase = (state: Campaign) => {
  const outlook = selectPolicyOutlook(state);
  // A program adopted this month is not a program working this month. The
  // lines still standing up move nothing; they are the reason the record has a
  // sentence to print while nothing arrives.
  const running = outlook.lines.filter((line) => programBites(state, line.domain, line.stance));
  const standingUp = outlook.lines.filter(
    (line) => !line.stance.inherited && !programBites(state, line.domain, line.stance),
  );
  const deltas = withoutLapsedSpending(state, sumDeltas(running.map((line) => line.perTurn)));
  // The program's teeth: what a week of governing does to the country
  // itself, as against what it does to the player's five readings. A stance
  // that moved only the dashboard left the nation the rest of the simulation
  // reads — conditions, conflicts, instrument odds, NPC assessments — exactly
  // as it found it.
  const runtime = selectNation(state, state.founding.nation);
  const statEffects = runtime
    ? policyNationEffects(
        runtime,
        running.map((line) => ({ stance: line.stance, quality: executionQuality(state, line.domain) })),
      )
    : [];
  // Marked while a program is still being built, and not after: the record only
  // needs the week it started, and the mark is what says which week that was.
  const marks = standingUp.map((line) => programMark(line.domain, line.stance.id));
  if (Object.keys(deltas).length === 0 && statEffects.length === 0 && marks.length === 0) return [];

  const turn = state.turn + 1;
  const headline = headlineMetric(deltas, playerGdp(state));
  const moved = headline ? (deltas[headline] ?? 0) : 0;
  const named = running.filter((line) => !line.stance.inherited).map((line) => line.stance.name.toLowerCase());

  // The verb agrees with the number of programs actually running: one
  // program continues, several continue, and a phase that narrates itself
  // ungrammatically reads as a template rather than as a record.
  //
  // The phrasing is drawn per turn, because this phase fires every week and a
  // standing program does not change: holding one sentence meant the ledger
  // printed the identical line eight weeks running, and a record that repeats
  // verbatim reads as a template even when every word of it is true. The draw
  // is on its own stream so it cannot move anything the program actually does.
  const voice = createRngStreams(state.seed).stream("policy-voice", String(state.turn));
  const subject = sentenceList(named);
  const target = headline ? METRIC_WORDS[headline] : "the country";
  const favorable = moved >= 0;
  // A week where the only news is that something is being built says that,
  // rather than reaching for a line about a program that is not working yet.
  // One program at a time, the newest: a week that reported six build-outs at
  // once would be a status list, and the sentence is doing the work of saying
  // what a change of program actually set in motion.
  const building = standingUp
    .map((line) => ({ line, weeks: programStandUpRemaining(state, line.domain, line.stance) }))
    .sort((a, b) => b.weeks - a.weeks)[0];
  const buildOut = building ? standUpLine(building.line, building.weeks) : undefined;
  const held =
    named.length === 0
      ? voice.pick(INHERITED_VOICES)
      : voice.pick(PROGRAM_VOICES)(subject, named.length === 1, target, favorable);
  const summary = buildOut && Object.keys(deltas).length === 0 ? buildOut : buildOut ? `${held} ${buildOut}` : held;

  return [
    {
      source: "simulate",
      actor: "player",
      turn,
      // The administration's own machinery working, which is a different thing
      // from the President deciding and from the world moving.
      provenance: {
        origin: "institution",
        systems: ["policy"],
        ...(marks.length > 0 ? { marks } : {}),
      },
      narration: { summary },
      effects: [...(Object.keys(deltas).length > 0 ? [{ kind: "metric" as const, deltas }] : []), ...statEffects],
    },
  ];
};

/**
 * What the record says about a program that has been signed and is not yet
 * working.
 *
 * These are the weeks a real program spends being written into rules and
 * staffed against, and they are the weeks its opposition organizes in — so the
 * sentence names the authority it is being stood up under and the constituency
 * it is worst for, which are the two facts a change of stance never used to
 * carry. Both are read rather than authored: the authority is a fact about the
 * power, and the opponent is the country's own beliefs measured against the
 * direction the program pushes.
 */
function standUpLine(line: PolicyOutlookLine, weeks: number): string {
  const wait = weeks === 1 ? "another week" : `another ${weeks} weeks`;
  const against = stanceOpposition(line.stance);
  const objection = against ? ` ${against.name} are organizing against it.` : "";
  return (
    `${capitalize(line.stance.name.toLowerCase())} is being stood up under ${domainAuthority(line.domain)} — ` +
    `${wait} before it reaches anybody.${objection}`
  );
}

export function sentenceList(items: readonly string[]): string {
  if (items.length === 1) return capitalize(items[0]!);
  return `${capitalize(items.slice(0, -1).join(", "))} and ${items.at(-1)!}`;
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}
