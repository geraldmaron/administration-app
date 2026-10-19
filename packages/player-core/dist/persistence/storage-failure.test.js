import { describe, expect, it } from "vitest";
import { playerFacingStorageFailure, sealStorageFailureReason } from "./storage-failure";
describe("storage failure copy", () => {
    it("never prints a raw setItem quota stack to the player", () => {
        const raw = "Failed to execute 'setItem' on 'Storage': Setting the value of 'administration.campaignPayload.v1:campaign-x#5' exceeded the quota.";
        const facing = playerFacingStorageFailure(new DOMException(raw, "QuotaExceededError"));
        expect(facing).toBe("This device is out of storage space, so your game wasn't saved. Free up some space and try again.");
        expect(facing.toLowerCase()).not.toContain("setitem");
    });
    it("gives the seal a lowercase embeddable sentence", () => {
        expect(sealStorageFailureReason(new Error("QuotaExceededError"))).toMatch(/^this device/);
    });
});
