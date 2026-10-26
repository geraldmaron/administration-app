import { forceAssetNoun } from "@admin/world";
import { availableUnitsOfType } from "./capacity.js";
import { selectNation } from "./state.js";
export const FORCE_PACKAGE_SPECS = [
    {
        id: "carrier-presence",
        name: "Carrier presence",
        rung: 2,
        branch: "navy",
        unitType: "navy.aircraft-carrier",
        min: 1,
        preferred: 1,
    },
    {
        id: "surface-blockade",
        name: "Surface blockade",
        rung: 3,
        branch: "navy",
        unitType: "navy.surface-combatant",
        min: 4,
        preferred: 8,
    },
    {
        id: "limited-strike",
        name: "Limited strike",
        rung: 4,
        branch: "air",
        unitType: "air.fighter",
        min: 36,
        preferred: 100,
    },
    {
        id: "expeditionary-corps",
        name: "Expeditionary corps",
        rung: 5,
        branch: "army",
        unitType: "army.brigade-combat-team",
        min: 2,
        preferred: 8,
    },
];
const SIZED_AGAINST = {
    "surface-blockade": { arm: "naval", floor: 4 },
    "limited-strike": { arm: "air", floor: 30 },
    "expeditionary-corps": { arm: "land", floor: 2 },
};
const SIZING_CURVE = 1.5;
/** The arm's strength the package faces, 0..1, or undefined with no target to read. */
export function opposingStrength(campaign, target, spec) {
    const sizing = SIZED_AGAINST[spec.id];
    if (!sizing || target === undefined)
        return undefined;
    return selectNation(campaign, target)?.stats.military.branchStrength[sizing.arm];
}
/** A package as the staff would size it against this target; the spec itself where nothing scales it. */
export function specAgainst(campaign, target, spec) {
    const sizing = SIZED_AGAINST[spec.id];
    const strength = opposingStrength(campaign, target, spec);
    if (!sizing || strength === undefined)
        return spec;
    const floor = Math.min(sizing.floor, spec.preferred);
    const preferred = Math.round(floor + (spec.preferred - floor) * Math.max(0, Math.min(1, strength)) ** SIZING_CURVE);
    const min = Math.min(spec.min, Math.max(1, Math.ceil(preferred / 2)));
    return { ...spec, preferred, min };
}
export function specForRung(rung) {
    return FORCE_PACKAGE_SPECS.find((spec) => spec.rung === rung);
}
/**
 * How far past its preferred size a package may be sent. Its effects scale by
 * the same bound, so a count the picker offers above it would commit hulls
 * that change nothing; the money is per unit sent (`force-costs.ts`).
 */
export const PACKAGE_MAX_SCALE = 1.5;
const PACKAGE_MIN_SCALE = 0.2;
export function scaleAgainstPreferred(count, preferred) {
    if (preferred <= 0)
        return 1;
    return Math.max(PACKAGE_MIN_SCALE, Math.min(PACKAGE_MAX_SCALE, count / preferred));
}
/** The most of this package that can be sent: whole units at the scale billing reaches, never below its floor. */
export function packageCeiling(spec) {
    return Math.max(spec.min, Math.floor(spec.preferred * PACKAGE_MAX_SCALE + 1e-9));
}
/** How hard the package lands against the size the staff proposed: what every effect of the rung scales by. */
export function forceScale(rung, force) {
    const spec = specForRung(rung);
    if (!spec)
        return 1;
    const preferred = force?.preferred ?? spec.preferred;
    return scaleAgainstPreferred(force?.count ?? preferred, preferred);
}
export function clampForce(spec, count, available) {
    const ceiling = available === undefined ? packageCeiling(spec) : Math.min(available, packageCeiling(spec));
    const max = Math.max(spec.min, ceiling);
    return {
        branch: spec.branch,
        unitType: spec.unitType,
        count: Math.max(spec.min, Math.min(max, Math.round(count))),
        preferred: spec.preferred,
    };
}
/** Every package the actor could send, each sized against the target when one is named. */
export function composeForcePackages(campaign, actor, target) {
    return FORCE_PACKAGE_SPECS.map((spec) => composeOne(campaign, actor, specAgainst(campaign, target, spec)));
}
function composeOne(campaign, actor, spec) {
    const available = availableUnitsOfType(campaign, actor, spec.branch, spec.unitType);
    if (available === undefined) {
        return { spec, available, min: spec.min, max: packageCeiling(spec), defaultCount: spec.preferred };
    }
    if (available < spec.min) {
        return {
            spec,
            available,
            min: spec.min,
            max: spec.min,
            defaultCount: spec.min,
            closedReason: available === 0
                ? `No uncommitted ${forceAssetNoun(spec.unitType, 2)} this week.`
                : `${available} ${forceAssetNoun(spec.unitType, available)} free, short of the ${spec.min} this package needs.`,
        };
    }
    const max = Math.min(available, packageCeiling(spec));
    const defaultCount = Math.min(spec.preferred, max);
    return { spec, available, min: spec.min, max, defaultCount };
}
export function packageForce(composed, count) {
    if (composed.closedReason)
        return undefined;
    return clampForce(composed.spec, count, composed.available);
}
