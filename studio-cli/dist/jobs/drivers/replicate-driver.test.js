import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReplicateDriver } from "./replicate-driver.js";
// A minimal but real WebP byte string, so what the driver writes can be read
// back and checked rather than assumed.
const WEBP = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0x20, 0, 0, 0]),
    Buffer.from("WEBPVP8 "),
    Buffer.alloc(20, 0x42),
]);
const IMAGE_URL = "https://replicate.delivery/pbxt/abc123/out.webp";
let outputDir;
beforeEach(async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "replicate-driver-"));
});
afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true });
});
/** Answers the prediction POST, then the image GET, the way the service does. */
function stubFetch(prediction, options = {}) {
    const calls = [];
    const impl = async (url, init) => {
        calls.push({ url, method: init.method });
        if (url.startsWith("https://api.replicate.com")) {
            return {
                ok: options.predictionOk ?? true,
                status: options.status ?? 200,
                json: async () => prediction,
                arrayBuffer: async () => new ArrayBuffer(0),
            };
        }
        return {
            ok: options.downloadOk ?? true,
            status: options.downloadOk === false ? 404 : 200,
            json: async () => ({}),
            arrayBuffer: async () => WEBP.buffer.slice(WEBP.byteOffset, WEBP.byteOffset + WEBP.byteLength),
        };
    };
    return { impl, calls };
}
const driverWith = (fetchImpl, extra = {}) => new ReplicateDriver({
    apiToken: "test-token",
    model: "black-forest-labs/flux-schnell",
    fetchImpl,
    outputDir,
    costPerImageUsd: 0.003,
    maxAttempts: 2,
    retryDelayMs: 0,
    ...extra,
});
const item = { id: "europe_m_senior_ceremonial_01", payload: { prompt: "an official portrait" } };
const succeeded = { status: "succeeded", output: [IMAGE_URL] };
describe("the open-weight image backend", () => {
    it("runs the model, collects what it made, and reports the cost", async () => {
        const { impl, calls } = stubFetch(succeeded);
        const result = await driverWith(impl).runItem(item);
        expect(result.status).toBe("done");
        expect(result.spendUsd).toBe(0.003);
        // Two round trips on purpose: the service answers with a URL, not bytes.
        expect(calls).toHaveLength(2);
        expect(calls[0].url).toBe("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions");
        expect(calls[1].url).toBe(IMAGE_URL);
        const output = result.output;
        expect(output.model).toBe("black-forest-labs/flux-schnell");
        expect(output.mimeType).toBe("image/webp");
        expect(await readFile(output.filePath)).toEqual(WEBP);
    });
    // The provenance gate refuses any shipped image whose journal does not name
    // the model that made it, so the stamp cannot depend on the run succeeding.
    it("stamps the producing model on success and on failure alike", async () => {
        const ok = await driverWith(stubFetch(succeeded).impl).runItem(item);
        expect(ok.producer).toBe("black-forest-labs/flux-schnell");
        const refused = await driverWith(stubFetch({ status: "failed", error: "nsfw" }).impl).runItem(item);
        expect(refused.status).toBe("failed");
        expect(refused.producer).toBe("black-forest-labs/flux-schnell");
    });
    // Without this the batch is paid for and then refused by the gate for being
    // the wrong size, nothing journals done, and the next run pays again.
    it("normalizes to the shipped standard, and reports what normalization produced", async () => {
        const normalizedPath = path.join(outputDir, "normalized.webp");
        const result = await driverWith(stubFetch(succeeded).impl, {
            normalize: async (source) => {
                expect(source).toContain(item.id);
                await writeFile(normalizedPath, WEBP);
                return { filePath: normalizedPath, bytes: 512, mimeType: "image/webp" };
            },
        }).runItem(item);
        const output = result.output;
        expect(output.filePath).toBe(normalizedPath);
        expect(output.bytes).toBe(512);
    });
    it("fails the item when normalization cannot bring it to standard, and still reports the spend", async () => {
        const result = await driverWith(stubFetch(succeeded).impl, {
            normalize: async () => undefined,
        }).runItem(item);
        expect(result.status).toBe("failed");
        // The prediction ran, so it was billed — a failure that reported no spend
        // would let a run overshoot its cap on repeated normalization failures.
        expect(result.spendUsd).toBe(0.003);
    });
    it("reports the spend on a prediction that ran and did not succeed", async () => {
        const result = await driverWith(stubFetch({ status: "failed", error: "safety filter" }).impl).runItem(item);
        expect(result.status).toBe("failed");
        expect(result.spendUsd).toBe(0.003);
        expect(result.error).toContain("safety filter");
    });
    it("charges nothing for an item it never sent", async () => {
        const result = await driverWith(stubFetch(succeeded).impl).runItem({ id: "x", payload: {} });
        expect(result.status).toBe("failed");
        expect(result.spendUsd).toBe(0);
    });
    it("does not pay for a request the service refused outright", async () => {
        const result = await driverWith(stubFetch({}, { predictionOk: false, status: 401 }).impl).runItem(item);
        expect(result.status).toBe("failed");
        expect(result.spendUsd).toBe(0);
        expect(result.error).toContain("401");
    });
});
describe("a prediction that outlives the blocking wait", () => {
    const POLL_URL = "https://api.replicate.com/v1/predictions/pred-1";
    /** Answers `processing` until the caller has asked `readyAfter` times. */
    function slowFetch(readyAfter) {
        const state = { polls: 0 };
        const impl = async (url) => {
            const body = (payload) => ({
                ok: true,
                status: 200,
                json: async () => payload,
                arrayBuffer: async () => WEBP.buffer.slice(WEBP.byteOffset, WEBP.byteOffset + WEBP.byteLength),
            });
            if (url === POLL_URL) {
                state.polls += 1;
                return body(state.polls >= readyAfter
                    ? { id: "pred-1", status: "succeeded", output: [IMAGE_URL], urls: { get: POLL_URL } }
                    : { id: "pred-1", status: "processing", urls: { get: POLL_URL } });
            }
            if (url.startsWith("https://api.replicate.com")) {
                return body({ id: "pred-1", status: "processing", urls: { get: POLL_URL } });
            }
            return body({});
        };
        return { impl, get polls() { return state.polls; } };
    }
    // `Prefer: wait` is best effort. Treating a still-running prediction as a
    // failure threw away compute that was already paid for and made the next run
    // buy the same image again.
    it("follows it to completion instead of abandoning what it already paid for", async () => {
        const slow = slowFetch(2);
        const result = await driverWith(slow.impl, { pollIntervalMs: 0, maxPollMs: 1000 }).runItem(item);
        expect(result.status).toBe("done");
        expect(slow.polls).toBeGreaterThanOrEqual(2);
        expect(result.output.model).toBe("black-forest-labs/flux-schnell");
    });
    it("names the prediction still running when the poll budget runs out, so it can be collected", async () => {
        const slow = slowFetch(Number.POSITIVE_INFINITY);
        const result = await driverWith(slow.impl, { pollIntervalMs: 1, maxPollMs: 3 }).runItem(item);
        expect(result.status).toBe("failed");
        expect(result.spendUsd).toBe(0.003);
        expect(result.error).toContain("pred-1");
    });
});
describe("what the downloaded bytes are", () => {
    // A live prediction returned its output at a URL with no extension, and the
    // extension-only driver refused an image it had already paid for and
    // downloaded. The bytes are the authority; the name is the last resort.
    it("recognizes a real image behind an extensionless URL", async () => {
        const bareUrl = "https://replicate.delivery/provider-outputs/b3446376/bde96676";
        const { impl } = stubFetch({ status: "succeeded", output: [bareUrl] });
        const result = await driverWith(impl).runItem(item);
        expect(result.status).toBe("done");
        const output = result.output;
        expect(output.mimeType).toBe("image/webp");
        expect(output.filePath.endsWith(".webp")).toBe(true);
    });
    it("still refuses bytes that are not an image at all", async () => {
        const bareUrl = "https://replicate.delivery/provider-outputs/not-an-image";
        const html = Buffer.from("<html>error page pretending to be output</html>");
        const impl = async (url) => {
            if (url.startsWith("https://api.replicate.com")) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ status: "succeeded", output: [bareUrl] }),
                    arrayBuffer: async () => new ArrayBuffer(0),
                };
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({}),
                arrayBuffer: async () => html.buffer.slice(html.byteOffset, html.byteOffset + html.byteLength),
            };
        };
        const result = await driverWith(impl).runItem(item);
        expect(result.status).toBe("failed");
        // Paid, downloaded, and still not shippable — the spend must be reported.
        expect(result.spendUsd).toBe(0.003);
    });
});
describe("addressing the two kinds of model Replicate hosts", () => {
    const captureUrl = async (model) => {
        const { impl, calls } = stubFetch(succeeded);
        await driverWith(impl, { model }).runItem(item);
        return { url: calls[0].url, body: calls[0] };
    };
    it("posts an official model to its own route", async () => {
        const { url } = await captureUrl("black-forest-labs/flux-schnell");
        expect(url).toBe("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions");
    });
    // The route above 404s for every community model, which is most of the
    // catalogue — including the cheap distilled ones worth pricing against.
    it("posts a version-pinned community model to the predictions route", async () => {
        const { url } = await captureUrl("bytedance/sdxl-lightning-4step:6f7a773af6fc");
        expect(url).toBe("https://api.replicate.com/v1/predictions");
    });
});
describe("backing off a rate limit", () => {
    it("waits as long as the service asks rather than its own flat delay", async () => {
        const waits = [];
        let attempts = 0;
        const impl = async (url) => {
            if (url.startsWith("https://api.replicate.com")) {
                attempts += 1;
                if (attempts === 1) {
                    return {
                        ok: false,
                        status: 429,
                        headers: { get: (name) => (name.toLowerCase() === "retry-after" ? "2" : null) },
                        json: async () => ({}),
                        arrayBuffer: async () => new ArrayBuffer(0),
                    };
                }
                return { ok: true, status: 200, json: async () => succeeded, arrayBuffer: async () => new ArrayBuffer(0) };
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({}),
                arrayBuffer: async () => WEBP.buffer.slice(WEBP.byteOffset, WEBP.byteOffset + WEBP.byteLength),
            };
        };
        const original = globalThis.setTimeout;
        // Record what the driver asked to wait for, then let it through instantly.
        globalThis.setTimeout = ((fn, ms) => {
            waits.push(ms ?? 0);
            return original(fn, 0);
        });
        try {
            const result = await driverWith(impl, { retryDelayMs: 1500 }).runItem(item);
            expect(result.status).toBe("done");
        }
        finally {
            globalThis.setTimeout = original;
        }
        // 2s from the header, not the 1.5s the driver would have picked alone.
        expect(waits).toContain(2000);
    });
});
