import type { NationFile } from "@admin/player-core";
import type { CountryView } from "./country-search";

export type CountryPriority = {
  readonly id: string;
  readonly tone: "risk" | "caution" | "neutral";
  readonly text: string;
  /** The view of the file that holds the detail. */
  readonly view: CountryView;
};

const TONE_ORDER: Readonly<Record<CountryPriority["tone"], number>> = { risk: 0, caution: 1, neutral: 2 };

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

function standingPriorities(file: NationFile): readonly CountryPriority[] {
  const { standing } = file;
  const out: CountryPriority[] = [];
  if (standing.tension && (standing.tension.stance === "adverse" || standing.tension.stance === "caution")) {
    out.push({ id: "tension", tone: standing.tension.stance === "adverse" ? "risk" : "caution", text: `Tension between you is ${standing.tension.word.toLowerCase()}.`, view: "diplomacy" });
  }
  if (standing.threat && (standing.threat.stance === "adverse" || standing.threat.stance === "caution")) {
    out.push({ id: "threat", tone: standing.threat.stance === "adverse" ? "risk" : "caution", text: `The threat you read in them is ${standing.threat.word.toLowerCase()}.`, view: "security" });
  }
  if (standing.unread) out.push({ id: "unread", tone: "neutral", text: "The services have no read on this government yet.", view: "intelligence" });
  return out;
}

/**
 * What a President opening this file should see first, most urgent first. Each
 * line is read off the file's own facts (a war, a measure in force, a tension
 * band, a commitment, forces on its soil), never a score of its own.
 */
export function countryPriorities(file: NationFile): readonly CountryPriority[] {
  const out: CountryPriority[] = [];
  if (file.atWarWith.length > 0) out.push({ id: "war", tone: "risk", text: `You are at war with ${file.name}.`, view: "overview" });
  out.push(...standingPriorities(file));
  const { measures } = file.trade;
  if (measures.length > 0) {
    const theirs = measures.filter((measure) => !measure.ours).length;
    out.push({ id: "measures", tone: theirs > 0 ? "caution" : "neutral", text: `${plural(measures.length, "trade measure is", "trade measures are")} in force between you${theirs > 0 ? `, ${theirs} of them their answer` : ""}.`, view: "economy" });
  }
  const standing = file.commitments.filter((commitment) => commitment.status !== "wound-down");
  if (standing.length > 0) out.push({ id: "commitments", tone: "neutral", text: `You have ${plural(standing.length, "standing commitment", "standing commitments")} toward them.`, view: "diplomacy" });
  if (file.presence.length > 0) out.push({ id: "presence", tone: "neutral", text: `US forces are placed in ${plural(file.presence.length, "location", "locations")} here.`, view: "security" });
  return out.map((item, index) => ({ item, index })).sort((a, b) => TONE_ORDER[a.item.tone] - TONE_ORDER[b.item.tone] || a.index - b.index).map(({ item }) => item);
}
