import { trackingPoll } from "@admin/engine";
import { readingBand } from "../reading";
const percent = (value) => `${Math.round(value * 100)}%`;
const points = (value) => `${Math.round(value * 100)}`;
/**
 * This week's topline.
 *
 * A sample of the settled figure, with its error drawn. The settled figure is
 * printed on the Brief, the Nation home and the Digest, so a poll shown alone
 * read as a second, disagreeing approval; the Nation screen draws the poll as a
 * labeled sample beside the settled figure instead.
 */
export function pollReading(campaign) {
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
