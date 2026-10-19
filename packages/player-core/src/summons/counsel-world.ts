import {
  COMBATANT_COMMANDS,
  effectivePosture,
  selectLiveScandals,
  selectNation,
  selectObligations,
  terminationClockRuns,
  type Campaign,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { appropriationReading } from "../congress/congress-reading";
import { economyTiles } from "../economy/readings";
import { readingBand, type Stance } from "../reading";
import { place } from "../navigation/places";
import { subjectHref } from "../shell/subject";
import { warReadings } from "../world/board-state";
import { warPowersHome } from "../world/war-powers-home";
import { boardStance, standingToward } from "../world/standing";
import type { PlaceCounsel } from "./counsel-shape";

// The counsel for the places that look outward or at the money. Split from
// counsel.ts for size only; the same rules hold: counsel rather than the
// place's headline figures, and nothing the simulation knows that the player
// does not.

const STANCE_WEIGHT: Readonly<Record<Stance, number>> = { adverse: 3, caution: 2, neutral: 1, favorable: 0 };

export function budgetCounsel(campaign: Campaign): PlaceCounsel {
  const reading = appropriationReading(campaign);
  const next = { label: reading.onPriorYear ? "Send a budget to Congress" : "Draft the next budget", href: place.budget() };
  // The header says how long the money lasts; the line says what that rests on.
  const detail = reading.detail.split(/(?<=\.)\s/)[0] ?? reading.headline;
  return { lines: [detail], quiet: false, next };
}

export function economyCounsel(campaign: Campaign): PlaceCounsel {
  const tiles = economyTiles(campaign);
  const worst = [...tiles].sort((a, b) => STANCE_WEIGHT[b.stance] - STANCE_WEIGHT[a.stance])[0];
  if (!worst) return { lines: ["There are no economic figures yet."], quiet: true };
  const watch = STANCE_WEIGHT[worst.stance] >= STANCE_WEIGHT.caution;
  const lines = watch
    ? [`${worst.caption} is the number to watch. Right now it's ${worst.stanceWord.toLowerCase()}.`, "Open its page to see each thing that moved it."]
    : ["Inflation, unemployment, and growth aren't moving against you right now."];
  return { lines, quiet: false, next: { label: `See what moves ${worst.caption.toLowerCase()}`, href: worst.href } };
}

type Board = { readonly id: NationId; readonly name: string; readonly stance: Stance | "unread" };

function board(campaign: Campaign): readonly Board[] {
  return (Object.keys(campaign.nations) as NationId[]).flatMap((id) => {
    const stance = boardStance(standingToward(campaign, id));
    const name = selectNation(campaign, id)?.base.identity.name;
    return stance && name ? [{ id, name, stance }] : [];
  });
}

function postureLine(rows: readonly Board[]): string {
  if (rows.some((row) => row.stance === "adverse")) return "Some governments are hostile to you.";
  if (rows.some((row) => row.stance === "caution")) return "No government is hostile to you, but some are wary.";
  return "Of the governments your intelligence services can see into, none is hostile or wary.";
}

export function worldCounsel(campaign: Campaign): PlaceCounsel {
  const rows = board(campaign);
  const lines = [postureLine(rows)];
  if (rows.some((row) => row.stance === "unread")) lines.push("Your intelligence services can't see into every government, so you don't know how some countries feel about you.");
  // Ranked by band, then by name: never by the trust figure under the band,
  // which a player reads only as the band's word.
  const colder = rows
    .filter((row) => row.stance === "adverse" || row.stance === "caution")
    .sort((a, b) => STANCE_WEIGHT[b.stance as Stance] - STANCE_WEIGHT[a.stance as Stance] || a.name.localeCompare(b.name))[0];
  if (!colder) return { lines, quiet: false, next: { label: "Compare how countries see you", href: place.world() } };
  return { lines, quiet: false, next: { label: `Open ${colder.name}'s page`, href: subjectHref({ kind: "nation", id: colder.id as string }) } };
}

function securityLines(campaign: Campaign, clocks: number, raised: boolean): string[] {
  const war = warReadings(campaign)[0];
  const lines = [war ? `${war.headline}.` : "American forces are not at war."];
  if (clocks > 0) lines.push(`${clocks === 1 ? "The War Powers deadline is" : "War Powers deadlines are"} running. Before time runs out, Congress needs to authorize the force or you need to bring it home.`);
  else if (raised) lines.push("One of your military commands is on high alert. Every week it stays that way, your forces get a little less ready.");
  return lines;
}

export function securityCounsel(campaign: Campaign): PlaceCounsel {
  const clocks = selectObligations(campaign).filter((obligation) => terminationClockRuns(campaign, obligation));
  const theater = COMBATANT_COMMANDS.find((def) => effectivePosture(campaign, def.id) !== "routine");
  const lines = securityLines(campaign, clocks.length, theater !== undefined);
  const clock = clocks[0];
  if (clock) {
    return { lines, quiet: false, next: { label: "See the War Powers deadline", href: warPowersHome(campaign, clock.target) } };
  }
  const war = warReadings(campaign)[0];
  if (war) return { lines, quiet: false, next: { label: "Open the war", href: subjectHref({ kind: "war", id: war.id }) } };
  if (theater) return { lines, quiet: false, next: { label: `Review ${theater.name}`, href: place.command(theater.id) } };
  return { lines, quiet: false, next: { label: "Choose a country to act on", href: place.world() } };
}

export function pressCounsel(campaign: Campaign): PlaceCounsel {
  const band = readingBand("standing", campaign.press.standing);
  const story = [...selectLiveScandals(campaign)].sort((a, b) => b.brokeTurn - a.brokeTurn || a.id.localeCompare(b.id))[0];
  const lines = [`The press's overall view of you is ${band?.word.toLowerCase() ?? "unknown"}.`];
  if (story) {
    lines.push(`A story about your administration is running: ${story.subject}.`);
    return { lines, quiet: false, next: { label: "Respond to the story", href: subjectHref({ kind: "scandal", id: story.id }) } };
  }
  return { lines, quiet: false, next: { label: "Hold a press conference", href: place.pressOffice() } };
}
