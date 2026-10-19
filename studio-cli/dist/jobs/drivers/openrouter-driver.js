import { validateScenarioDocument } from "../../scenarios/validate.js";
// OpenRouter's own billing is the source of truth; this is a conservative
// estimate so the ledger reflects "money was spent" immediately rather than
// waiting on a reconciliation step that does not exist yet.
//
// Exported because the spend gate has to price a run in the same units the
// ledger will record it in. It priced one at a flat per-item guess instead, and
// the two disagreed by more than five times on the first real run.
export const FALLBACK_COST_PER_1K_TOKENS_USD = 0.01;
/**
 * The completion length a single scenario item is assumed to risk.
 *
 * Measured rather than guessed, and from one observation: the first real
 * unattended run billed 56,580 tokens against a 16,346-token prompt, so the
 * model returned roughly forty thousand. That is far more than four scenarios
 * of prose require, which is worth knowing on its own — but the number the
 * spend gate quotes has to be what a run can actually cost, not what the output
 * ought to weigh. Widen it when a second run disagrees; it is a ceiling for a
 * warning, not a budget to spend up to.
 */
export const ASSUMED_MAX_COMPLETION_TOKENS = 48_000;
/**
 * What one item may cost, priced off the prompt actually being sent.
 *
 * The prompt half is known exactly — it is a string in hand — and the
 * completion half is the assumption above. A flat per-item constant could not
 * see either, which is how a 65,000-character brief was authorized at the same
 * price as a one-line one.
 */
export function estimateItemWorstCaseUsd(prompt) {
    // Four characters to the token: rough, and the right direction of rough for
    // a ceiling, since English prose runs slightly under it.
    const promptTokens = prompt.length / 4;
    return ((promptTokens + ASSUMED_MAX_COMPLETION_TOKENS) / 1000) * FALLBACK_COST_PER_1K_TOKENS_USD;
}
function estimateSpend(usage) {
    const tokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
    return (tokens / 1000) * FALLBACK_COST_PER_1K_TOKENS_USD;
}
function sleep(ms) {
    if (ms <= 0)
        return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * A fenced code block's contents, if the whole response is one.
 *
 * The brief ends with "Return ONLY the JSON array. No commentary." and models
 * comply with the *content* of that while still wrapping it in a markdown
 * fence, which is a formatting habit rather than a refusal to follow the
 * instruction. Until this existed the driver called `JSON.parse` on the raw
 * string, so a fenced response failed as "unparseable JSON from model" — and
 * failed *after* the tokens were spent, since the money goes out on the request
 * and the parse happens on the way back. The first real unattended run lost
 * $0.57 to exactly this and produced nothing.
 *
 * Deliberately narrow. It unwraps a fence and nothing else: no scraping from
 * the first bracket to the last, no tolerance for prose around the payload.
 * Those would hide a genuine instruction-following failure, which is a thing
 * the operator needs to see rather than a thing the driver should paper over —
 * a model that will not return the shape it was asked for is a finding about
 * the model or the brief, and the whole point of the unattended path is to
 * learn that.
 */
function unfenced(content) {
    const match = /^\s*```[^\n]*\n([\s\S]*?)\n?```\s*$/.exec(content);
    return match?.[1];
}
/**
 * Parse a model response, allowing exactly one layer of markdown fence.
 *
 * Raw first, so a well-formed response takes the same path it always did and a
 * fence is never assumed where there is none.
 */
function parseModelJson(content) {
    try {
        return { ok: true, value: JSON.parse(content) };
    }
    catch (rawErr) {
        const inner = unfenced(content);
        if (inner === undefined) {
            return { ok: false, error: rawErr instanceof Error ? rawErr.message : String(rawErr) };
        }
        try {
            return { ok: true, value: JSON.parse(inner) };
        }
        catch (fencedErr) {
            // The fence came off and what was inside still did not parse, so report
            // that rather than the outer error — "unexpected token `" would send a
            // reader back to the fence they have already handled.
            return { ok: false, error: `inside a code fence: ${fencedErr instanceof Error ? fencedErr.message : String(fencedErr)}` };
        }
    }
}
// The unattended path: runs a job against OpenRouter with no
// session in the loop. Every generated document faces the same validator
// every other driver's output faces (session-driver.ts's identical rule) —
// today that is scenario content, the only job kind that exists.
export class OpenRouterDriver {
    options;
    name = "openrouter";
    maxAttempts;
    retryDelayMs;
    constructor(options) {
        this.options = options;
        this.maxAttempts = options.maxAttempts ?? 3;
        this.retryDelayMs = options.retryDelayMs ?? 1000;
    }
    modelFor(item) {
        const staged = item.stage ? this.options.models.perStage?.[item.stage] : undefined;
        return staged ?? this.options.models.default;
    }
    async runItem(item) {
        const model = this.modelFor(item);
        const prompt = typeof item.payload.prompt === "string" ? item.payload.prompt : JSON.stringify(item.payload);
        let lastError = "unknown error";
        for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
            let response;
            try {
                response = await this.options.fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
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
                lastError = `openrouter request failed (HTTP ${response.status})`;
                const transient = response.status >= 500;
                if (transient && attempt < this.maxAttempts) {
                    await sleep(this.retryDelayMs * attempt);
                    continue;
                }
                return { itemId: item.id, status: "failed", spendUsd: 0, error: transient ? `${lastError} (${attempt} attempt(s))` : lastError };
            }
            const body = (await response.json());
            const spendUsd = estimateSpend(body.usage);
            const content = body.choices?.[0]?.message?.content;
            if (typeof content !== "string") {
                return { itemId: item.id, status: "failed", spendUsd, error: "openrouter response carried no message content" };
            }
            const result = parseModelJson(content);
            if (!result.ok) {
                return { itemId: item.id, status: "failed", spendUsd, error: `unparseable JSON from model: ${result.error}` };
            }
            const parsed = result.value;
            const validation = validateScenarioDocument(item.id, parsed);
            if (!validation.ok) {
                const errors = validation.findings.filter((finding) => finding.severity === "error");
                const defectCount = validation.shapeErrors.length + errors.length;
                const reasons = [...validation.shapeErrors, ...errors.map((finding) => finding.message)].slice(0, 3).join("; ");
                return { itemId: item.id, status: "failed", spendUsd, error: `${defectCount} defect(s): ${reasons}` };
            }
            return { itemId: item.id, status: "done", spendUsd, output: parsed, warnings: validation.findings.length };
        }
        return { itemId: item.id, status: "failed", spendUsd: 0, error: lastError };
    }
}
