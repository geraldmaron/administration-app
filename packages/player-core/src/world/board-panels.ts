import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { standingToward } from "./standing.js";

// The panels the world room opens beside its map, so a President can read what
// is in flight, whom to watch and where the blocs stand without hunting for
// each on its own file. Every row names the country it is about, so the web
// layer can make it a door rather than a label.

export type BoardPanelRow = {
  readonly key: string;
  readonly label: string;
  readonly meta: string;
  /** The country the row is about, when it is about one country. */
  readonly nation?: NationId;
};

export type BoardPanel = {
  readonly id: "in-flight" | "watch" | "blocs";
  readonly title: string;
  readonly rows: readonly BoardPanelRow[];
};

const ALIGNMENT_ORDER = ["aligned", "leaning-aligned", "neutral", "leaning-opposed", "opposed"] as const;
const ALIGNMENT_WORDS: Readonly<Record<(typeof ALIGNMENT_ORDER)[number], string>> = {
  aligned: "On your side",
  "leaning-aligned": "Leaning your way",
  neutral: "On neither side",
  "leaning-opposed": "Leaning against you",
  opposed: "Against you",
};

function nationName(campaign: Campaign, id: NationId): string {
  return campaign.nations[id]?.base.identity.name ?? (id as string);
}

const AIM_WORDS: Readonly<Record<Campaign["pursuits"][string]["aim"], string>> = {
  security: "Wants to feel safe",
  economic: "Wants money and trade",
  prestige: "Wants respect",
  autonomy: "Wants a free hand",
  internal: "Wants calm at home",
};

/**
 * Every war and every pursuit run at least partly in the open, wars first,
 * each newest-first within its kind. A pursuit conducted entirely by covert
 * means is not something a third party can read, so the board does not list it.
 */
function inFlightPanel(campaign: Campaign): BoardPanel {
  const wars = Object.values(campaign.conflicts)
    .filter((conflict) => conflict.status === "active")
    .sort((a, b) => b.startedTurn - a.startedTurn)
    .map(
      (conflict): BoardPanelRow => ({
        key: conflict.id,
        label: `${nationName(campaign, conflict.aggressor)} against ${nationName(campaign, conflict.defender)}`,
        meta: conflict.cause,
        nation: conflict.aggressor,
      }),
    );
  const pursuits = Object.values(campaign.pursuits)
    .filter((pursuit) => pursuit.status === "active" && pursuit.overt)
    .sort((a, b) => b.lastActedTurn - a.lastActedTurn)
    .map(
      (pursuit): BoardPanelRow => ({
        key: pursuit.id,
        label: `${nationName(campaign, pursuit.actor)} against ${nationName(campaign, pursuit.target)}`,
        meta: AIM_WORDS[pursuit.aim],
        nation: pursuit.actor,
      }),
    );
  return { id: "in-flight", title: "Under way", rows: [...wars, ...pursuits] };
}

/** The ten capitals whose tension toward the United States reads highest, so a President knows where to look first. */
function watchPanel(campaign: Campaign): BoardPanel {
  const home = campaign.founding.nation;
  const rows = (Object.keys(campaign.nations) as NationId[])
    .filter((id) => id !== home)
    .map((id) => ({ id, standing: standingToward(campaign, id) }))
    .filter((entry): entry is { readonly id: NationId; readonly standing: NonNullable<ReturnType<typeof standingToward>> } => entry.standing?.tension !== undefined)
    .sort((a, b) => (b.standing.tension?.level ?? 0) - (a.standing.tension?.level ?? 0))
    .slice(0, 10)
    .map(
      (entry): BoardPanelRow => ({
        key: entry.id,
        label: nationName(campaign, entry.id),
        meta: entry.standing.tension?.word ?? "",
        nation: entry.id,
      }),
    );
  return { id: "watch", title: "Watch", rows };
}

/** How the governments the board carries are spread across the alignment scale, MAP-8. */
function blocsPanel(campaign: Campaign): BoardPanel {
  const home = campaign.founding.nation;
  const rows = ALIGNMENT_ORDER.map((key) => {
    const count = (Object.keys(campaign.nations) as NationId[]).filter(
      (id) => id !== home && campaign.nations[id]?.base.bands.alignmentBand === key,
    ).length;
    return { key, label: ALIGNMENT_WORDS[key], meta: String(count) };
  }).filter((row) => row.meta !== "0");
  return { id: "blocs", title: "Blocs", rows };
}

/** The board's three panels: what is in flight, whom to watch, and where the blocs stand. */
export function boardPanelsReading(campaign: Campaign): readonly BoardPanel[] {
  return [inFlightPanel(campaign), watchPanel(campaign), blocsPanel(campaign)];
}
