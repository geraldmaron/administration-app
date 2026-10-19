import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ItemResult, JobDriver, JobItem } from "../driver.js";
import type { GeneratedImage } from "./image-driver.js";

// The open-weight image backend, beside the closed-weight one.
//
// It exists because OpenRouter — which this harness already speaks for text —
// serves no open-weight image models at all: its entire image catalogue is
// Google and OpenAI. Open weights (FLUX, SDXL, Qwen-Image) are an order of
// magnitude cheaper per image, and for a catalogue measured in hundreds of
// portraits that difference decides how much coverage a fixed budget buys.
//
// Replicate returns a URL rather than inline bytes, so this fetches twice: once
// to run the model, once to collect what it made.

export type ReplicateFetch = (
  url: string,
  init: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
  /** Present on a real Response; used to honor `Retry-After` on a 429. */
  headers?: { get(name: string): string | null };
}>;

export type ReplicateDriverOptions = {
  readonly apiToken: string;
  /** "owner/name", e.g. "black-forest-labs/flux-schnell". */
  readonly model: string;
  readonly fetchImpl: ReplicateFetch;
  readonly outputDir: string;
  readonly costPerImageUsd: number;
  /** Model-specific input beyond the prompt — aspect ratio, steps, output format. */
  readonly input?: Readonly<Record<string, unknown>>;
  /**
   * Brings the model's output to the shipped standard before the gate sees it.
   *
   * The same contract the closed-weight driver holds, and for the same reason:
   * an open-weight model returns whatever its own defaults produce, which is
   * never the size the catalogue ships. Without it every image is paid for and
   * then refused, nothing journals done, and the next run pays again — the
   * exact failure this cheaper backend exists to avoid.
   */
  readonly normalize?: (source: string) => Promise<{ filePath: string; bytes: number; mimeType: string } | undefined>;
  readonly maxAttempts?: number;
  readonly retryDelayMs?: number;
  /** How long to keep asking about a prediction that outlived the blocking wait. */
  readonly maxPollMs?: number;
  readonly pollIntervalMs?: number;
};

type Prediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: unknown;
  urls?: { get?: string };
};

// Replicate's blocking wait is best-effort, not a guarantee: a busy model
// returns 200 with the prediction still `starting` or `processing`. Those are
// the states worth waiting on; the other three are the end of the story.
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "canceled"]);

const MIME_FOR_EXTENSION: Readonly<Record<string, string>> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const EXTENSION_FOR_MIME: Readonly<Record<string, string>> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/**
 * What kind of image these bytes actually are.
 *
 * The delivery URL's extension was the only source once, and a live run broke
 * it: some predictions return an output URL with no extension at all, so an
 * image that was already paid for and already downloaded was refused over its
 * file name. The bytes themselves are the authority — every format this
 * catalogue ships declares itself in its first dozen bytes — with the
 * download's Content-Type and the URL as fallbacks for anything undeclared.
 */
function sniffMime(bytes: Buffer, contentType: string | null | undefined, url: string): string | undefined {
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const declared = contentType?.split(";")[0]?.trim().toLowerCase();
  if (declared && EXTENSION_FOR_MIME[declared]) return declared;
  const extension = (url.split("?")[0]!.split(".").pop() ?? "").toLowerCase();
  return MIME_FOR_EXTENSION[extension];
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Output is a URL, or an array of them, depending on the model. Anything else
// is a response this driver will not guess at.
function firstUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return undefined;
}

/**
 * Where to POST, and what to send, for the two kinds of model Replicate hosts.
 *
 * Only models Replicate publishes officially answer at
 * `/v1/models/{owner}/{name}/predictions`. Everything else — which is most of
 * the catalogue, including the cheap distilled ones worth comparing against —
 * is addressed by version id at `/v1/predictions` and 404s at the other route.
 * Naming a community model in `owner/name:version` form is how the operator
 * says which they mean, matching Replicate's own CLI convention.
 */
function predictionRequest(model: string, input: Record<string, unknown>): { url: string; body: string } {
  const separator = model.lastIndexOf(":");
  if (separator > 0) {
    const version = model.slice(separator + 1);
    return { url: "https://api.replicate.com/v1/predictions", body: JSON.stringify({ version, input }) };
  }
  return {
    url: `https://api.replicate.com/v1/models/${model}/predictions`,
    body: JSON.stringify({ input }),
  };
}

/**
 * How long to wait before trying again.
 *
 * A rate limit is the one failure that says how long to wait, so honor it when
 * it does. Otherwise back off exponentially: the flat linear delay this driver
 * shipped with retried a burst three times inside five seconds and gave up
 * while still rate limited, which is how a smoke run lost an item on nearly
 * every batch.
 */
function backoffMs(base: number, attempt: number, retryAfter: string | null | undefined): number {
  const advertised = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(advertised) && advertised > 0) return Math.min(advertised * 1000, 60_000);
  return Math.min(base * 2 ** (attempt - 1), 30_000);
}

export class ReplicateDriver implements JobDriver {
  readonly name = "replicate";
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly maxPollMs: number;
  private readonly pollIntervalMs: number;

  constructor(private readonly options: ReplicateDriverOptions) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1500;
    this.maxPollMs = options.maxPollMs ?? 180_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
  }

  /**
   * Follow a prediction that outlived the blocking wait until it settles.
   *
   * Abandoning it is the expensive mistake: the compute is already running and
   * already billed, so a driver that gave up at the wait's expiry paid full
   * price and threw the image away, then paid again on the next run because
   * nothing journaled done.
   */
  private async settle(prediction: Prediction): Promise<Prediction> {
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) return prediction;
    const deadline = this.maxPollMs;
    let waited = 0;
    let latest = prediction;
    while (!TERMINAL_STATUSES.has(latest.status ?? "") && waited < deadline) {
      await sleep(this.pollIntervalMs);
      waited += this.pollIntervalMs;
      const response = await this.options.fetchImpl(pollUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.options.apiToken}` },
      });
      if (!response.ok) continue;
      latest = (await response.json()) as Prediction;
    }
    return latest;
  }

  // Stamped with the model on every exit, failures included. A failed item was
  // billed to a model too, and a journal that recorded the producer only on
  // success cannot explain a run whose failures all came from one model and
  // whose successes came from another — which is the question the provenance
  // gate asks of every shipped image.
  async runItem(item: JobItem): Promise<ItemResult> {
    const result = await this.generate(item);
    return { ...result, producer: this.options.model };
  }

  private async generate(item: JobItem): Promise<ItemResult> {
    const prompt = typeof item.payload.prompt === "string" ? item.payload.prompt : undefined;
    if (!prompt) {
      return { itemId: item.id, status: "failed", spendUsd: 0, error: "image item carried no prompt" };
    }

    let lastError = "unknown error";
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Awaited<ReturnType<ReplicateFetch>>;
      try {
        const request = predictionRequest(this.options.model, { prompt, ...this.options.input });
        response = await this.options.fetchImpl(request.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.options.apiToken}`,
            "Content-Type": "application/json",
            // Blocks until the prediction finishes, when it can. It is a
            // best-effort hint rather than a promise, so `settle` follows
            // anything still running when it returns.
            Prefer: "wait",
          },
          body: request.body,
        });
      } catch (err) {
        lastError = `network error: ${err instanceof Error ? err.message : String(err)}`;
        if (attempt < this.maxAttempts) {
          await sleep(backoffMs(this.retryDelayMs, attempt, undefined));
          continue;
        }
        return { itemId: item.id, status: "failed", spendUsd: 0, error: `${lastError} (${attempt} attempt(s))` };
      }

      if (!response.ok) {
        lastError = `replicate request failed (HTTP ${response.status})`;
        const transient = response.status >= 500 || response.status === 429;
        if (transient && attempt < this.maxAttempts) {
          await sleep(backoffMs(this.retryDelayMs, attempt, response.headers?.get("retry-after")));
          continue;
        }
        return {
          itemId: item.id,
          status: "failed",
          spendUsd: 0,
          error: transient ? `${lastError} (${attempt} attempt(s))` : lastError,
        };
      }

      // The model ran, so it was billed — every exit below reports the cost.
      const spendUsd = this.options.costPerImageUsd;
      const prediction = await this.settle((await response.json()) as Prediction);
      if (prediction.status !== "succeeded") {
        const detail = typeof prediction.error === "string" ? prediction.error : (prediction.status ?? "no status");
        // A prediction still running when the poll budget expired is not a
        // dead end — it is compute this run paid for and can still collect.
        // Naming its id is what lets that happen instead of re-buying it.
        const unfinished = !TERMINAL_STATUSES.has(prediction.status ?? "");
        const trace = unfinished && prediction.id ? ` — still running as ${prediction.id}, collect it rather than re-running` : "";
        return { itemId: item.id, status: "failed", spendUsd, error: `prediction did not succeed: ${detail}${trace}` };
      }

      const url = firstUrl(prediction.output);
      if (!url) {
        return { itemId: item.id, status: "failed", spendUsd, error: "prediction carried no image URL" };
      }

      let bytes: Buffer;
      let declaredType: string | null | undefined;
      try {
        const download = await this.options.fetchImpl(url, { method: "GET" });
        if (!download.ok) {
          return { itemId: item.id, status: "failed", spendUsd, error: `could not download image (HTTP ${download.status})` };
        }
        declaredType = download.headers?.get("content-type");
        bytes = Buffer.from(await download.arrayBuffer());
      } catch (err) {
        return {
          itemId: item.id,
          status: "failed",
          spendUsd,
          error: `could not download image: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      const mimeType = sniffMime(bytes, declaredType, url);
      if (!mimeType) {
        return { itemId: item.id, status: "failed", spendUsd, error: "downloaded bytes are not an image format the catalogue ships" };
      }

      const filePath = path.join(this.options.outputDir, `${item.id}.${EXTENSION_FOR_MIME[mimeType]}`);
      try {
        await mkdir(this.options.outputDir, { recursive: true });
        await writeFile(filePath, bytes);
      } catch (err) {
        return {
          itemId: item.id,
          status: "failed",
          spendUsd,
          error: `could not write image: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      let stored: { filePath: string; bytes: number; mimeType: string } = {
        filePath,
        bytes: bytes.byteLength,
        mimeType,
      };
      if (this.options.normalize) {
        let normalized;
        try {
          normalized = await this.options.normalize(filePath);
        } catch (err) {
          return {
            itemId: item.id,
            status: "failed",
            spendUsd,
            error: `could not normalize image: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
        if (!normalized) {
          return { itemId: item.id, status: "failed", spendUsd, error: "could not normalize image" };
        }
        stored = normalized;
      }

      const output: GeneratedImage = {
        itemId: item.id,
        filePath: stored.filePath,
        bytes: stored.bytes,
        model: this.options.model,
        costUsd: spendUsd,
        mimeType: stored.mimeType,
        prompt,
      };
      return { itemId: item.id, status: "done", spendUsd, output };
    }

    return { itemId: item.id, status: "failed", spendUsd: 0, error: lastError };
  }
}
