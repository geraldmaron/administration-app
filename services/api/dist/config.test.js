import { describe, it, expect } from "vitest";
import { MissingConfigError, optionalEnv, requireEnv } from "./config.js";
import { verifiersFromEnv } from "./entitlements/config.js";
describe("configuration comes from the environment and is never defaulted", () => {
    it("a missing or blank variable throws, naming the variable and why it is needed", () => {
        expect(() => requireEnv({}, "A_REQUIRED_SECRET", "receipt verification")).toThrow(MissingConfigError);
        expect(() => requireEnv({ A_REQUIRED_SECRET: "  " }, "A_REQUIRED_SECRET", "x")).toThrow(/A_REQUIRED_SECRET/);
        expect(requireEnv({ A_REQUIRED_SECRET: "value" }, "A_REQUIRED_SECRET", "x")).toBe("value");
        expect(optionalEnv({ A: "" }, "A")).toBeUndefined();
    });
    it("no store is configured by default, so nothing verifies by accident", () => {
        expect(verifiersFromEnv({})).toEqual([]);
    });
});
