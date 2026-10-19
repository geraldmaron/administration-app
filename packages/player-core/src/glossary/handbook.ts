import { LAW_CHAPTER } from "../authority/handbook-law.js";
import type { PlaceKey } from "../navigation/places.js";

// The Handbook is the glossary and the explainers read in order, as a course
// rather than a reference. It holds no explanation of its own: a chapter names
// which explainers and terms it teaches and which screens it is about, so the
// words a player reads here are the same words the help on each screen shows.

export type HandbookChapter = {
  readonly id: string;
  readonly title: string;
  /** What the player can do after reading, said as abilities. */
  readonly opens: string;
  /** The screens the chapter describes, offered as doors at its end. */
  readonly places: readonly PlaceKey[];
  /** Explainer ids, in reading order. Every explainer belongs to exactly one chapter. */
  readonly explainers: readonly string[];
  /** Glossary ids the chapter teaches beyond those its explainers already name. */
  readonly terms?: readonly string[];
};

export const HANDBOOK_INTRO =
  "Welcome. This Handbook walks you through how the game works, roughly in the order you'll need it. Each chapter ends with links to the screens where you put it to use. If you'd rather look up a single word, every term in the game is also listed from A to Z.";

export const HANDBOOK: readonly HandbookChapter[] = [
  {
    id: "first-week",
    title: "Your first week",
    opens: "After this chapter, you'll be able to read the Brief, answer what is waiting for you, and move time forward with Continue.",
    places: ["brief", "digest"],
    explainers: ["how-a-week-runs", "decision-cost-and-impact"],
  },
  {
    id: "approval",
    title: "Approval and the public",
    opens: "You'll learn to tell why your approval moved and which part of your record to work on.",
    places: ["brief", "nation"],
    explainers: ["what-moves-approval", "what-feeds-the-judgments", "what-the-news-is-about"],
  },
  {
    id: "executive",
    title: "Your cabinet and the agencies",
    opens: "By the end, you'll be able to fill a cabinet seat, read a secretary's file, and give an agency an instruction it will carry out.",
    places: ["washington", "policy"],
    explainers: ["cabinet-breaks", "nomination-to-oath", "agency-directive", "policy-delivery-line"],
  },
  {
    id: "congress",
    title: "Congress",
    opens: "This chapter shows you how to follow a bill from committee to your desk, count the votes it needs, and see what a midterm will change.",
    places: ["congress"],
    explainers: ["bill-to-law", "congress-counts", "hill-mood-drivers", "midterm-seats"],
    terms: ["congress", "speaker", "congress-word"],
  },
  {
    id: "orders-and-courts",
    title: "Executive orders and the courts",
    opens: "You'll be able to choose between an order and a bill, and judge how an order will fare if someone challenges it.",
    places: ["policy", "courts"],
    explainers: ["order-vs-law", "court-challenge", "justice-position"],
  },
  {
    id: "oversight",
    title: "Investigations, scandals and removal",
    opens: "After this chapter, you'll be able to see an investigation coming, answer a scandal, and read how close you are to impeachment.",
    places: ["oversight", "brief"],
    explainers: ["inquiry-stages", "inquiry-cost", "scandal-lifecycle", "removal-ladder"],
  },
  {
    id: "money",
    title: "The budget and the economy",
    opens: "By the end, you'll be able to get a budget through Congress, avoid a shutdown or a default, and tell what you control in the economy and what you don't.",
    places: ["budget", "economy"],
    explainers: ["budget-process", "deficit-and-debt", "economy-levers"],
  },
  {
    id: "home",
    title: "Disasters at home",
    opens: "This chapter shows you how to respond to a disaster, declare an emergency, and read how a damage estimate firms up.",
    places: ["emergency", "nation"],
    explainers: ["domestic-emergencies", "impact-assessment-firms-up"],
  },
  {
    id: "world",
    title: "Other countries",
    opens: "You'll learn to read how a country sees the United States, choose a foreign policy tool, and use an intelligence report.",
    places: ["world", "security"],
    explainers: ["trust-in-us", "foreign-instruments", "collection-and-sharing"],
    terms: ["basing-arrangement"],
  },
  {
    id: "force",
    title: "Using military force",
    opens: "After this chapter, you'll be able to send an order down the chain of command and keep to the deadlines the War Powers Resolution sets.",
    places: ["security"],
    explainers: ["order-to-theater", "war-powers-clocks"],
  },
  {
    id: "press",
    title: "The press",
    opens: "You'll be able to tell how a story spreads and pick the right way to answer it.",
    places: ["pressOffice", "press"],
    explainers: ["press-story-spreads", "press-three-plays"],
  },
  {
    id: "record",
    title: "The Record, promises and elections",
    opens: "By the end, you'll be able to trace any change back to its cause, keep track of your promises, and see what decides an election.",
    places: ["record"],
    explainers: ["record-causal-trail", "promise-lifecycle", "election-vote-share"],
  },
  // The law behind every power the game lets the President use, by citation (DECISIONS §8.12).
  LAW_CHAPTER,
];

const BY_ID: ReadonlyMap<string, HandbookChapter> = new Map(HANDBOOK.map((chapter) => [chapter.id, chapter]));

export function handbookChapter(id: string): HandbookChapter | undefined {
  return BY_ID.get(id);
}

/** The chapter that teaches an explainer, so screen help can offer "Read the chapter". */
export function chapterForExplainer(explainerId: string): HandbookChapter | undefined {
  return HANDBOOK.find((chapter) => chapter.explainers.includes(explainerId));
}
