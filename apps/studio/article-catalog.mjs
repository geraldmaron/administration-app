import { composeArticle } from "@admin/engine";

// Real engine articles, not dummy copy. Each row is composeArticle over a
// feed item the composer already knows how to write — the same path a dispatch
// takes when a player opens it. The cover form hangs the CoverPackage on these
// pieces rather than inventing a second article store.

const ITEMS = [
  {
    id: "press-border-shipment",
    kicker: "",
    item: {
      turn: 4,
      kind: "press",
      visibility: "public",
      headline: "The ministry confirms the shipment was turned back at the border.",
      facts: { subject: "the customs hall", stake: "whether the week stays a trade dispute" },
    },
  },
  {
    id: "npc-trade-advisory",
    kicker: "",
    item: {
      turn: 6,
      kind: "npc-action",
      visibility: "public",
      headline: "Italy is resetting its trade program against the schedules you inherited.",
      actor: "ITA",
      target: "USA",
      facts: { instrument: "Trade program", stake: "schedules you inherited" },
    },
  },
  {
    id: "conflict-grain-board",
    kicker: "",
    item: {
      turn: 9,
      kind: "conflict",
      visibility: "public",
      headline: "A grain ship is boarded and released, and the photograph outlives the apology.",
      facts: { subject: "the boarding party", figure: "six hours" },
    },
  },
];

const NAMES = {
  actor: "Italy",
  target: "United States",
  playerNation: "USA",
  playerNationName: "United States",
};

export function listArticles() {
  return ITEMS.map((entry) => {
    const article = composeArticle(entry.item, NAMES);
    return {
      id: entry.id,
      kind: entry.item.kind,
      turn: entry.item.turn,
      kicker: entry.kicker,
      headline: article.headline,
      standfirst: article.standfirst,
      outlet: article.outlet,
      article,
    };
  });
}

export function findArticle(id) {
  return listArticles().find((entry) => entry.id === id);
}
