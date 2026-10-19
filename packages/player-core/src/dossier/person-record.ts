import { governorAssents, selectBills, selectDateOfTurn, selectNation, selectPerson, type Bill, type Campaign, type ChamberVote } from "@admin/engine";
import type { NationId } from "@admin/world";
import { recordedVotes } from "../congress/congress-record.js";
import { CHAMBER_TITLE } from "../congress/floor-schedule.js";
import { formatDate } from "../format/figures.js";
import { courtDocket, justiceFile } from "../judiciary/courts.js";
import { place } from "../navigation/places.js";
import { nationFile } from "../world/nation-file.js";
import { PARTY_WORDS, governorDispositionWord } from "../world/state-dossier.js";
import { personDossier } from "./person-dossier.js";

// What a person did in the chair they hold, read only from decisions the
// engine stored when they were made: a justice's or circuit judge's vote on a
// case, a member's vote on a roll call, a governor's answer to a federal
// request, a foreign government's public act while this leader held the chair.
// Nothing here is estimated; a record that has not started says when it will.
// A foreign government's reasons are an intelligence read, so only the act is
// listed, never the weighed terms behind it.

export type OfficeRecordKind = "bench" | "floor" | "governor" | "leader";

export type OfficeRecordRow = {
  readonly key: string;
  /** The case or bill, as a door. */
  readonly href: string;
  readonly title: string;
  /** The date, and the forum or question when more than one kind of vote is listed. */
  readonly detail: string;
  /** What the body decided: the holding, or the count and whether it carried. */
  readonly outcome: string;
  /** How this person voted or answered, in the word the record uses. */
  readonly cast: string;
  /** The vote or answer as a fact the screen can mark without judging it. */
  readonly castKey: "yea" | "nay" | "strike" | "uphold" | "agreed" | "declined" | "acted";
  /** Whether they stood with the majority of their court or party, or whom an act was aimed at, in words. */
  readonly standing: string;
};

export type OfficeRecordFact = { readonly label: string; readonly value: string; readonly href?: string };

export type PersonRecord = {
  readonly kind: OfficeRecordKind;
  readonly title: string;
  readonly note?: string;
  /** Column heads for the matter, the outcome, the vote and the standing. */
  /** Column heads; a record leaves out the columns its rows do not carry. */
  readonly columns: { readonly matter: string; readonly outcome?: string; readonly cast?: string; readonly standing?: string };
  readonly rows: readonly OfficeRecordRow[];
  readonly facts: readonly OfficeRecordFact[];
  /** Said plainly when there are no rows yet, including when the record will fill. */
  readonly empty: string;
};

const HOLDING_WORDS = { upheld: "Upheld", "struck-down": "Struck down" } as const;
const BENCH_COLUMNS = { matter: "Case", outcome: "Court's ruling", cast: "Voted", standing: "With" } as const;
const FLOOR_COLUMNS = { matter: "Bill", outcome: "Result", cast: "Voted", standing: "With" } as const;
const GOVERNOR_COLUMNS = { matter: "Request", cast: "Answer", standing: "Margin" } as const;
const LEADER_COLUMNS = { matter: "Act", standing: "Aimed at" } as const;

/** Public ledger entries with a decision stamp: the one record that keeps who decided what, and when. */
function stampedEntries(campaign: Campaign) {
  return campaign.ledger.flatMap((entry) => (entry.causal?.decision && (entry.causal.visibility ?? "public") === "public" ? [{ entry, causal: entry.causal, decision: entry.causal.decision }] : []));
}

/** A date kept as an ISO string, in the words every other date uses; anything unparsable is shown as stored. */
function isoDateWords(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? formatDate({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }) : iso;
}

/** A governor's answers to federal requests, from the week they took office. */
function governorRows(campaign: Campaign, state: string, since: number): readonly OfficeRecordRow[] {
  return stampedEntries(campaign)
    .filter(({ entry, decision }) => decision.question === "governor-consent" && decision.actor === state && entry.turn >= since)
    .reverse()
    .map(({ entry, causal, decision }): OfficeRecordRow => ({
      key: causal.eventId,
      href: place.event(causal.eventId),
      title: entry.description,
      detail: formatDate(causal.createdDate),
      outcome: "",
      cast: decision.acts ? "Agreed" : "Declined",
      castKey: decision.acts ? "agreed" : "declined",
      standing: decision.close ? "Close" : "Clear",
    }));
}

/** The turn this person took a foreign chair: the change of leader that names them, or the campaign's start. */
function leaderSince(campaign: Campaign, personId: string): number {
  const change = [...campaign.ledger].reverse().find((entry) => entry.causal?.systems?.includes("foreign-politics") && entry.causal.entities?.includes(personId));
  return change?.turn ?? 0;
}

/** A foreign government's public acts while this leader held the chair. */
function leaderRows(campaign: Campaign, nation: string, personId: string): readonly OfficeRecordRow[] {
  const since = leaderSince(campaign, personId);
  return stampedEntries(campaign)
    .filter(({ entry, decision }) => (decision.question === "npc-act" || decision.question === "join-war") && decision.actor === nation && entry.turn >= since)
    .reverse()
    .map(({ entry, causal, decision }): OfficeRecordRow => ({
      key: causal.eventId,
      href: place.event(causal.eventId),
      title: entry.description,
      detail: formatDate(causal.createdDate),
      outcome: "",
      cast: "",
      castKey: "acted",
      standing: decision.subject ? (selectNation(campaign, decision.subject as NationId)?.base.identity.name ?? decision.subject) : "",
    }));
}

function benchRows(campaign: Campaign, personId: string): readonly OfficeRecordRow[] {
  const justice = justiceFile(campaign, personId)?.votes.map((vote): OfficeRecordRow => ({
    key: `case:${vote.caseId}`,
    href: vote.href,
    title: vote.order,
    detail: `Supreme Court, ${vote.ruled}`,
    outcome: HOLDING_WORDS[vote.holding],
    cast: vote.vote === "strike" ? "To strike it down" : "To keep it",
    castKey: vote.vote,
    standing: `${vote.withMajority ? "The majority" : "The dissent"}${vote.wrote ? `, and wrote the ${vote.wrote === "majority" ? "opinion" : "dissent"}` : ""}`,
  })) ?? [];
  const circuit = [...courtDocket(campaign).ruled]
    .flatMap((row) => {
      const vote = row.circuit?.votes.find((entry) => (entry.judge as string) === personId);
      if (!row.circuit || !vote) return [];
      const majority = row.circuit.holding === "struck-down" ? "strike" : "uphold";
      return [{ row, circuit: row.circuit, vote, majority }];
    })
    .sort((a, b) => b.circuit.ruledTurn - a.circuit.ruledTurn || a.row.id.localeCompare(b.row.id))
    .map(({ row, circuit, vote, majority }): OfficeRecordRow => ({
      key: `circuit:${row.id}`,
      href: row.href,
      title: row.matter?.title ?? row.orderName,
      detail: `${circuit.court}, ${formatDate(selectDateOfTurn(campaign, circuit.ruledTurn))}`,
      outcome: HOLDING_WORDS[circuit.holding],
      cast: vote.vote === "strike" ? "To strike it down" : "To keep it",
      castKey: vote.vote,
      standing: vote.vote === majority ? "The panel majority" : "The dissent",
    }));
  return [...justice, ...circuit];
}

function partyStanding(vote: ChamberVote, member: NonNullable<ChamberVote["rollCall"]>[number]): string {
  if (member.party === "independent") return "No party";
  const bloc = (vote.rollCall ?? []).filter((entry) => entry.party === member.party);
  const yea = bloc.filter((entry) => entry.yea).length;
  const nay = bloc.length - yea;
  if (yea === nay) return `${PARTY_WORDS[member.party]}s split evenly`;
  return member.yea === (yea > nay) ? `Most ${PARTY_WORDS[member.party]}s` : `Against most ${PARTY_WORDS[member.party]}s`;
}

function floorQuestions(bill: Bill): readonly { readonly vote: ChamberVote; readonly question: string }[] {
  const initial = (bill.text?.initialPassage ?? []).filter((vote) => vote.recordedTurn !== undefined).map((vote) => ({ vote, question: "First vote" }));
  return [...initial, ...recordedVotes(bill)];
}

function floorRows(campaign: Campaign, personId: string): readonly OfficeRecordRow[] {
  return selectBills(campaign)
    .flatMap((bill) =>
      floorQuestions(bill).flatMap(({ vote, question }, index) => {
        const member = vote.rollCall?.find((entry) => (entry.person as string) === personId);
        if (!member) return [];
        return [{
          turn: vote.recordedTurn!,
          row: {
            key: `${bill.id}:${vote.chamber}:${question}:${index}`,
            href: place.bill(bill.id),
            title: bill.title,
            detail: `${CHAMBER_TITLE[vote.chamber]} ${question.toLowerCase()}, ${formatDate(selectDateOfTurn(campaign, vote.recordedTurn!))}`,
            outcome: `${vote.passed ? "Carried" : "Failed"}, ${vote.yeas} to ${vote.nays}`,
            cast: member.yea ? "Yea" : "Nay",
            castKey: member.yea ? "yea" : "nay",
            standing: partyStanding(vote, member),
          } satisfies OfficeRecordRow,
        }];
      }),
    )
    .sort((a, b) => b.turn - a.turn || a.row.key.localeCompare(b.row.key))
    .map(({ row }) => row);
}

function benchRecord(campaign: Campaign, personId: string, justice: boolean): PersonRecord {
  const file = justice ? justiceFile(campaign, personId) : undefined;
  return {
    kind: "bench",
    title: "Court record",
    ...(file ? { note: `${file.title}, seat ${file.seat}${file.chief ? ", who presides" : ""}. Each vote is added when the court rules. That includes cases about your orders and other cases before the court.` } : {}),
    columns: BENCH_COLUMNS,
    rows: benchRows(campaign, personId),
    facts: file?.axes.map((axis) => ({ label: axis.label, value: axis.word })) ?? [],
    empty: file ? `No case has reached the court since ${file.name} joined it. Each vote is added when the court rules.` : "This judge hasn't voted on a ruling yet. Each vote is added when the panel rules.",
  };
}

function floorRecord(campaign: Campaign, personId: string): PersonRecord {
  return {
    kind: "floor",
    title: "Votes in Congress",
    note: "Every recorded vote this member cast this term. If they weren't in office for a vote, it isn't listed.",
    columns: FLOOR_COLUMNS,
    rows: floorRows(campaign, personId),
    facts: [],
    empty: "No recorded votes yet this term. Votes show up here once the chamber takes up a bill and votes on it.",
  };
}

function governorRecord(campaign: Campaign, personId: string, state: string): PersonRecord | undefined {
  const runtime = campaign.states[state as keyof Campaign["states"]];
  const standing = runtime?.governor;
  if (!runtime || !standing || (standing.person as string) !== personId) return undefined;
  const word = governorDispositionWord(standing.disposition);
  const assents = governorAssents(standing);
  return {
    kind: "governor",
    title: "Governing the state",
    note: "How they feel about you now, then every answer they've given to a federal request since taking office.",
    columns: GOVERNOR_COLUMNS,
    rows: governorRows(campaign, state, standing.since ?? 0),
    facts: [
      { label: "State", value: runtime.base.name, href: place.state(state) },
      { label: "Party", value: PARTY_WORDS[standing.party] },
      { label: "How they feel about you", value: word },
      { label: "When a request needs their approval", value: assents ? "Will go along with it" : "Won't approve it" },
      ...(standing.termEnds ? [{ label: "Term ends", value: isoDateWords(standing.termEnds) }] : []),
    ],
    empty: `No federal request has needed ${runtime.base.name}'s governor since they took office. Each answer is added when it's given.`,
  };
}

function leaderRecord(campaign: Campaign, nation: NationId, nationName: string, personId: string): PersonRecord {
  const file = nationFile(campaign, nation);
  const theirs = file?.standing.theirs;
  return {
    kind: "leader",
    title: "Leading the country",
    note: "How their country feels about you now, then each public step their government has taken since they took power.",
    columns: LEADER_COLUMNS,
    rows: leaderRows(campaign, nation as string, personId),
    facts: [
      { label: "Country", value: nationName, href: place.country(nation) },
      ...(file?.inOfficeSince ? [{ label: "In office", value: file.inOfficeSince }] : []),
      { label: "Their view of you", value: theirs ? theirs.trust.word : "Unread. US intelligence can't tell yet." },
      ...(file && file.atWarWith.length > 0 ? [{ label: "At war with", value: file.atWarWith.join(", ") }] : []),
    ],
    empty: `The government of ${nationName} hasn't taken any public step since this leader took power.`,
  };
}

/** What this person has done in office, from the engine's stored decisions; undefined where there is nothing role-specific to show. */
export function personRecord(campaign: Campaign, personId: string): PersonRecord | undefined {
  if (!selectPerson(campaign, personId as never)) return undefined;
  const dossier = personDossier(campaign, personId);
  const standing = dossier?.standing;
  if (!standing) return undefined;
  if (standing.kind === "governor") return governorRecord(campaign, personId, standing.state as string);
  if (standing.kind === "foreign-leader") return leaderRecord(campaign, standing.nation, standing.nationName, personId);
  if (standing.kind === "justice") return benchRecord(campaign, personId, true);
  const floor = floorRows(campaign, personId);
  if (standing.kind === "hill" || floor.length > 0) return floorRecord(campaign, personId);
  const bench = benchRows(campaign, personId);
  return bench.length > 0 ? benchRecord(campaign, personId, false) : undefined;
}
