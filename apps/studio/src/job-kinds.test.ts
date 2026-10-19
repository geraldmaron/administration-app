import { describe, expect, it } from "vitest";
import { GATED_JOB_KINDS } from "@admin/studio-cli/dist/jobs/gate.js";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { kindFor } from "../job-kinds.mjs";

describe("the runs page", () => {
  it("has a descriptor for every job kind the harness gates, so no run is hidden", () => {
    for (const kind of GATED_JOB_KINDS) expect(() => kindFor({ id: "probe", kind })).not.toThrow();
  });
});
