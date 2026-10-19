import type { CoverLockCatalog } from "./cover-package.js";
export declare const DEFAULT_COVER_LOCK_ROOT: string;
export type CoverLockManifest = {
    readonly id: string;
    readonly version: number;
    readonly scanFile: string;
};
/** Every lock.json under the root, newest version last. Missing scans stay listed so the gate can fail closed. */
export declare function loadCoverLocks(root?: string): Promise<CoverLockCatalog>;
