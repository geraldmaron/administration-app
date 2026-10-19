import { describe, expect, it } from "vitest";
import { color } from "@admin/design";
import { partyColorForLabel, partyColorForTicket } from "./party-color";
describe("partyColorForTicket", () => {
    it("maps each US party ticket to the fixed palette", () => {
        expect(partyColorForTicket("democrat")).toBe(color.party.democrat);
        expect(partyColorForTicket("republican")).toBe(color.party.republican);
        expect(partyColorForTicket("independent")).toBe(color.party.independent);
    });
});
describe("partyColorForLabel", () => {
    it("maps caucus words and ignores non-party labels", () => {
        expect(partyColorForLabel("Democrat")).toBe(color.party.democrat);
        expect(partyColorForLabel("Republican")).toBe(color.party.republican);
        expect(partyColorForLabel("Independent")).toBe(color.party.independent);
        expect(partyColorForLabel("Rival faction")).toBeUndefined();
    });
});
