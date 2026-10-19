import { DISPOSITION_WORD, STANCE_CUTS } from "@admin/player-core";
import type { KeyEntry, MeterMark, ReadingFrameProps } from "@admin/ui";
import { termDoor } from "../handbook/term-door";

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The lines where Congress's word for a mood changes, drawn on every mood meter so the word and the tick never disagree. */
export const MOOD_MARKS: readonly MeterMark[] = [
  { id: "cool", label: `${DISPOSITION_WORD.caution} from ${percent(STANCE_CUTS.caution)}`, at: STANCE_CUTS.caution, kind: "gate" },
  { id: "even", label: `${DISPOSITION_WORD.neutral} from ${percent(STANCE_CUTS.neutral)}`, at: STANCE_CUTS.neutral, kind: "gate" },
  { id: "with", label: `${DISPOSITION_WORD.favorable} from ${percent(STANCE_CUTS.favorable)}`, at: STANCE_CUTS.favorable, kind: "gate" },
];

/** The same ticks with no name under them, for the second and later bars of a frame whose first bar already named each cut. */
export const MOOD_TICKS: readonly MeterMark[] = MOOD_MARKS.map((mark) => ({ ...mark, label: "" }));

const LADDER = `${DISPOSITION_WORD.adverse} under ${percent(STANCE_CUTS.caution)}, ${DISPOSITION_WORD.caution} ${percent(STANCE_CUTS.caution)} to ${percent(STANCE_CUTS.neutral)}, ${DISPOSITION_WORD.neutral} ${percent(STANCE_CUTS.neutral)} to ${percent(STANCE_CUTS.favorable)}, ${DISPOSITION_WORD.favorable} ${percent(STANCE_CUTS.favorable)} and up`;

const FILL_KEY: readonly KeyEntry[] = [
  { id: "against", kind: "swatch", label: `${DISPOSITION_WORD.adverse}, under ${percent(STANCE_CUTS.caution)}`, ink: "danger" },
  { id: "cool", kind: "swatch", label: `${DISPOSITION_WORD.caution}, ${percent(STANCE_CUTS.caution)} to ${percent(STANCE_CUTS.neutral)}`, ink: "warningInk" },
  { id: "even", kind: "swatch", label: `${DISPOSITION_WORD.neutral}, ${percent(STANCE_CUTS.neutral)} to ${percent(STANCE_CUTS.favorable)}`, ink: "accent" },
  { id: "with", kind: "swatch", label: `${DISPOSITION_WORD.favorable}, ${percent(STANCE_CUTS.favorable)} and up`, ink: "successInk" },
];

const TICK_KEY: KeyEntry = { id: "ladder", kind: "dash", label: "Where the word changes", ink: "danger", weight: 2, dash: "6 3" };

/** The frame a group of mood meters sits in, for `<ReadingFrame {...moodFrame(title)}>`: what they measure, the ladder of words, and how to read them. */
export function moodFrame(title: string, ticks = false): Omit<ReadingFrameProps, "children"> {
  return {
    title,
    unit: "% of favor, 0 to 100",
    period: "Now",
    legend: ticks ? [...FILL_KEY, TICK_KEY] : FILL_KEY,
    help: {
      meaning: "Each bar shows how favorably a person or group regards you, from 0 to 100%. The word beside the figure is a band of that scale, and the color follows the word. It shows their mood, not how they'll vote on any one thing.",
      steps: ["Find the fill: that is their mood now.", `Read the word: ${LADDER}.`, "A higher mood makes your bills and nominees easier to move."],
      term: termDoor("hill-mood", "the mood of Congress"),
    },
  };
}

const VOTE_KEY: readonly KeyEntry[] = [
  { id: "yea-passed", kind: "swatch", label: "Yes votes on a question that passed", ink: "successInk" },
  { id: "yea-failed", kind: "swatch", label: "Yes votes on one that failed", ink: "accent" },
  { id: "nay", kind: "swatch", label: "No votes", ink: "colorTertiary" },
  { id: "range", kind: "swatch", label: "Votes nobody has committed to yet, so only a range", ink: "colorSecondary", hollow: true },
  { id: "needed", kind: "tick", label: "Votes the question needs", ink: "gold", weight: 3 },
];

/** The frame a group of vote counts sits in: each bar is a chamber's seats, with a gold tick at the votes the question needs. */
export function voteFrame(title: string): Omit<ReadingFrameProps, "children"> {
  return {
    title,
    unit: "Votes, of the seats in the chamber",
    legend: VOTE_KEY,
    help: {
      meaning: "Each bar is a chamber's seats. The gold tick is how many votes the question needs. A solid fill is a vote that was recorded. A dashed range is a count nobody has committed to yet, so it shows what it takes to win, not who will vote which way.",
      term: termDoor("majority", "majority"),
    },
  };
}
