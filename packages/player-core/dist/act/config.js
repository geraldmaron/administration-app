import { isTariffStatute } from "@admin/engine";
import { actOption, isActGoal } from "./catalogue";
// An act's settings live in the address, so a plan survives a reload and can be
// shared. Everything here is read defensively: an address is typed by hand.
function whole(value) {
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}
function explicitRate(value) {
    if (value === undefined)
        return undefined;
    if (typeof value === "number")
        return value;
    return typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
}
/** "steel:20,cars:15" as goods and their added rates; a pair that does not read is dropped, a repeated good keeps its first rate. */
function goodsOf(value) {
    if (typeof value !== "string")
        return [];
    const pairs = value.split(",").flatMap((pair) => {
        const [sector, rate] = pair.split(":");
        const parsed = Number(rate);
        return sector && Number.isInteger(parsed) && parsed > 0 ? [{ sector, rate: parsed }] : [];
    });
    return pairs.filter((pair, index) => pairs.findIndex((other) => other.sector === pair.sector) === index);
}
const OBJECTIVES = ["military-capacity", "logistics", "infrastructure"];
const REGIME_ACTS = ["political-action", "coup-support", "capture", "kill"];
/** Unknown choices are dropped. Explicit tariff rates stay intact so validation can refuse them without substituting an order. */
export function parseActConfig(search) {
    const goal = typeof search.goal === "string" && isActGoal(search.goal) ? search.goal : undefined;
    const option = typeof search.option === "string" && actOption(search.option) ? actOption(search.option)?.id : undefined;
    const count = whole(search.count);
    const rate = explicitRate(search.rate);
    const sector = search.sector === undefined ? undefined : typeof search.sector === "string" ? search.sector : "";
    const partners = typeof search.partners === "string" ? search.partners.split(",").filter(Boolean) : undefined;
    const objective = OBJECTIVES.find((entry) => entry === search.strikeObjective);
    const protection = search.civilianProtection === "standard" || search.civilianProtection === "additional-assessment" ? search.civilianProtection : undefined;
    const manage = typeof search.manage === "string" && search.manage ? search.manage : undefined;
    const regimeAct = REGIME_ACTS.find((entry) => entry === search.regimeAct);
    const statute = typeof search.statute === "string" && isTariffStatute(search.statute) ? search.statute : undefined;
    const compare = typeof search.compare === "string" ? [...new Set(search.compare.split(",").filter((id) => actOption(id)?.id === id))] : [];
    const then = typeof search.then === "string" && actOption(search.then)?.id === search.then ? search.then : undefined;
    const goods = goodsOf(search.goods);
    return {
        ...(goods.length ? { goods } : {}),
        ...(goal ? { goal } : {}),
        ...(option ? { option } : {}),
        ...(count !== undefined && count > 0 ? { count } : {}),
        ...(sector !== undefined ? { sector } : {}),
        ...(rate !== undefined ? { rate } : {}),
        ...(statute ? { statute } : {}),
        ...(search.support === "seek" || search.support === "unilateral" ? { support: search.support } : {}),
        ...(partners?.length ? { partners } : {}),
        ...(objective ? { strikeObjective: objective } : {}),
        ...(protection ? { civilianProtection: protection } : {}),
        ...(regimeAct ? { regimeAct } : {}),
        ...(manage ? { manage } : {}),
        ...(compare.length ? { compare } : {}),
        ...(then ? { then } : {}),
    };
}
/** The address query for a set of settings; the inverse of `parseActConfig`. */
export function actSearchOf(config) {
    return {
        ...(config.goods?.length ? { goods: config.goods.map((good) => `${good.sector}:${good.rate}`).join(",") } : {}),
        ...(config.goal ? { goal: config.goal } : {}),
        ...(config.option ? { option: config.option } : {}),
        ...(config.count !== undefined ? { count: config.count } : {}),
        ...(config.sector !== undefined ? { sector: config.sector } : {}),
        ...(config.rate !== undefined ? { rate: config.rate } : {}),
        ...(config.statute ? { statute: config.statute } : {}),
        ...(config.support ? { support: config.support } : {}),
        ...(config.partners?.length ? { partners: config.partners.join(",") } : {}),
        ...(config.strikeObjective ? { strikeObjective: config.strikeObjective } : {}),
        ...(config.civilianProtection ? { civilianProtection: config.civilianProtection } : {}),
        ...(config.regimeAct ? { regimeAct: config.regimeAct } : {}),
        ...(config.manage ? { manage: config.manage } : {}),
        ...(config.compare?.length ? { compare: config.compare.join(",") } : {}),
        ...(config.then ? { then: config.then } : {}),
    };
}
