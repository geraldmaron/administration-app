import { place, type NationFile } from "@admin/player-core";
import type { CountryView } from "./params";

export type CountryPriority = {
  readonly id: string;
  readonly tone: "risk" | "caution" | "neutral";
  readonly text: string;
  /** The view of the file that holds the detail. */
  readonly view: CountryView;
  /** Where the detail lives when it is outside the file: a war has its own screen. */
  readonly href?: string;
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
    out.push({ id: "threat", tone: standing.threat.stance === "adverse" ? "risk" : "caution", text: `How much of a threat they are: ${standing.threat.word.toLowerCase()}.`, view: "security" });
  }
  if (standing.unread) out.push({ id: "unread", tone: "neutral", text: "Our intelligence agencies don't know much about this country yet.", view: "intelligence" });
  return out;
}

/**
 * What a President opening this file should see first, most urgent first. Each
 * line is read off the file's own facts (a war, a measure in force, a tension
 * band, a commitment, forces on its soil), never a score of its own.
 */
export function countryPriorities(file: NationFile): readonly CountryPriority[] {
  const out: CountryPriority[] = [];
  for (const [index, war] of file.atWarWith.entries()) out.push({ id: index === 0 ? "war" : `war:${war}`, tone: "risk", text: `You're at war with ${file.name}.`, view: "overview", href: place.war(war) });
  out.push(...standingPriorities(file));
  const { measures } = file.trade;
  if (measures.length > 0) {
    const theirs = measures.filter((measure) => !measure.ours).length;
    out.push({ id: "measures", tone: theirs > 0 ? "caution" : "neutral", text: `${plural(measures.length, "trade penalty is", "trade penalties are")} in place between you${theirs > 0 ? `, and ${theirs} of them came from their side` : ""}.`, view: "economy" });
  }
  const standing = file.commitments.filter((commitment) => commitment.status !== "wound-down");
  if (standing.length > 0) out.push({ id: "commitments", tone: "neutral", text: `You've made them ${plural(standing.length, "promise", "promises")} that ${standing.length === 1 ? "is" : "are"} still active.`, view: "diplomacy" });
  if (file.presence.length > 0) out.push({ id: "presence", tone: "neutral", text: `US forces are in ${plural(file.presence.length, "location", "locations")} here.`, view: "security" });
  return out.map((item, index) => ({ item, index })).sort((a, b) => TONE_ORDER[a.item.tone] - TONE_ORDER[b.item.tone] || a.index - b.index).map(({ item }) => item);
}
