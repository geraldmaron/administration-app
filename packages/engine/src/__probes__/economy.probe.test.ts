/**
 * Economy realism probes: each assertion states the realistic expectation from
 * a sourced benchmark, so a failing assertion is a reproduced break. Sources and
 * the full reasoning are in docs/audits/2026-10-24-world-dynamics/domains/economy.md.
 * Every probe drives the real engine on the shipped dataset.
 */
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { withWeeksElapsed } from "../__fixtures__/campaign.js";
import { foundedForBalance } from "../balance-harness.js";
import { commodityPhase } from "../commodity-phase.js";
import { COMMODITY_DEFS, referenceIndex } from "../commodity-registry.js";
import type { CommodityId } from "../commodities.js";
import { openConflict } from "../conflicts.js";
import { apply } from "../effects.js";
import { externalMacroPressure } from "../external-pressure.js";
import { resolveAction } from "../resolution.js";
import { createRngStreams } from "../rng.js";
import { selectRelationship, type Campaign, type Conflict } from "../state.js";
import { pumpPrice } from "../household-prices.js";
import { projectTariffPrices } from "../tariff-prices.js";
import { tariffPacket, type TradeMeasure } from "../trade.js";
import { DIVERSION_HALF_LIFE_DAYS, sectorFlow, sectorImports } from "../trade-volume.js";
import { addDays } from "../clock.js";
import { campaignTurnPhases } from "../turn-phases.js";
import { advanceTurn } from "../turn-loop.js";

const N = (s: string) => s as NationId;
const USA = N("USA");
const IRN = N("IRN");
const founded = foundedForBalance("economy-probe", "democrat", {}, { carriedWorld: false });
const BARE = founded.campaign;

function marketWeeks(campaign: Campaign, weeks: number): Campaign {
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) {
    for (const packet of commodityPhase(working)) working = apply(working, packet);
    working = withWeeksElapsed(working, 1);
  }
  return working;
}

/** Index over the market's resting level: 1.5 is half again above where it rests. */
const rel = (campaign: Campaign, id: CommodityId) => (campaign.markets?.commodities[id]?.index ?? referenceIndex(id)) / referenceIndex(id);
const withWar = (campaign: Campaign, war: Conflict): Campaign => ({ ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } });
const war = (aggressor: string, defender: string, intensity: number) => ({ ...openConflict(N(aggressor), N(defender), BARE.turn, "A probe war."), intensity });

function peak(campaign: Campaign, id: CommodityId, weeks: number): number {
  let working = campaign;
  let high = 0;
  for (let week = 0; week < weeks; week += 1) {
    working = marketWeeks(working, 1);
    high = Math.max(high, rel(working, id));
  }
  return high;
}

const report = (label: string, value: unknown) => console.log(`[economy-probe] ${label}: ${JSON.stringify(value)}`);

const HORMUZ_FULL = withWar(BARE, war("USA", "IRN", 1));

describe("B1: a full-intensity Hormuz war and the Brent path", () => {
  // EIA STEO (October 2026 edition) has Brent at $96 for 2026 and $105 for 4Q26
  // with Hormuz flows constrained. Those are annual and quarterly averages and
  // cannot validate a simulated weekly peak, and a full-intensity war is not a
  // complete closure (ROUTE_CLOSURE 0.5, per-flag passage, bypass). The price
  // target waits on calibrating the physical flow lost.
  it("reports the crude peak over rest within 16 weeks (report only)", () => {
    const high = peak(HORMUZ_FULL, "crude", 16);
    report("crude peak / rest, full-intensity USA-IRN war, 16 weeks", high);
    expect(high).toBeGreaterThan(1);
  });
  it.todo("Brent peak band: calibrate lost physical flow against the 2026 shut-in series first, then fit onset, peak and recovery bands to a comparable weekly or monthly price series");
});

describe("B2: fertilizer through Hormuz", () => {
  // UN/ITC (4 August 2026): the strait carries a third of traded urea. The
  // missing direct route is the defect; the 15% magnitude is unsupported until
  // traded-urea exposure is converted into the modeled commodity's supply
  // denominator.
  it("gives nitrogen fertilizer a strait route, as crude and LNG have", () => {
    report("nitrogen peak / rest, full closure, 16 weeks", peak(HORMUZ_FULL, "nitrogen", 16));
    expect(COMMODITY_DEFS.nitrogen.routes.length).toBeGreaterThan(0);
  });
  it.todo("nitrogen price band under a Hormuz closure, once the route's share is stated over total nitrogen supply rather than traded urea");
});

describe("B3: exporters whose barrels are stranded behind the strait", () => {
  // IEA via Hellenic Shipping News (27 April 2026): Iran, Iraq, Kuwait, Qatar and
  // Bahrain ship the vast majority of their oil exports through Hormuz. Receipts
  // are delivered quantity times price, so a stranded exporter must fare worse
  // than an exporter whose cargo never touches the strait. An ordering, not
  // "every Gulf exporter loses": the sign for each depends on its bypass.
  const twelve = marketWeeks(HORMUZ_FULL, 12);
  const open = externalMacroPressure(twelve, N("NOR")).growth;
  for (const nation of ["KWT", "QAT", "IRQ"]) {
    it(`${nation} fares worse than Norway when its exports cannot leave`, () => {
      const growth = externalMacroPressure(twelve, N(nation)).growth;
      report(`${nation} and NOR growth pressure, week 12 of full closure`, { [nation]: growth, NOR: open });
      expect(growth).toBeLessThan(open);
    });
  }
});

describe("B4: the flags a closing state stops carry the shortage", () => {
  // DECISIONS 6.10: "the countries whose cargo it stops are the ones that lose
  // the supply". Passing Japan's flag should cut Japan's hit by more than the
  // drop in the world price alone: Japan still pays the world price, but its
  // cargo arrives. An ordering; how much more is a calibration.
  it("Japan's growth hit falls by more than the price does when Iran lets Japan's ships through", () => {
    const iran = BARE.nations[IRN]!;
    const friendly: Campaign = {
      ...HORMUZ_FULL,
      nations: { ...HORMUZ_FULL.nations, [IRN]: { ...iran, base: { ...iran.base, doctrine: { ...iran.base.doctrine, alignmentPull: [...iran.base.doctrine.alignmentPull, N("JPN")] } } } },
    };
    const stopped = marketWeeks(HORMUZ_FULL, 8);
    const passed = marketWeeks(friendly, 8);
    const priceRatio = (rel(passed, "crude") - 1) / (rel(stopped, "crude") - 1);
    const hitRatio = externalMacroPressure(passed, N("JPN")).growth / externalMacroPressure(stopped, N("JPN")).growth;
    report("JPN: crude-rise ratio passed/stopped, growth-hit ratio passed/stopped", { priceRatio, hitRatio });
    expect(hitRatio).toBeLessThan(priceRatio);
  });
});

describe("B5: other governments answer a US blockade of Iran", () => {
  // China takes the large majority of Iran's crude (Energy Institute citing EIA);
  // a US blockade of its supplier is not invisible to Beijing. Run through
  // resolveAction, the public act path, so the third-party ripples the act
  // carries are charged; calling the rung's resolver bypassed them.
  it("cools Iran's main buyer toward the United States more than a US treaty ally, eight weeks on", () => {
    const phases = campaignTurnPhases(founded.charter);
    const act = resolveAction(BARE, { actor: USA, target: IRN, instrument: "military", rung: 3 }, createRngStreams(BARE.seed));
    if (!act.ok) throw new Error(`the blockade was refused: ${act.reason}`);
    report("blockade landed, ripple effects on the packet", {
      landed: act.packet.commitment?.landed,
      ripples: act.packet.effects.filter((e) => e.kind === "relationship" && e.to === USA).length,
    });
    let blockaded = apply(BARE, act.packet);
    let control = BARE;
    for (let week = 0; week < 8; week += 1) {
      blockaded = advanceTurn(blockaded, phases);
      control = advanceTurn(control, phases);
    }
    const deltas = Object.fromEntries(["CHN", "IND", "JPN", "KOR", "RUS"].map((n) => {
      const a = selectRelationship(blockaded, N(n), USA);
      const b = selectRelationship(control, N(n), USA);
      return [n, { tension: (a?.tension ?? 0) - (b?.tension ?? 0), trust: (a?.trust ?? 0) - (b?.trust ?? 0) }];
    }));
    report("toward-USA edge deltas, blockade vs control, week 8", deltas);
    // A treaty ally and Iran's main buyer should not read the act the same: the
    // buyer, which loses the supply, cools further than the ally.
    expect(act.packet.commitment?.landed, "the blockade must land for its ripples to apply").toBe(true);
    expect(deltas.CHN!.trust).toBeLessThan(deltas.JPN!.trust);
  });
});

describe("B6: Black Sea grain, 2022", () => {
  // FAO (April 2022 release): world wheat prices rose 19.7% in March 2022 alone;
  // Russia and Ukraine supplied about 30% of world wheat exports.
  // The FAO monthly rise is not isolated from 2022's other causes, and a Black
  // Sea export disruption is not a closure of the Turkish Straits.
  it("reports the wheat peak within eight weeks of a Russian invasion of Ukraine at 0.8 (report only)", () => {
    const high = peak(withWar(BARE, war("RUS", "UKR", 0.8)), "wheat", 8);
    report("wheat peak / rest, RUS-UKR at 0.8, 8 weeks", high);
    expect(high).toBeGreaterThan(1);
  });
  it.todo("wheat band under a Black Sea war: source port and export restrictions and their bypass, then assert a band isolated from 2022's other price causes");
});

describe("B7: a Taiwan war reaches the US economy", () => {
  // Bloomberg Economics (January 2024, via Insurance Journal): US GDP -6.7% in a
  // war, -3.3% in a blockade. That is a secondhand scenario model, not a
  // measured coefficient, so it sets no floor; the defect is that no critical
  // input channel exists at all (partner exposure reads export demand only).
  it("reports US growth pressure in a full-intensity China-Taiwan war (report only)", () => {
    const twelve = marketWeeks(withWar(BARE, war("CHN", "TWN", 1)), 12);
    const growth = externalMacroPressure(twelve, USA).growth;
    report("US growth pressure, CHN-TWN war at 1, week 12", growth);
    expect(Number.isFinite(growth)).toBe(true);
  });
  it.todo("a Taiwan war constrains US output through semiconductor availability: model the critical input with capacity and substitution, then assert ordering against a war with no critical-input supplier");
});

describe("B8: sanctions on Iran hurt Iran", () => {
  // World Bank: Iran real GDP growth -3.7% in 2012 and 2018, -2.4% in 2019, from
  // +2.6% (2011) and +8.8%/+3.0% (2016-17). Those years mix sanctions with other
  // causes, so they set no coefficient. The target is the engine's own
  // consistency: world supply already gives a US measure the seller's whole
  // output through the dollar (commodity-shocks.ts buyerShare), so the national
  // pressure must not read the same measure as reaching only Iran's sales to
  // the United States. A US embargo must hurt Iran at least as much as an
  // embargo by Iran's largest buyer, whose reach is only its own purchases.
  it("hurts Iran at least as much under a US embargo as under an embargo by China, its largest buyer", () => {
    const sanctions: TradeMeasure = {
      id: "sanctions:IRN:probe",
      kind: "sanctions",
      sector: "energy-crude" as TradeMeasure["sector"],
      target: IRN,
      rate: 0,
      imposedTurn: BARE.turn,
      imposedDate: BARE.calendar,
      authority: "INST-OFAC",
      origin: "us",
    };
    const embargo = { ...sanctions, id: "embargo:IRN:probe", kind: "embargo" as const };
    const sanctioned: Campaign = { ...BARE, trade: { ...BARE.trade, measures: { [sanctions.id]: sanctions } } };
    const embargoed: Campaign = { ...BARE, trade: { ...BARE.trade, measures: { [embargo.id]: embargo } } };
    const byChina: Campaign = { ...BARE, player: { ...BARE.player, flags: { ...BARE.player.flags, "embargo:CHN:IRN": true } } };
    const base = externalMacroPressure(BARE, IRN).growth;
    const delta = externalMacroPressure(sanctioned, IRN).growth - base;
    const usEmbargo = externalMacroPressure(embargoed, IRN).growth - base;
    const chinaEmbargo = externalMacroPressure(byChina, IRN).growth - base;
    report("IRN growth-pressure change: US sanctions / US embargo / Chinese embargo", { delta, usEmbargo, chinaEmbargo });
    expect(usEmbargo).toBeLessThanOrEqual(chinaEmbargo);
  });
  it.todo("Iran sanctions magnitude: a band from a sourced causal estimate scoped by sector and financial reach, never fitted to total historical GDP contraction");
});

function tariffMeasure(id: string, imposedTurn: number, liftedTurn?: number): TradeMeasure {
  return {
    id,
    kind: "tariff",
    sector: "consumer-electronics" as TradeMeasure["sector"],
    target: N("CHN"),
    rate: 0.25,
    imposedTurn,
    imposedDate: BARE.calendar,
    authority: "INST-USTR",
    origin: "us",
    ...(liftedTurn !== undefined ? { liftedTurn } : {}),
  };
}

/**
 * The price level the tariff projection's inflation pressure adds up to, week
 * by week: each week's annualized shift divided by 52. This is the term
 * external-pressure.ts feeds the macro inflation target, integrated; it is not
 * the household cost-of-living reading, which Wave 1 checks end to end.
 */
function priceLevelPath(measuresAt: (turn: number) => readonly TradeMeasure[], weeks: number): readonly number[] {
  return Array.from({ length: weeks }, (_, i) => BARE.turn + i).reduce<number[]>((path, turn) => {
    const measures = Object.fromEntries(measuresAt(turn).map((m) => [m.id, m]));
    const shift = projectTariffPrices({ ...BARE, turn, trade: { ...BARE.trade, measures } }).thisWeek / 52;
    return [...path, (path.at(-1) ?? 0) + shift];
  }, []);
}

describe("B9: tariff price effects do not ratchet", () => {
  // Amiti, Redding and Weinstein (JEP 2019): pass-through to import prices was
  // complete, so removing the tariff removes the wedge. A lifted tariff's wedge
  // returns toward baseline; a held one keeps it. So four impose-and-lift
  // cycles, read a year after the last lift, sit below one tariff still held,
  // and below their own peak.
  it("returns a lifted tariff's wedge toward baseline while a held tariff keeps its own", () => {
    const start = BARE.turn;
    const weeks = 156;
    const held = priceLevelPath(() => [tariffMeasure("tariff:held", start)], weeks);
    const cycles = [0, 1, 2, 3].map((k) => tariffMeasure(`tariff:cycle:${k}`, start + k * 26, start + k * 26 + 26));
    const cycled = priceLevelPath((turn) => cycles.filter((m) => m.imposedTurn <= turn).map((m) => (turn >= m.liftedTurn! ? m : ({ ...m, liftedTurn: undefined } as TradeMeasure))), weeks);
    const end = { held: held.at(-1)!, cycled: cycled.at(-1)!, cycledPeak: Math.max(...cycled) };
    report("price level a year after the last lift: held tariff, four lifted cycles, and the cycles' peak", end);
    expect(end.cycled).toBeLessThan(end.held);
    expect(end.cycled).toBeLessThan(end.cycledPeak);
  });
});

describe("B10: tariffs divert trade to third countries", () => {
  // Fajgelbaum et al. (QJE 2020) and the 2018-19 record: imports shifted from
  // China toward other suppliers of the same goods, over months, limited by
  // supplier capacity. Unchanged imports on the day are the diagnostic; an
  // immediate, predetermined gain is not the target.
  // The delay is a planning value (DIVERSION_HALF_LIFE_DAYS, 182 days); no
  // opened source gives the lag. The assertion is the ordering, not the size.
  it("diversion: Vietnam's sales rise within the half-life after a 25% tariff on China's and keep rising, the country buys less in all, and Vietnam gains no more than China lost", () => {
    const sector = "consumer-electronics" as TradeMeasure["sector"];
    const result = tariffPacket(BARE, N("CHN"), sector, 0.25, "s301");
    if (!result.ok) throw new Error(result.reason);
    const tariffed = apply(BARE, result.packet);
    const on = (weeks: number): Campaign => ({ ...tariffed, turn: tariffed.turn + weeks, calendar: addDays(tariffed.calendar, weeks * 7) });
    const vietnam = (state: Campaign) => sectorFlow(state, N("VNM"), sector)?.imports ?? 0;
    const china = (state: Campaign) => sectorFlow(state, N("CHN"), sector)?.imports ?? 0;
    const halfLife = on(Math.round(DIVERSION_HALF_LIFE_DAYS / 7));
    const later = on(104);
    report("VNM consumer-electronics imports: opening, half-life, 104 weeks; US total opening and at 104", {
      opening: vietnam(BARE), halfLife: vietnam(halfLife), later: vietnam(later), totalOpening: sectorImports(BARE, sector), totalLater: sectorImports(later, sector) });
    expect(vietnam(halfLife)).toBeGreaterThan(vietnam(BARE));
    expect(vietnam(later)).toBeGreaterThan(vietnam(halfLife));
    expect(sectorImports(later, sector)).toBeLessThan(sectorImports(BARE, sector));
    expect(vietnam(later) - vietnam(BARE)).toBeLessThanOrEqual(china(BARE) - china(later));
  });
  it("reports Vietnam's consumer-electronics flow on the day of a 25% tariff on China's (report only)", () => {
    const result = tariffPacket(BARE, N("CHN"), "consumer-electronics" as TradeMeasure["sector"], 0.25, "s301");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(BARE, result.packet);
    const before = sectorFlow(BARE, N("VNM"), "consumer-electronics" as TradeMeasure["sector"])?.imports ?? 0;
    const later = sectorFlow(after, N("VNM"), "consumer-electronics" as TradeMeasure["sector"])?.imports ?? 0;
    report("VNM consumer-electronics imports before/after CHN tariff", { before, later });
    expect(later).toBeGreaterThanOrEqual(0);
  });
});

describe("B11: retaliation reaches the US economy", () => {
  // USDA ERS (Amber Waves, 7 March 2022): retaliatory tariffs cut US farm exports
  // by $13.2 billion a year, China 95% of it, soybeans 71%.
  it("lowers US growth pressure while China's retaliatory tariff on row crops stands", () => {
    const answer: TradeMeasure = {
      id: "retaliation-measure:probe",
      kind: "tariff",
      sector: "agriculture-row-crops" as TradeMeasure["sector"],
      target: N("CHN"),
      rate: 0.25,
      imposedTurn: BARE.turn,
      imposedDate: BARE.calendar,
      authority: "INST-USTR",
      origin: "retaliation",
      actor: N("CHN"),
    };
    const answered: Campaign = { ...BARE, trade: { ...BARE.trade, measures: { [answer.id]: answer } } };
    const delta = externalMacroPressure(answered, USA).growth - externalMacroPressure(BARE, USA).growth;
    report("US growth-pressure change under standing Chinese retaliation", delta);
    expect(delta).toBeLessThan(0);
  });
});

describe("B12: a shock fades without ratchet or oscillation", () => {
  it("returns crude to within 5% of rest a year after the strait reopens, never undershooting by more than 10%", () => {
    let working = marketWeeks(HORMUZ_FULL, 12);
    working = { ...working, conflicts: {} };
    let low = Infinity;
    for (let week = 0; week < 52; week += 1) {
      working = marketWeeks(working, 1);
      low = Math.min(low, rel(working, "crude"));
    }
    report("crude after 52 weeks of peace; lowest point", { final: rel(working, "crude"), low, inventory: working.markets?.commodities.crude?.inventory });
    expect(Math.abs(rel(working, "crude") - 1)).toBeLessThanOrEqual(0.05);
    expect(low).toBeGreaterThanOrEqual(0.9);
  });

  it("does not ratchet: the same war twice, a year apart, peaks no higher the second time", () => {
    const first = peak(HORMUZ_FULL, "crude", 12);
    let working = marketWeeks(HORMUZ_FULL, 12);
    working = marketWeeks({ ...working, conflicts: {} }, 52);
    const second = peak(withWar(working, { ...war("USA", "IRN", 1), id: "probe-second" }), "crude", 12);
    report("crude peak, first and second identical war", { first, second });
    expect(second).toBeLessThanOrEqual(first * 1.05);
  });
});

describe("C1 (held): the pump follows crude at about a gallon's share of a barrel", () => {
  // A barrel is 42 gallons, so a $1 move in crude is about 2.4 cents a gallon
  // once fully passed through (EIA gasoline price components).
  it("moves the gallon 2.0 to 2.8 cents per dollar a barrel", () => {
    const perDollar = (pumpPrice(1 + 1 / 69) - pumpPrice(1)) * 100;
    report("cents a gallon per $1/bbl", perDollar);
    expect(perDollar).toBeGreaterThan(2.0);
    expect(perDollar).toBeLessThan(2.8);
  });
});
