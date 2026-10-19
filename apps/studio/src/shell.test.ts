import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { shell } from "../view.mjs";

describe("the console frame", () => {
  it("renders the rail with no sign-in indicator, since the console has no auth gate", () => {
    const html = shell("Overview", "<p>body</p>");
    expect(html).toContain('<aside class="rail"');
    expect(html).not.toContain("Unauthenticated");
    expect(html).not.toContain('action="/logout"');
  });

  it("drops the rail on a chromeless page, because every link would bounce back", () => {
    const html = shell("Sign in", "<p>body</p>", { chromeless: true });
    expect(html).not.toContain('<aside class="rail"');
    expect(html).not.toContain('class="navlink');
  });
});
