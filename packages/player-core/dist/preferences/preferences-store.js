/** How the map's camera moves between framings: a flight, a quick move, or a cut. */
export const CAMERA_MODES = ["fly", "quick", "cut"];
/** How large and far apart the map's dots are drawn. */
export const MAP_DENSITIES = ["fine", "standard", "bold"];
/** Which party and diverging palette the map and charts draw in. */
export const COLOR_VISION_PALETTES = ["standard", "protan", "deutan", "tritan"];
/** The page's light or dark theme; System follows the device and changes with it. */
export const THEME_CHOICES = ["system", "light", "dark"];
/** How the presidential review is presented. Reduced drops the scan's motion; it never drops the confirmation. */
export const CEREMONY_CHOICES = ["full", "reduced"];
/** The camera a player gets when they have not chosen one. */
export function effectiveCamera(preferences, options) {
    if (options.reducedMotion)
        return "cut";
    return preferences.camera ?? (options.firstSession ? "fly" : "quick");
}
export const DEFAULT_PREFERENCES = {};
export const PREFERENCES_KEY = "administration.preferences.v1";
function isHideGuidance(value) {
    return typeof value === "boolean";
}
function isSwitch(value) {
    return typeof value === "boolean";
}
function isAttentionSetting(value) {
    return value === "pause" || value === "wait" || value === "log";
}
/** Only the entries a later build could still act on survive; the rest fall back to the default. */
function readAttentionByKind(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return undefined;
    const kept = Object.entries(value).filter(([, setting]) => isAttentionSetting(setting));
    return kept.length === 0 ? undefined : Object.fromEntries(kept);
}
function oneOf(allowed, value) {
    return typeof value === "string" && allowed.includes(value) ? value : undefined;
}
/** The display settings, each kept only if this build still offers its value. */
function readDisplay(record) {
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
function readInboxSeen(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return undefined;
    const kept = Object.entries(value).flatMap(([campaign, ids]) => Array.isArray(ids) ? [[campaign, ids.filter((id) => typeof id === "string")]] : []);
    return kept.length === 0 ? undefined : Object.fromEntries(kept);
}
function readDismissedBriefs(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.filter((id) => typeof id === "string");
}
export function createPreferencesStore(storage, key = PREFERENCES_KEY) {
    return {
        async read() {
            const raw = await storage.getItem(key);
            if (raw === null)
                return DEFAULT_PREFERENCES;
            // A preference is not worth failing a launch over: unlike a save, there
            // is nothing here to lose, so unreadable stored preferences fall back to
            // the defaults rather than propagating an error to the shell.
            try {
                const parsed = JSON.parse(raw);
                const record = parsed;
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
                    ...readDisplay(typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null),
                };
            }
            catch {
                return DEFAULT_PREFERENCES;
            }
        },
        async write(preferences) {
            await storage.setItem(key, JSON.stringify(preferences));
        },
    };
}
