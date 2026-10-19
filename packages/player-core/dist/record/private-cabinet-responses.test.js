import { describe, expect, it } from "vitest";
import { apply } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { recordEntry, recordRows } from "./record-entry";
import { personDossier } from "../dossier/person-dossier";
describe("private cabinet response evidence", () => {
    it("never enters normal Record or dossier readings", () => {
        const opening = openingCampaign();
        const actor = Object.values(opening.player.cabinet)[0];
        const packet = { source: "simulate", actor: "world", turn: opening.turn, narration: { summary: "An official breaks publicly with the administration." }, provenance: { origin: "world", entities: [actor], systems: ["cabinet"] }, effects: [] };
        const ordinary = apply(opening, packet);
        const final = ordinary.ledger.at(-1);
        const privateEntry = { ...final, causal: { ...final.causal, internalDecisions: [{ question: "cabinet-break-cooperation", actor: "unseen-contact", subject: actor, acts: false, terms: [{ key: "loyalty", value: 0.173918, source: "trait" }], score: 0.173918, threshold: 0.55, close: false, visibility: "intelligence" }] } };
        const privateCampaign = { ...ordinary, ledger: [...ordinary.ledger.slice(0, -1), privateEntry] };
        expect(recordRows(privateCampaign)).toEqual(recordRows(ordinary));
        expect(recordEntry(privateCampaign, final.causal.eventId)).toEqual(recordEntry(ordinary, final.causal.eventId));
        expect(personDossier(privateCampaign, actor)).toEqual(personDossier(ordinary, actor));
        expect(JSON.stringify(personDossier(privateCampaign, actor))).not.toContain("unseen-contact");
    });
});
