import { describe, it, expect, vi } from "vitest";
import { FIXTURE_SCENARIOS } from "@admin/content";
import { OpenRouterDriver, estimateItemWorstCaseUsd } from "./openrouter-driver.js";
const VALID_SCENARIO = FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-border-reading");
function okResponse(content, usage) {
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }], usage }) };
}
describe("OpenRouterDriver", () => {
    it("succeeds and estimates spend from token usage", async () => {
        const fetchImpl = vi.fn(async () => okResponse([VALID_SCENARIO], { prompt_tokens: 500, completion_tokens: 500 }));
        const driver = new OpenRouterDriver({ apiKey: "key", models: { default: "model-a" }, fetchImpl });
        const result = await driver.runItem({ id: "item-1", payload: { prompt: "write a scenario" } });
        expect(result.status).toBe("done");
        expect(result.spendUsd).toBeCloseTo(0.01, 5); // 1000 tokens @ $0.01/1k
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const call = fetchImpl.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body).toEqual({ model: "model-a", messages: [{ role: "user", content: "write a scenario" }] });
    });
    it("picks the per-stage model over the default when the item names a stage", async () => {
        const fetchImpl = vi.fn(async () => okResponse([VALID_SCENARIO]));
        const driver = new OpenRouterDriver({
            apiKey: "key",
            models: { default: "model-default", perStage: { draft: "model-draft" } },
            fetchImpl,
        });
        await driver.runItem({ id: "item-1", payload: {}, stage: "draft" });
        await driver.runItem({ id: "item-2", payload: {}, stage: "unmapped-stage" });
        await driver.runItem({ id: "item-3", payload: {} });
        const models = fetchImpl.mock.calls.map((call) => JSON.parse(call[1].body).model);
        expect(models).toEqual(["model-draft", "model-default", "model-default"]);
    });
    it("retries a transient network error and succeeds once it clears", async () => {
        let calls = 0;
        const fetchImpl = vi.fn(async () => {
            calls += 1;
            if (calls < 3)
                throw new Error("ECONNRESET");
            return okResponse([VALID_SCENARIO]);
        });
        const driver = new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl, retryDelayMs: 0 });
        const result = await driver.runItem({ id: "item-1", payload: {} });
        expect(result.status).toBe("done");
        expect(calls).toBe(3);
    });
    it("retries HTTP 5xx but not HTTP 4xx", async () => {
        const serverError = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
        const serverDriver = new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl: serverError, maxAttempts: 3, retryDelayMs: 0 });
        const serverResult = await serverDriver.runItem({ id: "item-1", payload: {} });
        expect(serverResult.status).toBe("failed");
        expect(serverError).toHaveBeenCalledTimes(3);
        const clientError = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
        const clientDriver = new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl: clientError, maxAttempts: 3, retryDelayMs: 0 });
        const clientResult = await clientDriver.runItem({ id: "item-1", payload: {} });
        expect(clientResult.status).toBe("failed");
        expect(clientError).toHaveBeenCalledTimes(1); // no point retrying an auth failure with the same key
    });
    it("reports a permanently failing item rather than dropping it silently", async () => {
        const fetchImpl = vi.fn(async () => {
            throw new Error("timeout");
        });
        const driver = new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl, maxAttempts: 2, retryDelayMs: 0 });
        const result = await driver.runItem({ id: "item-1", payload: {} });
        expect(result.status).toBe("failed");
        expect(result.error).toContain("timeout");
        expect(result.error).toContain("2 attempt");
    });
    it("does not retry a content failure — a bad response is not fixed by asking again", async () => {
        const fetchImpl = vi.fn(async () => okResponse([{ id: "not-a-real-scenario" }]));
        const driver = new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl, maxAttempts: 3, retryDelayMs: 0 });
        const result = await driver.runItem({ id: "item-1", payload: {} });
        expect(result.status).toBe("failed");
        expect(fetchImpl).toHaveBeenCalledTimes(1); // one call, not three — content failures need a different prompt, not a retry
    });
    it("fails cleanly when the model returns unparseable JSON", async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: "not json" } }] }),
        }));
        const driver = new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl });
        const result = await driver.runItem({ id: "item-1", payload: {} });
        expect(result.status).toBe("failed");
        expect(result.error).toContain("unparseable JSON");
    });
    // The money goes out on the request and the parse happens on the way back, so
    // a formatting habit on the model's side is paid for in full before it is
    // discovered. The first real unattended run lost $0.57 to exactly the shape
    // in the first test here and produced nothing.
    describe("a response wrapped in a markdown fence", () => {
        const fenced = (raw) => ({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: raw } }], usage: { prompt_tokens: 10, completion_tokens: 10 } }),
        });
        const run = (raw) => {
            const fetchImpl = vi.fn(async () => fenced(raw));
            return new OpenRouterDriver({ apiKey: "key", models: { default: "m" }, fetchImpl }).runItem({ id: "item-1", payload: {} });
        };
        const body = JSON.stringify([VALID_SCENARIO], null, 2);
        it("unwraps a ```json fence — the exact shape that failed in production", async () => {
            const result = await run("```json\n" + body + "\n```");
            expect(result.status).toBe("done");
        });
        it("unwraps a bare fence with no language tag", async () => {
            expect((await run("```\n" + body + "\n```")).status).toBe("done");
        });
        it("tolerates whitespace around the fence", async () => {
            expect((await run("\n\n```json\n" + body + "\n```\n\n")).status).toBe("done");
        });
        it("still takes an unfenced response the way it always did", async () => {
            expect((await run(body)).status).toBe("done");
        });
        // Leniency stops at the fence on purpose: prose around the payload is a
        // model that did not follow the brief, and the unattended path exists to
        // surface that rather than to paper over it.
        it("refuses commentary around the payload rather than scraping it out", async () => {
            const result = await run("Here is the array you asked for:\n\n" + body);
            expect(result.status).toBe("failed");
            expect(result.error).toContain("unparseable JSON");
        });
        it("reports the inner error when the fence comes off and the contents are still bad", async () => {
            const result = await run("```json\n{ not json at all }\n```");
            expect(result.status).toBe("failed");
            expect(result.error).toContain("inside a code fence");
        });
        // The spend is journaled whatever the outcome: tokens were burned either
        // way, and a failure that reports zero teaches the ledger to under-count.
        it("journals the spend even when the parse fails", async () => {
            const result = await run("```json\n{ not json at all }\n```");
            expect(result.spendUsd).toBeGreaterThan(0);
        });
    });
    // The spend gate quoted a flat ten cents an item regardless of prompt size,
    // and the first real run — a 65,000-character brief — cost more than five
    // times that. An authorization is a statement of terms; one that names a
    // fifth of the price is not a gate.
    describe("what the gate quotes before spending", () => {
        it("scales with the prompt actually being sent", () => {
            const small = estimateItemWorstCaseUsd("write a scenario");
            const real = estimateItemWorstCaseUsd("x".repeat(65_000));
            expect(real).toBeGreaterThan(small);
        });
        it("quotes at least what the first real run actually cost", () => {
            // That run billed 56,580 tokens at the ledger's own rate: $0.5658.
            expect(estimateItemWorstCaseUsd("x".repeat(65_000))).toBeGreaterThanOrEqual(0.5658);
        });
        it("beats the flat constant it replaced on a real brief", () => {
            const FLAT_CONSTANT_IT_REPLACED = 0.1;
            expect(estimateItemWorstCaseUsd("x".repeat(65_000))).toBeGreaterThan(FLAT_CONSTANT_IT_REPLACED);
        });
    });
});
