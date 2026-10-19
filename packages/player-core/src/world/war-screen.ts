import {
  REPORT_WINDOW_DAYS,
  calledCompactsIn,
  campaignDay,
  hasIntelOnNation,
  nationName,
  outstandingIssuedAuthorizationActs,
  sentenceCase,
  selectAuthorizationAgainst,
  projectCallAnswers,
  projectLeave,
  projectPeace,
  selectCallableCompacts,
  selectObligations,
  sideOf,
  terminationClockRuns,
  terminationDaysRemaining,
  terminationWindowFromIntroduction,
  type Campaign,
  type WarLossBand,
  type Conflict,
  type ConflictSide,
  type ReportObligation,
  type WillingnessForecast,
} from "@admin/engine";
import { organizationById, type LonLat, type NationId, type OrgId } from "@admin/world";
import { formatDate } from "../format/figures";
import { placeForces } from "../geo/force-placement";
import { intensityWord } from "./conflict-intensity";
import { warAgeLine, warBeatDate } from "./war-age";
import { warFileReading } from "./war-file";
import { dueIn, reportStanding, warPartyForces, type ReportStanding, type WarPowersClock } from "./war-powers-reading";

// One war as a screen reads it: who is on each side and why they came, how hot
// the front is and how much each side has left, where forces stand, the War
// Powers paper the President owes, and which doors are open. Every figure comes
// from the engine's own readers; a side the services cannot read is shown as
// unread rather than guessed at.

export const SIDE_LABEL: Readonly<Record<ConflictSide, string>> = { aggressor: "The attacking side", defender: "The defending side" };

export type WarMember = {
  readonly nation: NationId;
  readonly name: string;
  readonly role: "principal" | "joined";
  readonly us: boolean;
  /** Why the government came in, where the services can read the decision. Empty means the surface prints "Joined" alone. */
  readonly reasons: readonly string[];
  /** What the government has put into the fighting, line by line; only the United States' own commitments are on record. */
  readonly committed: readonly string[];
};

/** A reading drawn on a meter, with the word beside it. Absent where the services cannot read the side. */
export type WarMeter = { readonly value: number; readonly word: string };

export type WarSide = {
  readonly side: ConflictSide;
  readonly label: string;
  readonly members: readonly WarMember[];
  readonly support?: WarMeter;
  readonly exhaustion?: WarMeter;
  /** Cumulative losses as a band with its confidence, never a count. */
  readonly casualties?: string;
  /** Governments the services expect to join this side. */
  readonly likely: readonly { readonly nation: NationId; readonly name: string; readonly forecast: WillingnessForecast }[];
};

export type WarForce = {
  readonly id: string;
  readonly label: string;
  readonly zoneName: string;
  readonly precision: "installation" | "zone";
  readonly point: LonLat;
  readonly personnel: number;
  readonly service?: string;
  readonly band?: string;
};

export type WarPaper = {
  readonly id: string;
  readonly description: string;
  readonly against: NationId;
  readonly report: ReportStanding;
  /** Days to the forty-eight hour report while it is still owed. */
  readonly reportClock?: WarPowersClock;
  /** The sixty day clock, while forces are committed and no authorization covers them. */
  readonly withdrawal?: WarPowersClock;
  /** Whether Congress has authorized force against this government, is voting on it, or has not been asked. */
  readonly authorization: WarAuthorization;
};

export type WarPeace = {
  readonly counterpart: string;
  readonly offered: boolean;
  readonly forecast: WillingnessForecast;
  readonly reasoning: string;
  /** The United States came in beside a principal, so the settlement is not its to sign. */
  readonly joined: boolean;
};

export type WarCompact = {
  readonly org: OrgId;
  readonly name: string;
  readonly called: boolean;
  readonly answers: readonly { readonly nation: NationId; readonly name: string; readonly forecast: WillingnessForecast }[];
};

export type WarScreenReading = {
  readonly id: string;
  readonly conflict: Conflict;
  readonly title: string;
  readonly cause: string;
  readonly age: string;
  readonly over: boolean;
  readonly statusWord: string;
  /** Where the United States stands in it. */
  readonly usRole: "principal" | "joined" | "outside";
  readonly usSide?: ConflictSide;
  readonly intensity: WarMeter;
  readonly sides: Readonly<Record<ConflictSide, WarSide>>;
  readonly forces: readonly WarForce[];
  readonly papers: readonly WarPaper[];
  readonly peace?: WarPeace;
  /** The standing cost of walking out, where the United States joined and can leave. */
  readonly canLeave: boolean;
  readonly compacts: readonly WarCompact[];
  /** Where Congress stands on force against each principal, for a President deciding whether to go in. */
  readonly authorizations: readonly WarAuthorization[];
  /** Every belligerent in the map's set form: `nation:A|nation:B`. */
  readonly set: string;
  readonly beats: readonly { readonly date: string; readonly description: string }[];
};

const STATUS_WORD: Readonly<Record<Conflict["status"], string>> = {
  active: "Under way",
  "aggressor-victory": "Ended. The attacker won.",
  "defender-victory": "Ended. The defender won.",
  settled: "Settled",
};

function supportWord(value: number): string {
  if (value >= 0.6) return "Firm";
  if (value >= 0.35) return "Wavering";
  return "Thin";
}

function exhaustionWord(value: number): string {
  if (value >= 0.6) return "Spent";
  if (value >= 0.3) return "Wearing";
  return "Fresh";
}

export function nationNameIn(campaign: Campaign, nation: NationId): string {
  return campaign.nations[nation]?.base.identity.name ?? (nation as string);
}

/** A government as a sentence carries it: "the United States", "Iran". */
function nationPhrase(campaign: Campaign, nation: NationId): string {
  const identity = campaign.nations[nation]?.base.identity;
  return identity ? nationName(identity) : (nation as string);
}

function casualtyWords(band: WarLossBand | undefined): string | undefined {
  if (!band) return undefined;
  const confidence = band.confidence === "high" ? "counted" : band.confidence === "medium" ? "estimated" : "a rough estimate";
  const range = (low: number, high: number) => `${low.toLocaleString("en-US")} to ${high.toLocaleString("en-US")}`;
  return `${range(band.killed.low, band.killed.high)} killed and ${range(band.wounded.low, band.wounded.high)} wounded (${confidence})`;
}

function membersOf(campaign: Campaign, conflict: Conflict, side: ConflictSide, reasons: ReadonlyMap<string, readonly string[]>, committed: ReadonlyMap<string, readonly string[]>): readonly WarMember[] {
  const us = campaign.founding.nation;
  const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
  return [principal, ...conflict.joined[side]].map((nation, index) => ({
    nation,
    name: nationNameIn(campaign, nation),
    role: index === 0 ? ("principal" as const) : ("joined" as const),
    us: nation === us,
    reasons: reasons.get(nation) ?? [],
    committed: committed.get(nation) ?? [],
  }));
}

function readSide(campaign: Campaign, conflict: Conflict, side: ConflictSide, file: NonNullable<ReturnType<typeof warFileReading>>, committed: ReadonlyMap<string, readonly string[]>): WarSide {
  const reasons = new Map(file.joiners.filter((joiner) => joiner.side === side).map((joiner) => [joiner.nation as string, joiner.reasons.map((line) => line.text)] as const));
  const principal = side === "aggressor" ? conflict.aggressor : conflict.defender;
  // The services read a government's will to fight only where they read the government; the United States' own side is always legible.
  const legible = hasIntelOnNation(campaign, principal);
  const casualties = casualtyWords(file.casualties[side]);
  return {
    side,
    label: SIDE_LABEL[side],
    members: membersOf(campaign, conflict, side, reasons, committed),
    ...(legible ? { support: { value: conflict.warSupport[side], word: supportWord(conflict.warSupport[side]) } } : {}),
    ...(legible ? { exhaustion: { value: conflict.exhaustion[side], word: exhaustionWord(conflict.exhaustion[side]) } } : {}),
    ...(casualties ? { casualties } : {}),
    likely: file.likelyJoiners[side].map((joiner) => ({ nation: joiner.nation, name: nationNameIn(campaign, joiner.nation), forecast: joiner.forecast })),
  };
}

/** Forces the President has committed to this war: against its belligerents, or to the war itself. */
function warForces(campaign: Campaign, conflict: Conflict): readonly WarForce[] {
  const belligerents = new Set<string>([conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender]);
  const ours = new Set(
    Object.values(campaign.commitments)
      .filter((commitment) => commitment.status === "active" && ((commitment.target.kind === "conflict" && commitment.target.id === conflict.id) || (commitment.target.kind === "nation" && belligerents.has(commitment.target.id))))
      .map((commitment) => commitment.id),
  );
  return placeForces(campaign)
    .filter((placement) => ours.has(placement.id) || belligerents.has(placement.zone as string))
    .map((placement) => ({
      id: placement.id,
      label: placement.label,
      zoneName: placement.zoneName,
      precision: placement.precision,
      point: placement.point,
      personnel: placement.personnel,
      ...(placement.service ? { service: placement.service } : {}),
      ...(placement.personnelBand ? { band: placement.personnelBand } : {}),
    }));
}

/** One introduction of force as its War Powers paper: the report, the sixty days, and Congress's answer on the government it targets. */
export function paperOf(campaign: Campaign, obligation: ReportObligation): WarPaper {
  const standing = reportStanding(obligation);
  const day = terminationDaysRemaining(campaign, obligation);
  return {
    id: obligation.id,
    description: obligation.description,
    against: obligation.target,
    report: standing,
    ...(standing === "Owed" ? { reportClock: dueIn(campaign, Math.max(0, obligation.dueDay - campaignDay(campaign)), REPORT_WINDOW_DAYS, (date) => `Report to Congress by ${date}`) } : {}),
    ...(terminationClockRuns(campaign, obligation) ? { withdrawal: dueIn(campaign, day, terminationWindowFromIntroduction(obligation), (date) => `Troops must leave by ${date} unless Congress votes`) } : {}),
    authorization: authorizationOf(campaign, obligation.target, pendingTargets(campaign)),
  };
}

function warPapers(campaign: Campaign, conflict: Conflict): readonly WarPaper[] {
  const us = campaign.founding.nation;
  const side = sideOf(conflict, us);
  if (!side) return [];
  const enemies = new Set<string>(side === "aggressor" ? [conflict.defender, ...conflict.joined.defender] : [conflict.aggressor, ...conflict.joined.aggressor]);
  return selectObligations(campaign)
    .filter((obligation) => enemies.has(obligation.target) && !obligation.terminated)
    .map((obligation) => paperOf(campaign, obligation));
}

function peaceOf(campaign: Campaign, conflict: Conflict): WarPeace | undefined {
  const projection = projectPeace(campaign, conflict.id);
  if (!projection) return undefined;
  return {
    counterpart: projection.counterpartName,
    offered: projection.offered,
    forecast: projection.forecast,
    reasoning: projection.reasoning,
    joined: conflict.joined[projection.ourSide].includes(campaign.founding.nation),
  };
}

export type WarAuthorization = { readonly nation: NationId; readonly name: string; readonly state: "covered" | "pending" | "open"; readonly title?: string };

function pendingTargets(campaign: Campaign): ReadonlySet<string> {
  return new Set<string>(outstandingIssuedAuthorizationActs(campaign).map((act) => act.target));
}

function authorizationOf(campaign: Campaign, nation: NationId, pending: ReadonlySet<string>): WarAuthorization {
  const covered = selectAuthorizationAgainst(campaign, nation);
  return {
    nation,
    name: nationNameIn(campaign, nation),
    state: covered ? "covered" : pending.has(nation) ? "pending" : "open",
    ...(covered ? { title: covered.title } : {}),
  };
}

function authorizationsOf(campaign: Campaign, conflict: Conflict): readonly WarAuthorization[] {
  const pending = pendingTargets(campaign);
  return [conflict.aggressor, conflict.defender].map((nation) => authorizationOf(campaign, nation, pending));
}

function compactsOf(campaign: Campaign, conflictId: string): readonly WarCompact[] {
  const called = new Set<string>(calledCompactsIn(campaign, conflictId));
  return selectCallableCompacts(campaign)
    .filter((entry) => entry.conflict === conflictId)
    .map((entry) => ({
      org: entry.org,
      name: organizationById.get(entry.org as string)?.name ?? entry.orgName,
      called: called.has(entry.org as string),
      answers: projectCallAnswers(campaign, entry.org, conflictId).map((joiner) => ({ nation: joiner.nation, name: nationNameIn(campaign, joiner.nation), forecast: joiner.forecast })),
    }));
}

/** One war's screen reading. Undefined for a war not on the board. */
export function warScreenReading(campaign: Campaign, id: string): WarScreenReading | undefined {
  const file = warFileReading(campaign, id);
  if (!file) return undefined;
  const { conflict } = file;
  const us = campaign.founding.nation;
  const usSide = sideOf(conflict, us);
  const parties = warPartyForces(campaign, id);
  const everyone = [...(parties?.aggressor ?? []), ...(parties?.defender ?? [])];
  const members = everyone.map((party) => party.nation);
  const committed = new Map(everyone.map((party) => [party.nation as string, party.committed] as const));
  const aggressor = nationPhrase(campaign, conflict.aggressor);
  const defender = nationPhrase(campaign, conflict.defender);
  const over = conflict.status !== "active";
  const peace = !over && usSide ? peaceOf(campaign, conflict) : undefined;
  return {
    id,
    conflict,
    title: `${sentenceCase(aggressor)} against ${defender}`,
    cause: conflict.cause,
    age: warAgeLine(campaign, conflict),
    over,
    statusWord: STATUS_WORD[conflict.status],
    usRole: !usSide ? "outside" : conflict.joined[usSide].includes(us) ? "joined" : "principal",
    ...(usSide ? { usSide } : {}),
    intensity: { value: conflict.intensity, word: intensityWord(conflict.intensity) },
    sides: { aggressor: readSide(campaign, conflict, "aggressor", file, committed), defender: readSide(campaign, conflict, "defender", file, committed) },
    forces: warForces(campaign, conflict),
    papers: over ? [] : warPapers(campaign, conflict),
    ...(peace ? { peace } : {}),
    canLeave: !over && projectLeave(campaign, id)?.refusal === undefined && projectLeave(campaign, id) !== undefined,
    compacts: over ? [] : compactsOf(campaign, id),
    authorizations: over || usSide ? [] : authorizationsOf(campaign, conflict),
    set: members.map((nation) => `nation:${nation}`).join("|"),
    beats: conflict.beats.map((beat) => ({ date: formatDate(warBeatDate(campaign, beat.turn)), description: beat.description })),
  };
}
