/**
 * Host capabilities the player UI may ask for.
 *
 * Browser implements the no-op Steam half. Electron implements filesystem and
 * Steam from the main process only, behind a typed bridge. The phone builds
 * keep their saves in the device's own store. Gameplay code never imports
 * Electron, steamworks.js or a native module.
 */
export type PlatformKind = "browser" | "desktop" | "ios" | "android";
export type SteamUser = {
    readonly id: string;
    readonly name: string;
};
export type PlatformCapabilities = {
    readonly kind: PlatformKind;
    readonly localFiles: boolean;
    readonly steamAvailable: boolean;
    readonly overlayAvailable: boolean;
    readonly offlinePlayable: true;
};
export type DesktopBridge = {
    readonly capabilities: () => Promise<PlatformCapabilities>;
    readonly steamUser: () => Promise<SteamUser | null>;
    readonly setRichPresence: (key: string, value: string) => Promise<void>;
    readonly clearRichPresence: () => Promise<void>;
    readonly unlockAchievement: (id: string) => Promise<boolean>;
    readonly savesDirectory: () => Promise<string>;
    readonly getItem: (key: string) => Promise<string | null>;
    readonly setItem: (key: string, value: string) => Promise<void>;
    readonly removeItem: (key: string) => Promise<void>;
};
declare global {
    interface Window {
        administrationDesktop?: DesktopBridge;
    }
}
