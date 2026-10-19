import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM beside the dev server.
import { parseFormBody, plateExtension } from "../article-form-body.mjs";

describe("the cover form body", () => {
  it("reads a urlencoded post the way the rest of studio does", () => {
    const raw = Buffer.from("situation=a+person&recipe=scene&intent=save");
    const parsed = parseFormBody({ headers: { "content-type": "application/x-www-form-urlencoded" } }, raw);
    expect(parsed.fields.situation).toBe("a person");
    expect(parsed.file).toBeUndefined();
  });

  it("pulls a plate out of a multipart post", () => {
    const body = [
      "--bound",
      'Content-Disposition: form-data; name="kicker"',
      "",
      "Week 4",
      "--bound",
      'Content-Disposition: form-data; name="plate"; filename="cover.png"',
      "Content-Type: image/png",
      "",
      "PNG",
      "--bound--",
      "",
    ].join("\r\n");
    const parsed = parseFormBody({ headers: { "content-type": "multipart/form-data; boundary=bound" } }, Buffer.from(body));
    expect(parsed.fields.kicker).toBe("Week 4");
    expect(parsed.file?.filename).toBe("cover.png");
    expect(plateExtension(parsed.file)).toBe(".png");
  });
});
