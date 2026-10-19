import { describe, expect, it } from "vitest";
import { CUE_REQUIRED_ROLES, EXCLUSIVE_LANES, SEMANTIC_ROLE_CONTRACT, SEMANTIC_ROLE_IDS, VALID_SHARED_HEX_PAIRS, isValidSharedHexPair, rolePaint, stanceRoleInk, } from "./semantic-roles.js";
const EXPECTED_ROLES = [
    "interactive",
    "selected",
    "focus",
    "favorable",
    "caution",
    "adverse",
    "destructive",
    "informational",
    "democratic",
    "republican",
    "independent",
    "institutional",
    "classified",
    "playerOwned",
    "disabled",
    "muted",
];
// The return type carries the narrowing the predicate performs. Annotating it
// as SemanticRoleContract[] widens hex back to string | null, and every caller
// then has to re-prove a fact the filter already established.
function exclusiveRoles() {
    return SEMANTIC_ROLE_CONTRACT.filter((role) => EXCLUSIVE_LANES.includes(role.lane) && role.hex !== null);
}
describe("semantic role contract", () => {
    it("enumerates every AC role exactly once", () => {
        expect([...SEMANTIC_ROLE_IDS].sort()).toEqual([...EXPECTED_ROLES].sort());
        expect(new Set(SEMANTIC_ROLE_IDS).size).toBe(SEMANTIC_ROLE_IDS.length);
    });
    it("declares the valid shared-hex pairs used by the exclusivity audit", () => {
        expect(VALID_SHARED_HEX_PAIRS).toEqual([["interactive", "selected"]]);
        for (const [a, b] of VALID_SHARED_HEX_PAIRS) {
            expect(SEMANTIC_ROLE_IDS).toContain(a);
            expect(SEMANTIC_ROLE_IDS).toContain(b);
            expect(isValidSharedHexPair(a, b)).toBe(true);
        }
    });
    it("fails when one hex serves unrelated danger / interaction / party meanings", () => {
        const byHex = new Map();
        for (const role of exclusiveRoles()) {
            const group = byHex.get(role.hex) ?? [];
            group.push(role);
            byHex.set(role.hex, group);
        }
        const collisions = [];
        for (const [hex, roles] of byHex) {
            if (roles.length < 2)
                continue;
            for (let i = 0; i < roles.length; i += 1) {
                for (let j = i + 1; j < roles.length; j += 1) {
                    const left = roles[i];
                    const right = roles[j];
                    if (left.lane === right.lane && isValidSharedHexPair(left.id, right.id)) {
                        continue;
                    }
                    if (left.lane !== right.lane) {
                        collisions.push(`${hex}: ${left.id} (${left.lane}) vs ${right.id} (${right.lane})`);
                    }
                }
            }
        }
        expect(collisions).toEqual([]);
    });
    it("requires a non-color cue for every interactive / state role in the table", () => {
        const missing = [];
        for (const role of SEMANTIC_ROLE_CONTRACT) {
            if (!CUE_REQUIRED_ROLES.has(role.id))
                continue;
            if (role.nonColorCues.length === 0) {
                missing.push(role.id);
            }
        }
        expect(missing).toEqual([]);
    });
    it("keeps the catalog fully mapped to live tokens", () => {
        const gaps = SEMANTIC_ROLE_CONTRACT.filter((role) => role.status === "gap");
        expect(gaps).toEqual([]);
    });
    it("keeps mapped roles on live tokens", () => {
        for (const role of SEMANTIC_ROLE_CONTRACT) {
            if (role.status !== "mapped")
                continue;
            expect(role.tokenPath).toBeTruthy();
            expect(role.hex).toBeTruthy();
            expect(role.hex.length).toBeGreaterThan(0);
        }
    });
    it("splits classified and player-owned off identity and institutional brass", () => {
        const classified = SEMANTIC_ROLE_CONTRACT.find((role) => role.id === "classified");
        const playerOwned = SEMANTIC_ROLE_CONTRACT.find((role) => role.id === "playerOwned");
        const institutional = SEMANTIC_ROLE_CONTRACT.find((role) => role.id === "institutional");
        const interactive = SEMANTIC_ROLE_CONTRACT.find((role) => role.id === "interactive");
        expect(classified.hex).not.toBe(institutional.hex);
        expect(classified.tokenPath).toBe("materials.classification.topSecret");
        expect(playerOwned.hex).not.toBe(institutional.hex);
        expect(playerOwned.tokenPath).toBe("color.mark.owned");
        expect(classified.hex).not.toBe(interactive.hex);
    });
    it("keeps focus on the interaction lane, not the accent preset", () => {
        const focus = SEMANTIC_ROLE_CONTRACT.find((role) => role.id === "focus");
        expect(focus.hex).toBe("#9BBFF8");
        expect(focus.lane).toBe("interaction");
    });
    it("exposes rolePaint and stanceRoleInk for consumer migration", () => {
        expect(rolePaint("focus")).toBe("#9BBFF8");
        expect(rolePaint("selected")).toBe(rolePaint("interactive"));
        expect(stanceRoleInk("favorable")).toBe(rolePaint("favorable"));
        expect(stanceRoleInk("adverse")).toBe(rolePaint("adverse"));
        expect(stanceRoleInk("neutral")).toBe("#9AA5B4");
    });
});
