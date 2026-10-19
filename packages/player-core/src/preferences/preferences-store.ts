import type { AttentionSource } from "@admin/engine";
import type { StoragePort } from "../persistence/save-store";

// Display preferences, kept deliberately separate from the campaign save.
//
// They survive abandoning a campaign, so a brief the player put away stays put
// away in their next administration, and, more importantly, they live nowhere
// the engine can reach. The save format has no field for them, so no
// simulation rule can come to depend on one.

/** What a kind of matter does when it arrives: stop the world, wait on the Desk for its last call, or go to the log. */
export type AttentionSetting = "pause" | "wait" | "log";

/** How the map's camera moves between framings: a flight, a quick move, or a cut. */
export const CAMERA_MODES = ["fly", "quick", "cut"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

/** How large and far apart the map's dots are drawn. */
export const MAP_DENSITIES = ["fine", "standard", "bold"] as const;
export type MapDensity = (typeof MAP_DENSITIES)[number];

/** Which party and diverging palette the map and charts draw in. */
export const COLOR_VISION_PALETTES = ["standard", "protan", "deutan", "tritan"] as const;
export type ColorVisionPalette = (typeof COLOR_VISION_PALETTES)[number];

/** The page's light or dark theme; System follows the device and changes with it. */
export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** How the presidential review is presented. Reduced drops the scan's motion; it never drops the confirmation. */
export const CEREMONY_CHOICES = ["full", "reduced"] as const;
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
export function effectiveCamera(preferences: Preferences, options: { readonly firstSession: boolean; readonly reducedMotion: boolean }): CameraMode {
  if (options.reducedMotion) return "cut";
  return preferences.camera ?? (options.firstSession ? "fly" : "quick");
}

export const DEFAULT_PREFERENCES: Preferences = {};

export const PREFERENCES_KEY = "administration.preferences.v1";

export type PreferencesStore = {
  read(): Promise<Preferences>;
  write(preferences: Preferences): Promise<void>;
};

function isHideGuidance(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isSwitch(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isAttentionSetting(value: unknown): value is AttentionSetting {
  return value === "pause" || value === "wait" || value === "log";
}

/** Only the entries a later build could still act on survive; the rest fall back to the default. */
function readAttentionByKind(value: unknown): Preferences["attentionByKind"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const kept = Object.entries(value).filter(([, setting]) => isAttentionSetting(setting));
  return kept.length === 0 ? undefined : (Object.fromEntries(kept) as Partial<Record<AttentionSource, AttentionSetting>>);
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** The display settings, each kept only if this build still offers its value. */
function readDisplay(record: Record<string, unknown> | null): Pick<Preferences, "camera" | "mapDensity" | "highContrast" | "colorVision" | "theme" | "ceremony"> {
  const camera = oneOf(CAMERA_MODES, record?.camera);
  const theme = oneOf(THEME_CHOICES, record?.theme);
  const ceremony = oneOf(CEREMONY_CHOICES, record?.ceremony);
  const mapDensity = oneOf(MAP_DENSITIES, record?.mapDensity);
  const colorVision = oneOf(COLOR_VISION_PALETTES, record?.colorVision);
  const highContrast = record?.highContrast;
  return {
    ...(camera ? { camera } : {}),
    ...(mapDensity ? { mapDensity } : {}),
    ...(colorVision ? { colorVision } : {}),
    ...(theme ? { theme } : {}),
    ...(ceremony ? { ceremony } : {}),
    ...(isSwitch(highContrast) ? { highContrast } : {}),
  };
}

/** Only campaign ids holding lists of string ids survive; anything else is dropped rather than trusted. */
function readInboxSeen(value: unknown): Preferences["inboxSeen"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const kept = Object.entries(value).flatMap(([campaign, ids]) =>
    Array.isArray(ids) ? [[campaign, ids.filter((id): id is string => typeof id === "string")] as const] : [],
  );
  return kept.length === 0 ? undefined : Object.fromEntries(kept);
}

function readDismissedBriefs(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((id): id is string => typeof id === "string");
}

export function createPreferencesStore(storage: StoragePort, key: string = PREFERENCES_KEY): PreferencesStore {
  return {
    async read(): Promise<Preferences> {
      const raw = await storage.getItem(key);
      if (raw === null) return DEFAULT_PREFERENCES;
      // A preference is not worth failing a launch over: unlike a save, there
      // is nothing here to lose, so unreadable stored preferences fall back to
      // the defaults rather than propagating an error to the shell.
      try {
        const parsed: unknown = JSON.parse(raw);
        const record = parsed as {
          hideGuidance?: unknown;
          attentionByKind?: unknown;
          dismissedBriefs?: unknown;
          clockShortcuts?: unknown;
          inboxSeen?: unknown;
          deviceReminders?: unknown;
        } | null;
        const hideGuidance = record?.hideGuidance;
        const attentionByKind = readAttentionByKind(record?.attentionByKind);
        const dismissedBriefs = readDismissedBriefs(record?.dismissedBriefs);
        const clockShortcuts = record?.clockShortcuts;
        const inboxSeen = readInboxSeen(record?.inboxSeen);
        const deviceReminders = record?.deviceReminders;
        return {
          ...(isHideGuidance(hideGuidance) ? { hideGuidance } : {}),
          ...(attentionByKind ? { attentionByKind } : {}),
          ...(dismissedBriefs ? { dismissedBriefs } : {}),
          ...(isSwitch(clockShortcuts) ? { clockShortcuts } : {}),
          ...(inboxSeen ? { inboxSeen } : {}),
          ...(isSwitch(deviceReminders) ? { deviceReminders } : {}),
          ...readDisplay(typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null),
        };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    },
    async write(preferences: Preferences): Promise<void> {
      await storage.setItem(key, JSON.stringify(preferences));
    },
  };
}
