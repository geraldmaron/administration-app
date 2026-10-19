import { assessWarfighting, composeForcePackages, declaredWarheads, opposingStrength, hasIntelOnNation, liveForceDomains, liveNuclearReading, packageBrief, packageForce, resolvePackageCount, selectForceBench, selectNation, } from "@admin/engine";
import { forceAssetFor, forceAssetNoun } from "@admin/world";
/** The department that holds each service's forces: the Marine Corps sits in the Navy's, the Space Force in the Air Force's. */
const SERVICE_OF_BRANCH = {
    army: "INST-ARMY",
    navy: "INST-NAVY",
    marines: "INST-NAVY",
    air: "INST-AIRFORCE",
    space: "INST-AIRFORCE",
};
function forceBandOf(strength) {
    if (strength >= 0.75)
        return "Formidable";
    if (strength >= 0.55)
        return "Strong";
    if (strength >= 0.35)
        return "Capable";
    if (strength >= 0.2)
        return "Limited";
    return "Slight";
}
function countedIn(campaign, nation, domain) {
    const own = nation === campaign.founding.nation;
    const seen = new Set();
    return domain.holdings.flatMap((holding) => {
        const branch = forceAssetFor(holding.id).branch;
        const key = `${branch}:${holding.id}`;
        if (seen.has(key))
            return [];
        seen.add(key);
        const bench = selectForceBench(campaign, nation, branch, holding.id);
        if (!bench)
            return [];
        const service = own ? SERVICE_OF_BRANCH[branch] : undefined;
        return [
            {
                domain: domain.id,
                branch,
                unitType: holding.id,
                label: holding.type,
                total: bench.fielded,
                committed: bench.committed,
                available: bench.available,
                belowReadiness: Math.max(0, bench.fielded - bench.committed - bench.available),
                ...(service ? { service } : {}),
            },
        ];
    });
}
/**
 * The qualitative band withstands the fog on its own (an intel-read
 * government's nuclear status is a fact the services hold); the count does
 * not. `declaredWarheads` is undefined for a government whose own arsenal is
 * never officially confirmed (Israel's `declared: false`), so the count is
 * read through it rather than off the raw reading — a nation can be known to
 * be nuclear-armed while its stock stays a withheld figure, which is the
 * ambiguity the dataset actually models.
 */
function nuclearOf(campaign, nation, read) {
    const reading = liveNuclearReading(campaign, nation);
    if (!reading || reading.warheads <= 0)
        return undefined;
    const count = read ? declaredWarheads(campaign, nation) : undefined;
    return {
        band: reading.triad ? "Has nuclear weapons on land, at sea, and in the air" : "Has nuclear weapons",
        ...(count !== undefined ? { warheads: count } : {}),
    };
}
/**
 * A government's forces as far as the President can know them, or undefined
 * for a government not on the board. Counts print only for a domain the
 * dataset holds an order of battle for, in a government the services read.
 */
export function nationForces(campaign, nation) {
    const domains = liveForceDomains(campaign, nation);
    if (!domains)
        return undefined;
    const read = hasIntelOnNation(campaign, nation);
    const countable = (domain) => read && domain.authored;
    const nuclear = nuclearOf(campaign, nation, read);
    const base = selectNation(campaign, nation)?.base;
    const assessed = base ? assessWarfighting(base) : undefined;
    return {
        nation,
        read,
        ...(assessed ? { warfighting: { label: assessed.label, sustains: assessed.sustainabilityLabel } } : {}),
        strip: domains.map((domain) => ({
            domain: domain.id,
            label: domain.label,
            strength: domain.strength,
            band: forceBandOf(domain.strength),
            counted: countable(domain),
        })),
        counted: domains.filter(countable).flatMap((domain) => countedIn(campaign, nation, domain)),
        inferred: domains
            .filter((domain) => !countable(domain))
            .map((domain) => ({ domain: domain.id, label: domain.label, reason: read ? "inferred" : "unread" })),
        ...(nuclear ? { nuclear } : {}),
    };
}
/** What one of the President's own departments holds, counted: the rows `/service/$id` draws. */
export function serviceHoldings(campaign, service) {
    return (nationForces(campaign, campaign.founding.nation)?.counted ?? []).filter((holding) => holding.service === service);
}
/** A holding as a count a sentence can carry: "11 aircraft carriers", "1 aircraft carrier". */
export function holdingCount(unitType, count) {
    return `${count.toLocaleString("en-US")} ${forceAssetNoun(unitType, count)}`;
}
const COMMITMENT_LEVELS = ["limited", "standard", "reinforced"];
const ARM_WORDS = { air: "air arm", navy: "navy", army: "army" };
/** The force a rung sends against this target: sized to what the target fields, inside what the bench leaves free. */
export function forcePackageFor(campaign, rung, target) {
    const composed = composeForcePackages(campaign, campaign.founding.nation, target).find((entry) => entry.spec.rung === rung);
    if (!composed)
        return undefined;
    const strength = opposingStrength(campaign, target, composed.spec);
    const targetName = target ? selectNation(campaign, target)?.base.identity.name : undefined;
    const arm = ARM_WORDS[composed.spec.branch];
    return {
        composed,
        brief: packageBrief(composed.spec),
        levels: COMMITMENT_LEVELS.map((level) => ({ level, count: resolvePackageCount(composed, level) })),
        ...(strength !== undefined && targetName && arm ? { sizing: { targetName, arm, strength } } : {}),
    };
}
/** The package the President's chosen count sends, inside the bounds the bench and the bill share; undefined while it is closed. */
export function chosenForce(choice, count) {
    return packageForce(choice.composed, count);
}
