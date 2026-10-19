import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
function sleep(ms) {
    if (ms <= 0)
        return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Models return `data:image/webp;base64,...`. Anything else — a URL, a bare
// string — is a response this driver does not know how to store, and guessing
// would write a file whose contents nobody has checked.
const DATA_URI = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s;
function decodeDataUri(uri) {
    const match = DATA_URI.exec(uri);
    if (!match)
        return undefined;
    return { mimeType: match[1], bytes: Buffer.from(match[2], "base64") };
}
const EXTENSION = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg",
};
export class ImageDriver {
    options;
    name = "image";
    maxAttempts;
    retryDelayMs;
    constructor(options) {
        this.options = options;
        this.maxAttempts = options.maxAttempts ?? 3;
        this.retryDelayMs = options.retryDelayMs ?? 1000;
    }
    // Every exit below is stamped with the model, including the failures: a
    // failed item was billed to a model too, and a journal that only recorded
    // the model on success could not explain a run whose failures all came from
    // one model and whose successes came from another.
    async runItem(item) {
        const result = await this.generate(item);
        return { ...result, producer: this.options.model };
    }
    async generate(item) {
        const prompt = typeof item.payload.prompt === "string" ? item.payload.prompt : undefined;
        if (!prompt) {
            return { itemId: item.id, status: "failed", spendUsd: 0, error: "image item carried no prompt" };
        }
        let lastError = "unknown error";
        for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
            let response;
            try {
                response = await this.options.fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: this.options.model,
                        messages: [{ role: "user", content: prompt }],
                        modalities: ["image", "text"],
                    }),
                });
            }
            catch (err) {
                lastError = `network error: ${err instanceof Error ? err.message : String(err)}`;
                if (attempt < this.maxAttempts) {
                    await sleep(this.retryDelayMs * attempt);
                    continue;
                }
                return { itemId: item.id, status: "failed", spendUsd: 0, error: `${lastError} (${attempt} attempt(s))` };
            }
            if (!response.ok) {
                lastError = `image request failed (HTTP ${response.status})`;
                const transient = response.status >= 500 || response.status === 429;
                if (transient && attempt < this.maxAttempts) {
                    await sleep(this.retryDelayMs * attempt);
                    continue;
                }
                return {
                    itemId: item.id,
                    status: "failed",
                    spendUsd: 0,
                    error: transient ? `${lastError} (${attempt} attempt(s))` : lastError,
                };
            }
            // Past this point the request was served, so it was billed — every exit
            // below reports the cost even when the result is unusable.
            const spendUsd = this.options.costPerImageUsd;
            const body = (await response.json());
            const uri = body.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (typeof uri !== "string") {
                return { itemId: item.id, status: "failed", spendUsd, error: "response carried no image" };
            }
            const decoded = decodeDataUri(uri);
            if (!decoded) {
                return { itemId: item.id, status: "failed", spendUsd, error: "image was not an inline base64 data URI" };
            }
            const extension = EXTENSION[decoded.mimeType];
            if (!extension) {
                return { itemId: item.id, status: "failed", spendUsd, error: `unsupported image type ${decoded.mimeType}` };
            }
            const filePath = path.join(this.options.outputDir, `${item.id}.${extension}`);
            try {
                await mkdir(this.options.outputDir, { recursive: true });
                await writeFile(filePath, decoded.bytes);
            }
            catch (err) {
                return {
                    itemId: item.id,
                    status: "failed",
                    spendUsd,
                    error: `could not write image: ${err instanceof Error ? err.message : String(err)}`,
                };
            }
            let stored = { filePath, bytes: decoded.bytes.byteLength, mimeType: decoded.mimeType };
            if (this.options.normalize) {
                let normalized;
                try {
                    normalized = await this.options.normalize(filePath);
                }
                catch (err) {
                    return {
                        itemId: item.id,
                        status: "failed",
                        spendUsd,
                        error: `could not normalize image: ${err instanceof Error ? err.message : String(err)}`,
                    };
                }
                if (!normalized) {
                    return { itemId: item.id, status: "failed", spendUsd, error: "image could not be brought under the size ceiling" };
                }
                stored = normalized;
            }
            const output = {
                itemId: item.id,
                ...stored,
                model: this.options.model,
                costUsd: spendUsd,
                prompt,
            };
            return { itemId: item.id, status: "done", spendUsd, output };
        }
        return { itemId: item.id, status: "failed", spendUsd: 0, error: lastError };
    }
}
