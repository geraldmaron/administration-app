import { type Campaign } from "@admin/engine";
export type StoragePort = {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
};
export declare const CAMPAIGN_LIBRARY_MANIFEST_KEY = "administration.campaignLibrary.v1";
export declare const CAMPAIGN_PAYLOAD_KEY_PREFIX = "administration.campaignPayload.v1";
export declare const CAMPAIGN_LIBRARY_SCHEMA_VERSION = 1;
/**
 * How many administrations one device may have running at once.
 *
 * The vault was unbounded, which is not generosity — a machine holding thirty
 * multi-megabyte saves is a phone that runs out of storage mid-week and loses
 * the campaign being played, and a list of thirty presidencies is a list nobody
 * chooses from. Five is the number a player can hold in their head: a term
 * being played, a term being replayed differently, and room to try something.
 *
 * The limit gates FOUNDING, never reading. A device that already holds more
 * than five — from a build before this existed, or from a vault restored off
 * another device — keeps every one of them listed, loadable and playable. It
 * simply cannot found another until it is back under the limit. A cap that
 * deleted saved work to satisfy its own number would be the worse bug.
 */
export declare const MAX_ACTIVE_CAMPAIGNS = 5;
export type SaveStatus = "idle" | "saving" | "saved" | "failed";
export type CampaignCorruptionStatus = "healthy" | "payload-missing" | "payload-corrupt" | "retired-world" | "retired-calendar";
/** What the library says about a save from before the current calendar, word for word. */
export declare const RETIRED_CALENDAR_REASON = "Started under an older calendar, so it can't be continued";
/** Whether a status is a game that moved on rather than a file that failed: the bytes are still worth exporting. */
export declare function isRetiredStatus(status: CampaignCorruptionStatus): boolean;
export type CampaignSummary = {
    readonly id: string;
    readonly name: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly savedAt: number | null;
    readonly turn: number;
    readonly date: string;
    readonly leader: string;
    readonly nation: string;
    readonly payloadKey: string;
    readonly status: CampaignCorruptionStatus;
    readonly error?: string;
    /**
     * The founding seed, for a vault card that wants to say this administration
     * is reproducible rather than just stored. Optional so a manifest entry
     * written before this field existed still parses — it fills in on the next
     * write, never a rewrite forced on read.
     */
    readonly seed?: string;
    /** Removal pressure as of the last write, 0..1. Same optionality as `seed`. */
    readonly removalPressure?: number;
    /**
     * Sha-256 of the exact bytes written to `payloadKey` the last time this
     * store classified them healthy, so `list()` can tell "unchanged since we
     * last read it end to end" from a byte compare instead of repeating the
     * decode, parse and schema validation for every row on every render.
     * Optional so a manifest entry written before this existed still parses —
     * it always takes the slow, correct path once and gains a stamp on its
     * next save.
     */
    readonly payloadStamp?: string;
};
export type CampaignLibraryManifestEntry = Omit<CampaignSummary, "status" | "error"> & {
    readonly status?: CampaignCorruptionStatus;
};
export type CampaignLibraryManifest = {
    readonly schemaVersion: typeof CAMPAIGN_LIBRARY_SCHEMA_VERSION;
    readonly activeCampaignId: string | null;
    readonly campaigns: readonly CampaignLibraryManifestEntry[];
};
export type CampaignLibrary = {
    readonly activeCampaignId: string | null;
    readonly campaigns: readonly CampaignSummary[];
};
export type CampaignLibrarySaveState = {
    readonly status: SaveStatus;
    readonly activeCampaignId: string | null;
    readonly savedAt: number | null;
    readonly error?: string;
};
export type CampaignLibraryStore = {
    list(): Promise<CampaignLibrary>;
    create(campaign: Campaign, options?: {
        readonly name?: string;
    }): Promise<CampaignSummary>;
    begin(campaign: Campaign, options?: {
        readonly name?: string;
    }): Promise<void>;
    load(id: string): Promise<Campaign>;
    autosaveActive(campaign: Campaign): Promise<void>;
    saveActive(campaign: Campaign): Promise<void>;
    rename(id: string, name: string): Promise<CampaignSummary>;
    duplicate(id: string, options?: {
        readonly name?: string;
    }): Promise<CampaignSummary>;
    /**
     * The save file exactly as this device holds it, for the player to keep.
     *
     * Read without opening the campaign, so exporting one administration never
     * makes it the one in play, and a save this build can no longer continue
     * can still leave the device intact.
     */
    exportSave(id: string): Promise<string>;
    delete(id: string): Promise<void>;
    getSaveState(): CampaignLibrarySaveState;
    subscribe(listener: () => void): () => void;
};
export type SaveStore = CampaignLibraryStore & {
    read(): Promise<Campaign | null>;
    write(campaign: Campaign): Promise<void>;
    clear(): Promise<void>;
    /**
     * The sitting: what the world did the last time it ran, kept beside the
     * campaign in play so a reload can still open the return brief. Not part
     * of the campaign — a stop is a fact about this sitting, not the country —
     * and not owed a schema: it is rewritten whole on every run.
     */
    readSitting(): Promise<unknown | null>;
    writeSitting(sitting: unknown | null): Promise<void>;
    /**
     * The President's unsigned drafts, kept beside the campaign in play. Not part
     * of the campaign either: a draft is a working paper the simulation has not
     * acted on, so the engine's save format never carries it.
     */
    /**
     * Bound to a named slot rather than to whichever is active when the write
     * runs: a write queued behind a load of another administration would
     * otherwise land on that one.
     */
    readDrafts(id: string): Promise<unknown | null>;
    writeDrafts(id: string, drafts: unknown | null): Promise<void>;
};
export type SaveStoreOptions = {
    /** Injected so tests can play an absence without waiting one out. */
    readonly now?: () => number;
    readonly idFactory?: () => string;
};
export declare function campaignPayloadKey(id: string): string;
export declare function campaignSittingKey(id: string): string;
export declare function campaignDraftsKey(id: string): string;
/**
 * How much room is left in the vault.
 *
 * `used` counts every stored administration, damaged ones included. A save the
 * game can no longer read still occupies a slot on the device and a row in the
 * archive, and the act that frees it — retiring it — is already on its own
 * tray; not counting it would let a vault fill with unreadable records while
 * still reporting a slot free, and the player would meet the refusal at the end
 * of a founding ceremony instead of in the room where the fix lives.
 */
export type VaultCapacity = {
    readonly limit: number;
    readonly used: number;
    /** Never negative: a vault already over the limit has no room, not room owed. */
    readonly free: number;
    readonly full: boolean;
};
export declare function vaultCapacity(used: number): VaultCapacity;
/**
 * The sentence a player reads when the vault will not take another
 * administration. Written here, beside the rule, so the store's refusal and the
 * screen's explanation cannot drift into two different accounts of one limit.
 */
export declare function vaultFullMessage(used: number): string;
/**
 * True when this error is the vault refusing on its own limit rather than the
 * device refusing on storage. Callers branch on it to send the player to the
 * archive instead of telling them their phone is full — the repo's own
 * `isQuotaExhausted` pattern, for the same reason: no error subclasses.
 */
export declare function isVaultFull(error: unknown): boolean;
export declare function createSaveStore(storage: StoragePort, options?: SaveStoreOptions): SaveStore;
export declare function createMemoryStorage(initial?: Readonly<Record<string, string>>): StoragePort;
/**
 * An exported save the player hands the vault to import. One sworn in on the
 * retired calendar is refused with the sentence the vault prints on a stored
 * one, not with the engine's version arithmetic.
 */
export declare function readImportedSave(parsed: unknown): Campaign;
