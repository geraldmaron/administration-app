import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSave } from "@admin/engine";
import { sha256Hex } from "./sha256.js";
import { sealedCampaign } from "@admin/content";

// The only property worth testing: this agrees with the server. The service
// computes its checksum with node:crypto, so node:crypto is the oracle, and
// every case here is one where a hand-rolled digest plausibly diverges.
const nodeDigest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

describe("the client-side save digest", () => {
  it("matches node:crypto on the empty string, which is the classic off-by-one in the padding", () => {
    expect(sha256Hex("")).toBe(nodeDigest(""));
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("matches across every block boundary, where the length word moves into its own block", () => {
    // 55 fits with the length; 56 forces a second block; 64 is exactly full.
    for (const length of [1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000]) {
      const body = "a".repeat(length);
      expect(sha256Hex(body), `length ${length}`).toBe(nodeDigest(body));
    }
  });

  it("matches on multi-byte characters, because a leader's name is the ordinary case", () => {
    for (const body of ["Aleyna Milutin", "Zoë Ó Súilleabháin", "北京", "Ω≈ç√", "🇲🇦 flag", "é"]) {
      expect(sha256Hex(body), body).toBe(nodeDigest(body));
    }
  });

  it("matches on a real serialized campaign, which is what it is actually for", () => {
    const body = JSON.stringify(createSave(sealedCampaign("digest-check")));
    expect(body.length).toBeGreaterThan(1000);
    expect(sha256Hex(body)).toBe(nodeDigest(body));
  });

  it("changes when any byte of the body changes", () => {
    const body = JSON.stringify(createSave(sealedCampaign("digest-check")));
    expect(sha256Hex(body)).not.toBe(sha256Hex(`${body} `));
  });
});
