import { z } from "zod";
export declare const MILITARY_BRANCHES: readonly ["army", "navy", "air", "marines", "space", "cyber"];
export type MilitaryBranch = (typeof MILITARY_BRANCHES)[number];
/**
 * Which branch-strength reading each service answers for. `land` covers the
 * army and the marines together: branch strength is a reading about ground
 * combat power, and a marine corps is ground combat power that arrives by sea.
 */
export declare const BRANCH_STRENGTH_OF: Readonly<Record<MilitaryBranch, "land" | "air" | "naval" | "cyber" | "space">>;
/** The arena a holding fights in. The contest is decided one domain at a time. */
export declare const FORCE_DOMAINS: readonly ["ground", "sea", "air", "space", "cyber"];
export type ForceDomain = (typeof FORCE_DOMAINS)[number];
/**
 * The scale of one of the thing.
 *
 * `platform` is a hull, an airframe or a satellite — a machine with a crew.
 * `unit` is the battalion, squadron and team scale a deployment order names.
 * `formation` is the scale that owns units — a division, a strike group, a
 * corps — and is what a service *is* rather than what it can send this week.
 */
export declare const FORCE_ECHELONS: readonly ["platform", "unit", "formation"];
export type ForceEchelon = (typeof FORCE_ECHELONS)[number];
/** What one of the thing is counted as, for the noun a screen puts beside a figure. */
export declare const FORCE_COUNT_NOUNS: readonly ["formations", "hulls", "airframes", "satellites", "teams", "batteries"];
export type ForceCountNoun = (typeof FORCE_COUNT_NOUNS)[number];
export type ForceAssetSpec = {
    readonly branch: MilitaryBranch;
    readonly domain: ForceDomain;
    readonly echelon: ForceEchelon;
    /** Plural, as a roster line reads it: "Brigade combat teams". */
    readonly label: string;
    /** Singular, for a sentence about one of them: "a brigade combat team". */
    readonly singular: string;
    readonly counts: ForceCountNoun;
    /**
     * People needed to field one, at the scale the id names. A crewed platform
     * counts its crew and the maintainers who keep it flying; a formation counts
     * its establishment. Rough by design: the number is for a plausibility check
     * against the service's headcount and a personnel reading beside a count,
     * never for a payroll.
     */
    readonly nominalPersonnel: number;
    /** What the thing is and what it is for, in the words a briefing would use. */
    readonly description: string;
};
/**
 * Every countable thing a service in this dataset holds. Ids are
 * `<branch>.<kind>`, so an id says which service owns it before the catalog is
 * consulted, and the validator holds each holding to the branch it sits under.
 */
export declare const FORCE_ASSETS: {
    readonly "army.division": ForceAssetSpec;
    readonly "army.airborne-division": ForceAssetSpec;
    readonly "army.armored-brigade": ForceAssetSpec;
    readonly "army.brigade-combat-team": ForceAssetSpec;
    readonly "army.mechanized-brigade": ForceAssetSpec;
    readonly "army.air-assault-brigade": ForceAssetSpec;
    readonly "army.combat-aviation-brigade": ForceAssetSpec;
    readonly "army.group-army": ForceAssetSpec;
    readonly "army.combined-arms-army": ForceAssetSpec;
    readonly "army.maneuver-battalion": ForceAssetSpec;
    readonly "army.air-defense-battalion": ForceAssetSpec;
    readonly "army.air-defense-battery": ForceAssetSpec;
    readonly "navy.carrier-strike-group": ForceAssetSpec;
    readonly "navy.surface-action-group": ForceAssetSpec;
    readonly "navy.amphibious-ready-group": ForceAssetSpec;
    readonly "navy.fleet": ForceAssetSpec;
    readonly "navy.aircraft-carrier": ForceAssetSpec;
    readonly "navy.attack-submarine": ForceAssetSpec;
    readonly "navy.ballistic-missile-submarine": ForceAssetSpec;
    readonly "navy.surface-combatant": ForceAssetSpec;
    readonly "navy.frigate": ForceAssetSpec;
    readonly "navy.amphibious-ship": ForceAssetSpec;
    readonly "navy.mine-countermeasures-vessel": ForceAssetSpec;
    readonly "air.fighter-squadron": ForceAssetSpec;
    readonly "air.bomber-squadron": ForceAssetSpec;
    readonly "air.refueling-squadron": ForceAssetSpec;
    readonly "air.fighter-brigade": ForceAssetSpec;
    readonly "air.fighter-regiment": ForceAssetSpec;
    readonly "air.fighter": ForceAssetSpec;
    readonly "air.strategic-bomber": ForceAssetSpec;
    readonly "air.tanker": ForceAssetSpec;
    readonly "air.strategic-airlifter": ForceAssetSpec;
    readonly "air.transport": ForceAssetSpec;
    readonly "marines.expeditionary-force": ForceAssetSpec;
    readonly "marines.littoral-regiment": ForceAssetSpec;
    readonly "marines.brigade": ForceAssetSpec;
    readonly "marines.infantry-regiment": ForceAssetSpec;
    readonly "marines.infantry-battalion": ForceAssetSpec;
    readonly "marines.expeditionary-unit": ForceAssetSpec;
    readonly "space.delta": ForceAssetSpec;
    readonly "space.missile-warning-constellation": ForceAssetSpec;
    readonly "space.navigation-satellite": ForceAssetSpec;
    readonly "cyber.mission-force-team": ForceAssetSpec;
    readonly "cyber.national-mission-team": ForceAssetSpec;
    readonly "cyber.network-defense-team": ForceAssetSpec;
    readonly "cyber.combat-mission-team": ForceAssetSpec;
};
export type ForceAssetId = keyof typeof FORCE_ASSETS;
export declare const FORCE_ASSET_IDS: readonly [ForceAssetId, ...ForceAssetId[]];
/** The catalog id, as a schema. A holding named outside the catalog does not parse. */
export declare const ForceAssetIdSchema: z.ZodEnum<{
    "army.division": "army.division";
    "army.airborne-division": "army.airborne-division";
    "army.armored-brigade": "army.armored-brigade";
    "army.brigade-combat-team": "army.brigade-combat-team";
    "army.mechanized-brigade": "army.mechanized-brigade";
    "army.air-assault-brigade": "army.air-assault-brigade";
    "army.combat-aviation-brigade": "army.combat-aviation-brigade";
    "army.group-army": "army.group-army";
    "army.combined-arms-army": "army.combined-arms-army";
    "army.maneuver-battalion": "army.maneuver-battalion";
    "army.air-defense-battalion": "army.air-defense-battalion";
    "army.air-defense-battery": "army.air-defense-battery";
    "navy.carrier-strike-group": "navy.carrier-strike-group";
    "navy.surface-action-group": "navy.surface-action-group";
    "navy.amphibious-ready-group": "navy.amphibious-ready-group";
    "navy.fleet": "navy.fleet";
    "navy.aircraft-carrier": "navy.aircraft-carrier";
    "navy.attack-submarine": "navy.attack-submarine";
    "navy.ballistic-missile-submarine": "navy.ballistic-missile-submarine";
    "navy.surface-combatant": "navy.surface-combatant";
    "navy.frigate": "navy.frigate";
    "navy.amphibious-ship": "navy.amphibious-ship";
    "navy.mine-countermeasures-vessel": "navy.mine-countermeasures-vessel";
    "air.fighter-squadron": "air.fighter-squadron";
    "air.bomber-squadron": "air.bomber-squadron";
    "air.refueling-squadron": "air.refueling-squadron";
    "air.fighter-brigade": "air.fighter-brigade";
    "air.fighter-regiment": "air.fighter-regiment";
    "air.fighter": "air.fighter";
    "air.strategic-bomber": "air.strategic-bomber";
    "air.tanker": "air.tanker";
    "air.strategic-airlifter": "air.strategic-airlifter";
    "air.transport": "air.transport";
    "marines.expeditionary-force": "marines.expeditionary-force";
    "marines.littoral-regiment": "marines.littoral-regiment";
    "marines.brigade": "marines.brigade";
    "marines.infantry-regiment": "marines.infantry-regiment";
    "marines.infantry-battalion": "marines.infantry-battalion";
    "marines.expeditionary-unit": "marines.expeditionary-unit";
    "space.delta": "space.delta";
    "space.missile-warning-constellation": "space.missile-warning-constellation";
    "space.navigation-satellite": "space.navigation-satellite";
    "cyber.mission-force-team": "cyber.mission-force-team";
    "cyber.national-mission-team": "cyber.national-mission-team";
    "cyber.network-defense-team": "cyber.network-defense-team";
    "cyber.combat-mission-team": "cyber.combat-mission-team";
}>;
export declare function forceAssetFor(id: ForceAssetId): ForceAssetSpec;
export declare function isForceAssetId(value: string): value is ForceAssetId;
/** The plural roster label, or the id itself where the id is not in the catalog — never a blank. */
export declare function forceAssetLabel(id: string): string;
/**
 * The noun a count is read in: "48 fighters", "1 aircraft carrier", "8 brigade
 * combat teams". Derived from the catalog's own singular, so a count and a
 * sentence about one of the thing never name a holding two ways. The id comes
 * back unchanged where it is not in the catalog, as `forceAssetLabel` does.
 */
export declare function forceAssetNoun(id: string, count: number): string;
export declare function forceAssetsOfBranch(branch: MilitaryBranch): readonly ForceAssetId[];
/** People needed to field `count` of the thing, at the catalog's nominal establishment. */
export declare function forceAssetPersonnel(id: ForceAssetId, count: number): number;
