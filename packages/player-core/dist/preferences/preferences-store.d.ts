import type { AttentionSource } from "@admin/engine";
import type { StoragePort } from "../persistence/save-store";
/** What a kind of matter does when it arrives: stop the world, wait on the Desk for its last call, or go to the log. */
export type AttentionSetting = "pause" | "wait" | "log";
/** How the map's camera moves between framings: a flight, a quick move, or a cut. */
export declare const CAMERA_MODES: readonly ["fly", "quick", "cut"];
export type CameraMode = (typeof CAMERA_MODES)[number];
/** How large and far apart the map's dots are drawn. */
export declare const MAP_DENSITIES: readonly ["fine", "standard", "bold"];
export type MapDensity = (typeof MAP_DENSITIES)[number];
/** Which party and diverging palette the map and charts draw in. */
export declare const COLOR_VISION_PALETTES: readonly ["standard", "protan", "deutan", "tritan"];
export type ColorVisionPalette = (typeof COLOR_VISION_PALETTES)[number];
/** The page's light or dark theme; System follows the device and changes with it. */
export declare const THEME_CHOICES: readonly ["system", "light", "dark"];
export type ThemeChoice = (typeof THEME_CHOICES)[number];
/** How the presidential review is presented. Reduced drops the scan's motion; it never drops the confirmation. */
export declare const CEREMONY_CHOICES: readonly ["full", "reduced"];
export type CeremonyChoice = (typeof CEREMONY_CHOICES)[number];
export type Preferences = {
    /**
     * The app-wide guidance master switch. Undefined and `false` mean the same
     * thing (guidance shown), because the field is additive to a save format
     * that shipped without it, the same accommodation every switch below makes.
     * When it is `true`, no room shows its brief.
     */
    readonly hideGuidance?: boolean;
    /**
     * The player's own setting for each kind of matter the Desk raises. A kind
     * with no entry keeps the game's default for it, so an absent field and an
     * empty one read the same.
     */
    readonly attentionByKind?: Partial<Record<AttentionSource, AttentionSetting>>;
    /** The rooms whose brief the player has put away, by brief id. */
    readonly dismissedBriefs?: readonly string[];
    /**
     * Single-key clock shortcuts. Undefined means on. Off keeps the buttons and
     * leaves P, period, plus and minus to the page.
     */
    readonly clockShortcuts?: boolean;
    /** Undefined is the game's default: Fly in the first session, Quick after it. Reduced motion is always Cut. */
    readonly camera?: CameraMode;
    /** Undefined is standard. */
    readonly mapDensity?: MapDensity;
    /** Thicker dots, louder inks and hairlines. Undefined follows the system's own contrast setting. */
    readonly highContrast?: boolean;
    /** Undefined is the standard palette. */
    readonly colorVision?: ColorVisionPalette;
    /** Undefined is System. */
    readonly theme?: ThemeChoice;
    /** Undefined is full; the system's reduce-motion setting always reduces it. */
    readonly ceremony?: CeremonyChoice;
    /**
     * The inbox items the player has read, keyed by campaign seed: an id like a clock's
     * due date recurs from one administration to the next, so one flat list
     * would mark another campaign's matter read.
     */
    readonly inboxSeen?: Readonly<Record<string, readonly string[]>>;
    /** Opt-in device reminders that matters wait at the desk. Undefined is off. */
    readonly deviceReminders?: boolean;
};
/** The camera a player gets when they have not chosen one. */
export declare function effectiveCamera(preferences: Preferences, options: {
    readonly firstSession: boolean;
    readonly reducedMotion: boolean;
}): CameraMode;
export declare const DEFAULT_PREFERENCES: Preferences;
export declare const PREFERENCES_KEY = "administration.preferences.v1";
export type PreferencesStore = {
    read(): Promise<Preferences>;
    write(preferences: Preferences): Promise<void>;
};
export declare function createPreferencesStore(storage: StoragePort, key?: string): PreferencesStore;
