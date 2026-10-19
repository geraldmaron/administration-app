import { describe, expect, it } from "vitest";
import { hasIntelOnNation } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { nationFile } from "./nation-file";
import { nationPower } from "./nation-power";
const opening = openingCampaign({ seedText: "nation-power" });
const foreign = Object.keys(opening.nations).filter((id) => id !== opening.founding.nation);
describe("a country's size", () => {
    it("reads population and GDP straight off the nation's stats, in USD millions", () => {
        const id = "MEX";
        const stats = opening.nations[id].stats;
        const power = nationPower(opening, id);
        expect(power.population).toBe(stats.demography.population);
        expect(power.gdpUsdMillions).toBe(stats.economy.gdp);
        expect(power.gdpPerCapitaUsd).toBe(stats.economy.gdpPerCapita);
    });
    it("states military spending as a share of GDP only where the services read the government", () => {
        for (const id of foreign.slice(0, 40)) {
            const power = nationPower(opening, id);
            if (hasIntelOnNation(opening, id)) {
                expect(power.militarySpendUsdMillions).toBe(opening.nations[id].stats.military.budget);
            }
            else {
                expect(power.militarySpendUsdMillions).toBeUndefined();
                expect(power.militarySpendShareOfGdp).toBeUndefined();
            }
        }
    });
    it("is carried on the country file and absent for an unknown id", () => {
        const file = nationFile(opening, "MEX");
        expect(file.power).toEqual(nationPower(opening, "MEX"));
        expect(nationPower(opening, "ZZZ")).toBeUndefined();
    });
});
