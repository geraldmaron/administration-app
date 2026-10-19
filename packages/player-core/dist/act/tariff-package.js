import { apply, likelihoodFromUnitInterval, tradeSector } from "@admin/engine";
import { formatMoney } from "../format/money";
import { buildAct } from "./build";
import { actOption } from "./catalogue";
import { RETALIATION_STANCE, tariffDraft } from "./preview";
const TARIFF = actOption("tariff");
function step(campaign, nation, good, statute) {
    const name = tradeSector(good.sector)?.name ?? good.sector;
    const draft = tariffDraft(campaign, nation, good.sector, good.rate, statute);
    const built = buildAct(campaign, nation, TARIFF, { sector: good.sector, rate: good.rate, ...(statute ? { statute } : {}) });
    const base = { sector: good.sector, name, rate: good.rate, standing: draft?.standing ?? 0, room: draft?.room ?? 0, law: draft?.law.name ?? "" };
    if (!built.ok)
        return { reading: { ...base, status: "refused", reason: built.reason } };
    const investigation = draft?.law.orders === "investigation";
    const incidence = investigation ? undefined : draft?.incidence;
    const word = incidence ? likelihoodFromUnitInterval(incidence.retaliationChance) : undefined;
    return {
        reading: {
            ...base,
            status: investigation ? "investigation" : "tariff",
            ...(incidence ? { revenue: incidence.revenue, shelfPriceRise: incidence.shelfPriceRise, importFall: incidence.importFall } : {}),
            ...(word ? { retaliation: { word, stance: RETALIATION_STANCE[word] } } : {}),
        },
        packet: built.packet,
        lines: built.lines,
    };
}
function fold(campaign, nation, goods, statute) {
    return goods.reduce((acc, good) => {
        const next = step(acc.running, nation, good, statute);
        return { running: next.packet ? apply(acc.running, next.packet) : acc.running, steps: [...acc.steps, next] };
    }, { running: campaign, steps: [] }).steps;
}
/** Each good as the order would take it, priced on the world the goods before it leave. */
export function readTariffPackage(campaign, nation, goods, statute) {
    const read = fold(campaign, nation, goods, statute).map((entry) => entry.reading);
    return { goods: read, revenue: read.reduce((sum, good) => sum + (good.revenue ?? 0), 0), ordered: read.filter((good) => good.status !== "refused").length };
}
/**
 * The packets for every good the order covers, in order, for one review and
 * one commit. A good the engine refuses is left out and named on the receipt;
 * an order that covers nothing is refused.
 */
export function buildTariffPackage(campaign, nation, goods, statute) {
    const steps = fold(campaign, nation, goods, statute);
    const packets = steps.flatMap((entry) => (entry.packet ? [entry.packet] : []));
    if (packets.length === 0)
        return { ok: false, reason: steps[0]?.reading.reason ?? "Pick at least one kind of goods." };
    const revenue = steps.reduce((sum, entry) => sum + (entry.reading.revenue ?? 0), 0);
    const lines = steps.map((entry, index) => ({
        label: `${index + 1}. ${entry.reading.name}`,
        value: entry.reading.status === "refused"
            ? `Left out. ${entry.reading.reason}`
            : entry.reading.status === "investigation"
                ? `An investigation under ${entry.reading.law}`
                : `${entry.reading.rate}% added under ${entry.reading.law}, ${entry.reading.standing + entry.reading.rate}% in all`,
    }));
    return {
        ok: true,
        packet: packets,
        title: packets.length === 1 ? "Tariff order signed" : `Tariff order on ${packets.length} kinds of goods signed`,
        lines: [...lines, ...(revenue > 0 ? [{ label: "Revenue", value: `About ${formatMoney(revenue)} a year coming in` }] : [])],
        charged: 0,
    };
}
