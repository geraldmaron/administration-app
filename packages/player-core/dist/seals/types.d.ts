import type { DeviceId, SealColor } from "./devices.js";
export type { DeviceId, SealColor } from "./devices.js";
/**
 * Seals and emblems are roundels, shields, stars, rosettes or octagons; an
 * outlet's is a masthead. The shape carries the class of body before a word
 * is read: departments and offices are roundels, regulators octagons, armed
 * services and alliances shields.
 */
export type SealShape = "roundel" | "shield" | "star" | "masthead" | "rosette" | "octagon";
/**
 * One authored emblem, composed from a fixed set of hand-drawn devices
 * (DECISIONS §8.10: faithful in what it signifies, never a copy of the
 * official artwork). The design system draws it; nothing here is a picture.
 */
export type SealSpec = {
    readonly id: string;
    readonly shape: SealShape;
    readonly field: SealColor;
    readonly rim: SealColor;
    /**
     * The legend around the rim. A " · " splits it: the first part runs over
     * the top, the rest reads along the bottom.
     */
    readonly ring?: {
        readonly text: string;
        readonly color: SealColor;
    };
    readonly device: DeviceId;
    readonly deviceColor: SealColor;
    /** A second, smaller device borne on an escutcheon over the first, as an eagle bears a shield. */
    readonly charge?: {
        readonly device: DeviceId;
        readonly color: SealColor;
        readonly field?: SealColor;
    };
    readonly accents?: {
        /** Stars around the device: an arc over it when few, a full ring when many. */
        readonly stars?: number;
        /** A motto on a ribbon under the device; for an outlet, its tagline. */
        readonly motto?: string;
        readonly wreath?: boolean;
        readonly rays?: boolean;
    };
    /** Two to five letters: an international body's mark, and the reading at the smallest sizes. */
    readonly monogram?: string;
    /** How an outlet sets its name. Only mastheads read it. */
    readonly nameplate?: Nameplate;
};
export type Nameplate = {
    readonly face: "serif" | "sans";
    readonly caps: boolean;
    readonly rule: "double" | "single" | "thick";
};
/** What a fallback emblem stands for when no authored seal exists for an id. */
export type SealKind = "federal" | "intelligence" | "court" | "international" | "outlet" | "generic";
