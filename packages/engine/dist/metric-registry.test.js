import { describe, expect, it } from "vitest";
import { CORE_METRIC_NODE_IDS, METRIC_REGISTRY, metricChildren, metricNode, metricParents, } from "./metric-registry.js";
import { OPINION_WEIGHTS } from "./opinion.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
describe("METRIC_REGISTRY integrity", () => {
    it("every parent and child id resolves to a node", () => {
        for (const node of METRIC_REGISTRY) {
            for (const parentId of node.parents) {
                expect(metricNode(parentId), `${node.id} parent ${parentId}`).toBeDefined();
            }
            for (const childId of node.children) {
                expect(metricNode(childId), `${node.id} child ${childId}`).toBeDefined();
            }
        }
    });
    it("OPINION_WEIGHTS keys map to children of approval", () => {
        const approval = metricNode("approval");
        expect(approval).toBeDefined();
        const childIds = new Set(approval.children);
        for (const key of Object.keys(OPINION_WEIGHTS)) {
            expect(childIds.has(key), `approval child ${key}`).toBe(true);
        }
    });
    it("has no orphan nodes in the core set", () => {
        const core = new Set(CORE_METRIC_NODE_IDS);
        for (const id of CORE_METRIC_NODE_IDS) {
            const node = metricNode(id);
            expect(node, `core node ${id}`).toBeDefined();
            const linked = new Set([...node.parents, ...node.children].filter((linkedId) => core.has(linkedId)));
            expect(linked.size, `orphan core node ${id}`).toBeGreaterThan(0);
        }
    });
});
describe("METRIC_REGISTRY kinds and fields", () => {
    it("gives every leaf node a quantity kind", () => {
        const unkinded = METRIC_REGISTRY.filter((node) => node.children.length === 0 && node.kind === undefined).map((node) => node.id);
        expect(unkinded).toEqual([]);
    });
    // The field is what the registry report walks; a field the campaign does not
    // keep would report a node as having no readers when it has no storage.
    it("names only fields the campaign actually keeps", () => {
        const { player } = buildCampaign();
        const stored = { MetricSet: player.metrics, PublicMood: player.opinion };
        for (const node of METRIC_REGISTRY) {
            if (!node.field)
                continue;
            const [type, key] = node.field.split(".");
            expect(key in stored[type], `${node.id} -> ${node.field}`).toBe(true);
        }
    });
});
describe("metric registry selectors", () => {
    it("metricChildren and metricParents agree with node links", () => {
        const treasuryHealth = metricNode("treasuryHealth");
        expect(treasuryHealth).toBeDefined();
        // Treasury health hangs off the judgment it actually moves — what the
        // public makes of public services — not off a composite above it.
        expect(metricParents("treasuryHealth").map((node) => node.id).sort()).toEqual(["services", "treasury"]);
        expect(metricChildren("treasury").map((node) => node.id)).toEqual(["treasuryHealth"]);
    });
});
