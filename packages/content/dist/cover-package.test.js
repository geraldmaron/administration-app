import { describe, expect, it } from "vitest";
import { COVER_BRIEF_HELPERS, COVER_RECIPES, HOUSE_LOCK_CITE, judgeCoverPackage, plateLooksLikeRefusedStock, publishCoverPackage, } from "./cover-package.js";
const catalog = {
    locks: [{ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg", scanPresent: true }],
};
const valid = () => ({
    brief: {
        situation: "A harbor master waiting on a convoy that will not clear.",
        metaphor: "A cracked teacup balanced on a folded sea chart.",
        refuse: "Handshake in front of flags",
    },
    recipe: "object-as-metaphor",
    plate: { assetPath: "plate.png", lockCite: HOUSE_LOCK_CITE },
    kicker: "Week 4",
    headline: "The ministry confirms the shipment was turned back at the border.",
});
describe("CoverPackage helpers", () => {
    it("keeps Content's three brief helper lines verbatim", () => {
        expect(COVER_BRIEF_HELPERS.situation).toBe("who is this for, and what are they stuck in? A person, not a topic.");
        expect(COVER_BRIEF_HELPERS.metaphor).toBe("the picture that asks the question. If you can google it, start over.");
        expect(COVER_BRIEF_HELPERS.refuse).toBe("name the stock photo so we don't ship it.");
    });
    it("closes the recipe list on the four house covers", () => {
        expect(COVER_RECIPES).toEqual(["object-as-metaphor", "scene", "character", "doodle-diagram"]);
    });
});
describe("the fail-closed cover gate", () => {
    it("accepts a complete package drawn against a scanned lock", () => {
        const judgment = judgeCoverPackage(valid(), catalog);
        expect(judgment.ok).toBe(true);
        if (judgment.ok)
            expect(judgment.package.plate.lockCite).toBe(HOUSE_LOCK_CITE);
    });
    it("refuses when any brief field is missing", () => {
        for (const field of ["situation", "metaphor", "refuse"]) {
            const input = { ...valid(), brief: { ...valid().brief, [field]: "  " } };
            const judgment = judgeCoverPackage(input, catalog);
            expect(judgment.ok, field).toBe(false);
            if (!judgment.ok) {
                expect(judgment.findings.some((finding) => finding.field === `brief.${field}`), field).toBe(true);
            }
        }
    });
    it("refuses an open recipe or a missing one", () => {
        expect(judgeCoverPackage({ ...valid(), recipe: "stock-hero" }, catalog).ok).toBe(false);
        expect(judgeCoverPackage({ ...valid(), recipe: "" }, catalog).ok).toBe(false);
    });
    it("refuses a plate that could be a stock photo — no lock citation", () => {
        const judgment = judgeCoverPackage({ ...valid(), plate: { assetPath: "plate.png" } }, catalog);
        expect(judgment.ok).toBe(false);
        if (!judgment.ok) {
            expect(judgment.findings.map((finding) => finding.code)).toContain("missing-lock-cite");
        }
    });
    it("refuses a plate that cites a lock whose scan is not on disk", () => {
        const emptyLock = {
            locks: [{ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg", scanPresent: false }],
        };
        const judgment = judgeCoverPackage(valid(), emptyLock);
        expect(judgment.ok).toBe(false);
        if (!judgment.ok) {
            expect(judgment.findings.map((finding) => finding.code)).toContain("lock-scan-absent");
        }
    });
    it("refuses a plate that is the stock photo named in refuse", () => {
        const input = {
            ...valid(),
            brief: {
                ...valid().brief,
                metaphor: "Handshake in front of flags",
                refuse: "handshake in front of flags",
            },
        };
        const judgment = judgeCoverPackage(input, catalog);
        expect(judgment.ok).toBe(false);
        if (!judgment.ok) {
            expect(judgment.findings.map((finding) => finding.code)).toContain("refuse-match");
        }
    });
    it("refuses a missing plate, kicker, or headline", () => {
        expect(judgeCoverPackage({ ...valid(), plate: { lockCite: HOUSE_LOCK_CITE } }, catalog).ok).toBe(false);
        expect(judgeCoverPackage({ ...valid(), kicker: "" }, catalog).ok).toBe(false);
        expect(judgeCoverPackage({ ...valid(), headline: " " }, catalog).ok).toBe(false);
    });
    it("does not publish a refused package", () => {
        const published = publishCoverPackage({ ...valid(), kicker: "" }, catalog);
        expect(published.ok).toBe(false);
    });
    it("publishes only when the judgment is clean", () => {
        const published = publishCoverPackage(valid(), catalog);
        expect(published.ok).toBe(true);
    });
});
describe("the refuse check", () => {
    it("treats the named stock photo as the picture we must not ship", () => {
        expect(plateLooksLikeRefusedStock("handshake in front of flags", "a minister", "Handshake in front of flags")).toBe(true);
    });
    it("lets a distinct metaphor stand next to a named cliché", () => {
        expect(plateLooksLikeRefusedStock("A cracked teacup balanced on a folded sea chart.", "A harbor master waiting on a convoy that will not clear.", "Handshake in front of flags")).toBe(false);
    });
});
