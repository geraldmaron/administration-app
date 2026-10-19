import { describe, expect, it } from "vitest";
import { Charter, IDEOLOGY_AXES } from "@admin/world";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { takePressAction } from "./__fixtures__/issued-acts.js";
import { composeArticle } from "./article.js";
import { apply } from "./effects.js";
import {
  FORMAT_PARTISANSHIP,
  PRESS_OUTLETS,
  corpsFrom,
  WEEK_SHARE_CAP,
  fileAtDesk,
  fileAtDesks,
  localeRegion,
  openingPressCorps,
  outletAudience,
  outletDisposition,
  outletDrivers,
  outletSpreadAt,
  outletStance,
  outletTarget,
  pickOutletForFeedItem,
  placementFor,
  pressPhase,
  pressReading,
  secondOutletFor,
} from "./press.js";
import { outletReading } from "./press-beliefs.js";
import type { PressOutlet } from "./press-outlets.js";
import { usTicket } from "./party.js";
import { createRngStreams } from "./rng.js";
import type { ActionRecord, AlignmentVector, Campaign, FeedItem } from "./state.js";

// The partisan term as the acceptance criterion states it: the desk's reading of the President, at its format's partisanship.
const partisanReading = (outlet: PressOutlet, placement: Partial<AlignmentVector>) =>
  outletReading(outlet.beliefs, placement) * FORMAT_PARTISANSHIP[outlet.format];

const outletById = (id: string) => PRESS_OUTLETS.find((outlet) => outlet.id === id)!;

describe("the roster", () => {
  it("carries eighteen desks, every partisan and regional desk with a mirrored twin", () => {
    expect(PRESS_OUTLETS).toHaveLength(18);
    const paired = PRESS_OUTLETS.filter((outlet) => FORMAT_PARTISANSHIP[outlet.format] !== 1 || outlet.format === "regional");
    expect(paired).toHaveLength(12);
    for (const outlet of paired) {
      const twin = paired.find(
        (other) => other.format === outlet.format && IDEOLOGY_AXES.every((axis) => other.beliefs[axis] === -outlet.beliefs[axis]),
      );
      expect(twin, outlet.id).toBeDefined();
    }
  });

  it("places one regional paper in each census region and none anywhere else", () => {
    const regions = PRESS_OUTLETS.flatMap((outlet) => (outlet.region ? [outlet.region] : [])).sort();
    expect(regions).toEqual(["midwest", "northeast", "south", "west"]);
    for (const outlet of PRESS_OUTLETS) expect(outlet.region !== undefined).toBe(outlet.format === "regional");
  });

  it("gives every desk an audience it reaches and a credibility, as a share", () => {
    for (const outlet of PRESS_OUTLETS) {
      expect(outlet.reach).toBeGreaterThan(0);
      expect(outlet.reach).toBeLessThanOrEqual(1);
      expect(outlet.credibility).toBeGreaterThan(0);
      expect(outlet.credibility).toBeLessThanOrEqual(1);
    }
  });
});

describe("the party placement at the founding", () => {
  const parties = ["democrat", "republican", "independent"] as const;

  it("opens every desk on its institutional term plus how far its politics carry it toward this President", () => {
    const institutional = outletSpreadAt(0.5);
    for (const party of parties) {
      const placement = placementFor(party);
      const corps = openingPressCorps(1, placement);
      for (const outlet of PRESS_OUTLETS) {
        const expected = Math.max(0, Math.min(1, institutional[outlet.id]! + partisanReading(outlet, placement)));
        // Stored to three places, so within half of the last one.
        expect(Math.abs(corps.dispositions[outlet.id]! - expected)).toBeLessThanOrEqual(0.0005 + 1e-9);
      }
    }
  });

  it("keeps the corps's standing the institutional figure for every party and platform, so opening approval cannot move", () => {
    for (const party of parties) {
      for (const platform of [[], ["plank-balanced-budget", "plank-fair-share"], ["plank-energy-dominance"]]) {
        expect(openingPressCorps(1, placementFor(party, platform)).standing).toBe(0.5);
      }
    }
  });

  it("puts the partisan channels on opposite sides of a Democrat and a Republican", () => {
    const stanceFor = (party: (typeof parties)[number], id: string) =>
      outletStance(openingPressCorps(1, placementFor(party)).dispositions[id]!);
    expect(stanceFor("democrat", "outlet-frontier-channel")).toBe("hostile");
    expect(stanceFor("republican", "outlet-frontier-channel")).toBe("friendly");
    expect(stanceFor("democrat", "outlet-meridian-news")).toBe("friendly");
    expect(stanceFor("republican", "outlet-meridian-news")).toBe("hostile");
    expect(stanceFor("democrat", "outlet-american-frequency")).toBe("hostile");
  });

  it("bends the party's reading toward the voters its platform courts", () => {
    const bare = placementFor("democrat");
    const courted = placementFor("democrat", ["plank-balanced-budget"]);
    expect(courted).not.toEqual(bare);
    expect(placementFor("democrat", [])).toEqual(bare);
    expect(usTicket("democrat").beliefs.economicLeftRight).toBe(bare.economicLeftRight);
  });

  it("keeps the President's placement in every desk's target, so the partisan desks do not drift back to neutral", () => {
    const campaign = buildCampaign();
    for (const outlet of PRESS_OUTLETS) {
      const partisan = outletDrivers(campaign, outlet).find((driver) => driver.key === "partisan")!;
      expect(partisan.delta).toBeCloseTo(partisanReading(outlet, placementFor(campaign.congress.administrationParty)), 9);
    }
  });
});

describe("standing stays the equal-weight institutional figure", () => {
  it("is the plain mean of the desks however unequal their reach", () => {
    const campaign = buildCampaign();
    const values = PRESS_OUTLETS.map((outlet) => outletDisposition(campaign.press, outlet));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(campaign.press.standing).toBeCloseTo(mean, 3);
    expect(new Set(PRESS_OUTLETS.map((outlet) => outlet.reach)).size).toBeGreaterThan(5);
  });

  it("reads the audience off the cohorts without writing anything back", () => {
    const campaign = buildCampaign();
    const before = JSON.stringify(campaign);
    const audience = outletAudience(campaign, outletById("outlet-frontier-channel"));
    expect(audience.reach).toBe(0.24);
    expect(audience.leans.length).toBeGreaterThan(0);
    expect(JSON.stringify(campaign)).toBe(before);
  });

  it("opens a save written with six desks on the same standing, and moves it no further than a week's drift", () => {
    const campaign = buildCampaign();
    const six = Object.fromEntries(Object.entries(campaign.press.dispositions).slice(0, 6));
    const old: Campaign = { ...campaign, press: { ...campaign.press, dispositions: six } };
    const week = pressPhase(old).reduce((state, packet) => apply(state, packet), old);
    expect(Math.abs(week.press.standing - old.press.standing)).toBeLessThanOrEqual(0.03);
  });
});

describe("which desk files a story", () => {
  const wildfire: FeedItem = {
    turn: 5,
    kind: "condition",
    visibility: "public",
    headline: "A wildfire is burning in Colorado.",
    target: "USA" as FeedItem["target"],
    facts: { phase: "onset", dateline: "Colorado" },
  };

  it("files a home story with a place under its region's paper, and puts a national desk second", () => {
    expect(localeRegion(wildfire)).toBe("west");
    expect(pickOutletForFeedItem(wildfire)?.id).toBe("outlet-western-correspondent");
    expect(secondOutletFor(wildfire)?.region).toBeUndefined();
  });

  it("never gives a regional paper anything but its own region's home news", () => {
    const abroad: FeedItem = { ...wildfire, target: "ALP" as FeedItem["target"], facts: { dateline: "Geneva" } };
    for (let turn = 1; turn <= 200; turn += 1) {
      for (const item of [abroad, { ...abroad, kind: "npc-action" as const }, { ...wildfire, kind: "player-action" as const }]) {
        expect(pickOutletForFeedItem({ ...item, turn })?.region).toBeUndefined();
      }
    }
  });

  it("chooses by relevance, not by which desk is most hostile", () => {
    const campaign = buildCampaign();
    const hostile = corpsFrom(campaign.press, { ...campaign.press.dispositions, "outlet-rampart": 0 });
    const items = Array.from({ length: 60 }, (_, turn): FeedItem => ({ turn, kind: "player-action", visibility: "public", headline: `Act ${turn}.` }));
    const desks = (corps: Campaign["press"]) => items.map((item) => fileAtDesk({ ...campaign, press: corps }, item).desk?.outletId);
    expect(desks(hostile)).toEqual(desks(campaign.press));
  });

  it("never lets one desk carry more than two in five of a week's filings", () => {
    const campaign = buildCampaign();
    for (const kind of ["condition", "npc-action", "player-action", "operator"] as const) {
      const items = Array.from({ length: 20 }, (_, index): FeedItem => ({ turn: 7, kind, visibility: "public", headline: `Story ${kind} ${index}.` }));
      const counts = new Map<string, number>();
      for (const item of fileAtDesks(campaign, items)) counts.set(item.desk!.outletId, (counts.get(item.desk!.outletId) ?? 0) + 1);
      expect(Math.max(...counts.values()) / items.length, kind).toBeLessThanOrEqual(WEEK_SHARE_CAP);
    }
  });

  it("keeps the desk's stance at filing, and a dispatch reread months later reads in that voice", () => {
    const campaign = buildCampaign();
    const item: FeedItem = { turn: 4, kind: "player-action", visibility: "public", headline: "The order went out." };
    const filed = fileAtDesk(campaign, item);
    const desk = outletById(filed.desk!.outletId);
    expect(filed.desk!.stance).toBe(outletStance(outletDisposition(campaign.press, desk)));
    expect(filed.desk!.byline).toBeDefined();
    const week4 = composeArticle(filed);
    const week40 = composeArticle(filed, {}, { outletDisposition: filed.desk!.stance === "hostile" ? 0.9 : 0.05 });
    expect(week40.standfirst).toBe(week4.standfirst);
    expect(week40.stance).toBe(filed.desk!.stance);
    expect(week4.byline.startsWith(`${filed.desk!.byline}.`)).toBe(true);
    expect(fileAtDesk({ ...campaign, press: corpsFrom(campaign.press, outletSpreadAt(0)) }, filed)).toBe(filed);
  });
});

describe("the President's own week on the wire", () => {
  const decision = (campaign: Campaign, description: string, extra: Partial<ActionRecord> = {}): ActionRecord => ({
    turn: campaign.turn,
    actor: "player",
    description,
    causal: { origin: "decision", eventId: `ev-${campaign.turn}-${description.length}`, createdDate: campaign.calendar },
    ...extra,
  });

  const weekOf = (campaign: Campaign) =>
    pressPhase(campaign).flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "feed" ? effect.items : [])));

  it("files a player-action story for every public act the President took this week, with the nation as actor", () => {
    const base = buildCampaign();
    const campaign = { ...base, ledger: [...base.ledger, decision(base, "The United States sent emergency relief to Alpland.")] };
    const filed = weekOf(campaign).filter((item) => item.kind === "player-action");
    expect(filed).toHaveLength(1);
    expect(filed[0]!.actor).toBe(campaign.founding.nation);
    expect(filed[0]!.desk).toBeDefined();
    expect(filed[0]!.facts?.subject).toBeUndefined();
  });

  it("files nothing for a covert act, an intelligence read, or an act already on the wire, and at most three a week", () => {
    const base = buildCampaign();
    const covert = decision(base, "A covert operation.", { commitment: { instrument: "covert", rung: 1, target: "ALP" as never } });
    const secret = decision(base, "A read.", { causal: { origin: "decision", eventId: "ev-1-9", createdDate: base.calendar, visibility: "intelligence" } });
    const wired = decision(base, "Already reported.");
    const many = Array.from({ length: 5 }, (_, index) => decision(base, `Policy move ${index}.`));
    const campaign: Campaign = {
      ...base,
      ledger: [...base.ledger, covert, secret, wired, ...many],
      feed: [{ turn: base.turn, kind: "player-action", visibility: "public", headline: "Already reported.", actor: base.founding.nation }],
    };
    const filed = weekOf(campaign).filter((item) => item.kind === "player-action").map((item) => item.headline);
    expect(filed).toHaveLength(2);
    expect(filed).not.toContain("A covert operation.");
    expect(filed).not.toContain("A read.");
    expect(filed).not.toContain("Already reported.");
  });
});

describe("the press engagement as a story", () => {
  const charter = Charter.parse({
    id: "charter-1",
    name: "The Constitution",
    removalMechanism: "impeachment",
    cabinetRoles: ["role-chancellor"],
    institutions: [{ name: "Congress", role: "Brings impeachment.", kind: "assembly" }],
    decisionConstraint: "Treaties require the Senate.",
    successionRule: "The Vice President serves out the term.",
    roleTitles: { "role-chancellor": "President" },
  });

  it("files a player-action item with the nation as actor and no person subject, and no line says anyone has not resigned", () => {
    for (const weeks of [0, 2, 3, 5]) {
      const campaign = withWeeksElapsed(buildCampaign(), weeks);
      for (const [kind, outlet] of [["press-conference", undefined], ["interview", "outlet-capital-register"], ["leak", "outlet-rampart"]] as const) {
        const result = takePressAction(campaign, charter, kind, createRngStreams(campaign.seed), outlet);
        if (!result.ok) throw new Error(result.reason);
        const items = result.packet.effects.flatMap((effect) => (effect.kind === "feed" ? effect.items : []));
        expect(items).toHaveLength(1);
        expect(items[0]!.kind).toBe("player-action");
        expect(items[0]!.actor).toBe(campaign.founding.nation);
        expect(items[0]!.facts?.subject).toBeUndefined();
        expect(result.engagement.outletId).toBe(outlet);
        const article = composeArticle(items[0]!, { playerNation: campaign.founding.nation, playerNationName: "the United States" });
        expect([article.standfirst, article.relevance, ...article.paragraphs].join(" ")).not.toMatch(/has not resigned/);
      }
    }
  });

  it("names what the room asked about", () => {
    const campaign = buildCampaign();
    const result = takePressAction(campaign, charter, "press-conference", createRngStreams(campaign.seed));
    if (!result.ok) throw new Error(result.reason);
    expect(result.projection.subject.kind).toBe("record");
    const flagged: Campaign = { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, "scandal:the-pipeline-contract": true } } };
    const story = takePressAction(flagged, charter, "press-conference", createRngStreams(campaign.seed));
    if (!story.ok) throw new Error(story.reason);
    expect(story.projection.subject.kind).toBe("story");
    expect(story.engagement.summary).toMatch(/The questions were about the pipeline contract\./);
  });
});

describe("what content can ask of the press", () => {
  it("reads the corps's standing, its silence, its hostile share, and one named desk", () => {
    const campaign = withWeeksElapsed(buildCampaign(), 4);
    expect(pressReading(campaign, "standing")).toBe(campaign.press.standing);
    expect(pressReading(campaign, "silenceWeeks")).toBe(campaign.turn - campaign.press.lastSpokeTurn);
    const hostile = { ...campaign, press: corpsFrom(campaign.press, outletSpreadAt(0)) };
    expect(pressReading(hostile, "hostileShare")).toBe(1);
    expect(pressReading(campaign, "outlet", "outlet-frontier-channel")).toBe(outletDisposition(campaign.press, outletById("outlet-frontier-channel")));
    expect(pressReading(campaign, "outlet", "outlet-not-on-the-roster")).toBeUndefined();
  });
});

describe("why each masthead sits where it does", () => {
  it("names the terms whose sum is the desk's target", () => {
    const campaign = withWeeksElapsed(buildCampaign(), 3);
    for (const outlet of PRESS_OUTLETS) {
      const sum = outletDrivers(campaign, outlet).reduce((total, driver) => total + driver.delta, 0);
      expect(Math.abs(outletTarget(campaign, outlet) - Math.max(0, Math.min(1, 0.5 + sum)))).toBeLessThanOrEqual(0.0005 + 1e-9);
    }
  });
});
