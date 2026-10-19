import { describe, it, expect } from "vitest";
import * as content from "./index.js";

describe("@admin/content smoke", () => {
  it("package scaffold loads", () => {
    expect(true).toBe(true);
  });

  it("does not export the Node lock loader on the player barrel", () => {
    expect(content).not.toHaveProperty("loadCoverLocks");
  });
});
