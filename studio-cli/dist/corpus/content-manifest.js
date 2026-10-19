import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CORE_SCENARIOS } from "@admin/content";
/**
 * The producer half of content delivery.
 *
 * The manifest readers, the signer and the client have existed for a while and
 * every one of them indexes something that nothing built: there was no writer
 * anywhere in the repo, so a published corpus could only ever be a directory on
 * whichever laptop ran the publish. This turns that directory into the
 * deployable tree the service serves and the player fetches — the same shards,
 * addressed by digest, indexed by a manifest that names what is bundled and
 * what travels over the wire.
 *
 * Nothing here reaches the network. Producing the tree and shipping it are
 * separate verbs on purpose: a build that cannot be inspected before it is
 * uploaded is a build nobody checks.
 */
/** The pool the scenario corpus publishes under. Mirrors the player's own constant. */
export const SCENARIO_POOL_KEY = "scenarios";
/**
 * The delivered-item shape this producer emits. A client refuses a set built
 * for a version it was not compiled against, so this moves only when the wire
 * shape of a delivered scenario changes — never as a release marker.
 */
export const CONTENT_SCHEMA_VERSION = 3;
/**
 * Condition kinds a v1 client cannot evaluate, and the version each one owes.
 *
 * A new `ScenarioCondition` member is not a wire-shape change to any scenario
 * already published, so adding one does not move the version by itself — the
 * handshake is strict equality and a premature bump refuses every installed
 * app for no gain. What it does mean is that the first content set that
 * *contains* the new kind cannot be served to a binary compiled against the
 * old union: the client's strict parse drops those scenarios silently, which
 * is exactly how 157 shipped scenarios once became invisible to the player.
 *
 * So the bump is owed at publish time, not at authoring time, and this is the
 * gate that collects it: a build carrying one of these kinds fails until
 * `CONTENT_SCHEMA_VERSION` here moves to at least the version owed, and the
 * corpus is republished. The player no longer fetches content over the
 * network — it parses only what is baked into the binary at build time
 * (`packages/player-core/src/content/bundled-corpus.ts`) — so there is no separate
 * client-side version to move in lockstep. The studio console reads the same
 * bake for what is live.
 */
const KINDS_NEEDING_VERSION = [
    ["institutionState", 2],
    // The four kinds that read the oversight ledger, the funding book and the
    // rules in flight. Detection is a substring of the shard body, which is why
    // they are listed one by one rather than by subsystem: the check has to name
    // the literal that appears in a serialized condition.
    ["oversightMatter", 2],
    ["shutdown", 2],
    ["appropriation", 2],
    ["pendingRule", 2],
    // The calendar and ticket gates. Inert until a shard carries one: the check is a
    // substring match on the serialized condition, so no shipped shard trips it and
    // the bump is owed at the first publish that does.
    ["calendar", 3],
    ["ticket", 3],
    // The pulse and the commodity bands, on the same terms: owed at the first
    // publish that carries one.
    ["inflationBand", 3],
    ["unemploymentBand", 3],
    ["costOfLivingBand", 3],
    ["crimeTrend", 3],
    ["cyclePhase", 3],
    ["commodityBand", 3],
];
/**
 * Matched as a discriminant rather than as a bare quoted word.
 *
 * `shutdown` and `appropriation` are English, and a scenario that merely says
 * one of them in a flag name or a headline is not a scenario a v1 client cannot
 * read. The discriminant is the only place the kind actually is.
 */
const asDiscriminant = (kind) => new RegExp(`"kind"\\s*:\\s*"${kind}"`);
/**
 * Shape a v2 client's strict parse drops outright, and the version each owes.
 *
 * `KINDS_NEEDING_VERSION` covers the condition union, which is where a new gate
 * usually lands. These two are not conditions: a cast pick and a locus bind are
 * members of two other closed unions, and a binary compiled against the old ones
 * refuses the whole scenario rather than merely failing to evaluate a gate — the
 * same silent drop, one level worse. Matched on the field and the literal
 * together, so a scenario that merely says the word in prose is not counted.
 *
 * The bundled floor is deliberately out of scope here, as it is for
 * `KINDS_NEEDING_VERSION`: `bundledEntry` never passes through this check, because
 * the baked pack and the schema that parses it are compiled into the same binary
 * and cannot disagree about a union. Only a shard that travels can meet a client
 * older than itself, which is why the core pack may carry a new cast pick the week
 * it is written and a published shard may not.
 */
const SHAPE_NEEDING_VERSION = [
    ["stricken", /"pick"\s*:\s*"stricken"/, 3],
    ["locus.bind", /"bind"\s*:\s*"condition"/, 3],
    ["outlet", /"pick"\s*:\s*"outlet"/, 3],
];
function checkShardSchemaVersion(shardId, body) {
    for (const [kind, owed] of KINDS_NEEDING_VERSION) {
        if (CONTENT_SCHEMA_VERSION >= owed)
            continue;
        if (!asDiscriminant(kind).test(body))
            continue;
        throw new Error(`shard "${shardId}" carries a "${kind}" condition, which a v${CONTENT_SCHEMA_VERSION} client cannot ` +
            `evaluate — raise CONTENT_SCHEMA_VERSION and the player's CLIENT_SCHEMA_VERSION to ${owed} together, ` +
            "then republish the corpus");
    }
    for (const [what, pattern, owed] of SHAPE_NEEDING_VERSION) {
        if (CONTENT_SCHEMA_VERSION >= owed)
            continue;
        if (!pattern.test(body))
            continue;
        throw new Error(`shard "${shardId}" carries ${what}, which a v${CONTENT_SCHEMA_VERSION} client drops on parse — raise ` +
            `CONTENT_SCHEMA_VERSION and the player's CLIENT_SCHEMA_VERSION to ${owed} together, then republish the corpus`);
    }
}
/**
 * The shard id standing for everything compiled into the app binary.
 *
 * A manifest that indexed only fetched shards would let the starter-pack audit
 * pass vacuously, since it can only reason about what the manifest names. The
 * bundled floor is therefore an entry like any other, with a real digest over
 * the same bodies the binary carries, and is simply never fetched.
 */
export const BUNDLED_SHARD_ID = "core";
function sha256Of(body) {
    return createHash("sha256").update(body).digest("hex");
}
function countItems(body) {
    return body.split("\n").filter((line) => line.trim().length > 0).length;
}
/**
 * The bundled floor as the manifest sees it.
 *
 * Serialized the same way a fetched shard is — one item per line — so its
 * digest is computed over the same bytes a client would verify if it ever did
 * fetch it, rather than over a JSON encoding that only exists here.
 */
function bundledEntry(assetPrefix, contentSetId) {
    const body = `${CORE_SCENARIOS.map((def) => JSON.stringify(def)).join("\n")}\n`;
    return {
        poolKey: SCENARIO_POOL_KEY,
        shardId: BUNDLED_SHARD_ID,
        path: `${assetPrefix}/${contentSetId}/shards/${BUNDLED_SHARD_ID}.jsonl`,
        bytes: Buffer.byteLength(body),
        sha256: sha256Of(body),
        itemCount: CORE_SCENARIOS.length,
        bundled: true,
        // One pool exists today, so a bundled shard can only reach bundled items.
        // The field stays wired rather than dropped because the audit that proves
        // a fresh install is playable offline is only meaningful while it is.
        requires: [],
    };
}
/**
 * Index every published shard, plus the bundled floor, into one manifest.
 *
 * The revision advances from whatever was published last rather than from a
 * clock or a counter in the repo, so two operators publishing from two
 * checkouts cannot mint the same revision for different content.
 */
export async function buildContentManifest(paths, options) {
    const shardNames = existsSync(paths.shardsDir)
        ? (await readdir(paths.shardsDir)).filter((name) => name.endsWith(".jsonl")).sort()
        : [];
    if (shardNames.length === 0) {
        throw new Error(`no shards under ${paths.shardsDir} — publish a batch into the corpus before building a content set`);
    }
    const files = [];
    const entries = [bundledEntry(options.assetPrefix, options.contentSetId)];
    for (const name of shardNames) {
        const localPath = path.join(paths.shardsDir, name);
        const body = await readFile(localPath, "utf8");
        const shardId = name.replace(/\.jsonl$/, "");
        checkShardSchemaVersion(shardId, body);
        const objectPath = `shards/${name}`;
        const sha256 = sha256Of(body);
        files.push({ objectPath, localPath, sha256, bytes: Buffer.byteLength(body) });
        entries.push({
            poolKey: SCENARIO_POOL_KEY,
            shardId,
            path: `${options.assetPrefix}/${options.contentSetId}/${objectPath}`,
            bytes: Buffer.byteLength(body),
            sha256,
            itemCount: countItems(body),
            bundled: false,
            requires: [],
        });
    }
    const images = [];
    const manifest = {
        contentSetId: options.contentSetId,
        schemaVersion: CONTENT_SCHEMA_VERSION,
        manifestRevision: (options.previous?.manifestRevision ?? 0) + 1,
        generatedAt: options.generatedAt,
        entries,
        images,
    };
    return { manifest, files };
}
/**
 * Write the deployable tree: the shards as the service will serve them, and
 * the manifest that indexes them.
 *
 * The directory is rebuilt from scratch each time. A tree that accumulated
 * whatever a previous build left behind would keep serving a shard the current
 * corpus no longer contains, and the manifest — which is rebuilt — would not
 * name it, so nothing would ever notice.
 */
export async function writeContentSet(outDir, build) {
    await rm(outDir, { recursive: true, force: true });
    await mkdir(path.join(outDir, "shards"), { recursive: true });
    for (const file of build.files) {
        await writeFile(path.join(outDir, file.objectPath), await readFile(file.localPath));
    }
    const manifestPath = path.join(outDir, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(build.manifest, null, 2)}\n`);
    return { manifestPath, shardCount: build.files.length };
}
/** The manifest already written to a content-set directory, if one is there. */
export async function readContentSetManifest(outDir) {
    const manifestPath = path.join(outDir, "manifest.json");
    if (!existsSync(manifestPath))
        return undefined;
    try {
        return JSON.parse(await readFile(manifestPath, "utf8"));
    }
    catch (error) {
        // A previous build that cannot be parsed must not silently restart the
        // revision at one: a client ordering sets by revision would then treat
        // older content as newer.
        throw new Error(`content set at ${manifestPath} exists but could not be read: ${error instanceof Error ? error.message : String(error)}`);
    }
}
