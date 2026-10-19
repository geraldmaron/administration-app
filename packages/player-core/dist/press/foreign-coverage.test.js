import { describe, expect, it } from "vitest";
import { apply, foreignPoliticsPhase, FOREIGN_OUTLETS } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { COVERAGE_CAPTIONS, foreignCoverageReading, foreignLeadershipReading, foreignPressReading } from "./foreign-coverage";
// "How they cover you" and "In office since", as the country file and the
// press room read them.
const opening = openingCampaign();
function aWeekAbroad(state) {
    return foreignPoliticsPhase(state).reduce((acc, packet) => apply(acc, packet), state);
}
describe("how a country's press covers you", () => {
    it("says nothing at the oath, before the press abroad has filed", () => {
        expect(foreignCoverageReading(opening, "DEU")).toBeUndefined();
        expect(foreignPressReading(opening)).toEqual([]);
    });
    it("reads a band and its caption once it has, and a state press as its government's voice", () => {
        const filed = aWeekAbroad(opening);
        const germany = foreignCoverageReading(filed, "DEU");
        expect(germany.echo).toBe(false);
        expect(germany.caption).toBe(COVERAGE_CAPTIONS[germany.band]);
        expect(germany.outlet?.kind).toBe("national");
        expect(germany.piece?.outletId).toBe(germany.outlet?.id);
        const china = foreignCoverageReading(filed, "CHN");
        expect(china.echo).toBe(true);
        expect(china.caption).toBe(COVERAGE_CAPTIONS.echo);
        expect(foreignCoverageReading(filed, filed.founding.nation)).toBeUndefined();
    });
    it("gives the press room one piece from every outlet on the foreign roster", () => {
        const pieces = foreignPressReading(aWeekAbroad(opening));
        expect(pieces.map((piece) => piece.outletId)).toEqual(FOREIGN_OUTLETS.map((outlet) => outlet.id));
    });
});
describe("in office since", () => {
    it("dates a table incumbent to the month the table was drawn, and a projected one to its month, never a day", () => {
        const seats = opening.foreignPolitics.seats;
        const table = Object.keys(seats).find((id) => seats[id].provenance === "table");
        expect(foreignLeadershipReading(opening, table).since).toBe("In office since at least September 2026.");
        const projected = Object.keys(seats).find((id) => seats[id].provenance === "projected");
        if (projected) {
            const line = foreignLeadershipReading(opening, projected).since;
            expect(line).toMatch(/^In office since about [A-Z][a-z]+ \d{4}, a guess based on their last election\.$/);
        }
    });
    it("names the next selection to its month, and nothing for the President's own country", () => {
        const reading = foreignLeadershipReading(opening, "BEL");
        expect(reading.nextSelection).toBe("June 2029");
        expect(foreignLeadershipReading(opening, opening.founding.nation)).toBeUndefined();
    });
});
