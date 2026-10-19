import { describe, it, expect } from "vitest";
import type { ReceiptVerification } from "@admin/contracts";
import { attempt, parseJson } from "./types.js";

// What every storefront verifier inherits from the port: a fault on the way to
// the store is `unavailable`, which never grants and never revokes, and never
// `invalid`, which would tell a paying player their purchase was refused.
describe("the verifier port", () => {
  it("a network fault is unavailable, never invalid, and names the platform", async () => {
    const result = await attempt("steam", async () => {
      throw new Error("ETIMEDOUT");
    });
    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") return;
    expect(result.reason).toContain("steam");
    expect(result.reason).toContain("ETIMEDOUT");
  });

  it("a malformed store response is unavailable rather than an unhandled throw", async () => {
    for (const body of ["not json", "null", "42", '"text"']) {
      const result = await attempt("steam", async () => {
        parseJson(body);
        return { status: "invalid", reason: "unreachable" };
      });
      expect(result.status).toBe("unavailable");
    }
  });

  it("a store's own answer passes through unchanged", async () => {
    const invalid: ReceiptVerification = { status: "invalid", reason: "not owned" };
    expect(await attempt("steam", async () => invalid)).toEqual(invalid);
    expect(parseJson('{"ok":true}')).toEqual({ ok: true });
  });
});
