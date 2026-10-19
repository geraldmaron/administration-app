import { trackingPoll, type Campaign } from "@admin/engine";
import { readingBand, type Stance } from "../reading";

// The polls, as the President reads them.
//
// One reading with an error on it, not the engine's own figure. The dossier
// already draws the settled headline; a poll is a different claim — it is what
// somebody measured, and a president who cannot tell a measurement from the
// truth is being taught that polling is arithmetic. So the band is the reading
// and the point inside it is a courtesy.

export type PollReading = {
  /** What the poll put approval at this week. */
  readonly reading: number;
  readonly low: number;
  readonly high: number;
  /** The reading as a percentage, with its band, for the figure line. */
  readonly figure: string;
  readonly range: string;
  readonly word: string;
  readonly stance: Stance;
  /** The margin, in the words a topline would carry it in. */
  readonly margin: string;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const points = (value: number) => `${Math.round(value * 100)}`;

/**
 * This week's topline.
 *
 * A sample of the settled figure, with its error drawn. The settled figure is
 * printed on the Brief, the Nation home and the Digest, so a poll shown alone
 * read as a second, disagreeing approval; the Nation screen draws the poll as a
 * labeled sample beside the settled figure instead.
 */
export function pollReading(campaign: Campaign): PollReading {
  const poll = trackingPoll(campaign);
  const band = readingBand("standing", poll.reading);
  return {
    reading: poll.reading,
    low: poll.low,
    high: poll.high,
    figure: percent(poll.reading),
    range: `${percent(poll.low)} to ${percent(poll.high)}`,
    word: band?.word ?? "",
    stance: band?.stance ?? "neutral",
    margin: `±${points((poll.high - poll.low) / 2)} points`,
  };
}
