import type { CausalId } from "./causality.js";
import type { CasualtyBand } from "./state-world.js";
import type { ConsequenceCard, ConsequenceContext } from "./consequences.js";
import type { ResolutionRequest } from "./resolution.js";
import type { NationId, PersonId, StateId } from "@admin/world";
import type { RungLevel } from "./instruments.js";
// Type-only, and it has to stay that way: budget.ts reads campaign state at
// runtime, so a value import here would close a cycle.
import type { BudgetAccount } from "./budget.js";
import type { ImpoundmentMessage } from "./impoundment.js";
import type { GameDate } from "./state-campaign.js";
import type { PressAction } from "./state-press.js";
import type { SharedCredit } from "./state-ties.js";

// The branch above the presidency, and everything it produces: the chambers and
// the people who run them, the law they write, the elections that recompose
// them, the corps that explains all of it to the country, and the treaties the
// Senate decides about.
//
// Split out of state.ts rather than living beside the campaign's own shape,
// because it is a self-contained vocabulary that nothing here depends on the
// rest of the campaign to state — and state.ts had grown past the point where
// a reader could find any of it. The rules that move it live in congress.ts,
// hill.ts, lobbying.ts, legislation.ts, elections.ts, press.ts and treaties.ts;
// the shapes live here with the rest of the campaign's plain serializable data.
// Every one of these types is re-exported from state.ts, which stays the single
// import path for campaign state.

// --- Congress: the branch the president has to answer to every week ---
//
// A presidency is not a ladder of instruments pointed abroad. The constraint
// that actually binds one is political and domestic: a president cannot invade
// a different country every week, cannot seat a cabinet alone, and cannot spend
// a dollar Congress has not appropriated. None of that was modeled, so the
// office had no branch above it and the only thing that ever stopped an
// administration was running out of readiness.
//
// The rules that move any of this live in congress.ts and legislation.ts; the
// shapes live here with the rest of the campaign's plain serializable data.

export type Chamber = "house" | "senate";

/** The two major parties an administration can belong to. Never Independent. */
export type UsMajorParty = "democrat" | "republican";

/** Chamber seat shares may be Independent; leadership posts are not. */
export type UsParty = UsMajorParty | "independent";

/**
 * What the president themselves ran as. A third option the chambers do not
 * have: a member sits with a caucus or with neither, but a president belongs to
 * a party or to no party at all, and an independent presidency is a different
 * office to hold than a party one.
 */
export type AdministrationParty = UsMajorParty | "independent";

/** Who holds the seats. `independent` is everyone who caucuses with neither. */
export type ChamberComposition = {
  readonly seats: number;
  readonly administration: number;
  readonly opposition: number;
  readonly independent: number;
};

/** The blocs a count splits a chamber into, the same three `ChamberComposition` seats. */
export type VoteCaucus = "administration" | "opposition" | "independent";

/** One bloc's part of a count: its seats, and how many of them vote yea. */
export type CaucusTally = {
  readonly seats: number;
  readonly yeas: number;
};

/**
 * A count on the floor. Kept whole rather than as a boolean because the whip
 * count is the thing a president reads before deciding whether to hold the
 * vote at all, and a screen cannot show a margin it was never handed.
 */
export type ChamberVote = {
  /** Separate non-member Senate casting vote; totals include it, member roll calls do not. */
  readonly castingVote?: { readonly person: PersonId; readonly yea: boolean };
  readonly rollCall?: readonly { readonly person: PersonId; readonly seat: string; readonly state: import("@admin/world").StateId; readonly party: UsParty; readonly yea: boolean; readonly support: number; readonly reasons: readonly string[] }[];
  readonly recordedTurn?: number;
  readonly procedure?: "cloture" | "final-passage";
  readonly cloture?: ChamberVote;
  readonly chamber: Chamber;
  readonly yeas: number;
  readonly nays: number;
  /** Votes needed to carry — a simple majority, or two thirds for an override. */
  readonly required: number;
  readonly passed: boolean;
  /**
   * The same count by bloc, so a screen can say how many of the President's
   * own members would have to break rather than what share the chamber
   * reached. Written on every count `voteOn` takes; absent only on a vote
   * stored by a build that counted before there was one counter.
   */
  readonly byCaucus?: Readonly<Record<VoteCaucus, CaucusTally>>;
  /**
   * Set when a 50-50 Senate on a simple majority was carried by the presiding
   * officer. Cloture, an override, a treaty, and a conviction never set it.
   */
  readonly tieBrokenBy?: PersonId;
};

/**
 * A congressional authorization for the use of military force against one
 * country, for a stated period. The president's own authority covers the first
 * unilateral action; sustaining or repeating it is what this is for.
 */
export type ForceAuthorization = {
  readonly id: string; // "aumf:<target>:<enactedTurn>"
  readonly title: string;
  readonly target: NationId;
  readonly enactedTurn: number;
  readonly expiresTurn: number;
  readonly vote: readonly ChamberVote[];
};

/**
 * A major military action taken without one.
 *
 * Kept as a record rather than a count, for the reason a contested executive
 * order is: what compounds is the pattern, and a retrospective has to be able
 * to say which countries and which weeks the case against the president was
 * built out of.
 */
export type UnauthorizedAction = {
  readonly id: string; // "unauthorized:<target>:<turn>"
  readonly target: NationId;
  readonly turn: number;
  readonly rung: RungLevel;
  readonly description: string;
};

/**
 * What the government is funded by.
 *
 * Two scopes, and keeping them apart is the whole of this type. `enactedTurn`,
 * `throughTurn` and `onPriorYear` are facts about the *book*: when it passed,
 * when the money runs out, and whether there is a new one at all. `priorYear`
 * is a fact about the lines inside a book that did pass — the accounts Congress
 * struck out and left at the rate the last Congress set.
 *
 * `onPriorYear` is the president who could not get a budget at all: the state
 * keeps running, on last year's numbers, which is a worse way to govern than
 * either passing one or failing loudly. `priorYear` is the president who got
 * most of one. They never overlap: when `onPriorYear` is true there is no book,
 * so there is no line inside it to be missing, and `priorYear` is empty.
 *
 * Only `throughTurn` reaches the shutdown. A struck-out account is not a
 * funding lapse — the government is funded, one department at last year's
 * number — and a lapse is the whole book running out with nothing behind it.
 */
export type Appropriation = {
  readonly enactedTurn: number;
  readonly throughTurn: number;
  readonly onPriorYear: boolean;
  readonly priorYear: readonly BudgetAccount[];
  /** Special messages withholding budget authority under the Impoundment Control Act; absent until the first is sent. */
  readonly impoundments?: readonly ImpoundmentMessage[];
};

/**
 * A seat of power inside a chamber, as opposed to a seat in one.
 *
 * The posts are fixed and the people in them are not: which caucus holds the
 * speakership follows the arithmetic, so a midterm that flips the House changes
 * who the president has to deal with rather than only how many of them.
 */
export type HillPostId =
  | "post-house-speaker"
  | "post-house-majority-leader"
  | "post-house-minority-leader"
  | "post-senate-majority-leader"
  | "post-senate-minority-leader"
  | "post-appropriations-chair"
  | "post-armed-services-chair";

/** Which side of the chamber a post belongs to, once the seats are counted. */
export type HillCaucus = "administration" | "opposition";

/**
 * One person on the Hill the president has to deal with by name.
 *
 * How warm they are toward the administration is theirs rather than the room's
 * or the post's, so it lives on the person's tie (`state-ties.ts`): it opens
 * near the chamber's and then moves with what the administration does to this
 * particular member — which is what makes a whip count something a president
 * can work on instead of only watch. `influence` is the share of their chamber
 * they can actually carry with them, and it is the reason a Speaker is worth
 * more than a chair.
 */
export type HillFigure = {
  readonly post: HillPostId;
  readonly person: PersonId;
  readonly chamber: Chamber;
  readonly caucus: HillCaucus;
  readonly influence: number; // 0..1 share of the chamber that follows them
  readonly seatedTurn: number;
};

/**
 * How a president spent to move one of them, and whether it worked: a call, a
 * budget negotiation, a public appeal in their state, credit shared on a live
 * bill, or campaigning beside them at home.
 */
export type LobbyApproach = "call" | "trade" | "public" | "credit" | "campaign";

/** A directed, observed issue-specific cooperation event, never inferred from biography. */
export type PersonCooperation = {
  readonly from: PersonId;
  readonly to: PersonId;
  readonly actId: string;
  readonly date: GameDate;
  readonly accepted: boolean;
  readonly account: string;
};

export type LobbyRecord = {
  readonly id: string; // "lobby:<post>:<turn>"
  readonly post?: HillPostId;
  readonly member?: PersonId;
  readonly billId?: string;
  readonly cooperation?: readonly PersonCooperation[];
  readonly approach: LobbyApproach;
  readonly turn: number;
  readonly landed: boolean;
  /** What the room made of it, in the words the record keeps. */
  readonly account: string;
};

/**
 * Likelihood and confidence as the player is allowed to see them for a Hill
 * play. The engine still rolls against `successChance`; this is the assessment
 * frozen at issuance, not a restatement of hidden disposition.
 */
export type LobbyForecast = {
  readonly likelihood: "remote" | "unlikely" | "roughly even" | "likely" | "almost certain";
  readonly confidence: "low" | "moderate" | "high";
  readonly confidenceBasis: string;
  readonly supporting: string;
  readonly uncertainty: string;
  readonly source: string;
  readonly asOf: GameDate;
};

export type IssuedActStatus =
  | "issued"
  | "in-progress"
  | "awaiting-response"
  | "resolved"
  | "reported"
  | "withdrawn"
  | "expired";

type IssuedActBase = {
  readonly id: string;
  readonly status: IssuedActStatus;
  readonly issuedTurn: number;
  readonly issuedDate: GameDate;
  readonly dueDate: GameDate;
  /**
   * The odds the player was shown. Resolution rolls against this number even if
   * the live board has moved, so a later record can say the outcome disagreed
   * with a reasonable forecast rather than rewriting the forecast.
   */
  readonly chance: number;
  readonly forecast: LobbyForecast;
  readonly outcome?: { readonly landed: boolean; readonly account: string; readonly civilianCasualties?: CasualtyBand };
};

/** A Hill play waiting on a counterpart. */
export type IssuedLobbyAct = IssuedActBase & {
  readonly kind: "lobby";
  readonly post: HillPostId;
  readonly approach: LobbyApproach;
  /** Live floor business this play was about, when there was any. */
  readonly matter?: { readonly billId: string; readonly title: string };
  readonly offer?: { readonly summary: string };
  /**
   * The rapport a second call with nothing asked costs, frozen when it was
   * authorized, so the answer charges what the card showed.
   */
  readonly repeatCall?: number;
};

/** A direct member request or an authorized broker's coalition effort. */
export type IssuedMemberLobbyAct = Omit<IssuedActBase, "forecast"> & {
  readonly forecast: Omit<LobbyForecast, "likelihood"> & { readonly likelihood: "unknown" };
  readonly kind: "member-lobby";
  readonly member: PersonId;
  readonly billId: string;
  readonly broker?: PersonId;
  readonly coalition: boolean;
};

/**
 * A press engagement that has been authorized but has not yet produced its
 * corps movement. The hour (or the leak) is on the calendar; the room answers
 * when the due date arrives.
 */
export type IssuedPressAct = IssuedActBase & {
  readonly kind: "press";
  readonly action: PressAction;
  /** Present when the play is with one masthead. */
  readonly outletId?: string;
};

/**
 * A treaty sent to the Senate for consent. The floor has not voted yet; the
 * calendar carries the instrument until the due date. Resolution re-reads the
 * live chamber — lobbying between send and vote can still move the count —
 * against the forecast frozen at issuance.
 */
export type IssuedTreatyAct = IssuedActBase & {
  readonly kind: "treaty";
  readonly treatyId: string;
  readonly title: string;
};

/**
 * An AUMF asked of Congress. Both chambers have not voted; the calendar
 * carries the request until the due date. Resolution re-reads the live Hill
 * against the forecast frozen at issuance.
 */
export type IssuedAuthorizationAct = IssuedActBase & {
  readonly kind: "authorization";
  readonly target: NationId;
  readonly title: string;
};

/**
 * A presidential act that has been authorized but has not yet produced its
 * world result. Stable across navigation and reload. Resolution reads the
 * conditions at the due date, not the ones at the click.
 */
export type IssuedInstrumentAct = {
  readonly causedBy?: CausalId;
  readonly kind: "instrument";
  readonly aftermath?: readonly ConsequenceCard[];
  readonly context?: ConsequenceContext;
  readonly id: string;
  readonly status: IssuedActStatus;
  readonly issuedTurn: number;
  readonly issuedDate: GameDate;
  readonly dueDate: GameDate;
  readonly request: ResolutionRequest;
  readonly supportRequests?: readonly import("./action-support.js").IssuedSupportRequest[];
  readonly title: string;
  readonly reservedTreasury: number;
  readonly forecast: LobbyForecast;
  readonly chance: number;
  readonly outcome?: { readonly landed: boolean; readonly account: string; readonly civilianCasualties?: CasualtyBand };
};

export type IssuedAct = IssuedMemberLobbyAct | IssuedLobbyAct | IssuedPressAct | IssuedTreatyAct | IssuedAuthorizationAct | IssuedInstrumentAct;

/**
 * One Senate committee, as the people who sit on it.
 *
 * The institution catalog has always referred every confirmation to a committee
 * by id, and until this existed that id reached nobody: the committee stage of a
 * nomination read the whole room's mood, so thirteen panels with thirteen
 * different chairs behaved as one. What is stored is the seating rather than the
 * panel's mood — a chair's own reading of an administration is derived from the
 * room and from who they are, the same way a leadership post's target is, so
 * there is no second disposition here to drift out of step with the first.
 *
 * `balance` is the share of the panel sitting with the administration's caucus,
 * carried from the Senate's own composition: it is what decides which caucus
 * chairs, and it is the weight the chair's reading is worth against the ranking
 * member's when the panel is read.
 */
export type CommitteeSeat = {
  /** The catalog's own committee id, e.g. `CMTE-ARMED`. */
  readonly committee: string;
  /** Absent when the bench had nobody left to seat, which is a legal state. */
  readonly chair?: PersonId;
  readonly ranking?: PersonId;
  /**
   * Which caucus holds the gavel. Stored rather than derived from the chamber
   * every time it is read, because it is what a midterm actually changes: when
   * the Senate flips, the ranking member takes the chair and the chair becomes
   * the ranking member — the same two people, the other way round.
   */
  readonly chairCaucus: HillCaucus;
  readonly balance: number; // 0..1 share sitting with the administration
  readonly seatedTurn: number;
};

export type Congress = {
  readonly members?: readonly import("./congress-members.js").CongressMember[];
  readonly chambers: Readonly<Record<Chamber, ChamberComposition>>;
  /**
   * What the president ran as, chosen at founding and never recomputed from
   * live alignments. May be Independent: a presidency is not obliged to belong
   * to a caucus, and one that does not is a different job, not a broken one.
   */
  readonly administrationParty: AdministrationParty;
  /**
   * The major caucus this administration sits nearest — its own party, or for
   * an independent the party its economics is closest to.
   *
   * Congress is two-party whoever is president: the `administration` column of
   * every ChamberComposition, every Senate seat's party word and every
   * leadership post are counted along this axis, because who Massachusetts
   * sends to the House is a fact about Massachusetts rather than about the
   * person in the chair. What being an independent changes is not the seats but
   * the president's claim on them, and that is a reading — `administrationAlignment`
   * in party.ts — not an identity check.
   */
  readonly caucusAnchor: UsMajorParty;
  /**
   * How the Hill is disposed toward this administration, 0..1. Distinct from
   * party arithmetic on purpose: a president's own party can refuse them, and
   * the other side's votes are winnable. Composition is who is in the room;
   * disposition is what the room currently thinks of the president.
   */
  readonly disposition: number;
  /**
   * The people the seats are held by. Empty is a legal state — a save from
   * before the Hill had names in it loads that way, and every count still
   * carries, because the leadership moves a count away from the room's own
   * disposition rather than replacing it.
   */
  readonly leadership: readonly HillFigure[];
  /**
   * The Senate's committees, keyed by the catalog's committee id. Empty is a
   * legal state for the same reason `leadership` empty is: a save written
   * before the panels were seated loads that way, and every committee reading
   * falls back to the room's own disposition when nobody is in the chair.
   */
  readonly committees: Readonly<Record<string, CommitteeSeat>>;
  readonly authorizations: readonly ForceAuthorization[];
  readonly unauthorized: readonly UnauthorizedAction[];
  /** Every attempt to move a member, kept for the same reason a veto is. */
  readonly lobbying: readonly LobbyRecord[];
  readonly appropriation: Appropriation;
  /** Concurrent budget resolutions: chamber votes and the instructions they adopted. Old saves have none. */
  readonly budgetResolutions?: readonly import("./state-budget.js").BudgetResolution[];
  /**
   * The Vice President, when one is seated. A vacant seat leaves a 50-50
   * Senate tie failing. `liaison` is how far that officer moves the room, and
   * it is zero until a later seating writes it.
   */
  readonly presidingOfficer?: { readonly person: PersonId; readonly liaison: number };
  /**
   * The chambers the country elected but has not yet seated.
   *
   * A Congress is chosen in November and sworn in on January 3, and for those
   * nine weeks the government is run by the chambers the last election made
   * while everybody already knows what the next ones look like. Without this
   * field the seating is instantaneous, which loses the lame-duck session
   * entirely — the one stretch of a term where a majority that is about to
   * disappear still holds the floor. Absent means nothing is waiting, which is
   * the reading for every week that is not between an election and a seating.
   */
  readonly seatingOn?: {
    readonly house: ChamberComposition;
    readonly senate: ChamberComposition;
    readonly seatsTurn: number;
  };
};

// --- Legislation: what Congress does when it is not answering the president ---

/** Who put it in the hopper. A president lobbies; they do not introduce. */
export type BillSponsor = "administration" | "opposition" | "bipartisan";

export type BillStatus =
  /** Introduced and still moving through the chambers. Nothing to sign yet. */
  | "in-progress"
  /** Passed both chambers and is on the desk, awaiting signature or veto. */
  | "on-the-desk"
  | "law"
  | "vetoed"
  /** Failed the override, or was withdrawn. A dead bill is kept, not deleted. */
  | "dead";

/**
 * Where a bill that has not reached the desk currently sits.
 *
 * Three stages because that is the shape of the thing: a measure is referred,
 * it is marked up, and then it is called. Which committee marks it up is not
 * modeled here — the markup reads the chamber's own disposition, the same
 * reading a confirmation runs on — so this is the passage of a bill through
 * time rather than a lattice of panels.
 */
export type BillStage = "referral" | "markup" | "floor" | "conference";
export type BillText = "base" | "targeted";
export type HousingText = BillText;

/**
 * What one week did to a bill that has not reached the desk.
 *
 * The four outcomes are the whole gamble: it moved, it gained ground, it became
 * the argument, or it stalled. Only the last one counts against the bill, and
 * three of those bury it.
 */
export type StageOutcome = "success" | "progress" | "controversy" | "stagnation";

/**
 * One week of a bill's passage, kept on the record.
 *
 * Stored rather than recomputed for the reason a lobbying attempt is: what the
 * room did to a bill in the third week of March is not derivable from where the
 * bill ended up, and a folio that could only print the current stage would say
 * nothing about how it got there.
 */
export type StageBeat = {
  readonly turn: number;
  readonly stage: BillStage;
  readonly outcome: StageOutcome;
  /** What happened, in the words the wire and the folio both quote. */
  readonly account: string;
};

/**
 * One act, from the desk onward.
 *
 * What the act *does* lives in the catalogue in legislation.ts, the same
 * arrangement the policy stances and the executive orders use and for the same
 * reason: these are rules with effects, and a save carrying a copy of them
 * would reload against a build that had since rebalanced them. What is stored
 * is the instance — which act, which votes, what the president did about it —
 * because that is the part no catalogue can reconstruct.
 *
 * The title is stored beside the act id even though the catalogue holds it,
 * because a law is a thing a player remembers by name and a record that could
 * only name it by looking the id up is a record that goes blank the day the
 * catalogue is edited.
 */
export type BillEnactment = "signed" | "veto-overridden" | "unsigned";
export type LawRevisionKind = "repeal" | "renewal" | "replacement";

export type Bill = {
  readonly id: string; // "bill:<act>:<introducedTurn>"
  readonly act: string;
  readonly title: string;
  readonly sponsor: BillSponsor;
  readonly introducedTurn: number;
  readonly status: BillStatus;
  /**
   * The floor votes that carried it to the desk — or, while it is still in
   * progress, the count as it stood the week it was introduced. Rewritten with
   * the real count on the week the floor actually takes it up, so a bill on the
   * desk always quotes the vote that put it there.
   */
  readonly passage: readonly ChamberVote[];
  /**
   * Where it sits, while it is in progress. Absent on every bill that has left
   * the chambers — a law has no stage — and absent on a bill from a save
   * written before legislation was staged, which is why every reader defaults
   * it rather than asserting it.
   */
  readonly stage?: BillStage;
  /** Weeks the bill stalled. Three buries it. */
  readonly setbacks?: number;
  /**
   * What the argument so far is worth on the floor, added to the act's own
   * appeal when the count is taken. This is the only thing a week of markup
   * changes about the arithmetic, and it is why a bill that carried on the day
   * it was introduced can still fail the vote it was introduced to win.
   */
  readonly momentum?: number;
  /** Every week of its passage, oldest first. */
  readonly beats?: readonly StageBeat[];
  /** Authored provision requested in markup, chamber texts, and the final identical text. Absent on old saves means base. */
  readonly text?: {
    readonly proposed?: BillText;
    readonly house?: BillText;
    readonly senate?: BillText;
    readonly conference?: BillText;
    readonly enrolled?: BillText;
    readonly initialPassage?: readonly ChamberVote[];
  };
  /** The votes on the attempt to pass it over a veto, where one was made. */
  readonly override?: readonly ChamberVote[];
  /**
   * How a law became law: the President signed it, Congress passed it over a
   * veto, or the desk window ran out with the President silent. A promise is
   * judged on what the President did, so only a signed law is the
   * administration's act. Absent on bills that are not law; `billEnactment`
   * reads a law without one as signed.
   */
  readonly enactedBy?: BillEnactment;
  /** The enacted statute this bill changes. Fixed at introduction; a failed bill changes nothing. */
  readonly revises?: { readonly billId: string; readonly kind: LawRevisionKind; readonly provision?: BillText };
  /**
   * The day the enrolled bill reached the President. The ten-day window runs
   * from here, not from introduction. Absent on a bill still in the chambers;
   * `presentmentDate` reads a desk bill without one as presented the week it
   * was introduced.
   */
  readonly presentedOn?: GameDate;
  readonly resolvedTurn?: number;
  /** Fixed recovery appropriation scored from GDP when this bill became law; absent on legacy laws is unknown. */
  readonly recoveryAuthority?: { readonly appropriated: number; readonly throughTurn: number };
  /**
   * The executive order or declared emergency this bill is written against, for an act
   * that is about a particular thing the President already did rather than
   * about the country generally: disapproval, emergency termination or renewal.
   *
   * Stored on the instance rather than on the catalogue entry because the
   * catalogue cannot know it — Congress picks the rule it is disapproving the
   * week it takes the resolution up, and a second resolution weeks later names
   * a different one.
   */
  readonly target?: string;
  /**
   * The member across the aisle this bill was written with, where one was.
   *
   * A stopgap that the minority leader signed up to is a different bill from one
   * the majority wrote alone, and the record could not tell them apart: the
   * sponsor field says which side put it in the hopper and nothing said who else
   * agreed to it. Absent is the ordinary case, and reads as a bill with no
   * counterparty rather than as one whose counterparty was forgotten.
   */
  readonly counterparty?: PersonId;
  /** The member the President shared this bill's credit with, read when it becomes law. */
  readonly sharedCredit?: SharedCredit;
};

/**
 * A ceiling on the appropriation that an act of Congress has lifted, and until
 * when.
 *
 * An authorization is not money. What it does is raise the amount the
 * appropriators are permitted to commit to an account, for the period it
 * covers; whether the money is then appropriated is a separate vote that may
 * never happen. Stored rather than derived from the statute book because the
 * budget reads it every week and must not have to know the act catalogue to do
 * it.
 */
export type AccountCapRaise = {
  readonly id: string; // the bill that enacted it
  readonly account: BudgetAccount;
  /** Added to the standing per-account ceiling, as an annual share of GDP. */
  readonly share: number;
  readonly enactedTurn: number;
  readonly throughTurn: number;
};

/**
 * One lapse in appropriations, from the week the money ran out to the week
 * somebody voted more.
 *
 * The Antideficiency Act's actual content: no officer may obligate money
 * Congress has not appropriated, so when the appropriation ends the work does,
 * and a government that has not been funded is a government that closes. What
 * is recorded is the fact and its length. What closed, and how badly, is read
 * back off the institutions at the time rather than frozen here — a lapse is a
 * date range, not a snapshot of the executive branch.
 */
export type FundingLapse = {
  /** The bill-shaped id every list record carries: `lapse:<turn>`. */
  readonly id: string;
  readonly begunTurn: number;
  /** Absent while it is still running, which is what makes it the open one. */
  readonly endedTurn?: number;
  /** How it ended, for a record that has to say who reopened the government. */
  readonly endedBy?: "continuing-resolution" | "appropriation";
};

// --- The term clock: the dates the whole presidency is arranged around ---
//
// Named for the term rather than for the mandate because that is all it is: a
// schedule. It carries no reading of how the administration is doing — the
// headline for that is `MetricSet.approval` — and the two were only ever
// conflated because the old composite happened to be called a mandate too.
//
// A term had no end. The campaign counted weeks, the removal arc was the only
// way out of the office, and "re-election" was a word on a screen with nothing
// under it — so a president could govern for two hundred weeks without ever
// being asked to account for it by the one body that actually decides whether
// an administration continues.
//
// The dates are fixed at founding and never move: that is what makes them
// something a player can govern toward. The rules that hold the elections live
// in elections.ts; the shapes live here with the rest of the plain data.

export type ElectionKind = "midterm" | "presidential";

/**
 * Seats moved between the administration's caucus and the opposition's. Signed
 * from the administration's side, so a negative number is the ordinary midterm.
 */
export type SeatSwing = Readonly<Record<Chamber, number>>;

/**
 * One election, held and settled.
 *
 * `voteShare` is the administration's own share of the vote — the reading the
 * whole result is derived from — and it is stored rather than recomputed for
 * the reason a signed order's odds are: reading it back later would use a
 * country the election itself has since changed.
 */
export type ElectionResult = {
  readonly id: string; // "election:<kind>:<turn>"
  readonly kind: ElectionKind;
  readonly turn: number;
  readonly voteShare: number; // 0..1
  /** The state calls as this night made them; later state changes cannot revise an election. */
  readonly stateCalls?: readonly import("./states.js").StateCall[];
  /** Midterms only: what the country did to the chambers. */
  readonly swing?: SeatSwing;
  /** Presidential only: whether the administration is still the administration. */
  readonly won?: boolean;
  readonly summary: string;
  /**
   * The governors' races decided on the same night, where any were.
   *
   * Kept per race rather than as a count, because a governor is a person the
   * board already carries and a party total cannot answer who the President has
   * to call about a disaster in that state next month.
   */
  readonly governors?: readonly GovernorRaceResult[];
  /**
   * Which third of the Senate was up. Absent on a presidential year's own
   * record only where the class is not known; a class is a fact about the
   * calendar, not about the result, so nothing derives it from the swing.
   */
  readonly senateClass?: 1 | 2 | 3;
};

/** One governor's race, as the night settled it. */
export type GovernorRaceResult = {
  readonly state: StateId;
  readonly party: UsParty;
  readonly winner: PersonId;
  /** The winner's share of the vote, 0..1. */
  readonly share: number;
};

/**
 * How a presidency ends, other than by being removed.
 *
 * Kept apart from `RemovalArc` on purpose: losing an election and being
 * convicted on articles of impeachment are different endings, and a model that
 * routed one through the other would have to call an ordinary defeat a removal
 * — which is exactly the sentence a player who merely lost should never read.
 */
export type TermOutcome = "defeated" | "term-limited";

export type TermClock = {
  /** 1 for the term the player took office in, 2 for the one they won. */
  readonly term: number;
  readonly termStartTurn: number;
  readonly elections: readonly ElectionResult[];
  /**
   * Set only once the presidency's own future is settled, which is to say only
   * at the end. Winning re-election does not set it — a second term is a
   * presidency with its future open again — so an outcome present at all is a
   * campaign that is over.
   */
  readonly outcome?: TermOutcome;
};

// --- The press: the standing an administration has with the people who
// --- explain it to the country
//
// The shapes moved to state-press.ts and are re-exported here, so every
// import path that named this file still resolves; IssuedPressAct above
// reads PressAction from there.
export type { PressAction, PressCorps, PressEngagement, ScandalResponse, ScandalVerb } from "./state-press.js";

// --- Treaties: what the president signs and the Senate decides about ---
//
// The shapes moved to state-treaties.ts and are re-exported here, so every
// import path that named this file still resolves.
export type { TreatyKind, TreatyRecord, TreatyStatus } from "./state-treaties.js";
