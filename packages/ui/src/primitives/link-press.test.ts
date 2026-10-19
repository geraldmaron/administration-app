import { afterEach, describe, expect, it } from "vitest";
import { anchorHref, configureLinkBase } from "./link-press";

describe("anchorHref", () => {
  afterEach(() => configureLinkBase(""));

  it("leaves routes alone when the app is served at the root", () => {
    expect(anchorHref("/nation")).toBe("/nation");
  });

  it("prefixes app routes with the configured subpath", () => {
    configureLinkBase("/administration-app/");
    expect(anchorHref("/nation?view=map")).toBe("/administration-app/nation?view=map");
  });

  it("never prefixes relative, protocol-relative or absolute URLs", () => {
    configureLinkBase("/administration-app");
    expect(anchorHref("nation")).toBe("nation");
    expect(anchorHref("//example.com/x")).toBe("//example.com/x");
    expect(anchorHref("https://example.com/x")).toBe("https://example.com/x");
  });
});
