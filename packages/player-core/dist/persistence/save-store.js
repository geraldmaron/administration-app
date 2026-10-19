import { MIN_READABLE_SCHEMA_VERSION, createSave, loadSave } from "@admin/engine";
import { retiredWorldReason } from "../campaign/founding-options.js";
import { decodePayload, encodePayload } from "./payload-codec";
import { sha256Hex } from "./sha256";
export const CAMPAIGN_LIBRARY_MANIFEST_KEY = "administration.campaignLibrary.v1";
export const CAMPAIGN_PAYLOAD_KEY_PREFIX = "administration.campaignPayload.v1";
export const CAMPAIGN_LIBRARY_SCHEMA_VERSION = 1;
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
export const MAX_ACTIVE_CAMPAIGNS = 5;
/** What the library says about a save from before the current calendar, word for word. */
export const RETIRED_CALENDAR_REASON = "Started under an older calendar, so it can't be continued";
/** Whether a status is a game that moved on rather than a file that failed: the bytes are still worth exporting. */
export function isRetiredStatus(status) {
    return status === "retired-world" || status === "retired-calendar";
}
const emptyManifest = {
    schemaVersion: CAMPAIGN_LIBRARY_SCHEMA_VERSION,
    activeCampaignId: null,
    campaigns: [],
};
export function campaignPayloadKey(id) {
    return `${CAMPAIGN_PAYLOAD_KEY_PREFIX}:${id}`;
}
export function campaignSittingKey(id) {
    return `${CAMPAIGN_PAYLOAD_KEY_PREFIX}:sitting:${id}`;
}
export function vaultCapacity(used) {
    return {
        limit: MAX_ACTIVE_CAMPAIGNS,
        used,
        free: Math.max(0, MAX_ACTIVE_CAMPAIGNS - used),
        full: used >= MAX_ACTIVE_CAMPAIGNS,
    };
}
/**
 * The sentence a player reads when the vault will not take another
 * administration. Written here, beside the rule, so the store's refusal and the
 * screen's explanation cannot drift into two different accounts of one limit.
 */
export function vaultFullMessage(used) {
    return (`This device has ${used} saved administrations, and ${MAX_ACTIVE_CAMPAIGNS} is the limit. ` +
        "Delete one you don't need to make room for a new one.");
}
/**
 * True when this error is the vault refusing on its own limit rather than the
 * device refusing on storage. Callers branch on it to send the player to the
 * archive instead of telling them their phone is full — the repo's own
 * `isQuotaExhausted` pattern, for the same reason: no error subclasses.
 */
export function isVaultFull(error) {
    const text = error instanceof Error ? error.message : String(error);
    return text.includes(`${MAX_ACTIVE_CAMPAIGNS} is the limit`);
}
export function createSaveStore(storage, options = {}) {
    const { now = () => Date.now(), idFactory = createCampaignId } = options;
    let saveState = { status: "idle", activeCampaignId: null, savedAt: null };
    const listeners = new Set();
    /**
     * Which campaign the app is actually playing.
     *
     * Every write used to find its target by re-reading `activeCampaignId` out of
     * the manifest, and a `Campaign` carries no library id, so nothing checked
     * that the bytes handed in belonged to the row being written. That was fine
     * while a device held one administration and silently destructive the moment
     * it held several: a save of campaign A landing after the player opened
     * campaign B wrote A's bytes into B's payload key, stamped A's turn and
     * leader onto B's row, and reported success. Writes are fire-and-forget
     * across this app by design, so the window was every end of week.
     *
     * The id is captured here when a campaign is created or opened, and a write
     * reads it before its first await — so a switch that happens while a write is
     * in flight cannot redirect that write. A's bytes always land on A.
     */
    let inPlayId = null;
    /**
     * One writer at a time.
     *
     * Every mutation here reads the manifest, awaits, and writes it back, and the
     * storage port offers no compare-and-swap. Two overlapping — two founding
     * presses, a delete racing an autosave, the capacity check racing the append
     * it guards — both read the same manifest and the second write erases the
     * first, orphaning a payload under a key no row names. Serializing them costs
     * nothing a player can perceive and is what makes the limit an actual limit.
     */
    let writes = Promise.resolve();
    function serialized(work) {
        const next = writes.then(work, work);
        writes = next.then(() => undefined, () => undefined);
        return next;
    }
    function publishSaveState(next) {
        saveState = next;
        for (const listener of listeners)
            listener();
    }
    async function readManifest() {
        const raw = await storage.getItem(CAMPAIGN_LIBRARY_MANIFEST_KEY);
        if (raw === null)
            return emptyManifest;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch (cause) {
            throw new Error("Campaign library manifest is not valid JSON.", { cause });
        }
        if (!isManifest(parsed)) {
            throw new Error("Campaign library manifest is malformed.");
        }
        return normalizeManifest(parsed);
    }
    async function writeManifest(manifest) {
        await storage.setItem(CAMPAIGN_LIBRARY_MANIFEST_KEY, JSON.stringify(manifest));
    }
    async function list() {
        const manifest = await readManifest();
        const campaigns = await Promise.all(manifest.campaigns.map((entry) => summarizeEntry(storage, entry)));
        return {
            activeCampaignId: manifest.activeCampaignId,
            campaigns,
        };
    }
    async function create(campaign, createOptions = {}) {
        const manifest = await readManifest();
        refuseWhenVaultIsFull(manifest);
        const timestamp = now();
        const id = uniqueCampaignId(manifest, idFactory);
        const draft = metadataFromCampaign({
            id,
            campaign,
            name: cleanName(createOptions.name) ?? defaultCampaignName(campaign),
            createdAt: timestamp,
            updatedAt: timestamp,
            savedAt: timestamp,
        });
        const payloadStamp = await writePayloadVerified(draft.payloadKey, campaign);
        const entry = { ...draft, payloadStamp };
        const next = normalizeManifest({ ...manifest, activeCampaignId: id, campaigns: [...manifest.campaigns, entry] });
        await writeManifest(next);
        inPlayId = id;
        publishSaveState({ status: "saved", activeCampaignId: id, savedAt: timestamp });
        return { ...entry, status: "healthy" };
    }
    /**
     * The row this write belongs to.
     *
     * `inPlayId` is read synchronously, before the first await, so a campaign
     * opened while this write is queued cannot become its target. A row that has
     * gone — the campaign was retired mid-write — refuses rather than falling
     * back to a survivor, because the only thing worse than losing a write is
     * landing it on somebody else's administration.
     */
    async function withCampaignInPlay() {
        const id = inPlayId;
        if (!id)
            throw new Error("No campaign is in play, so there is nothing to save.");
        const manifest = await readManifest();
        const entry = manifest.campaigns.find((candidate) => candidate.id === id);
        if (!entry)
            throw new Error("The campaign this write belongs to is no longer in the vault.");
        return { manifest, entry };
    }
    async function saveActive(campaign) {
        const previous = saveState;
        let attempted;
        try {
            const { manifest, entry } = await withCampaignInPlay();
            attempted = entry;
            const timestamp = now();
            publishSaveState({ status: "saving", activeCampaignId: entry.id, savedAt: entry.savedAt });
            const payloadStamp = await writePayloadVerified(entry.payloadKey, campaign);
            const updated = {
                ...metadataFromCampaign({
                    id: entry.id,
                    campaign,
                    name: entry.name,
                    createdAt: entry.createdAt,
                    updatedAt: timestamp,
                    savedAt: timestamp,
                }),
                payloadStamp,
            };
            await writeManifest(replaceEntry(manifest, updated));
            publishSaveState({ status: "saved", activeCampaignId: entry.id, savedAt: timestamp });
        }
        catch (cause) {
            publishSaveState({
                status: "failed",
                activeCampaignId: attempted?.id ?? inPlayId ?? previous.activeCampaignId,
                savedAt: attempted?.savedAt ?? previous.savedAt,
                error: cause instanceof Error ? cause.message : String(cause),
            });
            throw cause;
        }
    }
    async function load(id) {
        const manifest = await readManifest();
        const entry = findEntry(manifest, id);
        const campaign = await readCampaignPayload(storage, entry);
        await writeManifest({ ...manifest, activeCampaignId: id });
        inPlayId = id;
        publishSaveState({ status: "saved", activeCampaignId: id, savedAt: entry.savedAt });
        return campaign;
    }
    async function rename(id, name) {
        const manifest = await readManifest();
        const entry = findEntry(manifest, id);
        const updated = { ...entry, name: requiredName(name), updatedAt: now() };
        await writeManifest(replaceEntry(manifest, updated));
        return { ...updated, status: "healthy" };
    }
    async function duplicate(id, duplicateOptions = {}) {
        const manifest = await readManifest();
        refuseWhenVaultIsFull(manifest);
        const source = findEntry(manifest, id);
        const campaign = await readCampaignPayload(storage, source);
        const timestamp = now();
        const nextId = uniqueCampaignId(manifest, idFactory);
        const draft = metadataFromCampaign({
            id: nextId,
            campaign,
            name: cleanName(duplicateOptions.name) ?? copyName(source.name, manifest.campaigns),
            createdAt: timestamp,
            updatedAt: timestamp,
            savedAt: source.savedAt ?? timestamp,
        });
        const payloadStamp = await writePayloadVerified(draft.payloadKey, campaign);
        const entry = { ...draft, payloadStamp };
        await writeManifest({ ...manifest, activeCampaignId: nextId, campaigns: [...manifest.campaigns, entry] });
        inPlayId = nextId;
        publishSaveState({ status: "saved", activeCampaignId: nextId, savedAt: entry.savedAt });
        return { ...entry, status: "healthy" };
    }
    async function exportSave(id) {
        const entry = findEntry(await readManifest(), id);
        const raw = await storage.getItem(entry.payloadKey);
        if (raw === null)
            throw new Error(`Campaign "${entry.name}" cannot be exported because its payload is missing.`);
        return JSON.stringify(await parseSaveFile(raw, entry.payloadKey), null, 2);
    }
    async function deleteCampaign(id) {
        const manifest = await readManifest();
        const entry = findEntry(manifest, id);
        const remaining = manifest.campaigns.filter((campaign) => campaign.id !== id);
        const nextActive = manifest.activeCampaignId === id ? remaining[0]?.id ?? null : manifest.activeCampaignId;
        await writeManifest({ ...manifest, activeCampaignId: nextActive, campaigns: remaining });
        await storage.removeItem(entry.payloadKey);
        await storage.removeItem(campaignSittingKey(entry.id));
        // Deleting the campaign in play leaves nothing in play. The manifest
        // promotes a survivor so the vault has somewhere to open next, but nothing
        // is being played until something is actually loaded — and a write that
        // fires in between must refuse rather than land on the promoted stranger.
        if (inPlayId === id)
            inPlayId = null;
        publishSaveState({ status: "idle", activeCampaignId: nextActive, savedAt: null });
    }
    // Every act that touches the manifest goes through the queue exactly once, at
    // this boundary. The functions above call each other freely and must stay
    // unwrapped: a queued call awaiting a queued call it is itself blocking is a
    // deadlock, not a safeguard.
    return {
        read: () => serialized(async () => {
            const manifest = await readManifest();
            if (!manifest.activeCampaignId)
                return null;
            return load(manifest.activeCampaignId);
        }),
        write: (campaign) => serialized(async () => {
            // Nothing in play and nothing stored is the empty vault founding its
            // first slot. Nothing in play but something stored is a write with no
            // owner, and `saveActive` refuses it by name rather than adopting a row.
            if (inPlayId === null) {
                const manifest = await readManifest();
                if (!manifest.activeCampaignId) {
                    await create(campaign);
                    return;
                }
            }
            await saveActive(campaign);
        }),
        clear: () => serialized(async () => {
            const manifest = await readManifest();
            if (!manifest.activeCampaignId)
                return;
            await deleteCampaign(manifest.activeCampaignId);
        }),
        list,
        create: (campaign, createOptions) => serialized(() => create(campaign, createOptions)),
        begin: (campaign, beginOptions) => serialized(async () => {
            await create(campaign, beginOptions);
        }),
        load: (id) => serialized(() => load(id)),
        autosaveActive: (campaign) => serialized(() => saveActive(campaign)),
        saveActive: (campaign) => serialized(() => saveActive(campaign)),
        rename: (id, name) => serialized(() => rename(id, name)),
        duplicate: (id, duplicateOptions) => serialized(() => duplicate(id, duplicateOptions)),
        exportSave: (id) => serialized(() => exportSave(id)),
        delete: (id) => serialized(() => deleteCampaign(id)),
        readSitting: () => serialized(async () => {
            const manifest = await readManifest();
            const id = manifest.activeCampaignId;
            if (!id)
                return null;
            const raw = await storage.getItem(campaignSittingKey(id));
            if (raw === null)
                return null;
            try {
                return JSON.parse(raw);
            }
            catch {
                // A sitting that cannot be read is dropped, not repaired: the
                // campaign it belonged to is intact and the next run rewrites it.
                await storage.removeItem(campaignSittingKey(id));
                return null;
            }
        }),
        writeSitting: (sitting) => serialized(async () => {
            const { entry } = await withCampaignInPlay();
            const key = campaignSittingKey(entry.id);
            if (sitting === null)
                await storage.removeItem(key);
            else
                await storage.setItem(key, JSON.stringify(sitting));
        }),
        getSaveState: () => saveState,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
    /** Writes the payload, verifies the readback, and returns its stamp for the manifest entry. */
    async function writePayloadVerified(payloadKey, campaign) {
        const serialized = await encodePayload(JSON.stringify(createSave(campaign)));
        await storage.setItem(payloadKey, serialized);
        const readback = await storage.getItem(payloadKey);
        if (readback !== serialized) {
            throw new Error(`Campaign payload "${payloadKey}" could not be verified after write.`);
        }
        return sha256Hex(serialized);
    }
}
export function createMemoryStorage(initial = {}) {
    const entries = new Map(Object.entries(initial));
    return {
        async getItem(key) {
            return entries.get(key) ?? null;
        },
        async setItem(key, value) {
            entries.set(key, value);
        },
        async removeItem(key) {
            entries.delete(key);
        },
    };
}
function createCampaignId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `campaign-${Date.now().toString(36)}-${random}`;
}
/**
 * The limit, enforced where every founding path already passes.
 *
 * It lives in the store rather than on the button because founding is not the
 * only way a campaign is written: duplicating one from the archive, the dev
 * seed and a recovery import all end here, and a rule enforced on one of four
 * doors is a rule that holds until someone uses another door.
 */
function refuseWhenVaultIsFull(manifest) {
    const used = manifest.campaigns.length;
    if (used >= MAX_ACTIVE_CAMPAIGNS)
        throw new Error(vaultFullMessage(used));
}
function uniqueCampaignId(manifest, idFactory) {
    const used = new Set(manifest.campaigns.map((entry) => entry.id));
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const id = idFactory();
        if (!used.has(id))
            return id;
    }
    throw new Error("Could not allocate a unique campaign id.");
}
function normalizeManifest(manifest) {
    const campaigns = manifest.campaigns.map((entry) => ({ ...entry, status: entry.status ?? "healthy" }));
    const activeCampaignId = campaigns.some((entry) => entry.id === manifest.activeCampaignId)
        ? manifest.activeCampaignId
        : campaigns[0]?.id ?? null;
    return {
        schemaVersion: CAMPAIGN_LIBRARY_SCHEMA_VERSION,
        activeCampaignId,
        campaigns,
    };
}
function isManifest(raw) {
    if (typeof raw !== "object" || raw === null)
        return false;
    const candidate = raw;
    return (candidate.schemaVersion === CAMPAIGN_LIBRARY_SCHEMA_VERSION &&
        (typeof candidate.activeCampaignId === "string" || candidate.activeCampaignId === null) &&
        Array.isArray(candidate.campaigns) &&
        candidate.campaigns.every(isManifestEntry));
}
function isManifestEntry(raw) {
    if (typeof raw !== "object" || raw === null)
        return false;
    const candidate = raw;
    return (typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.createdAt === "number" &&
        typeof candidate.updatedAt === "number" &&
        (typeof candidate.savedAt === "number" || candidate.savedAt === null) &&
        typeof candidate.turn === "number" &&
        typeof candidate.date === "string" &&
        typeof candidate.leader === "string" &&
        typeof candidate.nation === "string" &&
        typeof candidate.payloadKey === "string");
}
async function summarizeEntry(storage, entry) {
    const raw = await storage.getItem(entry.payloadKey);
    if (raw === null)
        return { ...entry, status: "payload-missing", error: "The data for this saved game is missing." };
    // A row this store wrote carries the stamp of the bytes it wrote and last
    // classified healthy. Bytes still matching it were not touched since, so
    // paying again for decode, parse, full schema validation and the two
    // retirement checks — on every row, on every render of a screen the player
    // now lives in — would be doing a save's worth of work to relearn what this
    // store already knows. Only a stamped, previously-healthy row takes the
    // shortcut: a row already known damaged, or one written before stamps
    // existed, still earns the real classification below. A row that goes from
    // healthy to retired purely because a later build retired its world or
    // calendar, with its bytes never touched again, keeps reading healthy here
    // until it is next opened or saved — `load()` still refuses it for real.
    if (entry.status === "healthy" && entry.payloadStamp !== undefined && sha256Hex(raw) === entry.payloadStamp) {
        return { ...entry, status: "healthy" };
    }
    try {
        const parsed = await parseSaveFile(raw, entry.payloadKey);
        if (isEarlierCalendar(parsed))
            return { ...entry, status: "retired-calendar", error: RETIRED_CALENDAR_REASON };
        const retired = retiredWorldReason(loadSave(parsed));
        if (retired)
            return { ...entry, status: "retired-world", error: retired };
        return { ...entry, status: "healthy" };
    }
    catch (cause) {
        return {
            ...entry,
            status: "payload-corrupt",
            error: cause instanceof Error ? cause.message : String(cause),
        };
    }
}
async function readCampaignPayload(storage, entry) {
    const raw = await storage.getItem(entry.payloadKey);
    if (raw === null)
        throw new Error(`Campaign "${entry.name}" cannot be loaded because its payload is missing.`);
    const parsed = await parseSaveFile(raw, entry.payloadKey);
    if (isEarlierCalendar(parsed))
        throw new Error(`Campaign "${entry.name}" cannot be opened. ${RETIRED_CALENDAR_REASON}.`);
    const campaign = loadSave(parsed);
    // Refused here rather than handed on: every screen downstream reads the
    // charter, and letting this through only moves the failure to whichever
    // component asks first.
    const retired = retiredWorldReason(campaign);
    if (retired)
        throw new Error(`Campaign "${entry.name}" cannot be continued. ${retired}`);
    return campaign;
}
async function parseSaveFile(raw, key) {
    let json;
    try {
        json = await decodePayload(raw);
    }
    catch (cause) {
        throw new Error(`Local save at "${key}" is compressed and could not be decompressed.`, { cause });
    }
    try {
        return JSON.parse(json);
    }
    catch (cause) {
        throw new Error(`Local save at "${key}" is not valid JSON and cannot be read.`, { cause });
    }
}
/**
 * An exported save the player hands the vault to import. One sworn in on the
 * retired calendar is refused with the sentence the vault prints on a stored
 * one, not with the engine's version arithmetic.
 */
export function readImportedSave(parsed) {
    if (isEarlierCalendar(parsed))
        throw new Error(`${RETIRED_CALENDAR_REASON}.`);
    return loadSave(parsed);
}
/**
 * A save from below the readable window.
 *
 * Every save below it was sworn in on the calendar this build retired, so an
 * older version number is the whole test: the bytes are intact, the shape is a
 * save's, and what it cannot be is continued.
 */
function isEarlierCalendar(parsed) {
    if (typeof parsed !== "object" || parsed === null || !("schemaVersion" in parsed))
        return false;
    const version = parsed.schemaVersion;
    return typeof version === "number" && version < MIN_READABLE_SCHEMA_VERSION;
}
function metadataFromCampaign({ id, campaign, name, createdAt, updatedAt, savedAt, }) {
    return {
        id,
        name,
        createdAt,
        updatedAt,
        savedAt,
        turn: campaign.turn,
        date: gameDateLabel(campaign.calendar),
        leader: `${campaign.founding.title} ${campaign.founding.name}`,
        nation: campaign.founding.nation,
        payloadKey: campaignPayloadKey(id),
        status: "healthy",
        seed: campaign.seed,
        removalPressure: campaign.removal.pressure,
    };
}
function replaceEntry(manifest, updated) {
    return { ...manifest, campaigns: manifest.campaigns.map((entry) => (entry.id === updated.id ? updated : entry)) };
}
function findEntry(manifest, id) {
    const entry = manifest.campaigns.find((candidate) => candidate.id === id);
    if (!entry)
        throw new Error(`Campaign "${id}" does not exist in the local library.`);
    return entry;
}
function defaultCampaignName(campaign) {
    return `${campaign.founding.title} ${campaign.founding.name}`;
}
function gameDateLabel(date) {
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
function cleanName(name) {
    const trimmed = name?.trim();
    return trimmed ? trimmed : undefined;
}
function requiredName(name) {
    const trimmed = cleanName(name);
    if (!trimmed)
        throw new Error("Campaign name cannot be empty.");
    return trimmed;
}
function copyName(name, campaigns) {
    const base = `${name} Copy`;
    const existing = new Set(campaigns.map((entry) => entry.name));
    if (!existing.has(base))
        return base;
    for (let index = 2; index < 100; index += 1) {
        const candidate = `${base} ${index}`;
        if (!existing.has(candidate))
            return candidate;
    }
    return `${base} ${Date.now()}`;
}
