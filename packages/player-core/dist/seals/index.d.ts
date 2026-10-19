import type { SealKind, SealSpec } from "./types.js";
export type { DeviceId, SealColor } from "./devices.js";
export { DEVICE_IDS, SEAL_COLORS } from "./devices.js";
export type { Nameplate, SealKind, SealShape, SealSpec } from "./types.js";
export { SEAL_COURT_OF_APPEALS, SEAL_HOUSE, SEAL_PRESIDENT, SEAL_SENATE, SEAL_SUPREME_COURT, SEAL_VICE_PRESIDENT, SEAL_WHITE_HOUSE, } from "./registry/federal.js";
/** Every authored emblem, keyed by the id of the body it stands for. */
export declare const SEALS: Readonly<Record<string, SealSpec>>;
/** Whether `id` has an authored emblem rather than the generic one. */
export declare function hasAuthoredSeal(id: string): boolean;
export declare function sealKindOf(id: string): SealKind;
/** Initials of a name, or the tail of an id when there is no name. */
export declare function monogramOf(id: string, name?: string): string;
/** The emblem for an institution, organization or outlet id; a generic one, by kind, when none is authored. */
export declare function sealFor(id: string, name?: string): SealSpec;
/** The seal of a chamber of Congress, by the engine's chamber name. */
export declare function chamberSeal(chamber: "house" | "senate"): SealSpec;
