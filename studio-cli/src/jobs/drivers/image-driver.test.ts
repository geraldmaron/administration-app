import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ImageDriver, type ImageFetch } from "./image-driver.js";

// A minimal but real WebP byte string, so what the driver writes can be read
// back and checked rather than assumed.
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x20, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
  Buffer.alloc(20, 0x42),
]);

const dataUri = (mime = "image/webp", bytes = WEBP) => `data:${mime};base64,${bytes.toString("base64")}`;

const okResponse = (uri: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { images: [{ image_url: { url: uri } }] } }] }),
});

let outputDir: string;

beforeEach(async () => {
  outputDir = await mkdtemp(path.join(tmpdir(), "image-driver-"));
});

afterEach(async () => {
  await rm(outputDir, { recursive: true, force: true });
});

const driverWith = (fetchImpl: ImageFetch, costPerImageUsd = 0.03) =>
  new ImageDriver({
    apiKey: "test-key",
    model: "test/model",
    fetchImpl,
    outputDir,
    costPerImageUsd,
    maxAttempts: 2,
    retryDelayMs: 0,
  });

const item = { id: "europe_m_senior_ceremonial_01", payload: { prompt: "an official portrait" } };

describe("the image driver", () => {
  it("writes the image to disk and reports what it made", async () => {
    const result = await driverWith(async () => okResponse(dataUri())).runItem(item);

    expect(result.status).toBe("done");
    expect(result.spendUsd).toBe(0.03);
    const output = result.output as { filePath: string; bytes: number; mimeType: string };
    expect(output.mimeType).toBe("image/webp");
    expect(output.bytes).toBe(WEBP.byteLength);
    await expect(readFile(output.filePath)).resolves.toEqual(WEBP);
    expect(path.basename(output.filePath)).toBe(`${item.id}.webp`);
  });

  it("refuses an item with no prompt rather than billing for a guess", async () => {
    let called = false;
    const result = await driverWith(async () => {
      called = true;
      return okResponse(dataUri());
    }).runItem({ id: "x", payload: {} });

    expect(result.status).toBe("failed");
    expect(result.spendUsd).toBe(0);
    expect(called).toBe(false);
  });

  // A job resumes by id across runs and nothing forces a resumed run to name
  // the same model, so the journal has to be able to say what made each item.
  it("names the model that produced the item, on success and on failure alike", async () => {
    const made = await driverWith(async () => okResponse(dataUri())).runItem(item);
    expect(made.producer).toBe("test/model");

    const refused = await driverWith(async () => ({ ok: false, status: 400, json: async () => ({}) })).runItem(item);
    expect(refused.status).toBe("failed");
    expect(refused.producer).toBe("test/model");
  });

  // The distinction the ledger depends on: a request that was served was
  // billed, whatever came back in it.
  it("reports the cost of a served request even when the image is unusable", async () => {
    const noImage = await driverWith(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "I cannot do that" } }] }),
    })).runItem(item);
    expect(noImage.status).toBe("failed");
    expect(noImage.spendUsd).toBe(0.03);
    expect(noImage.error).toContain("no image");

    const notDataUri = await driverWith(async () => okResponse("https://example.com/portrait.webp")).runItem(item);
    expect(notDataUri.status).toBe("failed");
    expect(notDataUri.spendUsd).toBe(0.03);

    const wrongType = await driverWith(async () => okResponse(dataUri("image/gif"))).runItem(item);
    expect(wrongType.status).toBe("failed");
    expect(wrongType.spendUsd).toBe(0.03);
    expect(wrongType.error).toContain("unsupported");
  });

  it("charges nothing for a request that was never served", async () => {
    const refused = await driverWith(async () => ({
      ok: false,
      status: 400,
      json: async () => ({}),
    })).runItem(item);
    expect(refused.status).toBe("failed");
    expect(refused.spendUsd).toBe(0);
  });

  // Every image model returns something far larger than the catalogue ships —
  // 1024x1024 PNG at over a megabyte is typical. Normalizing after the driver
  // instead of inside it means the gate rejects the batch, nothing is
  // journaled done, and the next run pays for all of it a second time.
  describe("normalization, which happens before the gate can see the result", () => {
    it("reports what normalization produced, not what the model returned", async () => {
      const result = await new ImageDriver({
        apiKey: "test-key",
        model: "test/model",
        fetchImpl: async () => okResponse(dataUri("image/png", Buffer.alloc(1_200_000, 0x11))),
        outputDir,
        costPerImageUsd: 0.02,
        normalize: async (source) => ({
          filePath: source.replace(/\.png$/, ".webp"),
          bytes: 28_000,
          mimeType: "image/webp",
        }),
      }).runItem(item);

      expect(result.status).toBe("done");
      const output = result.output as { bytes: number; mimeType: string; filePath: string };
      expect(output.mimeType).toBe("image/webp");
      expect(output.bytes).toBe(28_000);
      expect(output.filePath).toMatch(/\.webp$/);
    });

    it("fails the item, still billed, when the image cannot reach the standard", async () => {
      const result = await new ImageDriver({
        apiKey: "test-key",
        model: "test/model",
        fetchImpl: async () => okResponse(dataUri()),
        outputDir,
        costPerImageUsd: 0.02,
        normalize: async () => undefined,
      }).runItem(item);

      expect(result.status).toBe("failed");
      expect(result.spendUsd).toBe(0.02);
      expect(result.error).toContain("size ceiling");
    });
  });

  it("retries a rate limit and a server error, but not a rejection", async () => {
    let calls = 0;
    const rateLimited = await driverWith(async () => {
      calls += 1;
      return calls === 1 ? { ok: false, status: 429, json: async () => ({}) } : okResponse(dataUri());
    }).runItem(item);
    expect(rateLimited.status).toBe("done");
    expect(calls).toBe(2);

    let badRequests = 0;
    await driverWith(async () => {
      badRequests += 1;
      return { ok: false, status: 400, json: async () => ({}) };
    }).runItem(item);
    expect(badRequests, "a 400 is not retried — the same request fails the same way").toBe(1);
  });
});
