import { isOpenCase, selectDateOfTurn } from "@admin/engine";
import { commodityBandOf, commodityIndex } from "@admin/content";
import { PLACES, anchored, place } from "../navigation/places";
import { familyRaise } from "./family-raise";
const WORDS = {
    crude: "Crude oil",
    "natural-gas": "Natural gas",
    lng: "Liquefied natural gas",
    wheat: "Wheat",
    corn: "Corn",
    soybeans: "Soybeans",
    copper: "Copper",
    lithium: "Lithium",
    "rare-earths": "Rare earths",
    potash: "Potash",
    nitrogen: "Nitrogen fertilizer",
};
const moving = (band) => (band === "spiking" ? "spiking" : "running high");
/**
 * The factories, bounded on purpose: four questions a real White House is
 * asked when a traded price moves, each on the case family whose contract
 * already fits it. Planning values: the clock lengths are how long the question
 * stays open before the family's default answers it.
 */
export const COMMODITY_FACTORIES = [
    {
        id: "reserve-release",
        commodities: ["crude"],
        raiseOn: ["elevated", "spiking"],
        hardOn: "spiking",
        kind: "emergency",
        clockWeeks: 3,
        title: (name, band) => `${name} is ${moving(band)}, and the emergency oil reserve could help`,
        reason: () => "Gas prices follow crude oil within weeks. Releasing oil from the reserve helps now, but it leaves less for the next crisis.",
    },
    {
        id: "allied-supply",
        commodities: ["wheat", "corn", "soybeans"],
        raiseOn: ["spiking"],
        hardOn: "spiking",
        kind: "foreign-request",
        clockWeeks: 4,
        title: (name) => `${name} is spiking, and countries that buy from us want to know what you'll sell`,
        reason: () => "Countries that import grain want to know if American grain will stay for sale. Answering commits our supply. If you say nothing, they'll take it as a no.",
    },
    {
        id: "critical-supply",
        commodities: ["rare-earths", "lithium", "copper"],
        raiseOn: ["spiking"],
        hardOn: "spiking",
        kind: "emergency",
        clockWeeks: 6,
        title: (name) => `${name} is getting scarce for the factories that need it`,
        reason: () => "Manufacturers are rationing what they have. Trade controls, a supply deal with allies, or the national stockpile could each help, at a different cost.",
    },
    {
        id: "farm-inputs",
        commodities: ["potash", "nitrogen"],
        raiseOn: ["elevated", "spiking"],
        hardOn: "spiking",
        kind: "emergency",
        clockWeeks: 5,
        title: (name, band) => `${name} is ${moving(band)} before planting`,
        reason: () => "Farmers are deciding how much to plant based on what fertilizer costs. Helping them costs money. Waiting shows up in next year's harvest.",
    },
];
const casePrefix = (factory, commodity) => `case:commodity:${factory.id}:${commodity}:`;
/**
 * The id a live reading raises under. One open case per factory and commodity:
 * a reading that is still past its line keeps the case it already raised rather
 * than stacking a second one, and a new episode after the market came back
 * gets a new id dated to the week it started.
 */
function episodeId(campaign, factory, commodity) {
    const prefix = casePrefix(factory, commodity);
    const open = Object.values(campaign.cases ?? {}).find((item) => item.id.startsWith(prefix) && isOpenCase(item.status));
    return open?.id ?? `${prefix}${campaign.turn}`;
}
function sourceFor(campaign, factory, commodity) {
    const band = commodityBandOf(commodityIndex(campaign, commodity));
    if (!factory.raiseOn.includes(band))
        return undefined;
    const id = episodeId(campaign, factory, commodity);
    // An episode that already settled this week has spent its id. Raising the
    // row again would put a hard matter on the Desk backed by a closed case,
    // which no put-off can write to; the next week's reading opens a new one.
    const spent = campaign.cases?.[id];
    if (spent !== undefined && !isOpenCase(spent.status))
        return undefined;
    const name = WORDS[commodity];
    const title = factory.title(name, band);
    // Commodities are read with the markets, which the economy carries.
    const href = anchored(place.economyView("markets"), "economy-commodities");
    const hard = band === factory.hardOn;
    const row = {
        id,
        source: "market-threshold",
        urgency: hard ? "hard" : "soft",
        subject: `commodity:${commodity}`,
        title,
        reason: factory.reason(name, band),
        href,
        stance: hard ? "adverse" : "caution",
        icon: PLACES.economy.icon,
    };
    return {
        raise: familyRaise(factory.kind, id, title, { kind: "commodity", id: commodity }, selectDateOfTurn(campaign, campaign.turn + factory.clockWeeks)),
        row,
        door: { href, label: "Open the economy" },
    };
}
/** Every commodity case the markets raise this week, one per factory and commodity past its line. */
export function commoditySources(campaign) {
    return COMMODITY_FACTORIES.flatMap((factory) => factory.commodities.flatMap((commodity) => {
        const source = sourceFor(campaign, factory, commodity);
        return source ? [source] : [];
    }));
}
/** What a commodity case settled on when the market came back before anything was decided. */
export const COMMODITY_EASED = "Prices went back to normal before anything was decided.";
