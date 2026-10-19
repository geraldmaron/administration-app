import type { FeedItem } from "./state.js";
import { capitalize, firstSentence, freshStake, headlineClause, sentence, type Desk } from "./article-desk.js";
import { conditionFootprint, homeHazard, plural, theHazard, type ConditionRead } from "./article-condition.js";

// News from home.
//
// The composer was written for a board of foreign capitals and read every item
// through that lens, so a flood filed against the United States came out as a
// move aimed at this government, closing on which instrument would answer it.
// A dispatch about the country's own weather, its own decisions or its own
// press is domestic, and every section of it is written here.
//
// Scope is inferred from the item, never stored. Feed items live in saves and
// an article is composed when it is read, so a field added to the item would
// leave everything already filed reading the old way.
//
// A standing condition at home files every week, so whatever this register
// says it says many times. It says only what the item carries — the hazard,
// where it was filed from, where it stands in its arc — and what that kind of
// emergency costs, and leaves the rest out.

type DomesticKind = "condition" | "player-action" | "press";

// The kinds home news arrives as. The others are foreign by construction: a
// foreign government's move, a front, a legislature abroad, a campaign, a
// compact, a network hosted somewhere else, and drift, which names nobody.
const DOMESTIC_KINDS: ReadonlySet<FeedItem["kind"]> = new Set<FeedItem["kind"]>(["condition", "player-action", "press"]);

function domesticKind(kind: FeedItem["kind"]): DomesticKind {
  return kind === "condition" || kind === "player-action" ? kind : "press";
}

/** Nobody foreign in the item, and the reader's own country named or acting. */
export function isDomesticItem(item: FeedItem, playerNation: string | undefined): boolean {
  if (playerNation === undefined || !DOMESTIC_KINDS.has(item.kind)) return false;
  // The country's own press and its own decisions are often filed with no
  // party at all — a midterm result, a firing — and a foreign story always
  // names its country. A condition always names one, so it is not read here.
  if (item.actor === undefined && item.target === undefined) return item.kind !== "condition";
  const foreign = (nation: string | undefined) => nation !== undefined && nation !== playerNation;
  if (foreign(item.actor) || foreign(item.target)) return false;
  return item.target === playerNation || item.actor === playerNation;
}

// The piece for an item that carried nothing but its headline: the headline,
// framed for home. One line per kind and none shared with the foreign banks.
const BARE: Readonly<Record<DomesticKind, (desk: Desk) => string>> = {
  condition: (d) => `At home: ${headlineClause(d)}.`,
  "player-action": (d) => `At home, on the record: ${headlineClause(d)}.`,
  press: (d) => `At home, in print: ${headlineClause(d)}.`,
};

const HOME_COST: Readonly<Record<NonNullable<ReturnType<typeof conditionFootprint>>, (noun: string) => string>> = {
  weather: (noun) => `${capitalize(theHazard(noun))} ${plural(noun) ? "are" : "is"} paid for from federal disaster money, and in the approval of whoever is seen to answer ${plural(noun) ? "them" : "it"}.`,
  health: (noun) => `${capitalize(theHazard(noun))} is paid for from federal emergency money, and in the approval of whoever is seen to answer it.`,
  order: () => "Unrest at home is paid for in the country's order, and in the approval of whoever is seen to answer it.",
  economy: (noun) => `Voters feel ${theHazard(noun)} in their jobs and prices, which is where approval is decided.`,
};

function conditionParagraphs(desk: Desk, read: ConditionRead): readonly string[] {
  const hazard = homeHazard(desk, read);
  const footprint = conditionFootprint(read);
  if (!hazard || !footprint) return [BARE.condition(desk)];
  const noun = capitalize(hazard.noun);
  const many = plural(hazard.noun);
  switch (read.phase) {
    case "over":
      return [`${noun} ${hazard.where} ${many ? "are" : "is"} over.`];
    case "worsening":
      return [`${noun} ${hazard.where} ${many ? "have" : "has"} gotten worse.`, HOME_COST[footprint](hazard.noun)];
    case "easing":
      return [`${noun} ${hazard.where} ${many ? "are" : "is"} easing, and ${many ? "have" : "has"} not ended.`, HOME_COST[footprint](hazard.noun)];
    default: {
      const lede =
        footprint === "weather" || footprint === "health"
          ? `The federal response to ${hazard.noun} ${hazard.where} starts with what the state asks for.`
          : footprint === "order"
            ? `Unrest ${hazard.where} is the administration's to answer.`
            : `${noun} at home is the economy the administration is judged on.`;
      const close = footprint === "weather" || footprint === "health" ? ["The states will say what they asked for, and the administration will be judged on what arrived."] : [];
      return [lede, HOME_COST[footprint](hazard.noun), ...close];
    }
  }
}

function stakeLine(stake: string | undefined): string | undefined {
  return stake ? `At issue: ${firstSentence(stake).replace(/[.!?]$/, "")}.` : undefined;
}

/** The body of a home piece. */
export function domesticParagraphs(desk: Desk, read: ConditionRead): readonly string[] {
  const kind = domesticKind(desk.kind);
  if (kind === "condition") return conditionParagraphs(desk, read);
  const stake = freshStake(desk);
  const lines =
    kind === "player-action"
      ? [desk.subject ? `${desk.subject} is on the administration's own record now.` : undefined, stake ? sentence(stake) : undefined]
      : [stakeLine(stake)];
  const filled = lines.filter((text): text is string => text !== undefined);
  return filled.length > 0 ? filled : [BARE[kind](desk)];
}

/** The standfirst, given a stake the headline has not already said (or none). */
export function domesticStandfirst(desk: Desk, read: ConditionRead, stake: string | undefined): string {
  const kind = domesticKind(desk.kind);
  if (kind === "condition") {
    const hazard = homeHazard(desk, read);
    if (!hazard) return "An emergency at home, and the federal response it calls for.";
    const noun = capitalize(hazard.noun);
    switch (read.phase) {
      case "over":
        return `${noun} ${hazard.where}, over.`;
      case "worsening":
        return `${noun} ${hazard.where}, and a worse week than the last.`;
      case "easing":
        return `${noun} ${hazard.where}, past its worst but not over.`;
      default: {
        const footprint = conditionFootprint(read);
        return footprint === "weather" || footprint === "health"
          ? `${noun} ${hazard.where}, and what the federal government owes the places it hit.`
          : `${noun} ${hazard.where}, and the administration's to answer.`;
      }
    }
  }
  if (kind === "player-action") {
    return stake ? `${sentence(firstSentence(stake))} A decision at home, and the country it lands on.` : "A decision at home, and the country it lands on.";
  }
  if (isCasualtyReport(desk)) return "A casualty report from home.";
  return desk.person ? `The story turns on ${desk.subject}.` : desk.subject ? `${desk.subject}, at home.` : "A story at home about this administration.";
}

export function domesticRelevance(desk: Desk, read: ConditionRead): string {
  const kind = domesticKind(desk.kind);
  if (kind === "condition") {
    if (read.phase === "over") return "This was at home. It is over, and what it cost stays on the record.";
    const footprint = conditionFootprint(read);
    if (footprint === "economy") return "This is the economy at home, and it is the one you are judged on.";
    if (footprint === "order") return "This is at home. Keeping order is yours to answer for.";
    return "This is at home. The emergency is yours to answer, and the governors will say whether you did.";
  }
  if (kind === "player-action") {
    return desk.byPlayer
      ? "You decided this. The country is the audience, and the opposition keeps the record."
      : "This is the administration's own business at home, and the country reads it as yours.";
  }
  if (isCasualtyReport(desk)) return "This is at home. The emergency is yours to answer, and the governors will say whether you did.";
  return "The story is about your administration. How you answer it is what the country reads next.";
}

// The impact desk files its casualty reports as press, headed with the toll.
function isCasualtyReport(desk: Desk): boolean {
  return /\bdeaths\b/.test(desk.item.headline) && /\bstruck by\b/.test(desk.item.headline);
}
