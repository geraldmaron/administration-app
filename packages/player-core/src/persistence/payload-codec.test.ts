import { describe, expect, it } from "vitest";
import { createSave } from "@admin/engine";
import { COMPRESSED_PAYLOAD_MARKER, decodePayload, encodePayload } from "./payload-codec";
import { openingCampaign } from "../__fixtures__/opening";

describe("the stored payload", () => {
  it("comes back as exactly the JSON that went in", async () => {
    const json = JSON.stringify(createSave(openingCampaign()));
    const stored = await encodePayload(json);
    expect(stored.startsWith(COMPRESSED_PAYLOAD_MARKER)).toBe(true);
    expect(await decodePayload(stored)).toBe(json);
  });

  // The slot budget is the point: a campaign's JSON is mostly repeated keys.
  it("is several times smaller than the JSON it holds", async () => {
    const json = JSON.stringify(createSave(openingCampaign()));
    const stored = await encodePayload(json);
    expect(stored.length * 4).toBeLessThan(json.length);
  });

  it("reads a save written before compression as the plain JSON it is", async () => {
    const legacy = JSON.stringify({ schemaVersion: 1, campaign: { note: "written by an older build" } });
    expect(await decodePayload(legacy)).toBe(legacy);
  });

  it("keeps characters outside ASCII intact", async () => {
    const json = JSON.stringify({ name: "Zoë Ngũgĩ · São Tomé and Príncipe · Reykjavík" });
    expect(await decodePayload(await encodePayload(json))).toBe(json);
  });

  it("fails loudly on a damaged compressed payload rather than returning half a save", async () => {
    await expect(decodePayload(`${COMPRESSED_PAYLOAD_MARKER}bm90IGd6aXA=`)).rejects.toThrow();
  });
});
